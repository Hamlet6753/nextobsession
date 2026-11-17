import { card } from '../components/creator.js';
import { directoryState, directoryPage } from '../services/directory.js';
export async function creatorApi(url, env) {
  const state = directoryState(url);
  const { rows, next } = await directoryPage(env.DB, state);
  return Response.json({ html: rows.map(card).join(''), next }, { headers: { 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff' } });
}
export async function healthApi(env) {
  await env.DB.prepare('SELECT username FROM creator LIMIT 1').all();
  return Response.json({ok:true,database:'connected',table:'creator'},{headers:{'Cache-Control':'no-store'}});
}
