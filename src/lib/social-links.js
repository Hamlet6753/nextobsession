// Platform is determined from the hostname, never from scraped names or bios.
const platforms = [
  ['instagram','Instagram',['instagram.com']], ['x','X',['x.com','twitter.com']],
  ['snapchat','Snapchat',['snapchat.com']], ['tiktok','TikTok',['tiktok.com']],
  ['youtube','YouTube',['youtube.com','youtu.be']], ['telegram','Telegram',['t.me','telegram.me','telegram.org']],
  ['facebook','Facebook',['facebook.com','fb.com']], ['reddit','Reddit',['reddit.com']],
  ['twitch','Twitch',['twitch.tv']], ['discord','Discord',['discord.com','discord.gg']],
  ['threads','Threads',['threads.net','threads.com']], ['bluesky','Bluesky',['bsky.app']],
  ['pinterest','Pinterest',['pinterest.com','pin.it']], ['linkedin','LinkedIn',['linkedin.com']],
  ['patreon','Patreon',['patreon.com']], ['fansly','Fansly',['fansly.com']],
  ['onlyfans','OnlyFans',['onlyfans.com']], ['linktree','Linktree',['linktr.ee']],
  ['whatsapp','WhatsApp',['wa.me','whatsapp.com']], ['spotify','Spotify',['spotify.com']],
  ['tumblr','Tumblr',['tumblr.com']], ['manyvids','ManyVids',['manyvids.com']],
  ['fanvue','Fanvue',['fanvue.com']], ['kick','Kick',['kick.com']], ['soundcloud','SoundCloud',['soundcloud.com']]
];
export function normalizeSocialLinks(value, strict = false) {
  const invalid = () => { if (strict) throw new Error('Use up to 40 valid http(s) social links without credentials.'); return []; };
  if(value == null || value === '') return [];
  if(typeof value === 'string') { try { value = JSON.parse(value); } catch { return invalid(); } }
  if(!Array.isArray(value) || value.length > 40) return invalid();
  const links = [], seen = new Set();
  for(const item of value) {
    const raw = typeof item === 'string' ? item : item?.url;
    try {
      if(typeof raw !== 'string' || raw.length > 2048 || /[\x00-\x20\x7f]/.test(raw)) throw Error();
      const url = new URL(raw);
      if(!['https:','http:'].includes(url.protocol) || url.username || url.password) throw Error();
      if(seen.has(url.href)) continue;
      seen.add(url.href);
      const host = url.hostname.toLowerCase().replace(/^www\./,'');
      const platform = platforms.find(([, , domains])=>domains.some(d=>host===d || host.endsWith('.'+d)));
      links.push({url:url.href,platform:platform?.[0]||'link',label:platform?.[1]||host});
    } catch { if(strict) return invalid(); }
  }
  return links;
}
