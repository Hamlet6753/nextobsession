import assert from 'node:assert/strict';
import {scrapeProfile,browserCheck} from '../src/admin/scrape.js';
function fixture(code=200){
 const state={navigations:0,closed:false,evaluations:0};
 const response={status:()=>code,allHeaders:async()=>({'server':'cloudflare','cf-ray':'test-ray','set-cookie':'must-not-leak'})};
 const hidden={first(){return this;},isVisible:async()=>false,count:async()=>0};
 const page={setDefaultTimeout(){},goto:async url=>{state.url=url;state.navigations++;return response;},url:()=>state.url+'?secret=must-not-leak',title:async()=>code===403?'Access denied':'Profile',locator:selector=>selector==='body'?{innerText:async()=>code===403?'Request denied by website.':'Public profile'}:hidden,waitForFunction:async()=>{},getByRole:()=>hidden,getByText:()=>hidden,waitForTimeout:async()=>{},evaluate:async()=>{state.evaluations++;return state.evaluations===1?{profile_detected:true,display_name:'Name',stats:{photos:10}}:state.evaluations===2?[{url:'https://instagram.com/test'}]:{pricing:{subscription_type:'free',pricing_source:'Subscribe for free'}};}};
 const launch=async()=>({newContext:async()=>({newPage:async()=>page,close:async()=>{}}),close:async()=>{state.closed=true;}});
 return {state,launch};
}
let f=fixture(403);let result=await scrapeProfile({},'example',f.launch);assert.equal(result.status,'blocked');assert.equal(result.diagnostics.phase,'profile_navigation');assert.equal(result.diagnostics.http_status,403);assert.equal(result.diagnostics.headers['cf-ray'],'test-ray');assert(!JSON.stringify(result).includes('must-not-leak'));assert.equal(f.state.navigations,1);assert.equal(f.state.evaluations,0);assert(f.state.closed);
f=fixture(200);result=await scrapeProfile({},'example',f.launch);assert.equal(result.status,'public_profile');assert.equal(result.record.photos,10);assert.equal(result.record.username,'@example');assert.equal(result.record.social_links[0].url,'https://instagram.com/test');assert(f.state.closed);
f=fixture(200);result=await browserCheck({},f.launch);assert.equal(result.status,'browser_ok');assert.equal(f.state.url,'https://example.com/');assert(f.state.closed);
result=await browserCheck(null);assert.equal(result.diagnostics.phase,'configuration');
result=await browserCheck({},async()=>{throw Error('private details');});assert.equal(result.diagnostics.phase,'browser_launch');assert(!JSON.stringify(result).includes('private details'));
console.log('PASS cloud browser check, successful extraction, 403 diagnostics, no retries, redaction and cleanup');
