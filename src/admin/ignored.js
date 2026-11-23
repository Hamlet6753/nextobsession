import { AdminInputError, username } from './records.js';
import { htmlResponse } from '../lib/responses.js';
import { escape } from '../lib/html.js';
import { schemaMarkup } from '../services/schema.js';
export async function assertNotIgnored(db, value) {
 const handle=username(value);
 if(await db.prepare('SELECT username FROM creator_ignored WHERE username = ?').bind(handle).first())throw new AdminInputError('This username is on the ignore list. Remove the exclusion before adding or editing it.');
}
export async function ignoreProfiles(db,input) {
 if(typeof input.usernames!=='string'||input.usernames.length>10000)throw new AdminInputError('Provide up to 100 usernames, one per line.');
 const handles=[...new Set(input.usernames.split(/\r?\n/).map(x=>x.trim()).filter(Boolean).map(username))];
 if(!handles.length||handles.length>100)throw new AdminInputError('Provide between 1 and 100 unique usernames.');
 const reason=typeof input.reason==='string'?input.reason.trim().toWellFormed():'';
 if(reason.length>500)throw new AdminInputError('Reason must be 500 characters or less.');
 if(typeof input.removeExisting!=='boolean')throw new AdminInputError('Select whether existing profiles should be removed.');
 const commands=handles.map(handle=>db.prepare('INSERT INTO creator_ignored (username,reason) VALUES (?,?) ON CONFLICT(username) DO UPDATE SET reason=excluded.reason').bind(handle,reason));
 if(input.removeExisting)commands.push(...handles.map(handle=>db.prepare("DELETE FROM creator WHERE '@' || lower(ltrim(trim(username), '@')) = ?").bind(handle)));
 const results=await db.batch(commands);
 return {ignored:handles.length,removed:results.slice(handles.length).reduce((n,r)=>n+(r.meta?.changes||0),0)};
}
export async function unignoreProfile(db,input) {
 const handle=username(input.username);
 await db.prepare('DELETE FROM creator_ignored WHERE username = ?').bind(handle).run();
 return {unignored:handle};
}
export async function ignoredCsv(db) {
 const {results}=await db.prepare('SELECT username FROM creator_ignored ORDER BY username LIMIT 10001').all();
 if(results.length>10000)throw new AdminInputError('Ignore list exceeds the CSV export limit of 10000.');
 return new Response('username\r\n'+results.map(r=>r.username.replace(/^@/,'')+'\r\n').join(''),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="ignored_usernames.csv"','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff'}});
}
export async function ignoredPage(db,url) {
 const q=(url.searchParams.get('q')||'').trim().replace(/^@/,'').toLowerCase();
 if(q.length>64||q&&!/^[a-z0-9_.-]+$/.test(q))throw new AdminInputError('Invalid username search.');
 const {results}=await db.prepare('SELECT username,reason,created_at FROM creator_ignored WHERE instr(username,?) > 0 ORDER BY username LIMIT 201').bind(q).all();
 const rows=results.slice(0,200);
 const body=rows.map(r=>`<tr><td>${escape(r.username)}</td><td>${escape(r.reason)}</td><td>${escape(r.created_at)}</td><td><button type="button" class="secondary" data-unignore="${escape(r.username)}">Remove exclusion</button></td></tr>`).join('');
 return htmlResponse(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Ignored creators | NextObsession.fans</title>${schemaMarkup('Ignored creators',{url})}<link rel="stylesheet" href="/assets/css/site.css?v=5"><link rel="stylesheet" href="/assets/css/admin.css?v=1"></head><body><main class="wrap admin-page"><nav><a href="/admin/import">Creator editor</a> | <a href="/admin/analytics">Analytics</a></nav><h1>Ignored creators</h1><p>Excluded usernames cannot be inserted or updated, including by bulk SQL imports. Removing an exclusion does not restore a profile.</p><section class="admin-panel"><form id="ignored-form"><label for="ignored-usernames">Usernames or OnlyFans profile URLs, one per line (up to 100)</label><textarea id="ignored-usernames" rows="5" required></textarea><label for="ignored-reason">Internal reason (optional)</label><input id="ignored-reason" maxlength="500"><p><label><input id="ignored-remove" type="checkbox"> Also delete these existing profiles from the database</label></p><button type="submit">Add to ignore list</button></form><p id="ignored-status" role="status"></p></section><section class="admin-panel"><h2>Current exclusions</h2><p><a href="/admin/api/ignored.csv">Download ignored_usernames.csv</a></p><form method="get"><label for="ignored-search">Find username</label><input id="ignored-search" name="q" value="${escape(q)}"><button type="submit">Search</button></form><p>${rows.length} matching exclusions shown${results.length>200?'; narrow your search to see further entries':''}.</p><div style="overflow-x:auto"><table><thead><tr><th>Username</th><th>Internal reason</th><th>Added (UTC)</th><th>Action</th></tr></thead><tbody>${body}</tbody></table></div></section></main><script src="/assets/js/admin-ignored.js?v=1" defer></script></body></html>`);
}
