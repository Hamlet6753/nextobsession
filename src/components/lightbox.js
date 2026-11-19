export const lightboxMarkup = `<dialog id="image-dialog" class="lightbox" aria-labelledby="image-dialog-title">
  <h2 id="image-dialog-title" class="lightbox-title">Image preview</h2>
  <div class="lightbox-frame">
    <div class="lightbox-stage" aria-busy="false"></div>
    <button type="button" class="lightbox-nav lightbox-prev" aria-label="Previous image" hidden>&#8249;</button>
    <button type="button" class="lightbox-nav lightbox-next" aria-label="Next image" hidden>&#8250;</button>
  </div>
  <button type="button" class="lightbox-close" aria-label="Close image preview" autofocus><svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>
  <div class="lightbox-bottom">
    <span class="lightbox-zoom" aria-label="Zoom level">100%</span>
    <span class="lightbox-counter" aria-live="polite" aria-atomic="true"></span>
    <span class="lightbox-status" role="status" aria-live="polite"></span>
    <a class="lightbox-original" href="#" target="_blank" rel="noopener noreferrer nofollow">Open source image</a>
  </div>
</dialog>`;
