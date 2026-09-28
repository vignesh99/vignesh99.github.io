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
  let pending = false, geometryDirty = true, geometry = null, lastDraw = -Infinity;
  let maxDisplacement = 0, drawCount = 0;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  function measure() {
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
    // One Cobalt comment-blue hue throughout the light, with a uniform softer
    // opacity over reading areas and a stronger beam below the text.
    // Cobalt font-lock-comment-face: #008AFF (emacs-jp/replace-colorthemes).
    const light = ctx.createLinearGradient(0, bottom, 0, sy);
    light.addColorStop(0, 'rgba(0,138,255,.18)');
    light.addColorStop(.22, 'rgba(0,138,255,.18)');
    light.addColorStop(.62, `rgba(0,138,255,${.30 + .10 * strength})`);
    light.addColorStop(1, `rgba(0,138,255,${.48 + .12 * strength})`);
    // Sample the original outline once per layout change, not on every wave frame.
    const points = [];
    let pen = {x: left + 20, y: top};
    points.push(pen);
    function curve(end, c1, c2) {
      const from = pen;
      const length = Math.hypot(end.x-from.x, end.y-from.y) +
        (c1 ? Math.hypot(c1.x-from.x,c1.y-from.y)+Math.hypot(end.x-c2.x,end.y-c2.y) : 0);
      const count = Math.max(2, Math.ceil(length / 9));
      for (let i=1;i<=count;i++) {
        const t=i/count,u=1-t;
        points.push(c1 ? {x:u*u*u*from.x+3*u*u*t*c1.x+3*u*t*t*c2.x+t*t*t*end.x,
          y:u*u*u*from.y+3*u*u*t*c1.y+3*u*t*t*c2.y+t*t*t*end.y}
          : {x:from.x+(end.x-from.x)*t,y:from.y+(end.y-from.y)*t});
      }
      pen=end;
    }
    curve({x:right-20,y:top});
    curve({x:right,y:top+20},{x:right-6.67,y:top},{x:right,y:top+6.67});
    curve({x:right,y:bottom});
    curve({x:sx+3,y:sy},{x:right,y:bottom+gap*.12},{x:sx+16,y:sy-gap*.08});
    curve({x:sx-3,y:sy});
    curve({x:left,y:bottom},{x:sx-16,y:sy-gap*.08},{x:left,y:bottom+gap*.12});
    curve({x:left,y:top+20});
    curve({x:left+20,y:top},{x:left,y:top+6.67},{x:left+6.67,y:top});
    points.pop(); // Closing point duplicates the first.
    points.forEach((p,i)=>{
      const before=points[(i+points.length-1)%points.length],after=points[(i+1)%points.length];
      const dx=after.x-before.x,dy=after.y-before.y,length=Math.hypot(dx,dy)||1;
      p.nx=dy/length;p.ny=-dx/length;
      // Keep the light attached to the lantern.
      p.weight=Math.min(1,Math.max(0,(sy-p.y)/32));
    });
    geometry={points,light,scale};geometryDirty=false;
  }
  function draw(now) {
    pending=false;
    // Bound extra rendering cost; the water solver still runs at its normal rate.
    if (!geometryDirty && now-lastDraw<32) return;
    if (geometryDirty) measure();
    if (!geometry) return;
    lastDraw=now;drawCount++;
    ctx.clearRect(0,0,innerWidth,innerHeight);
    const moving=!document.hidden&&!reduced.matches&&!document.body.classList.contains('still');
    const sample=moving ? (window.stream?.sampleSurface || window.waterWake?.sample) : null;
    maxDisplacement=0;
    const displaced=geometry.points.map(p=>{
      const wave=sample?.(p.x,p.y);
      const raw=wave ? wave.height*3+(wave.dx*p.nx+wave.dy*p.ny)*150 : 0;
      const amount=10*Math.tanh(raw/10)*p.weight;
      maxDisplacement=Math.max(maxDisplacement,Math.abs(amount));
      return {x:p.x+p.nx*amount,y:p.y+p.ny*amount,amount};
    });
    ctx.save();ctx.filter='blur(10px)';ctx.fillStyle=geometry.light;
    ctx.beginPath();displaced.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
    ctx.closePath();ctx.fill();ctx.restore();
    // Refraction glints stay on the boundary; the uniform interior never flickers.
    ctx.save();ctx.filter='blur(3px)';ctx.lineWidth=2;
    displaced.forEach((p,i)=>{
      if (p.amount<=.25) return;
      const next=displaced[(i+1)%displaced.length];
      ctx.strokeStyle=`rgba(74,173,255,${Math.min(.09,p.amount*.012)})`;
      ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(next.x,next.y);ctx.stroke();
    });ctx.restore();
  }
  function schedule() { geometryDirty=true;if (!pending) {pending=true;requestAnimationFrame(draw);} }
  addEventListener('watersurfacechange',event=>{
    if (event.detail?.rest) lastDraw=-Infinity;
    if (!pending) {pending=true;requestAnimationFrame(draw);}
  });
  // Small inspection hook for confirming coupling and idle behavior.
  window.lighthouseLight={state:()=>({maxDisplacement,drawCount,points:geometry?.points.map(p=>({x:p.x,y:p.y}))||[]})};
  for (const event of ['resize', 'sectionchange', 'sectionlayout']) addEventListener(event, schedule);
  document.addEventListener('scroll', schedule, {passive:true,capture:true});
  reduced.addEventListener('change',schedule);
  document.addEventListener('visibilitychange',schedule);
  const observer = new ResizeObserver(schedule);
  document.querySelectorAll('.section-scroll, .post-content, .site-header, .post-header').forEach(el => observer.observe(el));
  document.fonts.ready.then(schedule);
  schedule();
})();
