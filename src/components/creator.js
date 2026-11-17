import { escape, safeUrl, formatNumber, creatorPath } from '../lib/html.js';
const STAT_LABELS = {
  posts: 'Posts', photos: 'Photos', videos: 'Videos', likes: 'Likes',
  subscribers: 'Subscribers', followers: 'Followers', streams: 'Streams',
  audios: 'Audio', media: 'Media'
};

function image(value, alt, className) {
  const url = safeUrl(value);
  return url ? `<button type="button" class="photo-open ${className}-open" data-image-url="${escape(url)}" data-image-title="${escape(alt)}" aria-label="${escape('Open '+alt)}" aria-haspopup="dialog"><img class="${className}" src="${escape(url)}" alt="${escape(alt)}" loading="lazy" referrerpolicy="no-referrer"><span class="photo-hint" aria-hidden="true">View image</span></button>` : '';
}

function stats(row, detailed = false) {
  const keys = detailed ? Object.keys(STAT_LABELS) : ['photos', 'videos', 'likes'];
  return keys.filter(key => row[key] !== null && row[key] !== undefined).map(key =>
    `<span class="stat"><strong title="${escape(row[key])}">${escape(detailed ? Number(row[key]).toLocaleString('en') : formatNumber(row[key]))}</strong> ${STAT_LABELS[key]}</span>`
  ).join('');
}

function creatorPrice(row, className = '') {
  const amount = row.subscription_type === 'free' ? 0 :
    [row.subscription_current_price_cents, row.subscription_price_cents].find(value => Number.isSafeInteger(value) && value >= 0) ?? 0;
  if (amount === 0) return `<span class="creator-price is-free ${className}">FREE</span>`;
  const formatted = (amount / 100).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `<span class="creator-price ${className}"><span class="price-label">Price:</span> $${escape(formatted)}</span>`;
}
function creatorActions(row, website) {
  return `<div class="actions profile-actions"><a class="button" href="https://onlyfans.com/${encodeURIComponent(row.username.replace(/^@/, ''))}" target="_blank" rel="noopener noreferrer nofollow">Visit OnlyFans</a>${website ? `<a class="button secondary" href="${escape(website)}" target="_blank" rel="noopener noreferrer nofollow">Creator website</a>` : ''}</div>`;
}
function card(row) {
  const path = creatorPath(row.username);
  const picture = (value, alt, cls) => {
    const url = safeUrl(value);
    return url ? `<img class="${cls}" src="${escape(url)}" alt="${escape(alt)}" loading="lazy" referrerpolicy="no-referrer">` : '';
  };
  return `<article class="card" data-username="${escape(row.username)}"><a class="card-profile-link" href="${path}" aria-label="${escape('View profile: '+(row.name || row.username))}"><div class="cover">${picture(row.banner_url,'','banner')}</div><div class="card-identity"><div class="avatar-wrap">${escape((row.name || row.username.replace('@','')).slice(0,1).toUpperCase())}${picture(row.avatar_url,'','avatar')}</div><h2>${escape(row.name || row.username)}</h2><div class="username">${escape(row.username)}</div></div></a><div class="card-body"><p class="bio-preview">${escape(row.bio || '')}</p><div class="location card-location">${row.location ? escape(row.location) : '<span aria-hidden="true">&nbsp;</span>'}</div><div class="card-footer"><div class="card-stats">${stats(row)}</div>${creatorPrice(row)}</div></div></article>`;
}

export { image, stats, creatorPrice, creatorActions, card };
