import { escape } from '../lib/html.js';
import { shell } from '../components/layout.js';
import { card } from '../components/creator.js';
import { htmlResponse } from '../lib/responses.js';
import { SORTS, directoryState, directoryPage, continuationUrl } from '../services/directory.js';
export async function homePage(url, env) {
  const state = directoryState(url);
  const { rows, next } = await directoryPage(env.DB, state);
  const sortOptions = Object.entries(SORTS).map(([value, option]) => `<option value="${value}"${state.sort === value ? ' selected' : ''}>${state.q && value === 'random' ? 'Relevance' : option.label}</option>`).join('');
  const loadArea = next ? `<div class="load-area"><div id="load-sentinel" aria-hidden="true"></div><p id="load-status" class="load-status" role="status" aria-live="polite"></p><a id="load-more" class="button secondary load-more" data-cursor="${escape(next)}" href="${escape(continuationUrl('/', state, next))}">Load more creators</a></div>` : (rows.length ? '<p class="load-area muted">You have reached the end.</p>' : '');
  return htmlResponse(shell('Discover creators',`<section class="hero"><div class="eyebrow">Find someone worth following</div><h1>Find your next obsession.</h1><p>Explore creators, discover new favorites, and follow what catches your eye.</p><form id="discovery-form" action="/" method="get"><div class="search"><input type="search" name="q" value="${escape(state.q)}" placeholder="Search creators, locations or bio" aria-label="Search creators, locations or bio" maxlength="80"><button type="submit">Search</button></div><div class="search-controls"><p class="notice">Search names, usernames, locations, bios or websites.</p><label class="sort-control" for="creator-sort">Sort by<select id="creator-sort" name="sort">${sortOptions}</select></label></div></form></section><div class="toolbar"><span>${state.q ? 'Results for '+escape(state.q)+' (most relevant first)' : 'Explore creators'}</span><span id="loaded-count">${rows.length} creators loaded</span>${state.q || state.sort !== 'random' ? '<a href="/">Reset</a>' : ''}</div>${rows.length ? '<div id="creator-grid" class="grid" aria-busy="false">'+rows.map(card).join('')+'</div>' : '<section class="empty"><h2>No creators found</h2><p>Try another name, username, location or bio.</p></section>'}${loadArea}`, true));
}
