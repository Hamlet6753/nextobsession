import { CATEGORY_GROUPS } from '../config/categories.js';
const byId = new Map(CATEGORY_GROUPS.flatMap(group => group.items.map(item => [item.id, { ...item, group: group.id }])));
export class FilterInputError extends Error {}
export function readFilters(url) {
  const values = url.searchParams.getAll('category');
  if (values.length > 30) throw new FilterInputError('Too many categories.');
  const categories = [...new Set(values)].sort();
  if (categories.some(id => !byId.has(id))) throw new FilterInputError('Unknown category.');
  const location = (url.searchParams.get('location') || '').trim().slice(0,80);
  const price = url.searchParams.get('price') || '';
  if (!['','free','paid'].includes(price)) throw new FilterInputError('Unknown price filter.');
  return { categories, location, price };
}
export const filterKey = filters => JSON.stringify(filters);
export function filterParams(filters, params = new URLSearchParams()) {
  for (const id of filters.categories) params.append('category',id);
  if(filters.location)params.set('location',filters.location);
  if(filters.price)params.set('price',filters.price);
  return params;
}
const literal = value => "'" + value.replace(/'/g,"''") + "'";
export function filterPlan(filters, columns) {
  const inputs=[],bindings=[],candidates=[],conditions=[],ctes=[];
  const column = name => columns.has(name) ? 'creator.'+name : 'NULL';
  const selected = new Map();
  for(const id of filters.categories){const category=byId.get(id);if(!selected.has(category.group))selected.set(category.group,[]);selected.get(category.group).push(...category.keywords);}
  if(selected.size){
    inputs.push('? AS category_rules');bindings.push(JSON.stringify([...selected.values()]));
    // Indexed rules stay indexed even if another OR branch is only 1-2 chars.
    // Short word candidates use a cheap raw-bio boundary check; final matching
    // below remains authoritative. A rule with no searchable token cannot be
    // safely prefiltered, so its group keeps the full candidate set.
    let groupIndex=0;
    for(const rules of selected.values()){
      const indexed=new Map(),short=[];
      let unrestricted=false;
      for(const rule of rules){
        const tokens=rule.mode==='contains'?[rule.term]:rule.term.match(/[\p{L}\p{N}]+/gu)||[];
        const long=tokens.filter(token=>[...token].length>=3);
        if(long.length){
          // Phrases such as 'pre op' must also contain the short word 'op'.
          // Without this guard, the trigram 'pre' admits unrelated biographies.
          let anchor=rule.mode==='word' ? tokens.filter(token=>[...token].length<3).sort((a,b)=>[...b].length-[...a].length)[0]||'' : '';
          if(!indexed.has(anchor)&&indexed.size>=8)anchor='';
          if(!indexed.has(anchor))indexed.set(anchor,[]);
          indexed.get(anchor).push('('+long.map(t=>'"'+t.replace(/"/g,'""')+'"').join(' AND ')+')');
          continue;
        }
        if(rule.mode==='contains'){short.push({mode:'contains',term:rule.term});continue;}
        if(!tokens.length){unrestricted=true;break;}
        const token=[...tokens].sort((a,b)=>[...b].length-[...a].length)[0];
        short.push({mode:'word',pattern:'*[^a-z0-9]'+token+'[^a-z0-9]*'});
      }
      if(unrestricted)continue;
      const group=groupIndex++,branches=[];
      let band=0;
      const raw='lower(COALESCE('+column('bio')+",''))";
      for(const [anchor,terms] of indexed){
        const key='category_match'+group+'_'+band++;inputs.push('? AS '+key);bindings.push([...new Set(terms)].join(' OR '));
        const match='creator.rowid IN (SELECT rowid FROM creator_search_v1 WHERE bio MATCH (SELECT '+key+' FROM input))';
        branches.push(anchor ? '('+match+" AND (' ' || "+raw+" || ' ') GLOB "+literal('*[^a-z0-9]'+anchor+'[^a-z0-9]*')+')' : match);
      }
      if(short.length){
        const key='category_short'+group;inputs.push('? AS '+key);bindings.push(JSON.stringify([...new Map(short.map(rule=>[JSON.stringify(rule),rule])).values()]));
        branches.push(`EXISTS (SELECT 1 FROM json_each((SELECT ${key} FROM input)) AS short_rule WHERE CASE json_extract(short_rule.value,'$.mode') WHEN 'contains' THEN instr(${raw},json_extract(short_rule.value,'$.term')) > 0 ELSE (' ' || ${raw} || ' ') GLOB json_extract(short_rule.value,'$.pattern') END)`);
      }
      if(branches.length)candidates.push('('+branches.join(' OR ')+')');
    }
    let words='lower(COALESCE(bio,\'\'))';
    for(const sep of ['\t','\n','\r','.',',','_','-','/','\\','|',':',';','!','?','(',')','[',']','{','}','"',"'",'@','+','&']) words=`replace(${words}, ${literal(sep)}, ' ')`;
    for(let i=0;i<7;i++)words=`replace(${words}, '  ', ' ')`;
    ctes.push(`filter_text AS MATERIALIZED (SELECT FILTER_SOURCE.*, lower(COALESCE(bio,'')) AS _filter_bio, (' ' || trim(${words}) || ' ') AS _filter_words FROM FILTER_SOURCE)`);
    // English keyword boundaries: keep GLOB patterns below D1's 50-byte limit.
    conditions.push(`NOT EXISTS (SELECT 1 FROM json_each(input.category_rules) AS filter_group WHERE NOT EXISTS (SELECT 1 FROM json_each(filter_group.value) AS keyword WHERE CASE json_extract(keyword.value,'$.mode') WHEN 'contains' THEN instr(_filter_bio,json_extract(keyword.value,'$.term')) > 0 ELSE _filter_words GLOB ('*[^a-z0-9]' || json_extract(keyword.value,'$.words') || '[^a-z0-9]*') END))`);
    // Canonicalize keyword boundaries in JS once instead of SQL for every row.
    bindings[0]=JSON.stringify([...selected.values()].map(rules=>rules.map(rule=>({...rule,words:rule.term.replace(/[^\p{L}\p{N}]+/gu,' ').trim()}))));
  }
  if(filters.location){
    const needle=filters.location.toLowerCase();
    let field="COALESCE(creator.location,'')";
    for(const ch of new Set([...needle]))if(ch.charCodeAt(0)>127&&ch.toUpperCase()!==ch&&[...ch.toUpperCase()].length===1)field=`replace(${field},${literal(ch.toUpperCase())},${literal(ch)})`;
    inputs.push('? AS location_filter');bindings.push(needle);
    candidates.push('instr(lower('+field+'), (SELECT location_filter FROM input)) > 0');
    if([...needle].length>=3){inputs.push('? AS location_match');bindings.push('"'+needle.replace(/"/g,'""')+'"');candidates.push('creator.rowid IN (SELECT rowid FROM creator_search_v1 WHERE location MATCH (SELECT location_match FROM input))');}
  }
  if(filters.price){
    const effective=`CASE WHEN ${column('subscription_type')} = 'free' THEN 0 ELSE COALESCE(${column('subscription_current_price_cents')}, ${column('subscription_price_cents')}, 0) END`;
    candidates.push('(' + effective + (filters.price==='free'?' = 0)':' > 0)'));
  }
  return {inputs,bindings,candidates,conditions,ctes};
}
export { CATEGORY_GROUPS, byId };
