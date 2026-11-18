import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import worker from '../src/index.js';
import {directoryPage,directoryState,continuationUrl} from '../src/services/directory.js';
import {contactAddress} from '../src/routes/contact.js';
import {randomPhoto} from '../src/services/random-photo.js';
const folder=mkdtempSync(join(tmpdir(),'launch-'));const database=join(folder,'test.sqlite');
function execute(sql,bindings=[]){return JSON.parse(execFileSync('python3',['-c',`import sqlite3,json,sys
q=json.load(sys.stdin);c=sqlite3.connect(q['database']);c.row_factory=sqlite3.Row;c.setlimit(sqlite3.SQLITE_LIMIT_LIKE_PATTERN_LENGTH,50)
r=[dict(x) for x in c.execute(q['sql'],q['bindings'])];c.commit();print(json.dumps(r))`],{encoding:'utf8',input:JSON.stringify({database,sql,bindings})}));}
function script(sql){execFileSync('python3',['-c',`import sqlite3,json,sys
q=json.load(sys.stdin);c=sqlite3.connect(q['database']);c.executescript(q['sql']);c.commit()`],{input:JSON.stringify({database,sql})});}
const DB={prepare(sql){let params=[];return {bind(...v){params=v;return this;},async all(){return {results:execute(sql,params)}},async first(){return execute(sql,params)[0]??null}};}};
try {
 script('CREATE TABLE creator(username TEXT PRIMARY KEY,name TEXT,avatar_url TEXT,banner_url TEXT);');
 assert.equal(await randomPhoto(DB),null);
 execute('INSERT INTO creator VALUES(?,?,?,?)',['@sample','Name <&','https://images.example/avatar.jpg','https://images.example/banner.jpg']);
 execute('INSERT INTO creator VALUES(?,?,?,?)',['@empty','Empty',null,null]);
 execute('INSERT INTO creator VALUES(?,?,?,?)',['@default','Default','javascript:alert(1)','https://static.example/static/default_header_image.png']);
 let previous='';const seen=new Set();
 for(let i=0;i<12;i++){
  const photo=await randomPhoto(DB,previous);assert(photo);assert.equal(photo.username,'@sample');assert.equal(photo.creator_url,'/creator/sample');assert.notEqual(photo.image_url,previous);seen.add(photo.image_url);previous=photo.image_url;
 }
 assert.equal(seen.size,2);
 const response=await worker.fetch(new Request('https://nextobsession.fans/random-photos'),{DB});
 assert.equal(response.status,200);const html=await response.text();
 assert(html.includes('id="age-gate"'));assert(html.includes('id="random-photo-more"'));assert(html.includes('href="/creator/sample"'));assert(html.includes('alt="Name &lt;&amp;"'));assert(html.includes('content="noindex,follow"'));assert(html.includes('rel="canonical" href="https://nextobsession.fans/random-photos"'));
 const api=await worker.fetch(new Request('https://nextobsession.fans/api/random-photo?exclude='+encodeURIComponent(previous)),{DB});assert.equal(api.status,200);assert.equal(api.headers.get('Cache-Control'),'no-store');assert.notEqual((await api.json()).photo.image_url,previous);
 const bad=await worker.fetch(new Request('https://nextobsession.fans/api/random-photo'),{DB:{prepare(){throw Error('Test database failure');}}});assert.equal(bad.status,503);assert.equal(bad.headers.get('Content-Type'),'application/json');
 execute('DELETE FROM creator');
 const empty=await worker.fetch(new Request('https://nextobsession.fans/api/random-photo'),{DB});assert.deepEqual(await empty.json(),{photo:null});
 console.log('Random photo database, exclusion, SSR, escaping, age gate, empty and error checks passed.');
} finally {rmSync(folder,{recursive:true,force:true});}
