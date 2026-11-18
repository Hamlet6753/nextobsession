import { escape, creatorPath, safeUrl } from '../lib/html.js';
export const SITE_ORIGIN = 'https://nextobsession.fans';
export const SITEMAP_PROFILE_LIMIT = 200;
export function productionUrl(url) { return url?.origin === SITE_ORIGIN; }
export function canonicalUrl(url, directory = false) {
  const result = new URL(url?.pathname || '/', SITE_ORIGIN);
  if (directory && url) {
    const q=(url.searchParams.get('q')||'').trim().slice(0,80);
    if(q)result.searchParams.set('q',q);
    for(const id of [...new Set(url.searchParams.getAll('category'))].sort())if(id)result.searchParams.append('category',id);
    for(const key of ['location','price']){const value=(url.searchParams.get(key)||'').trim();if(value)result.searchParams.set(key,value);}
    const filtered=Boolean(q||result.searchParams.has('category')||result.searchParams.has('location')||result.searchParams.has('price'));
    const sort=url.searchParams.get('sort');if(!filtered&&sort&&!['random','default'].includes(sort))result.searchParams.set('sort',sort);
  }
  return result.href;
}
export function profileIndexable(row) {
  return Boolean(row && String(row.name||'').trim() && String(row.bio||'').trim().length>=120 && safeUrl(row.avatar_url) && safeUrl(row.banner_url));
}
export function metadata(title, {url, description='', indexable=false, directory=false, adult=false}={}) {
  const robots=productionUrl(url)&&indexable?'index,follow':'noindex,follow';
  return `<meta name="robots" content="${robots}"><title>${escape(title)} | NextObsession.fans</title><meta name="description" content="${escape(description)}"><link rel="canonical" href="${escape(canonicalUrl(url,directory))}">${adult?'<meta name="rating" content="adult">':''}`;
}
export async function sitemapResponse(url, env) {
  if(!productionUrl(url))return new Response('Not found',{status:404,headers:{'X-Robots-Tag':'noindex'}});
  const cache=globalThis.caches?.default;
  const key=new Request(SITE_ORIGIN+'/sitemap.xml');
  if(cache){const hit=await cache.match(key);if(hit)return hit;}
  const result=await env.DB.prepare(`WITH eligible AS (
    SELECT username, bio FROM creator WHERE length(trim(COALESCE(name,'')))>0
    AND length(trim(COALESCE(bio,'')))>=120
    AND (lower(substr(trim(avatar_url),1,8))='https://' OR lower(substr(trim(avatar_url),1,7))='http://')
    AND (lower(substr(trim(banner_url),1,8))='https://' OR lower(substr(trim(banner_url),1,7))='http://')
  ) SELECT min(username) AS username FROM eligible GROUP BY lower(trim(bio)) HAVING count(*)=1 ORDER BY username ASC LIMIT ${SITEMAP_PROFILE_LIMIT}`).all();
  const paths=['/','/about','/terms','/privacy','/contact','/removal',...result.results.map(r=>creatorPath(r.username))];
  const response=new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+paths.map(path=>'<url><loc>'+escape(SITE_ORIGIN+path)+'</loc></url>').join('')+'</urlset>',{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'public, max-age=3600'}});
  if(cache)await cache.put(key,response.clone());
  return response;
}
export function robotsResponse(url) {
  return new Response(productionUrl(url)?'User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: '+SITE_ORIGIN+'/sitemap.xml\n':'User-agent: *\nDisallow: /\n',{headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'public, max-age=300'}});
}
