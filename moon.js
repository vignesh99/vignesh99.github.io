(() => {
  function centerLetters() {
    document.querySelectorAll('.moon-initials text').forEach(text => {
      text.setAttribute('x', '50');
      text.setAttribute('y', '50');
      const box = text.getBBox();
      if (!box.width || !box.height) return;
      text.setAttribute('x', String(100 - box.x - box.width / 2));
      // A small optical offset below the geometric center (about 1.7 CSS px).
      text.setAttribute('y', String(103 - box.y - box.height / 2));
    });
  }
  document.fonts.ready.then(centerLetters);
  addEventListener('sectionchange', centerLetters);
})();
