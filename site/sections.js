(() => {
  'use strict';
  const screens = [...document.querySelectorAll('#section-deck > .screen')];
  const previous = document.querySelector('#previous-section');
  const next = document.querySelector('#next-section');
  const publicHash = id => '#' + ({ notes: 'writing', research: 'publications' }[id] || id);
  const sectionId = hash => ({ writing: 'notes', publications: 'research', teaching: 'about' }[hash.slice(1)] || hash.slice(1));
  let active = -1;
  const currentPane = () => screens[active]?.querySelector('.section-scroll');
  const canScroll = (pane, direction) => pane && (direction > 0
    ? pane.scrollTop + pane.clientHeight < pane.scrollHeight - 2
    : pane.scrollTop > 2);
  function show(index, { replace = false, focus = false, source = 'step' } = {}) {
    index = Math.max(0, Math.min(screens.length - 1, index));
    if (index === active) {
      if (location.hash !== publicHash(screens[index].id)) history.replaceState(null, '', publicHash(screens[index].id));
      return;
    }
    const previousIndex = active;
    const change = { from: screens[previousIndex]?.id ?? null, to: screens[index].id,
      direction: Math.sign(index - previousIndex), source };
    dispatchEvent(new CustomEvent('sectionwillchange', { detail: change }));
    active = index;
    screens.forEach((screen, i) => {
      screen.hidden = i !== index;
      screen.classList.toggle('is-active', i === index);
    });
    const screen = screens[index];
    document.body.dataset.section = screen.id;
    document.querySelectorAll('.site-header a[href^="#"]').forEach(link => {
      if (sectionId(link.hash) === screen.id) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    previous.disabled = index === 0;
    next.disabled = false;
    previous.textContent = index > 0 ? `↑ ${screens[index - 1].dataset.label}` : '↑ Previous';
    next.textContent = index < screens.length - 1 ? `${screens[index + 1].dataset.label} ↓` : 'Back to top ↑';
    if (location.hash !== publicHash(screen.id)) history[replace ? 'replaceState' : 'pushState'](null, '', publicHash(screen.id));
    if (focus) currentPane().focus({ preventScroll: true });
    dispatchEvent(new CustomEvent('sectionchange', { detail: change }));
    // Re-measure once the brief entrance transform has finished.
    setTimeout(() => dispatchEvent(new Event('sectionlayout')), 300);
  }
  function fromHash() {
    const teaching = location.hash === '#teaching';
    const index = screens.findIndex(screen => screen.id === sectionId(location.hash));
    show(index < 0 ? 0 : index, { replace: true, source: 'history' });
    if (teaching) {
      document.querySelector('#teaching').closest('details').open = true;
    }
  }
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const index = screens.findIndex(screen => screen.id === sectionId(link.hash));
    if (index < 0) return;
    event.preventDefault(); show(index, { focus: true, source: link.closest('.site-header') ? 'navigation' : 'link' });
  });
  previous.addEventListener('click', () => show(active - 1, { focus: true }));
  next.addEventListener('click', () => {
    const target = active === screens.length - 1 ? 0 : active + 1;
    if (target === 0) screens[0].querySelector('.section-scroll').scrollTop = 0;
    show(target, { focus: true });
  });
  addEventListener('popstate', fromHash);
  addEventListener('hashchange', fromHash);

  let lastWheel = -Infinity, wheelLockUntil = 0, wheelAmount = 0, changedThisGesture = false, readThisGesture = false;
  document.addEventListener('wheel', event => {
    if (event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY) || !event.deltaY) return;
    const time = performance.now();
    if (time - lastWheel > 180 && time >= wheelLockUntil) { wheelAmount = 0; changedThisGesture = false; readThisGesture = false; }
    lastWheel = time;
    if (changedThisGesture) { event.preventDefault(); return; }
    const direction = Math.sign(event.deltaY), pane = currentPane();
    if (pane.contains(event.target) && canScroll(pane, direction)) {
      readThisGesture = true; wheelAmount = 0; return;
    }
    event.preventDefault();
    // A gesture that was reading content cannot spill into the next section.
    if (readThisGesture) return;
    wheelAmount += event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? pane.clientHeight : 1);
    if (Math.abs(wheelAmount) >= 45) {
      show(active + Math.sign(wheelAmount), { replace: true });
      changedThisGesture = true;
      wheelLockUntil = time + 300;
    }
  }, { passive: false });

  document.addEventListener('keydown', event => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.target.closest('a,button,summary,input,textarea,select,[contenteditable=true]')) return;
    const direction = ['ArrowDown', 'PageDown', ' '].includes(event.key) ? (event.shiftKey ? -1 : 1)
      : ['ArrowUp', 'PageUp'].includes(event.key) ? -1 : 0;
    if (!direction) return;
    event.preventDefault();
    const pane = currentPane();
    if (canScroll(pane, direction)) {
      const amount = event.key.startsWith('Arrow') ? 44 : pane.clientHeight * .85;
      pane.scrollBy({ top: direction * amount, behavior: 'auto' });
    } else if (!event.repeat) show(active + direction, { focus: true });
  });

  let touch = null;
  document.addEventListener('touchstart', event => {
    if (event.touches.length !== 1) { touch = null; return; }
    const point = event.touches[0];
    touch = { x: point.clientX, y: point.clientY, target: event.target, reading: false };
  }, { passive: true });
  document.addEventListener('touchmove', event => {
    if (!touch || event.touches.length !== 1) return;
    const dy = touch.y - event.touches[0].clientY, pane = currentPane();
    if (pane.contains(touch.target) && canScroll(pane, Math.sign(dy))) touch.reading = true;
    else if (!touch.reading) event.preventDefault();
  }, { passive: false });
  document.addEventListener('touchend', event => {
    if (!touch) return;
    const point = event.changedTouches[0], dx = point.clientX - touch.x, dy = touch.y - point.clientY;
    if (!touch.reading && Math.abs(dy) > 60 && Math.abs(dy) > Math.abs(dx) * 1.3) show(active + Math.sign(dy), { replace: true });
    touch = null;
  }, { passive: true });
  fromHash();
})();
