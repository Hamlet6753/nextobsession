import { byId } from '../services/filters.js';
import { DISCOVERY_LINKS, discoveryIcon, visibleFilters } from '../config/discovery.js';
import { discoveryLinks, heroIcon } from '../components/discovery.js';
import { categoryPresentation } from '../services/category-presentation.js';
import { filterPanel, filterChips } from '../components/filters.js';
import { escape } from '../lib/html.js';
import { shell } from '../components/layout.js';
import { card } from '../components/creator.js';
import { htmlResponse } from '../lib/responses.js';
import { SORTS, directoryState, directoryPage, continuationUrl } from '../services/directory.js';
export async function homePage(url, env) {
  const state = directoryState(url);
  const category = categoryPresentation(state);
  const singleCategory = state.filters.categories.length === 1 ? byId.get(state.filters.categories[0]) : null;
  const heading = singleCategory ? `Find your next ${singleCategory.label} obsession.` : 'Find your next obsession.';
  const isNew = state.browse === 'new' && !state.q && !state.filters.categories.length && !state.filters.location && !state.filters.price;
  const title = category?.title || (isNew ? 'Discover new creators' : 'Discover creators');
  const heroDescription = category?.description || (isNew ? 'Discover recently updated creator profiles and find someone new to follow.' : '') || 'Explore creators, discover new favorites, and follow what catches your eye.';
  const { rows, next } = await directoryPage(env.DB, state);
  const sortOptions = Object.entries(SORTS).filter(([value])=>state.isSerp ? value!=='random' : value!=='default').map(([value, option]) => `<option value="${value}"${state.sort === value ? ' selected' : ''}>${state.q && value === 'random' ? 'Relevance' : option.label}</option>`).join('');
  const loadArea = next ? `<div class="load-area"><div id="load-sentinel" aria-hidden="true"></div><p id="load-status" class="load-status" role="status" aria-live="polite"></p><a id="load-more" class="button secondary load-more" data-cursor="${escape(next)}" href="${escape(continuationUrl('/', state, next))}">Load more creators</a></div>` : (rows.length ? '<p class="load-area muted">You have reached the end.</p>' : '');
  const icon = discoveryIcon(state);
  const controls = visibleFilters(state);
  const showReset = state.browse ? Boolean(state.q || controls.categories.length || controls.location || controls.price) : state.isSerp || state.sort !== 'random';
  // Browse pages have no dialog; keep URL-supplied extra filters on form submit.
  const browseFilters = state.browse ? [
    ...controls.categories.map(id => `<input type="hidden" name="category" value="${escape(id)}">`),
    ...(controls.location ? [`<input type="hidden" name="location" value="${escape(controls.location)}">`] : []),
    ...(controls.price ? [`<input type="hidden" name="price" value="${escape(controls.price)}">`] : [])
  ].join('') : '';
  return htmlResponse(shell(title,`<section class="hero"><div class="eyebrow">Find someone worth following</div><div class="discovery-heading"><h1>${escape(heading)}</h1>${heroIcon(icon)}</div><p>${escape(heroDescription)}</p><form id="discovery-form" action="/" method="get">${state.browse ? `<input type="hidden" name="browse" value="${escape(state.browse)}">` : ''}${browseFilters}<div class="search"><input type="search" name="q" value="${escape(state.q)}" placeholder="Search creators, locations or bio" aria-label="Search creators, locations or bio" maxlength="80"><button type="submit">Search</button></div>${discoveryLinks(state)}<div class="search-controls">${state.browse ? '' : filterPanel(state)}<p class="notice">Search names, usernames, locations, bios or websites.</p><label class="sort-control" for="creator-sort">Sort by<select id="creator-sort" name="sort">${sortOptions}</select></label></div></form></section>${showReset ? `<div class="toolbar"><a href="${state.browse ? '/?browse=' + escape(state.browse) : '/'}">Reset</a></div>` : ''}${filterChips(state)}${rows.length ? '<div id="creator-grid" class="grid" aria-busy="false">'+rows.map(card).join('')+'</div>' : '<section class="empty"><h2>No creators found</h2><p>Try another name, username, location or bio.</p></section>'}${loadArea}`, true,{url,directory:true,rows,state,indexable:!state.isSerp&&state.sort==='random'&&!state.cursor,category,discoveryLinks:DISCOVERY_LINKS,collectionTitle:title,heading,description:heroDescription,adult:true}));
}
