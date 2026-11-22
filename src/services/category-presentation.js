import { CATEGORY_GROUPS } from '../config/categories.js';
const categories = new Map(CATEGORY_GROUPS.flatMap(group => group.items.map(item => [item.id, item])));
// Sort and pagination keep category copy; additional search filters use generic copy.
export function categoryPresentation(state) {
  const filters = state.filters;
  if (state.q || !filters || filters.categories.length !== 1 || filters.location || filters.price) return null;
  const category = categories.get(filters.categories[0]);
  return category ? { id: category.id, label: category.label, description: category.description, title: `Discover ${category.label} creators` } : null;
}
