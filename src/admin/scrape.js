import extract from './extractors/extract.js';
import pricing from './extractors/pricing.js';
import { username, COUNTERS } from './records.js';

export async function scrapeProfile(binding, value) {
  if (!binding) throw new Error('Configure the BROWSER binding first.');
  const handle = username(value);
  const { launch } = await import('@cloudflare/playwright');
  const browser = await launch(binding);
  let timer;
  try {
    return await Promise.race([read(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Profile timed out. Nothing was saved.')),85000);})]);
  } finally { clearTimeout(timer); await browser.close(); }
  async function read() {
    const page = await browser.newPage({locale:'en-US'});
    page.setDefaultTimeout(5000);
    await page.route('**/*',route=>['media','font'].includes(route.request().resourceType())?route.abort():route.continue());
    const response = await page.goto('https://onlyfans.com/'+handle.slice(1),{waitUntil:'domcontentloaded',timeout:30000});
    const code = response?.status();
    if ([401,403,429].includes(code)) return {status:code===429?'rate_limited':'blocked',error:'Access restriction: HTTP '+code};
    if (code===404) return {status:'not_found',error:'Profile not found.'};
    if (code>=400) return {status:'error',error:'HTTP '+code};
    try { await page.waitForFunction(() => document.querySelector('.b-profile, .b-user-info__text, [data-testid="profile-header"]') || /verify you are human|access denied|page not found/i.test(document.body?.innerText||''),null,{timeout:20000}); } catch {}
    const title = await page.title();
    for (const selector of ['#challenge-running','#challenge-stage','#cf-challenge-running','iframe[src*="challenges.cloudflare.com"]']) {
      if (await page.locator(selector).first().isVisible()) return {status:'blocked',error:'Visible access challenge. Nothing was saved.'};
    }
    if (/^\s*(just a moment[.!\u2026]*|access denied|verify you are human)\s*$/i.test(title)) return {status:'blocked',error:'Access challenge page. Nothing was saved.'};
    if (!['onlyfans.com','www.onlyfans.com'].includes(new URL(page.url()).hostname)) return {status:'error',error:'Unexpected redirect.'};
    for (const role of ['button','link']) {
      const control = page.getByRole(role,{name:/^more info$/i});
      if (await control.count()===1 && await control.isVisible()) { await control.click(); break; }
    }
    await page.waitForTimeout(2000);
    try { await page.waitForFunction(()=>{const image=document.querySelector('img.b-profile__header__cover-img');return image?.src&&!/default_header_image|placeholder|of-logo/i.test(image.src);},null,{timeout:8000}); } catch {}
    const data = await page.evaluate(extract,handle.slice(1));
    if (!data.profile_detected) return {status:'unresolved',error:'No public profile detected. Nothing was saved.'};
    const prices = await page.evaluate(pricing);
    const record = {username:handle,name:data.display_name,bio:data.bio,location:data.location,website:data.website,avatar_url:data.avatar_url,banner_url:data.banner_url,...prices.pricing};
    for (const key of COUNTERS) record[key] = data.stats?.[key] ?? null;
    if (prices.pricing.pricing_source) record.pricing_checked_at = new Date().toISOString();
    return {status:'public_profile',record};
  }
}
