export default () => {
  // Conservative extraction: never treat absent pricing as a free subscription.
  const cents = value => {
    const s = String(value).trim();
    if (!/^\d+(?:[.,]\d{1,2})?$/.test(s)) return null;
    const [whole, decimal=''] = s.replace(',','.').split('.');
    const amount = Number(whole)*100 + Number(decimal.padEnd(2,'0'));
    return Number.isSafeInteger(amount) && amount>=0 ? amount : null;
  };
  const result = {subscription_type:null,subscription_price_cents:null,subscription_current_price_cents:null,subscription_currency:null,pricing_source:null};
  const candidates=[];
  const controls = [...document.querySelectorAll('button, [role="button"], .b-profile__subscribe-btn')].filter(el=>el.getClientRects().length);
  for (const el of controls) {
    const label=(el.innerText || '').replace(/\s+/g,' ').trim();
    if (!/\bsubscribe\b/i.test(label) || /\b(?:[2-9]|\d{2,})\s*months?\b|bundle|renew/i.test(label)) continue;
    candidates.push(label);
    const promotional=/trial|discount|%|first month|limited|offer|promotion/i.test(label);
    if (/subscribe\s+(?:for\s+)?free/i.test(label)) {
      result.subscription_current_price_cents=0;
      if (!promotional) { result.subscription_price_cents=0;result.subscription_type='free'; }
      result.pricing_source=label;
      break;
    }
    const matches=[...label.matchAll(/(US\$|USD|EUR|GBP|\$|€|£)\s*(\d+(?:[.,]\d{1,2})?)/gi)];
    // One clear price in the subscribe control; multiple prices need review.
    if (matches.length!==1) continue;
    const value=cents(matches[0][2]);
    if (value===null) continue;
    const symbol=matches[0][1].toUpperCase();
    // A bare dollar sign does not establish an ISO currency.
    const currency={USD:'USD','US$':'USD',EUR:'EUR','€':'EUR',GBP:'GBP','£':'GBP'}[symbol] || null;
    result.subscription_current_price_cents=value;
    result.subscription_currency=currency;
    if (!promotional && !el.querySelector('del,s')) {
      result.subscription_price_cents=value;
      result.subscription_type=value===0?'free':'paid';
    }
    result.pricing_source=label;
    break;
  }
  return {pricing:result,candidates};
};
