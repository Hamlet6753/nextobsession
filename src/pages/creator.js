import { creatorSocialLinks } from '../components/social-links.js';
import { profileIndexable } from '../services/seo.js';
import { escape, safeUrl } from '../lib/html.js';
import { shell } from '../components/layout.js';
import { image, stats, creatorPrice, creatorActions, creatorLocation } from '../components/creator.js';
import { htmlResponse } from '../lib/responses.js';
export async function creatorPage(username, env, url) {
  const row = await env.DB.prepare('SELECT * FROM creator WHERE username = ?').bind('@'+username.toLowerCase()).first();
  if (!row) return htmlResponse(shell('Not found','<section class="hero"><h1>Creator not found.</h1><a href="/">Back to discovery</a></section>',false,{url}),404);
  const website = safeUrl(row.website);
  const canonicalProfile=new URL('/creator/'+encodeURIComponent(row.username.replace(/^@/,'')),url?.origin||'https://nextobsession.fans');
  return htmlResponse(shell(row.name || row.username,`<section class="profile"><a class="back" href="/">Back to discovery</a><article class="profile-box"><div class="cover">${image(row.banner_url,(row.name || row.username),'banner')}</div><div class="profile-content"><div class="profile-top"><div class="avatar-wrap">${escape((row.name || row.username.replace('@','')).slice(0,1).toUpperCase())}${image(row.avatar_url,(row.name || row.username),'avatar')}</div>${creatorActions(row, website)}</div><div class="profile-title-row"><div class="profile-identity"><h1>${escape(row.name || row.username)}</h1><div class="username">${escape(row.username)}</div></div>${creatorPrice(row, 'profile-price')}</div>${creatorLocation(row.location, '', 'p')}${row.bio?`<p class="full-bio">${escape(row.bio)}</p>`:''}<div class="profile-stats-row"><div class="stats">${stats(row,true)}</div>${creatorSocialLinks(row)}</div></div></article></section>`,false,{url:canonicalProfile,creator:row,description:row.bio||'',indexable:profileIndexable(row),adult:true}));
}
