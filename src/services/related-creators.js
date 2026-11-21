import { safeUrl } from '../lib/html.js';
function shuffle(rows, random) {
  for(let i=rows.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[rows[i],rows[j]]=[rows[j],rows[i]];}
  return rows;
}
export async function relatedCreators(db, exclude, random=Math.random) {
  const bounds=await db.prepare('SELECT (SELECT min(rowid) FROM creator) AS lo, (SELECT max(rowid) FROM creator) AS hi').first();
  if(bounds?.lo==null || bounds?.hi==null)return [];
  const targets=new Set();
  for(let i=0;i<48;i++)targets.add(bounds.lo+Math.floor(random()*(bounds.hi-bounds.lo+1)));
  const queries=[...targets].map(target=>db.prepare('SELECT * FROM creator WHERE rowid >= ? ORDER BY rowid LIMIT 1').bind(target));
  const batches=await db.batch(queries);
  const unique=new Map();
  const add=row=>{if(row?.username && row.username.toLowerCase()!==exclude.toLowerCase())unique.set(row.username.toLowerCase(),row);};
  for(const result of batches)for(const row of result.results||[])add(row);
  // Bounded fallback for small/sparse tables, never ORDER BY random().
  if(unique.size<25){const result=await db.prepare('SELECT * FROM creator ORDER BY rowid LIMIT 125').all();for(const row of result.results||[])add(row);}
  const withImages=[],withoutImages=[];
  for(const row of unique.values())(safeUrl(row.avatar_url)||safeUrl(row.banner_url)?withImages:withoutImages).push(row);
  return [...shuffle(withImages,random),...shuffle(withoutImages,random)].slice(0,25);
}
