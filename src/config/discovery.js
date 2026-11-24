// These are shortcuts to existing categories, not new keyword rules.
export const DISCOVERY_LINKS = [
  { id: 'new', label: 'New', sort: 'updated_desc' },
  { id: 'blonde', label: 'Blonde', category: 'blonde' },
  { id: 'trans', label: 'Trans', category: 'trans' },
  { id: 'anime', label: 'Anime', category: 'anime' },
  { id: 'redhead', label: 'Redhead', category: 'redhead' },
  { id: 'anal', label: 'Anal', category: 'anal' },
  { id: 'fetish', label: 'Fetish', category: 'fetish' }
].map(link => ({ ...link, href: '/?browse=' + link.id }));
export const discoveryById = new Map(DISCOVERY_LINKS.map(link => [link.id, link]));
export function visibleFilters(state) {
  const base = discoveryById.get(state.browse)?.category;
  return { ...state.filters, categories: state.filters.categories.filter(id => id !== base) };
}
export function discoveryIcon(state) {
  const count = state.filters.categories.length + Boolean(state.filters.location) + Boolean(state.filters.price);
  if (count === 1) {
    if (state.filters.categories.length) return state.filters.categories[0];
    return state.filters.location ? 'location' : state.filters.price;
  }
  return state.browse === 'new' && count === 0 && !state.q ? 'new' : null;
}
