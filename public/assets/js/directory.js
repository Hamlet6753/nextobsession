(() => {
  const grid = document.getElementById('creator-grid');
  const more = document.getElementById('load-more');
  const sentinel = document.getElementById('load-sentinel');
  const status = document.getElementById('load-status');
  const count = document.getElementById('loaded-count');
  function updateCount() { if(count&&grid)count.textContent=grid.querySelectorAll('[data-username]').length+' creators loaded'; }
  const sort = document.getElementById('creator-sort');
  if (sort) sort.addEventListener('change', () => sort.form.requestSubmit());
  const form=document.getElementById('discovery-form');
  if(form)form.addEventListener('submit',()=>{
    const query=form.querySelector('[name=q]');
    const active=Boolean(query?.value.trim() || form.querySelector('[name=category]:checked') || [...form.querySelectorAll('[name=location]')].some(el=>el.value.trim()) || form.querySelector('[name=price]:checked')?.value);
    if(sort&&active)sort.disabled=true;
  });
  if (!grid || !more || !sentinel) return;
  const seen = new Set([...grid.querySelectorAll('[data-username]')].map(el => el.dataset.username));
  let busy = false, failed = false, observer = null;

  function finish() {
    more.hidden = true;
    if (observer) observer.disconnect();
    status.textContent = 'You have reached the end.';
  }
  async function load() {
    if (busy || more.hidden) return;
    busy = true;
    failed = false;
    grid.setAttribute('aria-busy', 'true');
    more.setAttribute('aria-disabled', 'true');
    status.textContent = 'Loading creators...';
    const previousCursor = more.dataset.cursor;
    try {
      const target = new URL(more.href);
      target.pathname = '/api/creators';
      const response = await fetch(target, { headers: { Accept: 'application/json' }, cache: 'no-store' });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const data = await response.json();
      if (typeof data.html !== 'string' || !(data.next === null || typeof data.next === 'string')) throw new Error('Invalid response');
      if (data.next && data.next === previousCursor) throw new Error('Continuation did not advance');
      const template = document.createElement('template');
      template.innerHTML = data.html;
      for (const element of [...template.content.children]) {
        if (!element.matches('article.card[data-username]') || seen.has(element.dataset.username)) continue;
        seen.add(element.dataset.username);
        grid.appendChild(element);
      }
      updateCount();
      if (!data.next) finish();
      else {
        target.pathname = '/';
        target.searchParams.set('cursor', data.next);
        more.href = target.pathname + target.search;
        more.dataset.cursor = data.next;
        more.textContent = 'Load more creators';
        status.textContent = '';
      }
    } catch (error) {
      failed = true;
      status.textContent = 'Could not load more creators. Please try again.';
      more.textContent = 'Try again';
    } finally {
      busy = false;
      grid.setAttribute('aria-busy', 'false');
      more.removeAttribute('aria-disabled');
      // Continue filling a tall viewport, but never automatically retry errors.
      if (!failed && !more.hidden && sentinel.getBoundingClientRect().top < window.innerHeight + 600) {
        window.setTimeout(load, 120);
      }
    }
  }
  more.addEventListener('click', event => { event.preventDefault(); load(); });
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting) && !failed) load();
    }, { rootMargin: '600px' });
    observer.observe(sentinel);
  }
  updateCount();
})();
