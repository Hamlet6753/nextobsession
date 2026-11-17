// Substring candidates come from the trigram index. Ranking stays in SQL,
// before the LIMIT and before cursor continuation.
const SEARCH_FIELDS = ['name', 'username', 'location', 'bio', 'website'];
const SEARCH_INDEX = 'creator_search_v1';
const separators = [' ', '\t', '\n', '\r', '.', ',', '_', '-', '/', '\\', '|', ':', ';', '!', '?', '(', ')', '[', ']', '{', '}', '"', "'", '@', '+', '&'];
const literal = value => "'" + value.replace(/'/g, "''") + "'";
export function searchPlan(q, columns) {
  const phrase = q.trim().replace(/^@/, '').replace(/\s+/gu, ' ').toLowerCase();
  const tokens = [...new Set(phrase.split(' ').filter(Boolean))];
  if (!tokens.length) return { inputs: [], bindings: [], ctes: [], source: 'creator_source', filter: '', rank: '0' };
  const inputs = ['? AS search_phrase', ...tokens.map((_, i) => '? AS term' + i)];
  const bindings = [phrase, ...tokens];
  const longTokens = tokens.filter(token => [...token].length >= 3);
  let filter = '';
  if (longTokens.length) {
    inputs.push('? AS search_match');
    bindings.push(longTokens.map(token => '"' + token.replace(/"/g, '""') + '"').join(' AND '));
    filter = ` WHERE creator.rowid IN (SELECT rowid FROM ${SEARCH_INDEX} WHERE ${SEARCH_INDEX} MATCH (SELECT search_match FROM input))`;
  }
  // SQLite lower() only folds ASCII. Fold the non-ASCII query characters'
  // uppercase variants as well, for literal substring checks and relevance.
  const mappings = [...new Set([...phrase])].filter(char => char.toUpperCase() !== char && [...char.toUpperCase()].length === 1 && char.charCodeAt(0) > 127);
  const normalized = SEARCH_FIELDS.map((field, i) => {
    let value = columns.has(field) ? `COALESCE(creator.${field}, '')` : "''";
    for (const char of mappings) value = `replace(${value}, ${literal(char.toUpperCase())}, ${literal(char)})`;
    value = `lower(${value})`;
    for (const whitespace of ['\t', '\n', '\r']) value = `replace(${value}, ${literal(whitespace)}, ' ')`;
    for (let pass = 0; pass < 7; pass++) value = `replace(${value}, '  ', ' ')`;
    value = `trim(${value})`;
    if (field === 'username') value = `ltrim(${value}, '@')`;
    return `${value} AS _search${i}`;
  });
  const words = SEARCH_FIELDS.map((_, i) => {
    let value = '_search' + i;
    for (const separator of separators.slice(1)) value = `replace(${value}, ${literal(separator)}, ' ')`;
    for (let pass = 0; pass < 7; pass++) value = `replace(${value}, '  ', ' ')`;
    return `(' ' || trim(${value}) || ' ') AS _words${i}`;
  });
  let wordPhrase = phrase;
  for (const separator of separators) wordPhrase = wordPhrase.split(separator).join(' ');
  wordPhrase = wordPhrase.replace(/\s+/gu, ' ').trim();
  inputs.push('? AS word_phrase'); bindings.push(wordPhrase);
  const containsAll = field => tokens.map((_, i) => `instr(${field}, input.term${i}) > 0`).join(' AND ');
  const allAnywhere = tokens.map((_, i) => '(' + SEARCH_FIELDS.map((_, f) => `instr(_search${f}, input.term${i}) > 0`).join(' OR ') + ')').join(' AND ');
  const rank = 'CASE ' + SEARCH_FIELDS.map((_, i) => {
    const field = '_search' + i, words = '_words' + i;
    // Prefix quality requires a complete word at the end of the query:
    // Rose Marie precedes Emma Rose, which precedes Roselyn.
    return `WHEN (${containsAll(field)}) THEN ${i * 10} + CASE ` +
      `WHEN ${field} = input.search_phrase THEN 0 ` +
      `WHEN input.word_phrase != '' AND instr(${words}, ' ' || input.word_phrase || ' ') = 1 THEN 1 ` +
      `WHEN input.word_phrase != '' AND instr(${words}, ' ' || input.word_phrase || ' ') > 0 THEN 2 ` +
      `WHEN instr(${field}, input.search_phrase) > 0 THEN 3 ELSE 4 END`;
  }).join(' ') + ' ELSE 50 END';
  const ctes = [
    `search_normalized AS (SELECT creator.*, creator.rowid AS _creator_rowid, ${normalized.join(', ')} FROM creator${filter})`,
    `search_words AS (SELECT search_normalized.*, ${words.join(', ')} FROM search_normalized)`,
    `search_scored AS (SELECT search_words.*, (${rank}) AS _relevance FROM search_words CROSS JOIN input WHERE ${allAnywhere})`
  ];
  return { inputs, bindings, ctes, source: 'search_scored', filter, rank };
}
