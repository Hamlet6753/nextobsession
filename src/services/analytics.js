import { AdminInputError } from '../admin/records.js';
const DAY=86400000;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const knownPath=value=>typeof value==='string'&&(/^(?:\/|\/(?:about|terms|privacy|contact|removal|random-photos))$/.test(value)||/^\/creator\/[a-zA-Z0-9_.-]{1,64}$/.test(value));
const token=(value,max=80)=>typeof value==='string'?value.trim().replace(/[^a-zA-Z0-9_. /:@+-]/g,'').slice(0,max):'';
const reply=(status=204,reason='')=>new Response(null,{status,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow',...(reason?{'X-Analytics-Status':reason}:{}),...([429,503].includes(status)?{'Retry-After':'60'}:{})}});
function unavailable(reason,error){
 const detail=String(error?.message||'').replace(/[\r\n]/g,' ').slice(0,240);
 console.error('Analytics unavailable:',reason,error?.name||'',detail);
 return reply(503,reason);
}
async function saveEvent(db,event){
 const keys=Object.keys(event);
 try{await db.prepare('INSERT INTO site_analytics ('+keys.join(',')+') VALUES ('+keys.map(()=>'?').join(',')+') ON CONFLICT(event_id) DO NOTHING').bind(...Object.values(event)).run();return true;}
 catch(error){unavailable('database-write-failed',error);return false;}
}
export function normalizeEvent(data,request,now=Date.now()) {
 if(!data||data.consent!=='granted'||!UUID.test(data.event_id)||!UUID.test(data.session_id)||!['pageview','click'].includes(data.event_type)||!knownPath(data.path)||!knownPath(data.landing_path))return null;
 const kind=data.path==='/'?(data.page_kind==='search'?'search':'home'):data.path.startsWith('/creator/')?'creator':data.path==='/random-photos'?'random-photos':'information';
 const ua=request.headers.get('User-Agent')||'';
 const device=/ipad|tablet/i.test(ua)?'tablet':/mobile|android|iphone/i.test(ua)?'mobile':'desktop';
 const actions=['internal','onlyfans','creator-website','social','external','email','image','carousel-next','carousel-prev','random-next','button'];
 const action=data.event_type==='click'&&actions.includes(data.action)?data.action:'';
 let target='';
 if(data.event_type==='click'&&typeof data.target==='string'){
  if(knownPath(data.target))target=data.target;
  else if(/^[a-z0-9.-]{1,253}$/i.test(data.target))target=data.target.toLowerCase();
 }
 return {event_id:data.event_id,occurred_at:now,event_type:data.event_type,session_id:data.session_id,path:data.path,page_kind:kind,action,target,source:token(data.source)||'direct',medium:token(data.medium)||'none',campaign:token(data.campaign),landing_path:data.landing_path,device};
}
export async function collectAnalytics(request,env,ctx) {
 const url=new URL(request.url);
 if(url.hostname!=='nextobsession.fans'&&env.ANALYTICS_ENABLED!=='true')return reply();
 if(request.headers.get('Origin')!==url.origin||request.headers.get('Sec-Fetch-Site')==='cross-site')return reply(403);
 if(!request.headers.get('Content-Type')?.startsWith('application/json'))return reply(415);
 if(/bot|crawler|spider|headless|slurp|preview|lighthouse/i.test(request.headers.get('User-Agent')||'')||request.headers.get('Sec-GPC')==='1'||request.headers.get('DNT')==='1')return reply();
 try {
  if(!env.ANALYTICS_RATE_LIMITER)return unavailable('rate-limiter-missing');
  const ip=request.headers.get('CF-Connecting-IP')||'unknown';
  const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(ip));
  const key='analytics:'+Array.from(new Uint8Array(hash),n=>n.toString(16).padStart(2,'0')).join('');
  let timer;
  const limited=await Promise.race([env.ANALYTICS_RATE_LIMITER.limit({key}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Rate limiter deadline exceeded')),700);})]).finally(()=>clearTimeout(timer));
  if(!limited.success)return reply(429,'rate-limited');
 }catch(error){return unavailable('rate-limiter-unavailable',error);}
 const reader=request.body?.getReader();if(!reader)return reply(400);
 const chunks=[];let size=0;
 while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>4096){await reader.cancel();return reply(413);}chunks.push(value);}
 let data;try{const bytes=new Uint8Array(size);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.length;}data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{return reply(400);}
 const event=normalizeEvent(data,request);if(!event)return reply(400);
 if(!env.DB?.prepare)return unavailable('database-binding-missing');
 const writing=saveEvent(env.DB,event);
 if(ctx?.waitUntil){
  // Acknowledges acceptance, not durable delivery. D1 failures are logged above.
  ctx.waitUntil(writing.then(()=>undefined));
  return reply(202,'accepted');
 }
 // Direct callers without a Worker execution context retain confirmed writes.
 return (await writing)?reply(204,'stored'):reply(503,'database-write-failed');
}
export async function purgeAnalytics(env,now=Date.now()) {
 // Scheduled daily; indexed retention delete, no creator records affected.
 return env.DB.prepare('DELETE FROM site_analytics WHERE occurred_at < ?').bind(now-90*DAY).run();
}
function dateValue(value,fallback){if(!value)return fallback;if(!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new AdminInputError('Invalid date.');const n=Date.parse(value+'T00:00:00Z');if(!Number.isFinite(n)||new Date(n).toISOString().slice(0,10)!==value)throw new AdminInputError('Invalid date.');return n;}
export async function analyticsReport(db,params,now=Date.now()) {
 const today=Math.floor(now/DAY)*DAY;
 const start=dateValue(params.get('from'),today-6*DAY),end=dateValue(params.get('to'),today)+DAY;
 if(start<today-89*DAY||end>today+DAY||start>=end)throw new AdminInputError('Choose dates within the last 90 days. Dates use UTC.');
 const requested=params.get('granularity')||'auto';
 if(!['auto','hour','day','week','month'].includes(requested))throw new AdminInputError('Invalid chart interval.');
 const granularity=requested==='auto'?((end-start)/DAY<=2?'hour':'day'):requested;
 const where=['occurred_at >= ?','occurred_at < ?'],args=[start,end];
 for(const [key,column,allowed] of [['path','path',null],['landing_path','landing_path',null],['source','source',null],['medium','medium',null],['campaign','campaign',null],['type','event_type',['pageview','click']],['device','device',['desktop','mobile','tablet']],['kind','page_kind',['home','search','creator','information','random-photos']],['action','action',['internal','onlyfans','creator-website','social','external','email','image','carousel-next','carousel-prev','random-next','button']]]){
  const value=params.get(key);if(!value)continue;
  if(value.length>160||(allowed&&!allowed.includes(value))||(['path','landing_path'].includes(key)&&!knownPath(value)))throw new AdminInputError('Invalid '+key+' filter.');
  where.push(column+' = ?');args.push(value);
 }
 const clause=where.join(' AND '),summary="SUM(CASE WHEN event_type='pageview' THEN 1 ELSE 0 END) AS pageviews, SUM(CASE WHEN event_type='click' THEN 1 ELSE 0 END) AS clicks, COUNT(DISTINCT session_id) AS sessions";
 const groups=[['totals',`SELECT ${summary} FROM site_analytics WHERE ${clause}`],['daily',`SELECT strftime('%Y-%m-%d',occurred_at/1000,'unixepoch') AS day, ${summary} FROM site_analytics WHERE ${clause} GROUP BY day ORDER BY day`],['pages',`SELECT path,page_kind, ${summary} FROM site_analytics WHERE ${clause} GROUP BY path,page_kind ORDER BY pageviews DESC,clicks DESC,path LIMIT 100`],['sources',`SELECT source,medium,campaign, ${summary} FROM site_analytics WHERE ${clause} GROUP BY source,medium,campaign ORDER BY sessions DESC,pageviews DESC,source LIMIT 100`],['targets',`SELECT action,target,COUNT(*) AS clicks FROM site_analytics WHERE ${clause} AND event_type='click' GROUP BY action,target ORDER BY clicks DESC,action,target LIMIT 100`],['landings',`SELECT landing_path,COUNT(DISTINCT session_id) AS sessions FROM site_analytics WHERE ${clause} GROUP BY landing_path ORDER BY sessions DESC,landing_path LIMIT 100`],['devices',`SELECT device, ${summary} FROM site_analytics WHERE ${clause} GROUP BY device ORDER BY sessions DESC`]];
 const bucket={hour:"strftime('%Y-%m-%dT%H:00:00Z',occurred_at/1000,'unixepoch')",day:"strftime('%Y-%m-%d',occurred_at/1000,'unixepoch')",week:"date(occurred_at/1000,'unixepoch','-6 days','weekday 1')",month:"strftime('%Y-%m-01',occurred_at/1000,'unixepoch')"}[granularity];
 if(granularity!=='day')groups.push(['series',`SELECT ${bucket} AS bucket, ${summary} FROM site_analytics WHERE ${clause} GROUP BY bucket ORDER BY bucket`]);
 const results=await db.batch(groups.map(([,sql])=>db.prepare(sql).bind(...args)));
 const out={from:new Date(start).toISOString().slice(0,10),to:new Date(end-DAY).toISOString().slice(0,10),timezone:'UTC',retention_days:90,granularity};
 groups.forEach(([key],i)=>{out[key]=key==='totals'?results[i].results[0]:results[i].results;});
 out.series=fillTimeSeries(start,end,granularity,granularity==='day'?out.daily.map(row=>({...row,bucket:row.day})):out.series);
 return out;
}

// UTC calendar buckets; weekly boundaries are Monday, with partial edge buckets.
export function fillTimeSeries(start,end,granularity,rows) {
 const date=new Date(start);
 if(granularity==='week')date.setUTCDate(date.getUTCDate()-((date.getUTCDay()+6)%7));
 if(granularity==='month')date.setUTCDate(1);
 const byBucket=new Map(rows.map(row=>[row.bucket,row]));
 const series=[];
 while(date.getTime()<end){
  const bucket=granularity==='hour'?date.toISOString().slice(0,13)+':00:00Z':date.toISOString().slice(0,10);
  const row=byBucket.get(bucket);
  series.push({bucket,pageviews:Number(row?.pageviews||0),clicks:Number(row?.clicks||0),sessions:Number(row?.sessions||0)});
  if(granularity==='hour')date.setUTCHours(date.getUTCHours()+1);
  else if(granularity==='month')date.setUTCMonth(date.getUTCMonth()+1);
  else date.setUTCDate(date.getUTCDate()+(granularity==='week'?7:1));
 }
 return series;
}
