import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {analyticsReport,fillTimeSeries} from '../src/services/analytics.js';
import {analyticsPage} from '../src/admin/analytics-page.js';
const now=Date.parse('2026-11-24T12:00:00Z');
const events=[
 ['2026-11-22T23:59:59Z','pageview','same'],
 ['2026-11-23T00:00:00Z','pageview','same'],
 ['2026-11-23T00:30:00Z','click','same'],
 ['2026-11-23T02:00:00Z','pageview','other'],
 ['2026-11-24T01:00:00Z','click','same'],
 ['2026-11-25T00:00:00Z','pageview','excluded']
].map(([date,type,session])=>[Date.parse(date),type,session,'/','home','google.com','organic','','internal','/','/','desktop']);
let executed=[];
const db={prepare(sql){return {bind(...args){return {sql,args};}};},async batch(statements){executed=statements;return JSON.parse(execFileSync('python3',['-c',`import sqlite3,json,sys
q=json.load(sys.stdin);db=sqlite3.connect(':memory:');db.row_factory=sqlite3.Row
db.execute('CREATE TABLE site_analytics(occurred_at INTEGER,event_type TEXT,session_id TEXT,path TEXT,page_kind TEXT,source TEXT,medium TEXT,campaign TEXT,action TEXT,target TEXT,landing_path TEXT,device TEXT)')
db.executemany('INSERT INTO site_analytics VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',q['events'])
print(json.dumps([{'results':[dict(r) for r in db.execute(s['sql'],s['args'])]} for s in q['statements']]))
`],{input:JSON.stringify({events,statements}),encoding:'utf8'}));}};
for(const [from,to,expected,length] of [['2026-11-24','2026-11-24','hour',24],['2026-11-23','2026-11-24','hour',48],['2026-11-22','2026-11-24','day',3]]){
 const r=await analyticsReport(db,new URLSearchParams({from,to}),now);assert.equal(r.granularity,expected);assert.equal(r.series.length,length);assert.equal(r.series.reduce((n,x)=>n+x.pageviews,0),r.totals.pageviews);assert.equal(r.series.reduce((n,x)=>n+x.clicks,0),r.totals.clicks);
}
const two=await analyticsReport(db,new URLSearchParams({from:'2026-11-23',to:'2026-11-24'}),now);
assert.deepEqual(two.series[0],{bucket:'2026-11-23T00:00:00Z',pageviews:1,clicks:1,sessions:1});assert.equal(two.series[1].sessions,0);assert.equal(two.totals.sessions,2);
for(const interval of ['week','month']){
 const r=await analyticsReport(db,new URLSearchParams({from:'2026-11-23',to:'2026-11-24',granularity:interval}),now);
 assert.equal(r.series.length,1);assert.equal(r.series[0].sessions,2);assert.equal(r.series[0].pageviews,2);assert.equal(r.series[0].clicks,2);
 assert.equal(r.series[0].bucket,interval==='week'?'2026-11-23':'2026-11-01');
}
await analyticsReport(db,new URLSearchParams({from:'2026-11-23',to:'2026-11-24',granularity:'day',source:'google.com'}),now);assert.equal(executed.length,7);assert(executed.every(s=>s.sql.includes('source = ?')&&s.args.includes('google.com')));
await assert.rejects(()=>analyticsReport(db,new URLSearchParams({granularity:'invalid'}),now));
const empty=fillTimeSeries(Date.parse('2026-01-31T00:00:00Z'),Date.parse('2026-03-02T00:00:00Z'),'month',[]);assert.deepEqual(empty.map(r=>r.bucket),['2026-01-01','2026-02-01','2026-03-01']);
const weeks=fillTimeSeries(Date.parse('2026-11-22T00:00:00Z'),Date.parse('2026-11-24T00:00:00Z'),'week',[]);assert.deepEqual(weeks.map(r=>r.bucket),['2026-11-16','2026-11-23']);
const html=await analyticsPage(new URL('https://nextobsession.fans/admin/analytics')).text();assert(html.includes('data-granularity="hour"'));assert(html.includes('data-period="2"'));assert(html.includes('data-site-schema'));assert(html.includes('noindex,nofollow'));const schema=JSON.parse(html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/)[1]);assert(!JSON.stringify(schema).includes('google.com'));
console.log('PASS auto 24/48 hours, daily/weekly/monthly SQL, boundaries, distinct sessions, zero-filled buckets, shared filters, validation, SSR controls and private schema');
