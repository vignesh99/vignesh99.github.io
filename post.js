(() => {
  'use strict';
  if (typeof renderMathInElement === 'function') {
    renderMathInElement(document.querySelector('.post-body'), {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false },
        { left: '\\(', right: '\\)', display: false },
        { left: '\\[', right: '\\]', display: true }
      ],
      throwOnError: false,
      strict: 'ignore'
    });
  }
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const savedMotion = () => { try { return localStorage.getItem('water-still') === 'true'; } catch { return false; } };
  try {
    const stream = createStream(document.querySelector('#stream-canvas'), document.querySelector('#ripple-canvas'), { paused: reduced.matches || savedMotion() });
    window.stream = stream;
    const applyMotion=()=>{const paused=reduced.matches||savedMotion();document.body.classList.toggle('still',paused);stream.setPaused(paused);};
    applyMotion();
    reduced.addEventListener('change', applyMotion);
    addEventListener('storage', event => { if (event.key === 'water-still') applyMotion(); });
  } catch (error) { console.error('Article ripple renderer:', error); }
  const reader = document.querySelector('.post-shell');
  reader.tabIndex = 0;
  if (!location.hash) reader.focus({ preventScroll: true });
  else {
    const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    target?.scrollIntoView();
  }
})();
