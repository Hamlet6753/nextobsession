import { DISCOVERY_LINKS } from '../config/discovery.js';
import { escape } from '../lib/html.js';
const icon = id => `<span class="discovery-icon discovery-icon--${escape(id)}" aria-hidden="true"></span>`;
export function discoveryLinks(state) {
  return `<nav class="discovery-links" aria-label="Quick discovery">${DISCOVERY_LINKS.map(link => `<a class="discovery-link${state.browse === link.id ? ' is-active' : ''}" href="${link.href}"${state.browse === link.id ? ' aria-current="page"' : ''}>${icon(link.id)}<span>${link.label}</span></a>`).join('')}</nav>`;
}
export function heroIcon(id) {
  return id ? `<span class="hero-discovery-icon" aria-hidden="true">${icon(id)}</span>` : '';
}
