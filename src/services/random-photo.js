import { creatorPath, safeUrl } from '../lib/html.js';

export async function randomPhoto(db, exclude = '') {
  const previous = typeof exclude === 'string' ? exclude.slice(0, 8192) : '';
  const bounds = await db.prepare('SELECT (SELECT min(rowid) FROM creator) AS lo, (SELECT max(rowid) FROM creator) AS hi').first();
  if (bounds?.lo == null || bounds?.hi == null) return null;
  function photoFrom(row) {
    if (!row) return null;
    const images = [...new Set([row.avatar_url, row.banner_url].map(value => safeUrl(value)).filter(value => value && value !== previous && !/default_header_image|default_avatar|\/static\//i.test(value)))];
    if (!images.length) return null;
    return {image_url:images[Math.floor(Math.random()*images.length)],name:row.name||row.username,username:row.username,creator_url:creatorPath(row.username)};
  }
  // Indexed seeks: never sort or scan the entire table for a random photo.
  for (let attempt = 0; attempt < 12; attempt++) {
    const target = bounds.lo + Math.floor(Math.random()*(bounds.hi-bounds.lo+1));
    const row = await db.prepare('SELECT username,name,avatar_url,banner_url FROM creator WHERE rowid >= ? ORDER BY rowid LIMIT 1').bind(target).first();
    const photo = photoFrom(row);
    if (photo) return photo;
  }
  // Rare fallback for mostly empty profiles. Stop at the first usable URL.
  const row = await db.prepare(`WITH images AS (
    SELECT username,name,trim(avatar_url) AS image_url FROM creator
    UNION ALL SELECT username,name,trim(banner_url) AS image_url FROM creator
  ) SELECT * FROM images WHERE
    (lower(image_url) LIKE 'https://%' OR lower(image_url) LIKE 'http://%')
    AND lower(image_url) NOT LIKE '%default_header_image%'
    AND lower(image_url) NOT LIKE '%default_avatar%'
    AND lower(image_url) NOT LIKE '%/static/%' AND image_url <> ? LIMIT 1`).bind(previous).first();
  return row ? photoFrom({...row,avatar_url:row.image_url,banner_url:null}) : null;
}

export async function randomPhotoApi(url, env) {
  const photo = await randomPhoto(env.DB, url.searchParams.get('exclude'));
  return Response.json({photo}, {headers:{'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff'}});
}
