import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import worker from '../src/index.js';
import {directoryPage,directoryState,continuationUrl} from '../src/services/directory.js';
import {contactAddress} from '../src/routes/contact.js';
const folder=mkdtempSync(join(tmpdir(),'launch-'));const database=join(folder,'test.sqlite');
function execute(sql,bindings=[]){return JSON.parse(execFileSync('python3',['-c',`import sqlite3,json,sys
q=json.load(sys.stdin);c=sqlite3.connect(q['database']);c.row_factory=sqlite3.Row;c.setlimit(sqlite3.SQLITE_LIMIT_LIKE_PATTERN_LENGTH,50)
r=[dict(x) for x in c.execute(q['sql'],q['bindings'])];c.commit();print(json.dumps(r))`],{encoding:'utf8',input:JSON.stringify({database,sql,bindings})}));}
function script(sql){execFileSync('python3',['-c',`import sqlite3,json,sys
q=json.load(sys.stdin);c=sqlite3.connect(q['database']);c.executescript(q['sql']);c.commit()`],{input:JSON.stringify({database,sql})});}
const DB={prepare(sql){let params=[];return {bind(...v){params=v;return this;},async all(){return {results:execute(sql,params)}},async first(){return execute(sql,params)[0]??null}};}};
try{
 script('CREATE TABLE creator(username TEXT PRIMARY KEY,name TEXT,location TEXT,bio TEXT,website TEXT,avatar_url TEXT,banner_url TEXT,updated_at TEXT,photos INTEGER,videos INTEGER,likes INTEGER,subscription_type TEXT,subscription_price_cents INTEGER,subscription_current_price_cents INTEGER);'+readFileSync(new URL('../migrations/20261117_creator_search.sql',import.meta.url),'utf8'));
 const bio='A public creator biography about gym training and creative work. '.repeat(3)+' <script>"&';
 for(let i=0;i<65;i++)execute('INSERT INTO creator(username,name,bio,avatar_url,banner_url,likes) VALUES(?,?,?,?,?,?)',['@user'+String(i).padStart(3,'0'),i===0?'Name " & < >':'Creator '+i,bio+i,'https://images.example/a.jpg','https://images.example/b.jpg',i]);
 execute('INSERT INTO creator(username,name,bio) VALUES(?,?,?)',['@thin','Thin','Short']);
 const origin='https://nextobsession.fans';const fetchPage=async(path,host=origin)=>worker.fetch(new Request(host+path),{DB});
 const profile=await (await fetchPage('/creator/user000')).text();
 assert(profile.includes('<title>Name &quot; &amp; &lt; &gt; | NextObsession.fans</title>'));
 assert(profile.includes('name="description" content="'+bio.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))+'0"'));
 assert(profile.includes('content="index,follow"'));assert(profile.includes('rel="canonical" href="'+origin+'/creator/user000"'));
 assert(!profile.includes('<script>"&'));assert((profile.match(/alt="Name &quot; &amp; &lt; &gt;"/g)||[]).length===2);
 assert((await (await fetchPage('/creator/thin')).text()).includes('content="noindex,follow"'));
 assert((await (await fetchPage('/creator/user000','https://preview.workers.dev')).text()).includes('content="noindex,follow"'));
 const home=await (await fetchPage('/')).text();assert(home.includes('content="index,follow"'));assert(home.includes('id="creator-sort"'));
 const serp=await (await fetchPage('/?category=fitness&sort=random&q=gym')).text();assert(serp.includes('id="creator-sort"'));assert(serp.includes('content="noindex,follow"'));assert(!serp.includes('sort=random'));assert(serp.includes('Find someone worth following'));
 for(const query of ['q=gym','category=fitness','price=free','location=Paris'])assert.equal(directoryState(new URL(origin+'/?'+query+'&sort=random')).sort,'default');
 const found=[];let cursor=null;
 do{const u=new URL(origin+'/?category=fitness');if(cursor)u.searchParams.set('cursor',cursor);const state=directoryState(u);const page=await directoryPage(DB,state);found.push(...page.rows.map(r=>r.username));cursor=page.next;if(cursor)assert(!continuationUrl('/',state,cursor).includes('sort='));}while(cursor);
 assert.equal(found.length,65);assert.equal(new Set(found).size,65);assert.deepEqual(found,[...found].sort());

 for(const sort of ['updated_asc','updated_desc','price_asc','price_desc','likes_asc','likes_desc','photos_asc','photos_desc','videos_asc','videos_desc']){
  const all=[];let next=null;
  do{
   const url=new URL(origin+'/?category=fitness&sort='+sort);if(next)url.searchParams.set('cursor',next);
   const state=directoryState(url);assert.equal(state.sort,sort);
   const page=await directoryPage(DB,state);all.push(...page.rows);next=page.next;
   if(next)assert(continuationUrl('/',state,next).includes('sort='+sort));
  }while(next);
  assert.equal(all.length,65);assert.equal(new Set(all.map(r=>r.username)).size,65);
  if(sort==='likes_desc')assert.deepEqual(all.map(r=>r.likes),Array.from({length:65},(_,i)=>64-i));
  if(sort==='likes_asc')assert.deepEqual(all.map(r=>r.likes),Array.from({length:65},(_,i)=>i));
 }
 const sortedHtml=await(await fetchPage('/?category=fitness&sort=likes_desc')).text();
 assert(sortedHtml.includes('value="likes_desc" selected'));
 assert(sortedHtml.includes('value="default"'));
 assert(!sortedHtml.includes('value="random"'));
 const sitemap=await(await fetchPage('/sitemap.xml')).text();assert(sitemap.includes('/creator/user000'));assert(!sitemap.includes('/creator/thin'));assert(!sitemap.includes('category='));
 assert.equal((await fetchPage('/sitemap.xml','https://preview.workers.dev')).status,404);
 for(const path of ['/about','/privacy','/terms','/removal','/contact']){const r=await fetchPage(path);assert.equal(r.status,200);const html=await r.text();assert(html.includes('href="'+origin+path+'"'));assert(html.includes('footer-links'));}
 assert((await(await fetchPage('/robots.txt','https://preview.workers.dev')).text()).includes('Disallow: /\n'));
 assert.equal((await fetchPage('/creator/missing')).status,404);
 assert.equal((await fetchPage('/about/')).status,301);
 const env={TURNSTILE_SECRET_KEY:'secret',CONTACT_EMAIL:'test@example.com'};
 function contact(body='cf-turnstile-response=valid',headers={}){return new Request(origin+'/api/contact-address',{method:'POST',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded',...headers},body});}
 const verifier=async()=>Response.json({success:true,hostname:'nextobsession.fans',action:'contact'});
 assert.equal((await contactAddress(contact(),env,verifier)).status,200);
 assert.equal((await contactAddress(contact(),env,async()=>Response.json({success:true,hostname:'evil.example',action:'contact'}))).status,403);
 assert.equal((await contactAddress(contact(),env,async()=>Response.json({success:true,hostname:'nextobsession.fans',action:'other'}))).status,403);
 assert.equal((await contactAddress(contact(),env,async()=>Response.json({success:false}))).status,403);
 assert.equal((await contactAddress(contact('website=spam&cf-turnstile-response=valid'),env,verifier)).status,400);
 assert.equal((await contactAddress(contact('',{Origin:'https://evil.example'}),env,verifier)).status,403);
 assert.equal((await contactAddress(contact('x='.padEnd(5000,'x')),env,verifier)).status,413);
 assert.equal((await contactAddress(contact(),{},verifier)).status,503);
 assert.equal((await contactAddress(contact(),env,async()=>{throw Error('offline')})).status,503);
 const gated=await worker.fetch(new Request(origin+'/contact'),{...env,TURNSTILE_SITE_KEY:'site'});assert(gated.headers.get('Content-Security-Policy').includes('script-src \'self\' https://challenges.cloudflare.com'));assert(!(await gated.text()).includes('test@example.com'));
 console.log('PASS metadata/escaping/canonicals/preview protection, alt, stable SERP pagination, curated sitemap, information pages, contact verification and rejection paths');
}finally{rmSync(folder,{recursive:true,force:true});}
