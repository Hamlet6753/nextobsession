import assert from 'node:assert/strict';
import {schemaGraph,serializeSchema} from '../src/services/schema.js';
import {shell} from '../src/components/layout.js';
import {htmlResponse} from '../src/lib/responses.js';
const origin='https://nextobsession.fans';
const row={username:'@example',name:'Example " &',bio:'</script><script>alert(1)</script> & \u2028',avatar_url:'https://images.example/avatar.jpg',banner_url:null};
for(const [path,type] of [['/about','AboutPage'],['/contact','ContactPage'],['/terms','WebPage'],['/privacy','WebPage'],['/removal','WebPage']]){
 const graph=schemaGraph('Page',{url:new URL(origin+path)});
 assert(graph['@graph'].some(n=>n['@type']===type));
 assert(graph['@graph'].some(n=>n['@type']==='WebSite'));
 assert(graph['@graph'].some(n=>n['@type']==='BreadcrumbList'));
}
const graph=schemaGraph(row.name,{url:new URL(origin+'/creator/example'),creator:row,description:row.bio,adult:true});
const person=graph['@graph'].find(n=>n['@type']==='Person');assert.equal(person.name,row.name);assert.equal(person.description,row.bio);assert(!('gender' in person));assert(!('offers' in person));assert(!graph['@graph'].some(n=>n['@type']==='ProfilePage'));
const serial=serializeSchema(graph);assert(!serial.includes('</script>'));assert.deepEqual(JSON.parse(serial),graph);
for(const isSerp of [false,true]){
 const g=schemaGraph('Creators',{url:new URL(origin+'/?q=example'),directory:true,rows:[row],state:{isSerp}});
 assert(g['@graph'].some(n=>n['@type']===(isSerp?'SearchResultsPage':'CollectionPage')));
 const list=g['@graph'].find(n=>n['@type']==='ItemList');assert.equal(list.numberOfItems,1);assert.equal(list.itemListElement[0].url,origin+'/creator/example');
}
const content=shell(row.name,'<p>Profile</p>',false,{url:new URL(origin+'/creator/example'),creator:row,description:row.bio});
const response=htmlResponse(content);const html=await response.text();
const match=html.match(/<script type="application\/ld\+json" data-site-schema nonce="([^"]+)">([\s\S]*?)<\/script>/);assert(match);assert.equal(JSON.parse(match[2])['@context'],'https://schema.org');assert(response.headers.get('Content-Security-Policy').includes("'nonce-"+match[1]+"'"));assert(response.headers.get('Content-Security-Policy').includes("manifest-src 'self'"));
const challenge=htmlResponse(content,200,{turnstile:true});assert(challenge.headers.get('Content-Security-Policy').includes('https://challenges.cloudflare.com'));
assert(!html.includes('<script>alert(1)</script>'));
console.log('PASS JSON-LD graph types, visible list items, safe serialization, CSP nonce and Turnstile/manifest compatibility');
