export const COUNTERS = ['posts','photos','videos','likes','subscribers','followers','streams','audios','media'];
export const TEXT_FIELDS = ['name','bio','location','website','avatar_url','banner_url','subscription_type','subscription_currency','pricing_checked_at'];
export const PRICE_FIELDS = ['subscription_price_cents','subscription_current_price_cents'];
export class AdminInputError extends Error {}
export function username(value) {
  let text = String(value || '').trim();
  if (/^https?:/i.test(text)) {
    let url; try { url = new URL(text); } catch { throw new AdminInputError('Invalid profile URL.'); }
    if (!['onlyfans.com','www.onlyfans.com'].includes(url.hostname)) throw new AdminInputError('Only OnlyFans profile URLs are accepted.');
    text = url.pathname.replace(/^\/+|\/+$/g,'');
  }
  text = text.replace(/^@/,'').toLowerCase();
  if (!/^[a-z0-9_.-]{1,64}$/.test(text)) throw new AdminInputError('Invalid username.');
  return '@' + text;
}
// Repair isolated UTF-16 surrogates without damaging valid emoji pairs.
export function clean(value) { return String(value).toWellFormed(); }
function integer(value, label, max = Number.MAX_SAFE_INTEGER) {
  if (value === '' || value == null) return null;
  if (!/^(0|[1-9]\d*)$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) > max) throw new AdminInputError('Invalid '+label+'.');
  return Number(value);
}
export function normalize(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new AdminInputError('Expected a profile.');
  const record = {username:username(input.username)};
  for (const key of TEXT_FIELDS) {
    const value = input[key];
    if (value != null && typeof value !== 'string') throw new AdminInputError('Invalid '+key+'.');
    record[key] = value == null || !value.trim() ? null : clean(value.trim());
    if (record[key]?.length > (key === 'bio' ? 30000 : 4000)) throw new AdminInputError(key+' is too long.');
  }
  if (!record.name) throw new AdminInputError('Name is required.');
  for (const key of ['website','avatar_url','banner_url']) {
    if (!record[key]) continue;
    let url; try { url = new URL(record[key]); } catch { throw new AdminInputError('Invalid '+key+'.'); }
    if (!['https:','http:'].includes(url.protocol) || url.username || url.password) throw new AdminInputError('Invalid '+key+'.');
    record[key] = url.href;
  }
  if (record.subscription_type && !['free','paid','unknown'].includes(record.subscription_type)) throw new AdminInputError('Invalid subscription type.');
  if (record.subscription_currency && !/^[A-Z]{3}$/.test(record.subscription_currency)) throw new AdminInputError('Currency must have three uppercase letters.');
  if (record.pricing_checked_at && !Number.isFinite(Date.parse(record.pricing_checked_at))) throw new AdminInputError('Invalid pricing date.');
  for (const key of [...COUNTERS,...PRICE_FIELDS]) record[key] = integer(input[key],key);
  record.age = integer(input.age,'age',120);
  if (record.age !== null && record.age < 18) throw new AdminInputError('Age must be between 18 and 120.');
  record.gender = input.gender == null || input.gender === '' ? null : input.gender;
  if (record.gender !== null && !['female','male','nonbinary','other'].includes(record.gender)) throw new AdminInputError('Invalid gender.');
  return record;
}
export async function loadRecord(db, value) {
  return db.prepare('SELECT * FROM creator WHERE username = ?').bind(username(value)).first();
}
export async function saveRecord(db, input, mode) {
  const row = normalize(input);
  if (!['create','update'].includes(mode)) throw new AdminInputError('Invalid save mode.');
  const columns = new Set((await db.prepare('PRAGMA table_info(creator)').all()).results.map(x=>x.name));
  if (!columns.has('age') || !columns.has('gender')) throw new AdminInputError('Apply the age/gender migration first.');
  const data = {...row,updated_at:new Date().toISOString()};
  const keys = Object.keys(data).filter(key=>columns.has(key));
  if (mode === 'create') {
    const result = await db.prepare('INSERT INTO creator ('+keys.map(x=>'"'+x+'"').join(',')+') VALUES ('+keys.map(()=>'?').join(',')+') ON CONFLICT(username) DO NOTHING').bind(...keys.map(k=>data[k])).run();
    if (result.meta.changes === 0) throw new AdminInputError('Profile already exists. Load it to edit.');
  } else {
    const editable = keys.filter(k=>k!=='username');
    const result = await db.prepare('UPDATE creator SET '+editable.map(k=>'"'+k+'" = ?').join(',')+' WHERE username = ?').bind(...editable.map(k=>data[k]),row.username).run();
    if (result.meta.changes === 0) throw new AdminInputError('Profile no longer exists.');
  }
  return row;
}
