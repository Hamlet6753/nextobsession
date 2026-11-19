export default (username) => {
  const clean = s => (s || '').replace(/\s+/g, ' ').trim();
  const visible = el => el && el.getClientRects().length > 0;
  const find = selectors => {
    for (const selector of selectors) {
      const el = [...document.querySelectorAll(selector)].find(visible);
      if (el) return el;
    }
    return null;
  };
  const text = selectors => { const el = find(selectors); return el ? el.innerText.trim() : null; };
  const imageCandidates = selectors => {
    const out = [];
    const push = (url, score, source) => {
      if (!url || /^(data:|blob:)/i.test(url)) return;
      try {
        url = new URL(url, location.href).href;
        if (!/^https?:/.test(url) || /of-logo|placeholder|default[-_]?avatar|\/static\//i.test(url)) return;
        out.push({url, score, source});
      } catch {}
    };
    for (const selector of selectors) for (const el of document.querySelectorAll(selector)) {
      for (const img of (el.matches('img') ? [el] : el.querySelectorAll('img'))) {
        for (const attr of ['srcset','data-srcset']) {
          for (const part of (img.getAttribute(attr) || '').split(',')) {
            const m = part.trim().match(/^(\S+)\s+(\d+(?:\.\d+)?)(w|x)$/);
            if (m) push(m[1],Number(m[2])*(m[3]==='x'?(img.naturalWidth || img.width || 1):1),attr);
          }
        }
        push(img.currentSrc,img.naturalWidth || 0,'currentSrc');
        for (const attr of ['data-original','data-full','data-src','src']) push(img.getAttribute(attr),img.naturalWidth || 0,attr);
      }
      for (const child of [el,...el.querySelectorAll('[style]')]) {
        for (const m of getComputedStyle(child).backgroundImage.matchAll(/url\(["']?(.*?)["']?\)/g)) push(m[1],0,'background-image');
      }
    }
    return [...new Map(out.sort((a,b)=>b.score-a.score).map(o=>[o.url,o])).values()];
  };
  const structuredProfile = (documents, wanted) => {
    const people = [];
    const walk = value => {
      if (!value || typeof value !== 'object') return;
      if (Array.isArray(value)) { value.forEach(walk); return; }
      const types = [].concat(value['@type'] || []);
      if (types.includes('Person') && String(value.alternateName || '').replace(/^@/,'').toLowerCase() === wanted.toLowerCase()) people.push(value);
      Object.values(value).forEach(walk);
    };
    documents.forEach(walk);
    const person = people[0];
    if (!person) return null;
    const image = typeof person.image === 'string' ? person.image : person.image?.url || person.image?.contentUrl || null;
    const counters = [];
    for (const entry of [].concat(person.interactionStatistic || [],person.agentInteractionStatistic || [])) {
      const type = typeof entry.interactionType === 'string' ? entry.interactionType : entry.interactionType?.['@id'] || entry.interactionType?.['@type'] || '';
      const action = type.split(/[\/#]/).pop();
      const key = {LikeAction:'likes',WriteAction:'posts',FollowAction:'followers',SubscribeAction:'subscribers'}[action];
      const count = typeof entry.userInteractionCount === 'number' ? entry.userInteractionCount : /^\d+$/.test(String(entry.userInteractionCount)) ? Number(entry.userInteractionCount) : NaN;
      if (key && Number.isSafeInteger(count) && count >= 0) counters.push({key,count,label:action,display:String(count),source:'JSON-LD',approximate:false});
    }
    return {name:person.name || null,bio:person.description || null,image,counters};
  };
  const documents = [];
  for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
    try { documents.push(JSON.parse(script.textContent)); } catch {}
  }
  const structured = structuredProfile(documents, username);
  const profile = find(['.b-profile__header', '.b-profile', '[data-testid="profile-header"]']);
  const body = document.body?.innerText || '';
  const title = document.title;
  const name = structured?.name || text(['.b-profile__name', '.g-user-name', '[data-testid="profile-name"]', 'h1']) ||
    (/ OnlyFans$/.test(title) ? title.replace(/\s+OnlyFans$/, '').trim() : null);
  const bio = structured?.bio || text(['.b-user-info__text', '.b-profile__bio', '[data-testid="profile-bio"]', '[itemprop="description"]']);
  let locationText = text(['.b-user-info__location', '.b-profile__location', '[data-testid="profile-location"]', '[itemprop="homeLocation"]', '.b-user-info__detail.m-location', '.b-user-info__detail--location']);
  // More info detail rows can use icon labels instead of dedicated classes.
  for (const el of document.querySelectorAll('.b-user-info__detail, .b-user-info__item, [data-testid="profile-location"]')) {
    const icons = [...el.querySelectorAll('use')].map(u=>u.getAttribute('href') || u.getAttribute('xlink:href') || '').join(' ');
    if (!locationText && /location|map-pin|map-marker|geo/i.test(icons)) locationText = clean(el.innerText).replace(/^location\s*:?\s*/i,'') || null;
  }
  const externalWebsite = href => {
    try {
      let url = new URL(href, location.href);
      if (/(^|\.)onlyfans\.com$/.test(url.hostname) && url.pathname === '/away') {
        const target = url.searchParams.get('url');
        if (!target) return null;
        url = new URL(target);
      }
      return /^https?:$/.test(url.protocol) && !/(^|\.)onlyfans\.com$/.test(url.hostname) ? url.href : null;
    } catch { return null; }
  };
  const websites = [...new Set([...document.querySelectorAll('.b-user-info a[href], .b-profile__bio a[href], [data-testid="profile-website"] a[href], a[data-testid="profile-website"], a[href^="/away?url="]')].map(a=>externalWebsite(a.getAttribute('href'))).filter(Boolean))];
  const avatarCandidates = imageCandidates(['.b-profile__avatar', '.b-profile__user .g-avatar', '.b-profile__header .g-avatar', '.b-user-avatar', '[data-testid="profile-avatar"]']);
  const bannerCandidates = imageCandidates(['.b-profile__header__cover-img', '.b-profile__header__cover', '.b-profile__cover', '.b-profile__header__img', '.b-profile__header .b-profile__header-img', '[data-testid="profile-banner"]']);
  if (structured?.image && /^https?:/.test(structured.image) && !/of-logo|placeholder/i.test(structured.image)) avatarCandidates.unshift({url:structured.image,score:null,source:'JSON-LD Person.image'});
  const avatar = avatarCandidates[0]?.url || null;
  // Read the supplied element directly, independent of image loading/visibility.
  const cover = document.querySelector('img.b-profile__header__cover-img');
  const directBanner = cover?.getAttribute('src') || cover?.getAttribute('data-src');
  if (directBanner) {
    try {
      const url = new URL(directBanner, location.href);
      if (/^https?:$/.test(url.protocol) && !/of-logo|placeholder|default[-_](?:header[-_])?image|default[-_]?avatar|\/static\//i.test(url.href)) {
        bannerCandidates.unshift({url:url.href,score:null,source:'cover-img src'});
      }
    } catch {}
  }
  const banner = bannerCandidates[0]?.url || null;
  const stats = {};
  const raw = [];
  const aliases = {post:'posts',posts:'posts',photo:'photos',photos:'photos',image:'photos',images:'photos',video:'videos',videos:'videos',like:'likes',likes:'likes',fan:'subscribers',fans:'subscribers',subscriber:'subscribers',subscribers:'subscribers',follower:'followers',followers:'followers',stream:'streams',streams:'streams',livestream:'streams',livestreams:'streams',audio:'audios',audios:'audios',media:'media'};
  const number = value => {
    // Accept exactly one numeric token, never "106 18 38.3K".
    const m = clean(value).match(/^(\d+(?:[.,]\d+)?|\d{1,3}(?:,\d{3})+)\s*([kmb])?$/i);
    if (!m) return null;
    let n = m[1];
    n = m[2] ? Number(n.replace(',', '.')) : Number(n.replace(/,/g, ''));
    return Number.isFinite(n) ? Math.round(n * ({k:1e3,m:1e6,b:1e9}[m[2]?.toLowerCase()] || 1)) : null;
  };
  const add = (label, value, source) => {
    const key = aliases[clean(label).toLowerCase()];
    const count = number(value);
    if (!key || count === null) return;
    if (stats[key] === undefined) stats[key] = count;
    raw.push({key, label:clean(label), display:clean(value), count, source,
      approximate:/[kmb]/i.test(value)});
  };
  // Restrict scanning to profile/header counters, never individual post likes.
  const roots = [...document.querySelectorAll('.b-profile__header, .b-profile__sections, .b-profile__stats, [data-testid="profile-stats"]')].filter(visible);
  for (const root of roots) {
    for (const el of [root, ...root.querySelectorAll('a,li,span,div,[title],[aria-label]')]) {
      if (!visible(el)) continue;
      for (const candidate of [el.getAttribute('title'), el.getAttribute('aria-label'), el.innerText]) {
        if (!candidate || candidate.length > 140) continue;
        const re = /(\d+(?:[.,]\d+)?\s*[kmb]?)\s*(posts?|photos?|images?|videos?|likes?|fans?|subscribers?|followers?|streams?|livestreams?|audios?|media)\b/gi;
        for (const m of candidate.matchAll(re)) add(m[2],m[1],'labelled DOM');
      }
      // Icon-only counters: require a recognized icon label, not just a number.
      const use = el.querySelector('use');
      const icon = use?.getAttribute('href') || use?.getAttribute('xlink:href') || '';
      const iconKey = icon.match(/(?:^|[-_/#])(photos?|images?|videos?|likes?|hearts?|streams?|audios?|posts?|subscribers?|followers?)(?:$|[-_])/i)?.[1]?.toLowerCase();
      if (iconKey && el.querySelectorAll('use').length === 1 && clean(el.innerText).length < 30) add(iconKey.replace(/^hearts?$/, 'likes'),clean(el.innerText),'profile icon');
    }
  }
  for (const counter of structured?.counters || []) { stats[counter.key] = counter.count; raw.push(counter); }
  const uniqueRaw = [...new Map(raw.map(s=>[`${s.key}:${s.display}:${s.source}`,s])).values()];
  const escaped = username.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const matched = new RegExp('@'+escaped+'(?![a-z0-9_.-])','i').test(body);
  return {
    title, text:body.slice(0,60000), display_name:name, bio,
    location:locationText, website:websites[0] || null, websites,
    avatar_url:avatar, banner_url:banner, image_candidates:{avatar:avatarCandidates,banner:bannerCandidates}, stats,
    stats_raw:uniqueRaw, profile_detected:Boolean(structured || (matched && (profile || bio || avatar || name))),
    diagnostics:{profile_root_found:Boolean(profile),username_found:matched,stats_roots:roots.length,
      images:[...document.querySelectorAll('.b-profile img, .b-profile__header img')].map(i=>({class:i.className,src:i.getAttribute('src'),srcset:i.getAttribute('srcset'),parent:i.parentElement?.className})),
      headings:[...document.querySelectorAll('h1,h2')].slice(0,10).map(e=>clean(e.innerText)),
      profile_elements:[...document.querySelectorAll('[class]')].filter(e=> /profile|user-info|avatar|cover|counter|stat/i.test(e.className?.toString()||'')).slice(0,150).map(e=>({tag:e.tagName,class:e.className?.toString(),text:clean(e.innerText).slice(0,200)}))}
  };
};
