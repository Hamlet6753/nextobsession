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
  return url ? `<img class="${className}" src="${escape(url)}" alt="${escape(alt)}" loading="lazy" referrerpolicy="no-referrer">` : '';
}
function stats(row, detailed = false) {
  const keys = detailed ? Object.keys(STAT_LABELS) : ['photos', 'videos', 'likes'];
  return keys.filter(key => row[key] !== null && row[key] !== undefined).map(key =>
    `<span class="stat"><strong title="${escape(row[key])}">${escape(detailed ? Number(row[key]).toLocaleString('en') : formatNumber(row[key]))}</strong> ${STAT_LABELS[key]}</span>`
  ).join('');
}
const css = `
*{box-sizing:border-box}body{margin:0;background:#101014;color:#fafafa;font-family:Arial,sans-serif}a{color:inherit;text-decoration:none}button,input{font:inherit}a:focus-visible,button:focus-visible,input:focus-visible{outline:2px solid #ff728f;outline-offset:4px}header{border-bottom:1px solid #27272e}.nav{max-width:1200px;margin:auto;padding:26px 24px;display:flex;justify-content:space-between;align-items:center;gap:20px}.brand{font-weight:800;font-size:21px;letter-spacing:-.7px}.brand span{color:#ff728f}.tag{color:#aaaab5;font-size:12px}.wrap{max-width:1200px;padding:0 24px;margin:auto}.hero{padding:64px 0 36px;max-width:780px}.eyebrow{color:#ff728f;text-transform:uppercase;letter-spacing:2px;font-size:11px}h1{font-size:clamp(36px,6vw,64px);letter-spacing:-2px;line-height:1.05;margin:18px 0}p{color:#aaaab5;line-height:1.6}.search{display:flex;gap:12px;margin-top:28px}.search input{min-width:0;flex:1;border:1px solid #393942;border-radius:12px;padding:16px;background:#19191f;color:#fff}.button,button{display:inline-block;border:0;border-radius:12px;background:#ff728f;color:#181015;font-weight:700;padding:15px 22px;cursor:pointer}.secondary{background:#25252e;color:#fafafa}.toolbar{display:flex;align-items:center;justify-content:space-between;gap:20px;margin:14px 0 22px;color:#aaaab5;font-size:13px}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px}.card{min-width:0;background:#19191f;border:1px solid #2b2b34;border-radius:18px;overflow:hidden;transition:border-color .2s,transform .2s}.card:hover{border-color:#ff728f66;transform:translateY(-3px)}.cover{height:145px;background:linear-gradient(120deg,#33202c,#23202f 60%,#19191f);position:relative;overflow:hidden}.cover img{height:100%;width:100%;object-fit:cover}.card-body{padding:0 22px 24px}.avatar-wrap{width:76px;height:76px;position:relative;margin-top:-38px;margin-bottom:16px;border:4px solid #19191f;border-radius:50%;background:#34232d;display:grid;place-items:center;font-weight:800;font-size:24px;overflow:hidden}.avatar-wrap img{width:100%;height:100%;object-fit:cover;position:absolute;inset:0}.card h2{font-size:20px;margin:0 0 6px;overflow-wrap:anywhere}.username{color:#ff728f;font-size:13px;overflow-wrap:anywhere}.bio-preview{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;white-space:pre-line;font-size:14px;min-height:66px}.location{font-size:13px;color:#aaaab5;overflow-wrap:anywhere}.stats{display:flex;flex-wrap:wrap;gap:12px;margin-top:20px;padding-top:16px;border-top:1px solid #30303a}.stat{font-size:11px;color:#aaaab5}.stat strong{color:#fafafa;font-size:14px}.pagination{display:flex;justify-content:center;gap:12px;margin:36px 0}.empty{padding:60px 24px;border:1px dashed #393942;border-radius:18px;text-align:center}.empty h2{font-size:24px}.profile{max-width:900px;margin:36px auto}.back{font-size:13px;color:#aaaab5}.profile-box{margin-top:24px;border:1px solid #30303a;border-radius:22px;overflow:hidden;background:#19191f}.profile-box .cover{height:260px}.profile-content{padding:0 32px 32px}.profile-content .avatar-wrap{width:108px;height:108px;margin-top:-54px;font-size:32px}.profile-content h1{font-size:38px;letter-spacing:-1px}.full-bio{white-space:pre-wrap;overflow-wrap:anywhere}.actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:28px}.profile-content .stats{gap:24px}.profile-content .stat{font-size:13px}.profile-content .stat strong{display:block;font-size:22px;margin-bottom:6px}footer{max-width:1200px;margin:60px auto 0;padding:28px 24px;border-top:1px solid #27272e;font-size:12px;color:#777783;line-height:1.7}.muted{color:#aaaab5}.notice{margin-top:16px;font-size:12px}@media(max-width:900px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:560px){.grid{grid-template-columns:1fr}.hero{padding-top:40px}.nav{padding:22px 20px}.wrap{padding:0 20px}.search{gap:8px}.search button{padding:14px}.profile-box .cover{height:180px}.profile-content{padding:0 20px 24px}.tag{max-width:90px;text-align:right}h1{letter-spacing:-1px}}
`;
function shell(title, content) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${escape(title)} | NextObsession</title><style>${css}</style></head><body><header><nav class="nav"><a class="brand" href="/">Next<span>Obsession</span></a><span class="tag">Independent creator discovery</span></nav></header><main class="wrap">${content}</main><footer>NextObsession. Independent creator discovery. Not affiliated with OnlyFans.<br>For adults 18+. Profile information may change. Counters can include rounded source values.</footer></body></html>`;
}
function card(row) {
  const path = creatorPath(row.username);
  return `<article class="card"><a href="${path}" aria-label="${escape('View '+(row.name || row.username))}"><div class="cover">${image(row.banner_url,'','banner')}</div><div class="card-body"><div class="avatar-wrap">${escape((row.name || row.username.replace('@','')).slice(0,1).toUpperCase())}${image(row.avatar_url,'','avatar')}</div><h2>${escape(row.name || row.username)}</h2><div class="username">${escape(row.username)}</div>${row.bio ? `<p class="bio-preview">${escape(row.bio)}</p>` : ''}${row.location ? `<div class="location">${escape(row.location)}</div>` : ''}<div class="stats">${stats(row)}</div></div></a></article>`;
}
function htmlResponse(content, status = 200) {
  return new Response(content, { status, headers: {
    'Content-Type':'text/html; charset=utf-8',
    'Cache-Control':'no-store',
    'X-Content-Type-Options':'nosniff',
    'Referrer-Policy':'no-referrer',
    'Content-Security-Policy':"default-src 'none'; img-src https: http:; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"
  }});
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    if (!['GET','HEAD'].includes(request.method)) return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD'}});
    if (path === '/health') return Response.json({ok:true});
    try {
      if (path === '/api/health') {
        await env.DB.prepare('SELECT username FROM creator LIMIT 1').all();
        return Response.json({ok:true,database:'connected',table:'creator'},{headers:{'Cache-Control':'no-store'}});
      }
      if (path === '/') {
        const q = (url.searchParams.get('q') || '').trim().slice(0,80);
        const after = url.searchParams.get('after') || '';
        const prefix = q.replace(/^@/,'').replace(/[\\%_]/g,c=>'\\'+c);
        let where = [], bindings = [];
        if (q) {
          where.push("(username LIKE ? ESCAPE '\\' COLLATE NOCASE OR name LIKE ? ESCAPE '\\' COLLATE NOCASE)");
          bindings.push('@'+prefix+'%',prefix+'%');
        }
        if (after) { where.push('username > ?'); bindings.push(after); }
        const query = 'SELECT * FROM creator'+(where.length?' WHERE '+where.join(' AND '):'')+' ORDER BY username LIMIT 25';
        const result = await env.DB.prepare(query).bind(...bindings).all();
        const rows = result.results.slice(0,24);
        const next = result.results.length > 24 ? '/?'+new URLSearchParams({q,after:rows.at(-1).username}) : null;
        return htmlResponse(shell('Discover creators',`<section class="hero"><div class="eyebrow">Find someone worth following</div><h1>Find your next obsession.</h1><p>Explore creators, discover new favorites, and follow what catches your eye.</p><form class="search" action="/" method="get"><input type="search" name="q" value="${escape(q)}" placeholder="Search username or name" aria-label="Search username or name" maxlength="80"><button type="submit">Search</button></form><p class="notice">Search by the beginning of a username or name.</p></section><div class="toolbar"><span>${q ? 'Results for '+escape(q) : 'Explore creators'} · ${rows.length} on this page</span>${q || after ? '<a href="/">Reset</a>' : ''}</div>${rows.length ? '<div class="grid">'+rows.map(card).join('')+'</div>' : '<section class="empty"><h2>No creators found</h2><p>Try a different username or name.</p></section>'}<div class="pagination">${after?`<a class="button secondary" href="/?${escape(new URLSearchParams({q}).toString())}">First page</a>`:''}${next?`<a class="button" href="${escape(next)}">Next page</a>`:''}</div>`));
      }
      const match = path.match(/^\/creator\/([a-zA-Z0-9_.-]{1,64})$/);
      if (match) {
        const row = await env.DB.prepare('SELECT * FROM creator WHERE username = ?').bind('@'+match[1].toLowerCase()).first();
        if (!row) return htmlResponse(shell('Not found','<section class="hero"><h1>Creator not found.</h1><a href="/">Back to discovery</a></section>'),404);
        const website = safeUrl(row.website);
        return htmlResponse(shell(row.name || row.username,`<section class="profile"><a class="back" href="/">Back to discovery</a><article class="profile-box"><div class="cover">${image(row.banner_url,'','banner')}</div><div class="profile-content"><div class="avatar-wrap">${escape((row.name || row.username.replace('@','')).slice(0,1).toUpperCase())}${image(row.avatar_url,'','avatar')}</div><h1>${escape(row.name || row.username)}</h1><div class="username">${escape(row.username)}</div>${row.location?`<p class="location">${escape(row.location)}</p>`:''}${row.bio?`<p class="full-bio">${escape(row.bio)}</p>`:''}<div class="stats">${stats(row,true)}</div><div class="actions"><a class="button" href="https://onlyfans.com/${encodeURIComponent(row.username.slice(1))}" target="_blank" rel="noopener noreferrer nofollow">Visit OnlyFans</a>${website?`<a class="button secondary" href="${escape(website)}" target="_blank" rel="noopener noreferrer nofollow">Creator website</a>`:''}</div></div></article></section>`));
      }
      return htmlResponse(shell('Not found','<section class="hero"><h1>Page not found.</h1><a href="/">Back to discovery</a></section>'),404);
    } catch(error) {
      console.error('Request failed',error);
      if (path === '/api/health') return Response.json({ok:false,database:'unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});
      return htmlResponse(shell('Temporarily unavailable','<section class="hero"><h1>Please try again shortly.</h1><p>We could not load the directory.</p></section>'),503);
    }
  }
};
