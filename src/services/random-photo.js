import { creatorPath, safeUrl } from '../lib/html.js';

export async function randomPhoto(db, exclude = '') {
  const previous = typeof exclude === 'string' ? exclude.slice(0, 8192) : '';
  const row = await db.prepare(`WITH images AS (
    SELECT username, name, trim(avatar_url) AS image_url FROM creator
    UNION ALL
    SELECT username, name, trim(banner_url) AS image_url FROM creator
  ) SELECT username, name, image_url FROM images
    WHERE (lower(image_url) LIKE 'https://%' OR lower(image_url) LIKE 'http://%')
    AND lower(image_url) NOT LIKE '%default_header_image%'
    AND lower(image_url) NOT LIKE '%default_avatar%'
    AND lower(image_url) NOT LIKE '%/static/%'
    AND image_url <> ?
    ORDER BY random() LIMIT 1`).bind(previous).first();
  const imageUrl = row && safeUrl(row.image_url);
  if (!imageUrl) return null;
  return {image_url:imageUrl, name:row.name || row.username, username:row.username, creator_url:creatorPath(row.username)};
}

export async function randomPhotoApi(url, env) {
  const photo = await randomPhoto(env.DB, url.searchParams.get('exclude'));
  return Response.json({photo}, {headers:{'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff'}});
}
