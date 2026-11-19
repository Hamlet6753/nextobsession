import { shell } from '../components/layout.js';
import { escape } from '../lib/html.js';
import { htmlResponse } from '../lib/responses.js';
import { randomPhoto } from '../services/random-photo.js';

export async function randomPhotosPage(url, env) {
  const photo = await randomPhoto(env.DB);
  const content = `<section class="random-photos" aria-labelledby="random-photos-title">
    <div class="random-photos-heading"><div><a class="back" href="/">Back to discovery</a><h1 id="random-photos-title">Random Photos</h1></div><button type="button" id="random-photo-more">More</button></div>
    <figure class="random-photo-frame" id="random-photo-frame" data-image-gallery aria-busy="false">
      <button type="button" class="photo-open random-photo-open" id="random-photo-open" aria-haspopup="dialog" ${photo ? `data-image-url="${escape(photo.image_url)}" data-image-title="${escape(photo.name)}" aria-label="${escape('Open '+photo.name)}"` : 'hidden'}>
        ${photo ? `<img id="random-photo-image" src="${escape(photo.image_url)}" alt="${escape(photo.name)}" referrerpolicy="no-referrer">` : '<img id="random-photo-image" alt="" hidden>'}
        <span class="photo-hint" aria-hidden="true">View image</span>
      </button>
      <figcaption><a id="random-photo-creator" ${photo ? `href="${escape(photo.creator_url)}"` : 'hidden'}>${photo ? escape(photo.name) : ''}</a></figcaption>
    </figure>
    <p class="random-photo-status" id="random-photo-status" role="status" aria-live="polite">${photo ? '' : 'No photos available yet.'}</p>
    <noscript><p>Enable JavaScript to load another photo, or refresh this page.</p></noscript>
  </section>`;
  return htmlResponse(shell(photo ? 'Random Photos - ' + photo.name : 'Random Photos', content, false, {url,adult:true,indexable:false,
    description:'Discover creators through random public profile photos.',randomPhotos:true}));
}
