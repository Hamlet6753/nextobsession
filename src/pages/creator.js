import { escape, safeUrl } from '../lib/html.js';
import { shell } from '../components/layout.js';
import { image, stats, creatorPrice, creatorActions } from '../components/creator.js';
import { htmlResponse } from '../lib/responses.js';
export async function creatorPage(username, env) {
  const row = await env.DB.prepare('SELECT * FROM creator WHERE username = ?').bind('@'+username.toLowerCase()).first();
  if (!row) return htmlResponse(shell('Not found','<section class="hero"><h1>Creator not found.</h1><a href="/">Back to discovery</a></section>'),404);
  const website = safeUrl(row.website);
  return htmlResponse(shell(row.name || row.username,`<section class="profile"><a class="back" href="/">Back to discovery</a><article class="profile-box"><div class="cover">${image(row.banner_url,(row.name || row.username)+' - banner','banner')}</div><div class="profile-content"><div class="profile-top"><div class="avatar-wrap">${escape((row.name || row.username.replace('@','')).slice(0,1).toUpperCase())}${image(row.avatar_url,(row.name || row.username)+' - profile photo','avatar')}</div>${creatorActions(row, website)}</div><div class="profile-title-row"><div class="profile-identity"><h1>${escape(row.name || row.username)}</h1><div class="username">${escape(row.username)}</div></div>${creatorPrice(row, 'profile-price')}</div>${row.location?`<p class="location">${escape(row.location)}</p>`:''}${row.bio?`<p class="full-bio">${escape(row.bio)}</p>`:''}<div class="stats">${stats(row,true)}</div></div></article></section>`));
}
