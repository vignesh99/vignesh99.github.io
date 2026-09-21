(() => {
  'use strict';
  const timers = new WeakMap();
  document.addEventListener('click', async event => {
    const button = event.target.closest('.copy-bibtex');
    if (!button) return;
    const text = button.dataset.bibtex;
    if (!text) return;
    const group = button.closest('.abstract-tools');
    const status = group.querySelector('.copy-status');
    clearTimeout(timers.get(button));
    let copied = false;
    try { await navigator.clipboard.writeText(text); copied = true; } catch {}
    if (!copied) {
      // A selectable copy remains available if clipboard permission is denied.
      let field = group.querySelector('.bibtex-fallback');
      if (!field) {
        field = document.createElement('textarea');
        field.className = 'bibtex-fallback';field.readOnly = true;
        field.setAttribute('aria-label', 'BibTeX citation');group.append(field);
      }
      field.value = text;field.focus({ preventScroll: true });field.select();
      try { copied = document.execCommand('copy'); } catch {}
      if (copied) { field.remove();button.focus({ preventScroll: true }); }
    }
    button.textContent = copied ? 'Copied' : 'Copy BibTeX';
    status.textContent = copied ? 'BibTeX copied.' : 'Select and copy the citation below.';
    if (copied) timers.set(button, setTimeout(() => {
      button.textContent = 'Copy BibTeX';status.textContent = '';
    }, 2200));
  });
})();
