export default () => {
  // Only explicitly labelled public profile social buttons, never post/bio links.
  const links = [];
  const seen = new Set();
  for (const a of document.querySelectorAll('a.m-tab-social[href], a[id^="m-tab-social"][href], [data-testid="profile-social-links"] a[href], .b-user-info__socials a[href]')) {
    try {
      let url = new URL(a.getAttribute('href'), location.href);
      if (/(^|\.)onlyfans\.com$/i.test(url.hostname) && url.pathname === '/away') url = new URL(url.searchParams.get('url'));
      if (!['http:','https:'].includes(url.protocol) || url.username || url.password || url.href.length > 2048) continue;
      // Exclude internal UI/navigation links, including signed-in account controls.
      if (/(^|\.)onlyfans\.com$/i.test(url.hostname) && !/^\/[a-z0-9_.-]+\/?$/i.test(url.pathname)) continue;
      if (seen.has(url.href)) continue;
      seen.add(url.href); links.push({url:url.href});
      if (links.length === 40) break;
    } catch {}
  }
  return links;
}
;
