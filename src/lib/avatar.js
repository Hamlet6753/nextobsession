import { safeUrl } from './html.js';
// Keep provider defaults out of the UI and Person.image, without editing records.
export function avatarUrl(value) {
  const url=safeUrl(value);
  if(!url)return null;
  const parsed=new URL(url);
  const onlyfans=parsed.hostname==='onlyfans.com'||parsed.hostname.endsWith('.onlyfans.com');
  const defaultAvatar=/(?:^|\/)(?:default[-_]?avatar|avatar[-_]?default|avatar[-_]?placeholder|placeholder[-_]?avatar)(?:[._/-]|$)/i.test(parsed.pathname);
  return onlyfans&&defaultAvatar?null:url;
}
