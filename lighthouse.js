(() => {
  'use strict';
  const wordmark = document.querySelector('.site-header .wordmark, .post-header .wordmark');
  if (!wordmark) return;
  wordmark.querySelector('.water-mark')?.remove();
  const mark = document.createElement('span');
  mark.className = 'lighthouse-mark';
  mark.setAttribute('aria-hidden', 'true');
  for (const part of ['roof', 'lantern', 'gallery', 'tower', 'base']) {
    const element = document.createElement('span');
    element.className = 'lighthouse-' + part;
    mark.append(element);
  }
  document.body.append(mark);
  const canvas = document.createElement('canvas');
  canvas.id = 'lighthouse-beam';
  canvas.setAttribute('aria-hidden', 'true');
  const water = document.querySelector('#stream-canvas');
  if (water) water.after(canvas); else document.body.prepend(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  document.body.classList.add('lighthouse-lighting');
  dispatchEvent(new Event('sectionlayout'));
  let pending = false;
  function draw() {
    pending = false;
    const pane = document.querySelector('.screen:not([hidden]) .section-scroll, .post-content');
    if (!pane) return;
    const scale = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(innerWidth * scale);
    canvas.height = Math.round(innerHeight * scale);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    const lamp = mark.querySelector('.lighthouse-lantern').getBoundingClientRect();
    const r = pane.getBoundingClientRect();
    const sx = lamp.left + lamp.width / 2, sy = lamp.top + lamp.height / 2;
    const header = document.querySelector('.site-header, .post-header').getBoundingClientRect();
    const readingViewport = document.querySelector('.post-shell, #section-deck').getBoundingClientRect();
    const padding = innerWidth <= 600 ? 12 : 16;
    const top = Math.max(r.top - 16, header.bottom + 2);
    const bottom = Math.min(r.bottom + 12, readingViewport.bottom + 4);
    const left = r.left - padding, right = r.right + padding;
    const gap = Math.max(1, sy - bottom);
    const distance = Math.max(0, Math.min(1, (gap - 70) / 300));
    const strength = distance * distance * (3 - 2 * distance);
    // Constant original haze over the entire reading block. Only the empty
    // space below it carries the brighter, distance-dependent light gradient.
    const light = ctx.createLinearGradient(0, bottom, 0, sy);
    light.addColorStop(0, 'rgba(16,52,92,.33)');
    light.addColorStop(.22, 'rgba(16,52,92,.33)');
    light.addColorStop(.62, `rgba(70,126,178,${.07 + .10 * strength})`);
    light.addColorStop(1, `rgba(151,204,250,${.10 + .15 * strength})`);
    ctx.save();ctx.filter = 'blur(10px)';ctx.fillStyle = light;
    // A single silhouette joins the full-width haze to the lantern, avoiding
    // overlapping layers, a brightness seam, or a cone cutting across text.
    ctx.beginPath();ctx.moveTo(left + 20, top);
    ctx.lineTo(right - 20, top);ctx.quadraticCurveTo(right, top, right, top + 20);
    ctx.lineTo(right, bottom);
    ctx.bezierCurveTo(right, bottom + gap * .12, sx + 16, sy - gap * .08, sx + 3, sy);
    ctx.lineTo(sx - 3, sy);
    ctx.bezierCurveTo(sx - 16, sy - gap * .08, left, bottom + gap * .12, left, bottom);
    ctx.lineTo(left, top + 20);ctx.quadraticCurveTo(left, top, left + 20, top);
    ctx.closePath();ctx.fill();ctx.restore();

  }
  function schedule() { if (!pending) { pending = true; requestAnimationFrame(draw); } }
  for (const event of ['resize', 'sectionchange', 'sectionlayout']) addEventListener(event, schedule);
  document.querySelector('.post-shell')?.addEventListener('scroll', schedule, { passive: true });
  const observer = new ResizeObserver(schedule);
  document.querySelectorAll('.section-scroll, .post-content, .site-header, .post-header').forEach(el => observer.observe(el));
  document.fonts.ready.then(schedule);
  schedule();
})();
