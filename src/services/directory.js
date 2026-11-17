import { searchPlan } from './search.js';
const PAGE_SIZE = 24;
const SORTS = {
  random: { label: 'Random', direction: 'ASC' },
  updated_asc: { label: 'Oldest first', column: 'updated_at', direction: 'ASC' },
  updated_desc: { label: 'Newest first', column: 'updated_at', direction: 'DESC' },
  price_asc: { label: 'Price &#8593;', direction: 'ASC' },
  price_desc: { label: 'Price &#8595;', direction: 'DESC' },
  likes_desc: { label: 'Most liked', column: 'likes', direction: 'DESC' },
  likes_asc: { label: 'Less liked', column: 'likes', direction: 'ASC' },
  photos_desc: { label: 'More photos', column: 'photos', direction: 'DESC' },
  photos_asc: { label: 'Less photos', column: 'photos', direction: 'ASC' },
  videos_desc: { label: 'More videos', column: 'videos', direction: 'DESC' },
  videos_asc: { label: 'Less videos', column: 'videos', direction: 'ASC' }
};
class DirectoryInputError extends Error {}
function encodeCursor(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function decodeCursor(raw) {
  if (!raw || raw.length > 3000 || !/^[A-Za-z0-9_-]+$/.test(raw)) throw new DirectoryInputError('Invalid continuation. Refresh the page.');
  try {
    const value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(atob(raw.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))));
    if (!value || value.v !== 2 || typeof value.q !== 'string' || value.q.length > 80 ||
        !Object.hasOwn(SORTS, value.s) || !Number.isInteger(value.seed) || value.seed < 1 || value.seed >= 2147483647 ||
        !Number.isInteger(value.r) || value.r < 0 || value.r > 100 || typeof value.u !== 'string' || !/^@[a-zA-Z0-9_.-]{1,64}$/.test(value.u)) throw new Error();
    if (value.k !== null) {
      if (value.s === 'updated_asc' || value.s === 'updated_desc') {
        if (typeof value.k !== 'string' || value.k.length > 100) throw new Error();
      } else if (!Number.isSafeInteger(value.k) || value.k < 0) throw new Error();
    }
    return value;
  } catch { throw new DirectoryInputError('Invalid continuation. Refresh the page.'); }
}
function directoryState(url) {
  const q = (url.searchParams.get('q') || '').trim().slice(0, 80);
  const sort = url.searchParams.get('sort') || 'random';
  if (!Object.hasOwn(SORTS, sort)) throw new DirectoryInputError('Unknown sorting option.');
  const cursor = url.searchParams.has('cursor') ? decodeCursor(url.searchParams.get('cursor')) : null;
  if (cursor && (cursor.q !== q || cursor.s !== sort)) throw new DirectoryInputError('Search or sorting changed. Refresh the page.');
  const seed = cursor ? cursor.seed : crypto.getRandomValues(new Uint32Array(1))[0] % 2147483646 + 1;
  return { q, sort, cursor, seed };
}
async function directoryPage(db, state) {
  const { q, sort, seed, cursor } = state;
  const fields = await db.prepare('PRAGMA table_info(creator)').all();
  const columns = new Set(fields.results.map(field => field.name));
  const column = name => columns.has(name) ? '"' + name + '"' : 'NULL';
  let expression;
  const plan = searchPlan(q, columns);
  const searching = plan.bindings.length > 0;
  const parameters = [seed, ...plan.bindings];
  if (sort === 'random') {
    expression = searching ? '0' : '(((_creator_rowid % 2147483647) * (_creator_rowid % 2147483647)) % 2147483647 * input.seed) % 2147483647';
  } else if (sort === 'price_asc' || sort === 'price_desc') {
    expression = `CASE WHEN ${column('subscription_type')} = 'free' THEN 0 ELSE COALESCE(${column('subscription_current_price_cents')}, ${column('subscription_price_cents')}, 0) END`;
  } else {
    expression = column(SORTS[sort].column);
  }
  const ctes = ['input AS (SELECT ? AS seed' + (plan.inputs.length ? ', ' + plan.inputs.join(', ') : '') + ')'];
  if (searching) ctes.push(...plan.ctes);
  else ctes.push('creator_source AS (SELECT creator.*, creator.rowid AS _creator_rowid, 0 AS _relevance FROM creator)');
  ctes.push('ranked AS (SELECT ' + plan.source + '.*, (' + expression + ') AS _sort_key FROM ' + plan.source + ' CROSS JOIN input)');
  let continuation = '';
  if (cursor) {
    let secondary;
    const tail = [];
    if (cursor.k === null) {
      secondary = '(_sort_key IS NULL AND username > ?)';
      tail.push(cursor.u);
    } else {
      const comparison = SORTS[sort].direction === 'DESC' ? '<' : '>';
      secondary = `(_sort_key IS NULL OR _sort_key ${comparison} ? OR (_sort_key = ? AND username > ?))`;
      tail.push(cursor.k, cursor.k, cursor.u);
    }
    continuation = ' WHERE (_relevance > ? OR (_relevance = ? AND ' + secondary + '))';
    parameters.push(cursor.r, cursor.r, ...tail);
  }
  const sql = 'WITH ' + ctes.join(', ') + ' SELECT * FROM ranked' + continuation +
    ' ORDER BY _relevance ASC, (_sort_key IS NULL) ASC, _sort_key ' + SORTS[sort].direction + ', username ASC LIMIT ' + (PAGE_SIZE + 1);

  const result = await db.prepare(sql).bind(...parameters).all();
  const rows = result.results.slice(0, PAGE_SIZE);
  const last = rows.at(-1);
  const next = result.results.length > PAGE_SIZE ? encodeCursor({ v: 2, r: last._relevance, q, s: sort, seed, k: last._sort_key, u: last.username }) : null;
  return { rows, next };
}
function continuationUrl(path, state, cursor) {
  return path + '?' + new URLSearchParams({ q: state.q, sort: state.sort, cursor });
}

export { SORTS, DirectoryInputError, directoryState, directoryPage, continuationUrl };
