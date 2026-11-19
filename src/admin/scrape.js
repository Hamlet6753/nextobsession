import extract from './extractors/extract.js';
import pricing from './extractors/pricing.js';
import { username, COUNTERS } from './records.js';
const VERSION = 'cloud-scraper-2';
const allowedHost = host => ['onlyfans.com','www.onlyfans.com'].includes(host);
function safeLocation(value) {
  try { const url=new URL(value);return url.origin+url.pathname; } catch { return ''; }
}
export async function navigationDiagnostics(page,response,phase) {
  const diagnostics={version:VERSION,phase,http_status:response?.status()??null,final_url:safeLocation(page.url()),headers:{}};
  try {
    const headers=await response?.allHeaders();
    for(const key of ['server','content-type','cf-ray','cf-mitigated','retry-after'])if(headers?.[key])diagnostics.headers[key]=headers[key].slice(0,300);
  } catch {}
  try { diagnostics.title=(await page.title()).slice(0,200); } catch {}
  try { diagnostics.message=(await page.locator('body').innerText({timeout:2000})).replace(/\s+/g,' ').trim().slice(0,1200); } catch {}
  return diagnostics;
}
async function withBrowser(binding,work,launchBrowser) {
  if(!binding)return {status:'error',error:'BROWSER binding is missing in this environment.',diagnostics:{version:VERSION,phase:'configuration'}};
  let browser,context,timer,expired=false,phase='browser_launch';
  const diagnostics={version:VERSION};
  const setPhase=value=>{phase=value;};
  try {
    const launch=launchBrowser||(await import('@cloudflare/playwright')).launch;
    const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{expired=true;const error=new Error('Timeout');error.name='TimeoutError';reject(error);},85000);});
    return await Promise.race([(async()=>{
      browser=await launch(binding);
      if(expired){await browser.close();throw new Error('Browser launch completed after timeout.');}
      setPhase('context_creation');context=await browser.newContext({locale:'en-US'});
      const page=await context.newPage();page.setDefaultTimeout(5000);
      // Keep standard browser networking: no request interception or resource blocking.
      return await work(page,setPhase);
    })(),timeout]);
  }catch(error){
    return {status:'error',error:(error?.name==='TimeoutError'?'Timed out':'Browser operation failed')+' at '+phase+'. Nothing was saved.',diagnostics:{...diagnostics,phase,error_type:String(error?.name||'Error').slice(0,80)}};
  }finally{
    clearTimeout(timer);
    try{await context?.close();}catch{}
    try{await browser?.close();}catch{}
  }
}
export async function browserCheck(binding,launchBrowser) {
  return withBrowser(binding,async(page,setPhase)=>{
    setPhase('browser_check_navigation');
    const response=await page.goto('https://example.com/',{waitUntil:'domcontentloaded',timeout:30000});
    const diagnostics=await navigationDiagnostics(page,response,'browser_check_navigation');
    return {status:response?.status()===200?'browser_ok':'browser_check_failed',error:response?.status()===200?null:'Control page did not return HTTP 200.',diagnostics};
  },launchBrowser);
}
export async function scrapeProfile(binding,value,launchBrowser) {
  const handle=username(value);
  return withBrowser(binding,async(page,setPhase)=>{
    setPhase('profile_navigation');
    const response=await page.goto('https://onlyfans.com/'+handle.slice(1),{waitUntil:'domcontentloaded',timeout:30000});
    const code=response?.status();
    if([401,403,429].includes(code))return {status:code===429?'rate_limited':'blocked',error:'Target returned HTTP '+code+'. Nothing was saved.',diagnostics:await navigationDiagnostics(page,response,'profile_navigation')};
    if(code===404)return {status:'not_found',error:'Profile not found.',diagnostics:await navigationDiagnostics(page,response,'profile_navigation')};
    if(!code||code>=400)return {status:'error',error:'Unexpected navigation response.',diagnostics:await navigationDiagnostics(page,response,'profile_navigation')};
    if(!allowedHost(new URL(page.url()).hostname))return {status:'error',error:'Unexpected redirect.',diagnostics:await navigationDiagnostics(page,response,'profile_navigation')};
    setPhase('profile_render');
    try {
      await page.waitForFunction((name)=>{
        const text=document.body?.innerText||'';
        const header=document.querySelector('.b-profile, .b-user-info__text, [data-testid="profile-header"]');
        return (header&&text.toLowerCase().includes('@'+name))||/verify you are human|access denied|page not found/i.test(text);
      },handle.slice(1),{timeout:25000,polling:500});
    }catch{}
    const title=await page.title();
    for(const selector of ['#challenge-running','#challenge-stage','#cf-challenge-running','iframe[src*="challenges.cloudflare.com"]']){
      if(await page.locator(selector).first().isVisible())return {status:'blocked',error:'Visible access challenge. Nothing was saved.',diagnostics:await navigationDiagnostics(page,response,'profile_render')};
    }
    if(/^\s*(just a moment[.!\u2026]*|access denied|verify you are human)\s*$/i.test(title))return {status:'blocked',error:'Access challenge page. Nothing was saved.',diagnostics:await navigationDiagnostics(page,response,'profile_render')};
    setPhase('profile_info');
    let expanded=false;
    for(const role of ['button','link']){
      const control=page.getByRole(role,{name:/^more info$/i});
      if(await control.count()===1&&await control.isVisible()){await control.click();expanded=true;break;}
    }
    if(!expanded){const control=page.getByText(/^more info$/i);if(await control.count()===1&&await control.isVisible())await control.click();}
    await page.waitForTimeout(2000);
    try{await page.waitForFunction(()=>{const image=document.querySelector('img.b-profile__header__cover-img');return image?.src&&!/default_header_image|placeholder|of-logo/i.test(image.src);},null,{timeout:8000});}catch{}
    setPhase('profile_extraction');
    const data=await page.evaluate(extract,handle.slice(1));
    if(!data.profile_detected)return {status:'unresolved',error:'No public profile detected. Nothing was saved.',diagnostics:await navigationDiagnostics(page,response,'profile_extraction')};
    const prices=await page.evaluate(pricing);
    const record={username:handle,name:data.display_name,bio:data.bio,location:data.location,website:data.website,avatar_url:data.avatar_url,banner_url:data.banner_url,...prices.pricing};
    for(const key of COUNTERS)record[key]=data.stats?.[key]??null;
    if(prices.pricing.pricing_source)record.pricing_checked_at=new Date().toISOString();
    return {status:'public_profile',record,diagnostics:{version:VERSION,phase:'complete',http_status:code}};
  },launchBrowser);
}
