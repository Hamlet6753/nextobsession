import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import worker from '../src/index.js';
import {directoryPage,directoryState,continuationUrl} from '../src/services/directory.js';
import {contactAddress} from '../src/routes/contact.js';
import {adminRoute} from '../src/admin/routes.js';
import {normalize,username} from '../src/admin/records.js';
const folder=mkdtempSync(join(tmpdir(),'launch-'));const database=join(folder,'test.sqlite');
function execution(sql,bindings=[]){return JSON.parse(execFileSync('python3',['-c',`import sqlite3,json,sys
q=json.load(sys.stdin);c=sqlite3.connect(q['database']);c.row_factory=sqlite3.Row;c.setlimit(sqlite3.SQLITE_LIMIT_LIKE_PATTERN_LENGTH,50)
r=[dict(x) for x in c.execute(q['sql'],q['bindings'])];n=c.execute('SELECT changes()').fetchone()[0];c.commit();print(json.dumps({'results':r,'changes':n}))`],{encoding:'utf8',input:JSON.stringify({database,sql,bindings})}));}
function execute(sql,bindings=[]){return execution(sql,bindings).results;}
function script(sql){execFileSync('python3',['-c',`import sqlite3,json,sys
q=json.load(sys.stdin);c=sqlite3.connect(q['database']);c.executescript(q['sql']);c.commit()`],{input:JSON.stringify({database,sql})});}
const DB={prepare(sql){let params=[];return {bind(...v){params=v;return this;},async all(){return {results:execute(sql,params)}},async first(){return execute(sql,params)[0]??null},async run(){return {meta:{changes:execution(sql,params).changes}}}};}};
DB.batch=async statements=>{const results=[];for(const statement of statements)results.push(await statement.run());return results;};
try {
 script('CREATE TABLE creator(username TEXT PRIMARY KEY,name TEXT,location TEXT,bio TEXT,website TEXT,avatar_url TEXT,banner_url TEXT,updated_at TEXT,photos INTEGER,videos INTEGER,likes INTEGER,subscription_type TEXT,subscription_price_cents INTEGER,subscription_current_price_cents INTEGER);'+readFileSync(new URL('../migrations/20261117_creator_search.sql',import.meta.url),'utf8'));
 script(readFileSync(new URL('../migrations/20261119_creator_manual_fields.sql',import.meta.url),'utf8'));
 script(readFileSync(new URL('../migrations/20261120_creator_social_links.sql',import.meta.url),'utf8'));
 script(readFileSync(new URL('../migrations/20261123_creator_ignored.sql',import.meta.url),'utf8'));
 const secret='test-secret-with-more-than-20-characters';const origin='https://nextobsession.fans';
 const auth='Basic '+btoa('admin:'+secret);const env={DB,ADMIN_PASSWORD:secret};
 const req=(path,body)=>new Request(origin+path,{method:body?'POST':'GET',headers:{Authorization:auth,...(body?{'Content-Type':'application/json',Origin:origin}:{})},body:body?JSON.stringify(body):undefined});
 assert.equal((await adminRoute(new Request(origin+'/admin/import'),env)).status,401);
 assert.equal((await adminRoute(req('/admin/import'),{DB})).status,503);
 const page=await adminRoute(req('/admin/import'),env);assert.equal(page.status,200);assert((await page.text()).includes('noindex,nofollow'));
 const input={username:'Test_user',name:'Name <script>',bio:'Biography',age:'25',gender:'female',photos:'0',social_links:[{url:'https://instagram.com/test'}]};
 let response=await adminRoute(req('/admin/api/save',{record:input,mode:'create'}),env);assert.equal(response.status,200,await response.clone().text());
 let stored=execute('SELECT * FROM creator')[0];assert.equal(JSON.parse(stored.social_links)[0].url,'https://instagram.com/test');assert.equal(stored.age,25);assert.equal(stored.gender,'female');assert.equal(stored.username,'@test_user');
 assert.equal((await adminRoute(req('/admin/api/save',{record:input,mode:'create'}),env)).status,400);
 response=await adminRoute(req('/admin/api/save',{record:{...input,age:'',gender:'',bio:'Updated'},mode:'update'}),env);assert.equal(response.status,200);stored=execute('SELECT * FROM creator')[0];assert.equal(stored.age,null);assert.equal(stored.gender,null);assert.equal(stored.bio,'Updated');
 assert.throws(()=>normalize({...input,age:17}));assert.throws(()=>normalize({...input,age:'18.5'}));assert.throws(()=>normalize({...input,gender:'invalid'}));assert.throws(()=>normalize({...input,website:'javascript:alert(1)'}));assert.equal(normalize({...input,name:'X\ud835'}).name,'X\ufffd');
 assert.equal(username('https://onlyfans.com/example'),'@example');assert.throws(()=>username('https://evil.example/test'));
 const forged=new Request(origin+'/admin/api/save',{method:'POST',headers:{Authorization:auth,Origin:'https://evil.example','Content-Type':'application/json'},body:'{}'});assert.equal((await adminRoute(forged,env)).status,403);
 let called=0;const scrape=async()=>{called++;return {status:'public_profile',record:{username:'@test_user',name:'Refreshed',bio:null,age:99,gender:'male'}};};
 response=await adminRoute(req('/admin/api/scrape',{username:'test_user'}),env,scrape);let result=await response.json();assert.equal(result.record.bio,'Updated');assert.equal(result.record.age,null);assert.equal(result.record.gender,null);assert.equal(execute('SELECT name FROM creator')[0].name,input.name);
 await adminRoute(req('/admin/api/scrape',{username:'test_user'}),env,async()=>({status:'blocked',error:'HTTP 403'}));assert.equal(execute('SELECT name FROM creator')[0].name,input.name);
 const fts=execute("SELECT rowid FROM creator_search_v1 WHERE creator_search_v1 MATCH 'Updated'");assert.equal(fts.length,1);
 const publicPage=await worker.fetch(new Request(origin+'/creator/test_user'),env);const publicHtml=await publicPage.text();assert(!publicHtml.includes('name="gender"'));assert(!publicHtml.includes('"gender":'));assert(!publicHtml.includes('"age":'));
 response=await adminRoute(req('/admin/api/ignored',{usernames:'@TEST_USER\ntest_user',reason:'Removal request <script>',removeExisting:false}),env);assert.equal(response.status,200);assert.equal((await response.json()).ignored,1);assert.equal(execute('SELECT * FROM creator').length,1);
 assert.equal((await adminRoute(req('/admin/api/save',{record:input,mode:'update'}),env)).status,400);
 const before=called;assert.equal((await adminRoute(req('/admin/api/scrape',{username:'test_user'}),env,scrape)).status,400);assert.equal(called,before);
 const ignoredHtml=await (await adminRoute(req('/admin/ignored'),env)).text();assert(ignoredHtml.includes('Removal request &lt;script&gt;'));assert(ignoredHtml.includes('data-site-schema'));assert(ignoredHtml.includes('noindex,nofollow'));
 const csv=await (await adminRoute(req('/admin/api/ignored.csv'),env)).text();assert.equal(csv,'username\r\ntest_user\r\n');
 response=await adminRoute(req('/admin/api/ignored',{usernames:'test_user',reason:'Removal request',removeExisting:true}),env);assert.equal((await response.json()).removed,1);assert.equal(execute('SELECT * FROM creator').length,0);assert.equal(execute("SELECT rowid FROM creator_search_v1 WHERE creator_search_v1 MATCH 'Updated'").length,0);
 execute("INSERT INTO creator(username,name) VALUES ('@TEST_USER','Forbidden'),('@allowed','Allowed')");assert.equal(execute('SELECT * FROM creator').length,1);
 execute("INSERT INTO creator(username,name) VALUES ('test_user','Forbidden') ON CONFLICT(username) DO UPDATE SET name=excluded.name");assert.equal(execute('SELECT * FROM creator').length,1);
 execute("UPDATE creator SET username='@test_user' WHERE username='@allowed'");assert.equal(execute('SELECT username FROM creator')[0].username,'@allowed');
 await adminRoute(req('/admin/api/unignore',{username:'test_user'}),env);assert.equal(execute('SELECT * FROM creator_ignored').length,0);assert.equal(execute('SELECT * FROM creator').length,1);
 execute("INSERT INTO creator(username,name) VALUES ('@test_user','Restored manually')");assert.equal(execute('SELECT * FROM creator').length,2);
 assert.equal((await adminRoute(req('/admin/api/ignored',{usernames:'valid\ninvalid!',reason:'',removeExisting:false}),env)).status,400);assert.equal(execute('SELECT * FROM creator_ignored').length,0);
 console.log('PASS ignored-list auth, validation, normalized deduplication, SSR escaping/schema, CSV, optional deletion, FTS cleanup, raw SQL imports/updates and explicit unblock');
 console.log('PASS admin auth, origin checks, migration, persistence, nulls, validation, duplicates, scrape drafts, FTS and public field exclusion');
}finally{rmSync(folder,{recursive:true,force:true});}
