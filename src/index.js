const STAT_LABELS = {
  posts: 'Posts', photos: 'Photos', videos: 'Videos', likes: 'Likes',
  subscribers: 'Subscribers', followers: 'Followers', streams: 'Streams',
  audios: 'Audio', media: 'Media'
};
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({
  '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
}[c]));
function safeUrl(value) {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : null; }
  catch { return null; }
}
const formatNumber = value => new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
const creatorPath = username => '/creator/' + encodeURIComponent(username.replace(/^@/, ''));
function image(value, alt, className) {
  const url = safeUrl(value);
  return url ? `<button type="button" class="photo-open ${className}-open" data-image-url="${escape(url)}" data-image-title="${escape(alt)}" aria-label="${escape('Open '+alt)}" aria-haspopup="dialog"><img class="${className}" src="${escape(url)}" alt="${escape(alt)}" loading="lazy" referrerpolicy="no-referrer"><span class="photo-hint" aria-hidden="true">View image</span></button>` : '';
}
const lightboxScript = String.raw`(() => {
  const dialog = document.getElementById('image-dialog');
  if (!dialog) return;
  const stage = dialog.querySelector('.lightbox-stage');
  const title = dialog.querySelector('#image-dialog-title');
  const status = dialog.querySelector('.lightbox-status');
  const original = dialog.querySelector('.lightbox-original');
  const close = dialog.querySelector('.lightbox-close');
  const previous = dialog.querySelector('.lightbox-prev');
  const next = dialog.querySelector('.lightbox-next');
  const counter = dialog.querySelector('.lightbox-counter');
  let activeImage = null, opener = null, previousOverflow = '', gallery = [], index = 0, touch = null;
  function validUrl(value) {
    try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : null; }
    catch { return null; }
  }
  function render() {
    const item = gallery[index];
    title.textContent = item.title;
    original.href = item.url;
    counter.textContent = gallery.length > 1 ? (index + 1) + ' / ' + gallery.length : '';
    previous.hidden = next.hidden = gallery.length < 2;
    status.textContent = 'Loading image...';
    stage.setAttribute('aria-busy', 'true');
    const img = new Image();
    activeImage = img;
    img.alt = item.title;
    img.referrerPolicy = 'no-referrer';
    img.className = 'lightbox-image';
    img.draggable = false;
    img.addEventListener('load', () => {
      if (activeImage !== img) return;
      status.textContent = '';
      stage.setAttribute('aria-busy', 'false');
      img.classList.add('is-loaded');
    });
    img.addEventListener('error', () => {
      if (activeImage !== img) return;
      status.textContent = 'This image could not be loaded. Try opening the source image.';
      stage.setAttribute('aria-busy', 'false');
      img.hidden = true;
    });
    stage.replaceChildren(img);
    img.src = item.url;
  }
  function move(direction) {
    if (!dialog.open || gallery.length < 2) return;
    index = (index + direction + gallery.length) % gallery.length;
    touch = null;
    render();
  }
  dialog.addEventListener('close', () => {
    activeImage = null; gallery = []; touch = null;
    stage.replaceChildren();
    document.body.style.overflow = previousOverflow;
    if (opener && opener.isConnected) opener.focus({preventScroll:true});
    opener = null;
  });
  close.addEventListener('click', () => dialog.close());
  previous.addEventListener('click', () => move(-1));
  next.addEventListener('click', () => move(1));
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault(); move(event.key === 'ArrowLeft' ? -1 : 1);
    }
  });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const b = dialog.getBoundingClientRect();
    if (event.clientX < b.left || event.clientX > b.right || event.clientY < b.top || event.clientY > b.bottom) dialog.close();
  });
  stage.addEventListener('pointerdown', event => {
    if (event.pointerType === 'touch' && event.isPrimary) touch = {x:event.clientX,y:event.clientY,id:event.pointerId};
  });
  stage.addEventListener('pointerup', event => {
    if (!touch || touch.id !== event.pointerId) return;
    const dx = event.clientX-touch.x, dy = event.clientY-touch.y;
    touch = null;
    if (Math.abs(dx) >= 50 && Math.abs(dx) > Math.abs(dy)*1.4) move(dx < 0 ? 1 : -1);
  });
  stage.addEventListener('pointercancel', () => { touch = null; });
  document.addEventListener('click', event => {
    const button = event.target.closest('button[data-image-url]');
    if (!button || !validUrl(button.dataset.imageUrl)) return;
    const scope = button.closest('.profile-box');
    if (!scope) return;
    const buttons = [...scope.querySelectorAll('button[data-image-url]')];
    gallery = buttons.map(el => ({url:validUrl(el.dataset.imageUrl),title:el.dataset.imageTitle || 'Image preview',element:el})).filter(item => item.url);
    index = gallery.findIndex(item => item.element === button);
    if (index < 0) return;
    opener = button;
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal(); render(); close.focus();
  });
})();
`;
const lightboxMarkup = `<dialog id="image-dialog" class="lightbox" aria-labelledby="image-dialog-title"><div class="lightbox-top"><div><span class="lightbox-eyebrow">NEXT<span>OBSESSION</span></span><h2 id="image-dialog-title">Image preview</h2></div><button type="button" class="lightbox-close" aria-label="Close image preview" autofocus><svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button></div><div class="lightbox-frame"><div class="lightbox-stage" aria-busy="false"></div><button type="button" class="lightbox-nav lightbox-prev" aria-label="Previous image" hidden>&#8249;</button><button type="button" class="lightbox-nav lightbox-next" aria-label="Next image" hidden>&#8250;</button></div><div class="lightbox-bottom"><span class="lightbox-counter" aria-live="polite" aria-atomic="true"></span><span class="lightbox-status" role="status" aria-live="polite"></span><a class="lightbox-original" href="#" target="_blank" rel="noopener noreferrer nofollow">Open source image</a></div></dialog>`;

function stats(row, detailed = false) {
  const keys = detailed ? Object.keys(STAT_LABELS) : ['photos', 'videos', 'likes'];
  return keys.filter(key => row[key] !== null && row[key] !== undefined).map(key =>
    `<span class="stat"><strong title="${escape(row[key])}">${escape(detailed ? Number(row[key]).toLocaleString('en') : formatNumber(row[key]))}</strong> ${STAT_LABELS[key]}</span>`
  ).join('');
}
const css = `
*{box-sizing:border-box}body{margin:0;background:#101014;color:#fafafa;font-family:Arial,sans-serif}a{color:inherit;text-decoration:none}button,input,select{font:inherit}a:focus-visible,button:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid #ff728f;outline-offset:4px}header{border-bottom:1px solid #27272e}.nav{max-width:1200px;margin:auto;padding:26px 24px;display:flex;justify-content:space-between;align-items:center;gap:20px}.brand{font-weight:800;font-size:21px;letter-spacing:-.7px}.brand span{color:#ff728f}.tag{color:#aaaab5;font-size:12px}.wrap{max-width:1200px;padding:0 24px;margin:auto}.hero{padding:64px 0 36px;max-width:780px}.eyebrow{color:#ff728f;text-transform:uppercase;letter-spacing:2px;font-size:11px}h1{font-size:clamp(36px,6vw,64px);letter-spacing:-2px;line-height:1.05;margin:18px 0}p{color:#aaaab5;line-height:1.6}.search{display:flex;gap:12px;margin-top:28px}.search input{min-width:0;flex:1;border:1px solid #393942;border-radius:12px;padding:16px;background:#19191f;color:#fff}.button,button{display:inline-block;border:0;border-radius:12px;background:#ff728f;color:#181015;font-weight:700;padding:15px 22px;cursor:pointer}.secondary{background:#25252e;color:#fafafa}.toolbar{display:flex;align-items:center;justify-content:space-between;gap:20px;margin:14px 0 22px;color:#aaaab5;font-size:13px}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px}.card{min-width:0;background:#19191f;border:1px solid #2b2b34;border-radius:18px;overflow:hidden;transition:border-color .2s,transform .2s}.card:hover{border-color:#ff728f66;transform:translateY(-3px)}.cover{height:145px;background:linear-gradient(120deg,#33202c,#23202f 60%,#19191f);position:relative;overflow:hidden}.cover img{height:100%;width:100%;object-fit:cover}.card-body{padding:0 22px 24px}.avatar-wrap{width:76px;height:76px;position:relative;margin-top:-38px;margin-bottom:16px;border:4px solid #19191f;border-radius:50%;background:#34232d;display:grid;place-items:center;font-weight:800;font-size:24px;overflow:hidden}.avatar-wrap img{width:100%;height:100%;object-fit:cover;position:absolute;inset:0}.card h2{font-size:20px;margin:0 0 6px;overflow-wrap:anywhere}.username{color:#ff728f;font-size:13px;overflow-wrap:anywhere}.bio-preview{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;white-space:pre-line;font-size:14px;min-height:66px}.location{font-size:13px;color:#aaaab5;overflow-wrap:anywhere}.stats{display:flex;flex-wrap:wrap;gap:12px;margin-top:20px;padding-top:16px;border-top:1px solid #30303a}.stat{font-size:11px;color:#aaaab5}.stat strong{color:#fafafa;font-size:14px}.pagination{display:flex;justify-content:center;gap:12px;margin:36px 0}.empty{padding:60px 24px;border:1px dashed #393942;border-radius:18px;text-align:center}.empty h2{font-size:24px}.profile{max-width:900px;margin:36px auto}.back{font-size:13px;color:#aaaab5}.profile-box{margin-top:24px;border:1px solid #30303a;border-radius:22px;overflow:hidden;background:#19191f}.profile-box .cover{height:260px}.profile-content{padding:0 32px 32px}.profile-content .avatar-wrap{width:108px;height:108px;margin-top:-54px;font-size:32px}.profile-content h1{font-size:38px;letter-spacing:-1px}.full-bio{white-space:pre-wrap;overflow-wrap:anywhere}.actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:28px}.profile-content .stats{gap:24px}.profile-content .stat{font-size:13px}.profile-content .stat strong{display:block;font-size:22px;margin-bottom:6px}footer{max-width:1200px;margin:60px auto 0;padding:28px 24px;border-top:1px solid #27272e;font-size:12px;color:#777783;line-height:1.7}.muted{color:#aaaab5}.notice{margin-top:16px;font-size:12px}@media(max-width:900px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:560px){.grid{grid-template-columns:1fr}.hero{padding-top:40px}.nav{padding:22px 20px}.wrap{padding:0 20px}.search{gap:8px}.search button{padding:14px}.profile-box .cover{height:180px}.profile-content{padding:0 20px 24px}.tag{max-width:90px;text-align:right}h1{letter-spacing:-1px}}
.photo-open{display:block;margin:0;padding:0;border:0;border-radius:0;background:transparent;color:inherit;cursor:zoom-in;position:relative;width:100%;height:100%;overflow:hidden}.avatar-wrap .photo-open{position:absolute;inset:0;border-radius:50%}.photo-hint{position:absolute;bottom:12px;right:12px;background:#101014c9;border:1px solid #ffffff30;border-radius:20px;color:#fff;font-size:11px;font-weight:400;padding:6px 10px;opacity:0;transform:translateY(4px);transition:opacity .18s,transform .18s;pointer-events:none}.photo-open:hover .photo-hint,.photo-open:focus-visible .photo-hint{opacity:1;transform:none}.avatar-open .photo-hint{display:none}.photo-open:focus-visible{outline-offset:-4px}.card h2 a:hover{color:#ff728f}.lightbox{width:min(1100px,calc(100vw - 40px));max-width:none;max-height:calc(100dvh - 40px);padding:0;background:#17171e;color:#fafafa;border:1px solid #ffffff24;border-radius:22px;box-shadow:0 32px 120px #000a;overflow:auto}.lightbox[open]{animation:lightbox-in .18s ease-out}.lightbox::backdrop{background:#050508dd;backdrop-filter:blur(12px)}.lightbox-top{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:20px 24px;border-bottom:1px solid #ffffff12}.lightbox-eyebrow{font-size:10px;letter-spacing:2px;color:#aaaab5}.lightbox-eyebrow span{color:#ff728f}.lightbox h2{font-size:15px;font-weight:500;margin:8px 0 0;overflow-wrap:anywhere}.lightbox-close{padding:0;width:40px;height:40px;display:grid;place-items:center;border-radius:50%;background:#ffffff0d;color:#eee;flex-shrink:0;cursor:pointer}.lightbox-close:hover{background:#ff728f25;color:#ff728f}.lightbox-stage{display:grid;place-items:center;min-height:180px;padding:16px;background:#0d0d12}.lightbox-image{display:block;max-width:100%;max-height:calc(100dvh - 235px);width:auto;height:auto;object-fit:contain;border-radius:8px;opacity:0;transition:opacity .2s}.lightbox-image.is-loaded{opacity:1}.lightbox-image[hidden]{display:none}.lightbox-bottom{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px 24px;font-size:12px;line-height:1.5}.lightbox-status{color:#aaaab5}.lightbox-original{color:#ff728f;flex-shrink:0}.lightbox-original:hover{text-decoration:underline}@keyframes lightbox-in{from{opacity:0;transform:translateY(12px) scale(.98)}to{opacity:1;transform:none}}@media(max-width:560px){.lightbox{width:calc(100vw - 20px);max-height:calc(100dvh - 20px);border-radius:16px}.lightbox-top{padding:16px}.lightbox-bottom{padding:14px 16px;flex-wrap:wrap}.lightbox-stage{padding:8px}.lightbox-image{max-height:calc(100dvh - 225px)}}@media(prefers-reduced-motion:reduce){.lightbox[open]{animation:none}.lightbox-image,.photo-hint{transition:none}}

.card-profile-link{display:block}.card-identity{padding:0 22px 20px}.card-identity h2{transition:color .15s}.card-profile-link:hover h2{color:#ff728f}.card-profile-link:focus-visible{outline-offset:-4px}.card-body .bio-preview{margin-top:0}.lightbox-frame{position:relative}.lightbox-stage{touch-action:pan-y pinch-zoom}.lightbox-nav{position:absolute;top:50%;transform:translateY(-50%);width:44px;height:52px;display:grid;place-items:center;padding:0;background:#16161cdb;color:#fafafa;border:1px solid #ffffff2b;border-radius:12px;font-size:36px;line-height:1;box-shadow:0 4px 18px #0006;cursor:pointer}.lightbox-nav:hover{background:#ff728f;color:#181015}.lightbox-prev{left:24px}.lightbox-next{right:24px}.lightbox-nav[hidden]{display:none}.lightbox-counter{color:#fafafa;font-variant-numeric:tabular-nums;flex-shrink:0}.lightbox-status{flex:1}@media(max-width:560px){.lightbox-nav{width:36px;height:44px;font-size:30px}.lightbox-prev{left:12px}.lightbox-next{right:12px}.lightbox-bottom{gap:10px}}

`;
const directoryCss = `
.toolbar{flex-wrap:wrap}.sort-control{display:flex;align-items:center;gap:10px;color:#aaaab5}.sort-control select{max-width:100%;background:#19191f;color:#fafafa;border:1px solid #393942;border-radius:10px;padding:12px 36px 12px 12px;cursor:pointer;color-scheme:dark}.search-controls{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;margin:20px 0}.search-controls .notice{margin:0}.load-area{text-align:center;margin:32px 0;min-height:90px}.load-status{font-size:13px;min-height:20px}.load-more[aria-disabled="true"]{opacity:.6;pointer-events:none}.load-more[hidden]{display:none}#load-sentinel{height:1px}@media(max-width:560px){.sort-control{width:100%;justify-content:space-between}.sort-control select{flex:1;min-width:0}.toolbar{gap:10px}}
`;
const creatorUiCss = `
.card{display:flex;flex-direction:column;transition:border-color .2s,transform .2s,box-shadow .25s}
.card:hover{border-color:#ff728f88;box-shadow:0 0 0 1px #ff728f16,0 10px 26px #ff728f26,0 24px 52px #000b;transform:translateY(-3px)}
.card-identity h2{height:24px;line-height:24px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.card-identity .username{height:18px;line-height:18px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.card-body{display:flex;flex-direction:column;flex:1;min-width:0}
.card .bio-preview{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;line-clamp:3;line-height:1.6;height:4.8em;min-height:4.8em;max-height:4.8em;flex-shrink:0;overflow:hidden;overflow-wrap:anywhere;margin:0 0 12px;white-space:pre-line}
.card-location{height:21px;line-height:21px;margin:0 0 18px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.card-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;border-top:1px solid #30303a;padding-top:16px;margin-top:auto;height:72px;min-height:72px}
.card-stats{display:flex;align-items:center;flex-wrap:wrap;gap:6px 10px;min-width:0;flex:1;line-height:18px}
.card-stats .stat{white-space:nowrap}
.creator-price{flex-shrink:0;color:#fafafa;font-size:13px;font-weight:700;line-height:1.4;white-space:nowrap;font-variant-numeric:tabular-nums}
.price-label{font-weight:400;color:#aaaab5}
.creator-price.is-free{color:#4ade80;font-weight:800;letter-spacing:.5px}
.profile-top{display:flex;align-items:flex-start;justify-content:space-between;gap:24px}
.profile-top .avatar-wrap{flex-shrink:0;margin-bottom:0}
.profile-actions{margin:18px 0 0;display:flex;flex-wrap:nowrap;justify-content:flex-end;gap:10px;min-width:0}
.profile-actions .button{white-space:nowrap;text-align:center}
.profile-title-row{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;margin-top:20px}
.profile-identity{min-width:0;flex:1}
.profile-identity h1{margin:0 0 12px;overflow-wrap:anywhere}
.profile-price{font-size:22px;margin-top:6px;text-align:right}
.profile-content .full-bio{margin-top:22px}
@media(max-width:700px){.profile-top{gap:12px}.profile-actions{gap:8px}.profile-actions .button{font-size:12px;padding:13px 12px}.profile-price{font-size:19px}}
@media(max-width:560px){.profile-top{flex-wrap:wrap;gap:0}.profile-top .avatar-wrap{margin-bottom:16px}.profile-actions{width:100%;margin:0;justify-content:stretch;gap:8px}.profile-actions .button{flex:1;min-width:0;white-space:normal;display:flex;align-items:center;justify-content:center;font-size:12px;padding:13px 8px;line-height:1.3}.profile-title-row{gap:12px;margin-top:22px;align-items:flex-start}.profile-identity h1{font-size:32px}.profile-price{font-size:17px;margin-top:5px}.card-footer{gap:10px}.creator-price{font-size:12px}.profile-price{font-size:17px}}
@media(prefers-reduced-motion:reduce){.card{transition:none}.card:hover{transform:none}}
`;
function shell(title, content, directory = false) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${escape(title)} | NextObsession</title><style>${css}${creatorUiCss}${directory ? directoryCss : ''}</style></head><body><header><nav class="nav"><a class="brand" href="/">Next<span>Obsession</span></a><span class="tag">Independent creator discovery</span></nav></header><main class="wrap">${content}</main><footer>NextObsession. Independent creator discovery. Not affiliated with OnlyFans.<br>For adults 18+. Profile information may change. Counters can include rounded source values.</footer>${lightboxMarkup}<script src="/assets/lightbox.js?v=2" defer></script>${directory ? '<script src="/assets/directory.js?v=1" defer></script>' : ''}</body></html>`;
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
function htmlResponse(content, status = 200) {
  return new Response(content, { status, headers: {
    'Content-Type':'text/html; charset=utf-8',
    'Cache-Control':'no-store',
    'X-Content-Type-Options':'nosniff',
    'Referrer-Policy':'no-referrer',
    'Content-Security-Policy':"default-src 'none'; connect-src 'self'; script-src 'self'; img-src https: http:; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"
  }});
}
const PAGE_SIZE = 24;
const SORTS = {
  random: { label: 'Random', direction: 'ASC' },
  updated_asc: { label: 'Oldest first', column: 'updated_at', direction: 'ASC' },
  updated_desc: { label: 'Newest first', column: 'updated_at', direction: 'DESC' },
  price_asc: { label: 'Price &#8593;', direction: 'ASC' },
  price_desc: { label: 'Price &#8595;', direction: 'DESC' },
  likes_desc: { label: 'Most liked', column: 'likes', direction: 'DESC' },
  likes_asc: { label: 'Less liked', column: 'likes', direction: 'ASC' },
  photos_desc: { label: 'More photos', column: 'photos', direction: 'DESC' },
  photos_asc: { label: 'Less photos', column: 'photos', direction: 'ASC' },
  videos_desc: { label: 'More videos', column: 'videos', direction: 'DESC' },
  videos_asc: { label: 'Less videos', column: 'videos', direction: 'ASC' }
};
class DirectoryInputError extends Error {}
function encodeCursor(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function decodeCursor(raw) {
  if (!raw || raw.length > 3000 || !/^[A-Za-z0-9_-]+$/.test(raw)) throw new DirectoryInputError('Invalid continuation. Refresh the page.');
  try {
    const value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(atob(raw.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))));
    if (!value || value.v !== 1 || typeof value.q !== 'string' || value.q.length > 80 ||
        !Object.hasOwn(SORTS, value.s) || !Number.isInteger(value.seed) || value.seed < 1 || value.seed >= 2147483647 ||
        typeof value.u !== 'string' || !/^@[a-zA-Z0-9_.-]{1,64}$/.test(value.u)) throw new Error();
    if (value.k !== null) {
      if (value.s === 'updated_asc' || value.s === 'updated_desc') {
        if (typeof value.k !== 'string' || value.k.length > 100) throw new Error();
      } else if (!Number.isSafeInteger(value.k) || value.k < 0) throw new Error();
    }
    return value;
  } catch { throw new DirectoryInputError('Invalid continuation. Refresh the page.'); }
}
function directoryState(url) {
  const q = (url.searchParams.get('q') || '').trim().slice(0, 80);
  const sort = url.searchParams.get('sort') || 'random';
  if (!Object.hasOwn(SORTS, sort)) throw new DirectoryInputError('Unknown sorting option.');
  const cursor = url.searchParams.has('cursor') ? decodeCursor(url.searchParams.get('cursor')) : null;
  if (cursor && (cursor.q !== q || cursor.s !== sort)) throw new DirectoryInputError('Search or sorting changed. Refresh the page.');
  const seed = cursor ? cursor.seed : crypto.getRandomValues(new Uint32Array(1))[0] % 2147483646 + 1;
  return { q, sort, cursor, seed };
}
async function directoryPage(db, state) {
  const { q, sort, seed, cursor } = state;
  const fields = await db.prepare('PRAGMA table_info(creator)').all();
  const columns = new Set(fields.results.map(field => field.name));
  const column = name => columns.has(name) ? '"' + name + '"' : 'NULL';
  let expression, parameters = [];
  if (sort === 'random') {
    // Stable seeded pseudo-random ranking. Uses SQLite's persistent rowid, not
    // RANDOM() on each request, so continuation retains exactly the same order.
    // Both intermediate products fit signed int64. No schema migration needed.
    expression = '(((creator.rowid % 2147483647) * (creator.rowid % 2147483647)) % 2147483647 * ?) % 2147483647';
    parameters.push(seed);
  } else if (sort === 'price_asc' || sort === 'price_desc') {
    expression = `CASE WHEN ${column('subscription_type')} = 'free' THEN 0 ELSE COALESCE(${column('subscription_current_price_cents')}, ${column('subscription_price_cents')}, 0) END`;
  } else {
    expression = column(SORTS[sort].column);
  }
  const where = [];
  if (q) {
    const prefix = q.replace(/^@/, '').replace(/[\\%_]/g, c => '\\' + c);
    where.push("(username LIKE ? ESCAPE '\\' COLLATE NOCASE OR name LIKE ? ESCAPE '\\' COLLATE NOCASE)");
    parameters.push('@' + prefix + '%', prefix + '%');
  }
  let continuation = '';
  if (cursor) {
    if (cursor.k === null) {
      continuation = ' WHERE _sort_key IS NULL AND username > ?';
      parameters.push(cursor.u);
    } else {
      const comparison = SORTS[sort].direction === 'DESC' ? '<' : '>';
      continuation = ` WHERE (_sort_key IS NULL OR _sort_key ${comparison} ? OR (_sort_key = ? AND username > ?))`;
      parameters.push(cursor.k, cursor.k, cursor.u);
    }
  }
  const sql = 'WITH ranked AS (SELECT creator.*, (' + expression + ') AS _sort_key FROM creator' +
    (where.length ? ' WHERE ' + where.join(' AND ') : '') + ') SELECT * FROM ranked' + continuation +
    ' ORDER BY (_sort_key IS NULL) ASC, _sort_key ' + SORTS[sort].direction + ', username ASC LIMIT ' + (PAGE_SIZE + 1);
  const result = await db.prepare(sql).bind(...parameters).all();
  const rows = result.results.slice(0, PAGE_SIZE);
  const last = rows.at(-1);
  const next = result.results.length > PAGE_SIZE ? encodeCursor({ v: 1, q, s: sort, seed, k: last._sort_key, u: last.username }) : null;
  return { rows, next };
}
function continuationUrl(path, state, cursor) {
  return path + '?' + new URLSearchParams({ q: state.q, sort: state.sort, cursor });
}
const directoryScript = String.raw`(() => {
  const grid = document.getElementById('creator-grid');
  const more = document.getElementById('load-more');
  const sentinel = document.getElementById('load-sentinel');
  const status = document.getElementById('load-status');
  const count = document.getElementById('loaded-count');
  const sort = document.getElementById('creator-sort');
  if (sort) sort.addEventListener('change', () => sort.form.requestSubmit());
  if (!grid || !more || !sentinel) return;
  const seen = new Set([...grid.querySelectorAll('[data-username]')].map(el => el.dataset.username));
  let busy = false, failed = false, observer = null;
  const updateCount = () => { if (count) count.textContent = seen.size + ' creators loaded'; };
  function finish() {
    more.hidden = true;
    if (observer) observer.disconnect();
    status.textContent = 'You have reached the end.';
  }
  async function load() {
    if (busy || more.hidden) return;
    busy = true;
    failed = false;
    grid.setAttribute('aria-busy', 'true');
    more.setAttribute('aria-disabled', 'true');
    status.textContent = 'Loading creators...';
    const previousCursor = more.dataset.cursor;
    try {
      const target = new URL(more.href);
      target.pathname = '/api/creators';
      const response = await fetch(target, { headers: { Accept: 'application/json' }, cache: 'no-store' });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const data = await response.json();
      if (typeof data.html !== 'string' || !(data.next === null || typeof data.next === 'string')) throw new Error('Invalid response');
      if (data.next && data.next === previousCursor) throw new Error('Continuation did not advance');
      const template = document.createElement('template');
      template.innerHTML = data.html;
      for (const element of [...template.content.children]) {
        if (!element.matches('article.card[data-username]') || seen.has(element.dataset.username)) continue;
        seen.add(element.dataset.username);
        grid.appendChild(element);
      }
      updateCount();
      if (!data.next) finish();
      else {
        target.pathname = '/';
        target.searchParams.set('cursor', data.next);
        more.href = target.pathname + target.search;
        more.dataset.cursor = data.next;
        more.textContent = 'Load more creators';
        status.textContent = '';
      }
    } catch (error) {
      failed = true;
      status.textContent = 'Could not load more creators. Please try again.';
      more.textContent = 'Try again';
    } finally {
      busy = false;
      grid.setAttribute('aria-busy', 'false');
      more.removeAttribute('aria-disabled');
      // Continue filling a tall viewport, but never automatically retry errors.
      if (!failed && !more.hidden && sentinel.getBoundingClientRect().top < window.innerHeight + 600) {
        window.setTimeout(load, 120);
      }
    }
  }
  more.addEventListener('click', event => { event.preventDefault(); load(); });
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting) && !failed) load();
    }, { rootMargin: '600px' });
    observer.observe(sentinel);
  }
  updateCount();
})();`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    if (!['GET','HEAD'].includes(request.method)) return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD'}});
    if (path === '/assets/lightbox.js') return new Response(lightboxScript,{headers:{'Content-Type':'text/javascript; charset=utf-8','Cache-Control':'public, max-age=300','X-Content-Type-Options':'nosniff'}});
    if (path === '/assets/directory.js') return new Response(directoryScript,{headers:{'Content-Type':'text/javascript; charset=utf-8','Cache-Control':'public, max-age=300','X-Content-Type-Options':'nosniff'}});
    if (path === '/health') return Response.json({ok:true});
    try {
      if (path === '/api/health') {
        await env.DB.prepare('SELECT username FROM creator LIMIT 1').all();
        return Response.json({ok:true,database:'connected',table:'creator'},{headers:{'Cache-Control':'no-store'}});
      }
      if (path === '/' || path === '/api/creators') {
        const state = directoryState(url);
        const { rows, next } = await directoryPage(env.DB, state);
        if (path === '/api/creators') {
          return Response.json({ html: rows.map(card).join(''), next }, { headers: { 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff' } });
        }
        const sortOptions = Object.entries(SORTS).map(([value, option]) => `<option value="${value}"${state.sort === value ? ' selected' : ''}>${option.label}</option>`).join('');
        const loadArea = next ? `<div class="load-area"><div id="load-sentinel" aria-hidden="true"></div><p id="load-status" class="load-status" role="status" aria-live="polite"></p><a id="load-more" class="button secondary load-more" data-cursor="${escape(next)}" href="${escape(continuationUrl('/', state, next))}">Load more creators</a></div>` : (rows.length ? '<p class="load-area muted">You have reached the end.</p>' : '');
        return htmlResponse(shell('Discover creators',`<section class="hero"><div class="eyebrow">Find someone worth following</div><h1>Find your next obsession.</h1><p>Explore creators, discover new favorites, and follow what catches your eye.</p><form id="discovery-form" action="/" method="get"><div class="search"><input type="search" name="q" value="${escape(state.q)}" placeholder="Search username or name" aria-label="Search username or name" maxlength="80"><button type="submit">Search</button></div><div class="search-controls"><p class="notice">Search by the beginning of a username or name.</p><label class="sort-control" for="creator-sort">Sort by<select id="creator-sort" name="sort">${sortOptions}</select></label></div></form></section><div class="toolbar"><span>${state.q ? 'Results for '+escape(state.q) : 'Explore creators'}</span><span id="loaded-count">${rows.length} creators loaded</span>${state.q || state.sort !== 'random' ? '<a href="/">Reset</a>' : ''}</div>${rows.length ? '<div id="creator-grid" class="grid" aria-busy="false">'+rows.map(card).join('')+'</div>' : '<section class="empty"><h2>No creators found</h2><p>Try a different username or name.</p></section>'}${loadArea}`, true));
      }
      const match = path.match(/^\/creator\/([a-zA-Z0-9_.-]{1,64})$/);
      if (match) {
        const row = await env.DB.prepare('SELECT * FROM creator WHERE username = ?').bind('@'+match[1].toLowerCase()).first();
        if (!row) return htmlResponse(shell('Not found','<section class="hero"><h1>Creator not found.</h1><a href="/">Back to discovery</a></section>'),404);
        const website = safeUrl(row.website);
        return htmlResponse(shell(row.name || row.username,`<section class="profile"><a class="back" href="/">Back to discovery</a><article class="profile-box"><div class="cover">${image(row.banner_url,(row.name || row.username)+' - banner','banner')}</div><div class="profile-content"><div class="profile-top"><div class="avatar-wrap">${escape((row.name || row.username.replace('@','')).slice(0,1).toUpperCase())}${image(row.avatar_url,(row.name || row.username)+' - profile photo','avatar')}</div>${creatorActions(row, website)}</div><div class="profile-title-row"><div class="profile-identity"><h1>${escape(row.name || row.username)}</h1><div class="username">${escape(row.username)}</div></div>${creatorPrice(row, 'profile-price')}</div>${row.location?`<p class="location">${escape(row.location)}</p>`:''}${row.bio?`<p class="full-bio">${escape(row.bio)}</p>`:''}<div class="stats">${stats(row,true)}</div></div></article></section>`));
      }
      return htmlResponse(shell('Not found','<section class="hero"><h1>Page not found.</h1><a href="/">Back to discovery</a></section>'),404);
    } catch(error) {
      if (error instanceof DirectoryInputError) {
        if (path === '/api/creators') return Response.json({error:error.message},{status:400,headers:{'Cache-Control':'no-store'}});
        return htmlResponse(shell('Invalid request', '<section class="hero"><h1>Please refresh your search.</h1><p>'+escape(error.message)+'</p><a href="/">Back to discovery</a></section>'),400);
      }
      console.error('Request failed',error);
      if (path === '/api/creators') return Response.json({error:'Could not load creators.'},{status:503,headers:{'Cache-Control':'no-store'}});
      if (path === '/api/health') return Response.json({ok:false,database:'unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});
      return htmlResponse(shell('Temporarily unavailable','<section class="hero"><h1>Please try again shortly.</h1><p>We could not load the directory.</p></section>'),503);
    }
  }
};
