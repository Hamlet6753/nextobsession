// Per-database, bounded isolate cache. Preview and production bindings never mix.
const databases = new WeakMap();
export async function cachedQuery(db, key, ttl, query) {
  let cache = databases.get(db);
  if (!cache) { cache = new Map(); databases.set(db, cache); }
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expires > now) return hit.promise;
  if (hit) cache.delete(key);
  while (cache.size >= 64) cache.delete(cache.keys().next().value);
  const entry = {expires:now + ttl, promise:Promise.resolve().then(query)};
  cache.set(key, entry);
  try { return await entry.promise; }
  catch (error) { if (cache.get(key) === entry) cache.delete(key); throw error; }
}
