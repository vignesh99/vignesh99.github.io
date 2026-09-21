(() => {
  'use strict';
  // Native details groups handle current browsers; this also supports older ones.
  document.addEventListener('toggle', event => {
    const panel = event.target;
    if (!(panel instanceof HTMLDetailsElement) || !panel.getAttribute('name')) return;
    if (panel.open) {
      document.querySelectorAll('details[name]').forEach(other => {
        if (other !== panel && other.getAttribute('name') === panel.getAttribute('name')) other.open = false;
      });
    }
    requestAnimationFrame(() => {
      if (panel.open) {
        const reader = panel.closest('.section-scroll, .post-shell');
        const summary = panel.querySelector('summary');
        if (reader && summary) {
          const area = reader.getBoundingClientRect(), heading = summary.getBoundingClientRect();
          if (heading.top < area.top + 8 || heading.bottom > area.bottom - 8) {
            reader.scrollTop += heading.top - area.top - 8;
          }
        }
      }
      dispatchEvent(new Event('sectionlayout'));
    });
  }, true);
})();
