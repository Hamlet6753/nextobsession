import { card } from './creator.js';
const arrow=direction=>`<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="${direction==='prev'?'m14 6-6 6 6 6':'m10 6 6 6-6 6'}"/></svg>`;
export function relatedCreatorsMarkup(rows) {
  if(!rows.length)return '';
  return `<section id="related-creators" class="related-creators" aria-labelledby="related-title" data-related-creators><div class="related-heading"><h2 id="related-title">Discover more creators</h2><div class="related-controls" hidden><button type="button" data-related-prev aria-label="Previous creators" disabled>${arrow('prev')}</button><button type="button" data-related-next aria-label="Next creators">${arrow('next')}</button></div></div><div class="related-viewport" tabindex="0" aria-label="Other creators"><div class="related-track">${rows.map(card).join('')}</div></div><div class="related-bottom"><span class="related-status" aria-live="polite"></span><a class="button related-explore" href="/">Explore more</a></div></section>`;
}
