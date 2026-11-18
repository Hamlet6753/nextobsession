(() => {
  const dialog = document.getElementById('age-gate');
  const enter = document.getElementById('age-gate-enter');
  if (!dialog || !enter) return;
  const key = 'nextobsession.age-confirmed.v1';
  const duration = 30 * 24 * 60 * 60 * 1000;
  function confirmed() {
    try {
      const timestamp = Number(localStorage.getItem(key));
      return timestamp > 0 && timestamp <= Date.now() && Date.now() - timestamp < duration;
    } catch { return false; }
  }
  function show() {
    if (confirmed() || dialog.open) return;
    dialog.showModal();
    document.documentElement.classList.add('age-gate-open');
    enter.focus({preventScroll: true});
  }
  dialog.addEventListener('cancel', event => event.preventDefault());
  enter.addEventListener('click', () => {
    try { localStorage.setItem(key, String(Date.now())); } catch { /* Storage may be disabled. */ }
    dialog.close();
    document.documentElement.classList.remove('age-gate-open');
  });
  // Recheck pages restored from the browser's back/forward cache.
  window.addEventListener('pageshow', show);
  show();
})();
