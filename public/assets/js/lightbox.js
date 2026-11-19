(() => {
  const dialog = document.getElementById('image-dialog');
  if (!dialog) return;
  const stage = dialog.querySelector('.lightbox-stage');
  const title = dialog.querySelector('#image-dialog-title');
  const status = dialog.querySelector('.lightbox-status');
  const original = dialog.querySelector('.lightbox-original');
  const close = dialog.querySelector('.lightbox-close');
  const previous = dialog.querySelector('.lightbox-prev');
  const next = dialog.querySelector('.lightbox-next');
  const counter = dialog.querySelector('.lightbox-counter');
  const zoom = dialog.querySelector('.lightbox-zoom');
  const levels = [1, 2, 3, 4];
  let activeImage = null, opener = null, previousOverflow = '', gallery = [], index = 0;
  let zoomIndex = 0, offsetX = 0, offsetY = 0, baseWidth = 0, baseHeight = 0, loaded = false, gesture = null;
  let ignoreOverlayClickUntil = 0;
  function validUrl(value) {
    try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : null; }
    catch { return null; }
  }
  function stopDrag() {
    if (gesture && stage.hasPointerCapture(gesture.id)) stage.releasePointerCapture(gesture.id);
    gesture = null;
    stage.classList.remove('is-dragging');
  }
  function applyZoom() {
    const scale = levels[zoomIndex];
    const maxX = Math.max(0, (baseWidth * scale - stage.clientWidth) / 2);
    const maxY = Math.max(0, (baseHeight * scale - stage.clientHeight) / 2);
    offsetX = Math.max(-maxX, Math.min(maxX, offsetX));
    offsetY = Math.max(-maxY, Math.min(maxY, offsetY));
    if (activeImage) {
      activeImage.style.transform = 'translate(-50%, -50%) translate(' + offsetX + 'px, ' + offsetY + 'px) scale(' + scale + ')';
      activeImage.setAttribute('aria-label', 'Image zoom ' + Math.round(scale * 100) + ' percent. Click or press Enter to zoom; after 400 percent, return to fit.');
    }
    stage.classList.toggle('is-zoomed', zoomIndex > 0);
    zoom.textContent = Math.round(scale * 100) + '%';
  }
  function resetZoom() {
    stopDrag(); zoomIndex = 0; offsetX = offsetY = 0; applyZoom();
  }
  function fitImage() {
    if (!loaded || !activeImage || !stage.clientWidth || !stage.clientHeight) return;
    const ratio = Math.min(stage.clientWidth / activeImage.naturalWidth, stage.clientHeight / activeImage.naturalHeight);
    baseWidth = activeImage.naturalWidth * ratio;
    baseHeight = activeImage.naturalHeight * ratio;
    activeImage.style.width = baseWidth + 'px';
    activeImage.style.height = baseHeight + 'px';
    applyZoom();
  }
  function cycleZoom(clientX, clientY) {
    if (!loaded) return;
    const previousScale = levels[zoomIndex];
    zoomIndex = (zoomIndex + 1) % levels.length;
    if (zoomIndex === 0) { resetZoom(); return; }
    const rect = stage.getBoundingClientRect();
    const x = clientX == null ? 0 : clientX - rect.left - stage.clientWidth / 2;
    const y = clientY == null ? 0 : clientY - rect.top - stage.clientHeight / 2;
    const ratio = levels[zoomIndex] / previousScale;
    offsetX = x - (x - offsetX) * ratio;
    offsetY = y - (y - offsetY) * ratio;
    applyZoom();
  }
  function render() {
    loaded = false; resetZoom();
    const item = gallery[index];
    title.textContent = item.title;
    original.href = item.url;
    counter.textContent = gallery.length > 1 ? (index + 1) + ' / ' + gallery.length : '';
    previous.hidden = next.hidden = gallery.length < 2;
    status.textContent = 'Loading image...';
    stage.setAttribute('aria-busy', 'true');
    const img = new Image(); activeImage = img;
    img.alt = item.title; img.referrerPolicy = 'no-referrer'; img.className = 'lightbox-image'; img.draggable = false;
    img.tabIndex = 0; img.setAttribute('role', 'button');
    img.addEventListener('load', () => {
      if (activeImage !== img) return;
      loaded = true;
      status.textContent = '';
      stage.setAttribute('aria-busy', 'false');
      fitImage(); img.classList.add('is-loaded');
    });
    img.addEventListener('error', () => {
      if (activeImage !== img) return;
      loaded = false; resetZoom();
      status.textContent = 'This image could not be loaded. Try opening the source image.';
      stage.setAttribute('aria-busy', 'false'); img.hidden = true;
    });
    img.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); cycleZoom(); }
    });
    stage.replaceChildren(img); img.src = item.url;
  }
  function move(direction) {
    if (!dialog.open || gallery.length < 2) return;
    index = (index + direction + gallery.length) % gallery.length; render();
  }
  dialog.addEventListener('close', () => {
    loaded = false; resetZoom(); activeImage = null; gallery = []; stage.replaceChildren();
    document.body.style.overflow = previousOverflow;
    if (opener && opener.isConnected) opener.focus({preventScroll:true}); opener = null;
  });
  close.addEventListener('click', () => dialog.close());
  previous.addEventListener('click', () => move(-1));
  next.addEventListener('click', () => move(1));
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault(); move(event.key === 'ArrowLeft' ? -1 : 1);
    }
  });
  dialog.addEventListener('click', event => {
    if (Date.now() < ignoreOverlayClickUntil) return;
    if (event.target === dialog || event.target === stage || event.target.classList?.contains('lightbox-frame')) dialog.close();
  });
  stage.addEventListener('wheel', event => {
    if (!dialog.open || !loaded || zoomIndex === 0 || event.ctrlKey) return;
    event.preventDefault();
    stopDrag();
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? stage.clientHeight : 1;
    const dx = event.shiftKey && !event.deltaX ? event.deltaY : event.deltaX;
    const dy = event.shiftKey && !event.deltaX ? 0 : event.deltaY;
    offsetX -= dx * unit; offsetY -= dy * unit;
    applyZoom();
  }, {passive:false});
  stage.addEventListener('pointerdown', event => {
    if (!loaded || !event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
    stopDrag();
    gesture = {id:event.pointerId, x:event.clientX, y:event.clientY, startX:offsetX, startY:offsetY, moved:false, touch:event.pointerType === 'touch', onImage:event.target === activeImage};
    stage.setPointerCapture(event.pointerId);
    if (event.pointerType === 'mouse') event.preventDefault();
  });
  stage.addEventListener('pointermove', event => {
    if (!gesture || gesture.id !== event.pointerId) return;
    const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
    if (Math.hypot(dx, dy) > 5) gesture.moved = true;
    if (zoomIndex > 0 && gesture.moved) {
      stage.classList.add('is-dragging');
      offsetX = gesture.startX + dx; offsetY = gesture.startY + dy; applyZoom();
    }
  });
  stage.addEventListener('pointerup', event => {
    if (!gesture || gesture.id !== event.pointerId) return;
    const current = gesture, dx = event.clientX - current.x, dy = event.clientY - current.y;
    const moved = current.moved || Math.hypot(dx, dy) > 5;
    stopDrag();
    // Pointer capture can retarget the subsequent click to the overlay.
    ignoreOverlayClickUntil = Date.now() + 400;
    if (!moved && current.onImage) cycleZoom(event.clientX, event.clientY);
    else if (!moved) dialog.close();
    else if (zoomIndex === 0 && current.touch && Math.abs(dx) >= 50 && Math.abs(dx) > Math.abs(dy) * 1.4) move(dx < 0 ? 1 : -1);
  });
  stage.addEventListener('pointercancel', stopDrag);
  stage.addEventListener('lostpointercapture', () => { gesture = null; stage.classList.remove('is-dragging'); });
  if ('ResizeObserver' in window) new ResizeObserver(() => { stopDrag(); fitImage(); }).observe(stage);
  else window.addEventListener('resize', () => { stopDrag(); fitImage(); });
  document.addEventListener('click', event => {
    const button = event.target.closest('button[data-image-url]');
    if (!button || !validUrl(button.dataset.imageUrl)) return;
    const scope = button.closest('.profile-box, [data-image-gallery]'); if (!scope) return;
    const buttons = [...scope.querySelectorAll('button[data-image-url]')];
    gallery = buttons.map(el => ({url:validUrl(el.dataset.imageUrl),title:el.dataset.imageTitle || 'Image preview',element:el})).filter(item => item.url);
    index = gallery.findIndex(item => item.element === button); if (index < 0) return;
    opener = button; previousOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    dialog.showModal(); render(); close.focus();
  });
})();
