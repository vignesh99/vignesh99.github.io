(() => {
  'use strict';
  const arrangements = {
    home: { left: [.29, .72], right: [.47] },
    notes: { left: [.43], right: [.25, .74] },
    research: { left: [.27, .69], right: [.18, .48, .81] },
    about: { left: [.18, .48, .81], right: [.27, .69] },
    contact: { left: [.18, .48, .81], right: [.27, .69] }
  };
  const layer = document.createElement('div');
  layer.className = 'side-stars';
  layer.setAttribute('aria-hidden', 'true');
  document.body.append(layer);
  function layout() {
    const section = document.querySelector('.screen.is-active, .post-shell');
    if (!section) return;
    const config = arrangements[section.id] || arrangements[document.body.classList.contains('publication-page')?'research':'notes'];
    if (!config) return;
    const pane = section.querySelector('.section-scroll, .post-content').getBoundingClientRect();
    const bounds = section.getBoundingClientRect();
    layer.dataset.surface = 'water';
    layer.replaceChildren();
    let index = 0;
    for (const side of ['left', 'right']) {
      config[side].forEach((height, i) => {
        const star = document.createElement('span');
        star.className = 'side-star';
        star.dataset.side = side;
        // Place each glint in the available gutter, including narrow phone margins.
        const fraction = [.46, .65, .36][i];
        const x = side === 'left' ? pane.left * fraction : pane.right + (innerWidth - pane.right) * (1 - fraction);
        star.style.left = `${x}px`;
        star.style.top = `${bounds.top + 26 + height * Math.max(0, bounds.height - 60)}px`;
        star.style.setProperty('--twinkle', `${5.7 + index * 1.31}s`);
        star.style.setProperty('--drift', `${3.9 + index * .73}s`);
        star.style.setProperty('--phase', `${-index * 2.17 - 1.2}s`);
        star.innerHTML = '<span class="star-light"><span class="star-core"></span></span><span class="star-reflection"></span>';
        layer.append(star);
        index++;
      });
    }
  }
  addEventListener('sectionchange', layout);
  addEventListener('sectionlayout', layout);
  addEventListener('resize', layout);
  layout();
})();
