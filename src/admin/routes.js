import { adminPage } from './page.js';
import { AdminInputError, loadRecord, saveRecord, username, clean } from './records.js';
import { scrapeProfile } from './scrape.js';
const encoder = new TextEncoder();
const json = (data,status=200) => Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});
async function authorized(request, secret) {
  const header = request.headers.get('Authorization') || '';
  if (!header.startsWith('Basic ')) return false;
  let credentials;try { credentials = atob(header.slice(6)); } catch { return false; }
  if (!credentials.startsWith('admin:') || credentials.length > 4096) return false;
  const [a,b] = await Promise.all([credentials.slice(6),secret].map(value=>crypto.subtle.digest('SHA-256',encoder.encode(value))));
  const left=new Uint8Array(a),right=new Uint8Array(b);let diff=0;for(let i=0;i<left.length;i++)diff|=left[i]^right[i];return diff===0;
}
async function body(request) {
  if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) throw new AdminInputError('JSON required.');
  const reader=request.body?.getReader();if(!reader)throw new AdminInputError('Missing body.');
  let size=0;const chunks=[];
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>65536){await reader.cancel();throw new AdminInputError('Request too large.');}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  try{const value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));if(!value||typeof value!=='object'||Array.isArray(value))throw Error();return value;}catch{throw new AdminInputError('Invalid JSON.');}
}
export async function adminRoute(request,env, scrape=scrapeProfile) {
  const url=new URL(request.url);
  if(url.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(url.hostname))return json({error:'HTTPS required.'},403);
  if(typeof env.ADMIN_PASSWORD!=='string'||env.ADMIN_PASSWORD.length<20)return json({error:'Configure ADMIN_PASSWORD with at least 20 ASCII characters.'},503);
  if(!await authorized(request,env.ADMIN_PASSWORD))return new Response('Administrator sign-in required.',{status:401,headers:{'WWW-Authenticate':'Basic realm="NextObsession admin", charset="UTF-8"','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}});
  if(request.method==='POST'&&(request.headers.get('Origin')!==url.origin||request.headers.get('Sec-Fetch-Site')==='cross-site'))return json({error:'Invalid request origin.'},403);
  try {
    if(request.method==='GET'&&['/admin','/admin/import'].includes(url.pathname))return adminPage();
    if(request.method==='GET'&&url.pathname==='/admin/api/creator')return json({record:await loadRecord(env.DB,url.searchParams.get('username'))});
    if(request.method==='POST'&&url.pathname==='/admin/api/scrape'){
      const input=await body(request);const handle=username(input.username);
      const existing=await loadRecord(env.DB,handle);
      const result=await scrape(env.BROWSER,handle);
      if(result.status!=='public_profile')return json(result);
      // Failed/missing scraped fields never erase previously stored values.
      const fields=Object.fromEntries(Object.entries(result.record).filter(([k,v])=>v!=null&&v!==''&&k!=='age'&&k!=='gender'));
      const record={...(existing||{}),...fields,age:existing?.age??null,gender:existing?.gender??null};
      return json({status:'public_profile',exists:Boolean(existing),record:JSON.parse(clean(JSON.stringify(record)))});
    }
    if(request.method==='POST'&&url.pathname==='/admin/api/save'){
      const input=await body(request);const record=await saveRecord(env.DB,input.record,input.mode);return json({saved:true,record});
    }
    return json({error:'Not found.'},404);
  } catch(error) {
    if(error instanceof AdminInputError)return json({error:error.message},400);
    console.error('Admin operation failed:',error?.name||'Error');
    return json({error:'Operation failed. Check the database migration and Browser Run binding. Nothing was intentionally overwritten.'},503);
  }
}
