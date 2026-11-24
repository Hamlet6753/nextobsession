import { relatedCreators } from '../services/related-creators.js';
import { relatedCreatorsMarkup } from '../components/related-creators.js';
import { creatorSocialLinks } from '../components/social-links.js';
import { profileIndexable } from '../services/seo.js';
import { escape, safeUrl } from '../lib/html.js';
import { shell } from '../components/layout.js';
import { avatar, banner, stats, creatorPrice, creatorActions, creatorLocation } from '../components/creator.js';
import { htmlResponse } from '../lib/responses.js';
export async function creatorPage(username, env, url) {
  const row = await env.DB.prepare('SELECT * FROM creator WHERE username = ?').bind('@'+username.toLowerCase()).first();
  if (!row) return htmlResponse(shell('Not found','<section class="hero"><h1>Creator not found.</h1><a href="/">Back to discovery</a></section>',false,{url}),404);
  let related=[];
  try { related=await relatedCreators(env.DB,row.username); } catch(error) { console.error('Related creators unavailable:',error?.name||'Error'); }
  const website = safeUrl(row.website);
  const canonicalProfile=new URL('/creator/'+encodeURIComponent(row.username.replace(/^@/,'')),url?.origin||'https://nextobsession.fans');
  return htmlResponse(shell(row.name || row.username,`<section class="profile"><a class="back" href="/">Back to discovery</a><article class="profile-box"><div class="cover">${banner(row,true)}</div><div class="profile-content"><div class="profile-top">${avatar(row,true)}${creatorActions(row, website)}</div><div class="profile-title-row"><div class="profile-identity"><h1>${escape(row.name || row.username)}</h1><div class="username">${escape(row.username)}</div></div>${creatorPrice(row, 'profile-price')}</div>${creatorLocation(row.location, '', 'p')}${row.bio?`<p class="full-bio">${escape(row.bio)}</p>`:''}<div class="profile-stats-row"><div class="stats">${stats(row,true)}</div>${creatorSocialLinks(row)}</div></div></article></section>${relatedCreatorsMarkup(related)}`,false,{url:canonicalProfile,creator:row,description:row.bio||'',indexable:profileIndexable(row),adult:true,relatedCreators:related.length>0,relatedRows:related}));
}
