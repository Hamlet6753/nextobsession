(() => {
  const button = document.getElementById('random-photo-more');
  const frame = document.getElementById('random-photo-frame');
  const image = document.getElementById('random-photo-image');
  const creator = document.getElementById('random-photo-creator');
  const status = document.getElementById('random-photo-status');
  if (!button || !frame || !image || !creator || !status) return;
  let busy = false;
  image.addEventListener('error', () => { status.textContent = 'This photo could not be loaded. Try More.'; });
  if (image.getAttribute('src') && image.complete && !image.naturalWidth) status.textContent = 'This photo could not be loaded. Try More.';
  function preload(url) {
    return new Promise((resolve, reject) => {
      const photo = new Image();
      const timeout = setTimeout(() => { photo.src = ''; reject(new Error('Image timeout')); }, 15000);
      photo.referrerPolicy = 'no-referrer';
      photo.onload = () => { clearTimeout(timeout); resolve(); };
      photo.onerror = () => { clearTimeout(timeout); reject(new Error('Image unavailable')); };
      photo.src = url;
    });
  }
  button.addEventListener('click', async () => {
    if (busy) return;
    busy = true; button.disabled = true; button.textContent = 'Loading...';
    frame.setAttribute('aria-busy', 'true'); status.textContent = '';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const url = new URL('/api/random-photo', window.location.origin);
      const current = image.getAttribute('src');
      if (current) url.searchParams.set('exclude', current);
      const response = await fetch(url, {signal:controller.signal, cache:'no-store'});
      if (!response.ok) throw new Error('Request failed');
      const {photo} = await response.json();
      if (!photo) { status.textContent = 'No more photos available right now.'; return; }
      const source = new URL(photo.image_url);
      if (!['https:', 'http:'].includes(source.protocol) || !/^\/creator\/[a-zA-Z0-9_.%-]+$/.test(photo.creator_url)) throw new Error('Invalid photo');
      await preload(source.href);
      image.src = source.href; image.alt = photo.name; image.hidden = false;
      creator.href = photo.creator_url; creator.textContent = photo.name; creator.hidden = false;
      document.title = 'Random Photos - ' + photo.name + ' | NextObsession.fans';
    } catch {
      status.textContent = 'Could not load the next photo. Please try More again.';
    } finally {
      clearTimeout(timeout); busy = false; button.disabled = false; button.textContent = 'More'; frame.setAttribute('aria-busy', 'false');
    }
  });
})();
