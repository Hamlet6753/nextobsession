import { safeUrl } from './html.js';
export function bannerUrl(value) {
  const url=safeUrl(value);
  if(!url)return null;
  const parsed=new URL(url);
  const onlyfans=parsed.hostname==='onlyfans.com'||parsed.hostname.endsWith('.onlyfans.com');
  const defaultBanner=/(?:^|\/)(?:default[-_]?(?:header(?:[-_]?image)?|banner|cover|image)|(?:banner|header|cover)[-_]?(?:default|placeholder)|placeholder[-_]?(?:banner|header|cover))(?:[._/-]|$)/i.test(parsed.pathname);
  return onlyfans&&defaultBanner?null:url;
}
