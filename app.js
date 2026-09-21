(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const escape = text => text.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  for (const key of ['biography', 'personal', 'teaching']) $('#' + key).innerHTML = siteContent[key];
  const labels = { workshop: 'Workshop', conference: 'Conference', journal: 'Journal' };
  const counts = Object.fromEntries(Object.keys(labels).map(type => [type, siteContent.papers.filter(p => p.type === type).length]));
  for (const type of Object.keys(labels)) $('#' + type + '-count').textContent = counts[type];
  $('#papers').innerHTML = siteContent.papers.map(paper => `
    <article class="paper" data-type="${paper.type}" ${paper.type !== 'workshop' ? 'hidden' : ''}>
      <div class="paper-meta"><span>${paper.year}</span></div>
      <div class="paper-top"><h3><a href="${paper.url}">${escape(paper.title)}</a></h3><a class="paper-arrow" href="${paper.url}" aria-label="Read ${escape(paper.title)}">↗</a></div>
      <p class="paper-authors">${paper.authors}</p><p class="paper-venue">${escape(paper.venue)}</p>
      <div class="paper-actions">
        <details class="paper-abstract" name="publication-abstracts"><summary>Read abstract</summary>
          <div class="abstract-basin"><p>${escape(paper.abstract)}</p>
            <div class="abstract-credit"><p class="paper-citation">${paper.citationChicago}</p><p class="paper-rights">${paper.rightsNotice}</p></div>
            <div class="abstract-tools">${paper.abstractSource ? `<a class="text-link" href="${escape(paper.abstractSource)}">Abstract source ↗</a>` : ''}<button type="button" class="copy-bibtex" data-bibtex="${escape(paper.bibtex)}">Copy BibTeX</button><span class="copy-status" role="status"></span></div>
          </div>
        </details>
      </div>
    </article>`).join('');

  const saved = key => { try { return localStorage.getItem(key); } catch { return null; } };
  const save = (key, value) => { try { localStorage.setItem(key, value); } catch {} };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = reduced.matches || saved('water-still') === 'true';
  let stream = null;
  let selected = 'workshop';
  try {
    stream = createStream($('#stream-canvas'), $('#ripple-canvas'), { paused });
    // Expose state for local inspection without introducing extra interface controls.
    window.stream = stream;
  } catch (error) { console.error('Stream renderer:', error); }

  function applyMotion() {
    document.body.classList.toggle('still', paused);
    document.documentElement.style.scrollBehavior = paused ? 'auto' : '';
    $('#motion').setAttribute('aria-pressed', String(paused));
    $('.motion-label').textContent = paused ? 'Let it flow' : 'Still water';
    stream?.setPaused(paused);
  }
  $('#motion').addEventListener('click', () => {
    paused = !paused; save('water-still', String(paused)); applyMotion();
  });
  reduced.addEventListener('change', event => { paused = event.matches; applyMotion(); });

  document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
    selected = button.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach(item => {
      item.classList.toggle('active', item === button);
      item.setAttribute('aria-pressed', String(item === button));
    });
    document.querySelectorAll('.paper').forEach(paper => {
      paper.hidden = paper.dataset.type !== selected;
      if (paper.hidden) paper.querySelectorAll('details[open]').forEach(details => { details.open = false; });
    });
    $('#research').dataset.current = selected;
    $('#research-content').scrollTop = 0;
    stream?.route(selected, counts[selected]);
    stream?.measure();
  }));

  document.querySelectorAll('.paper-abstract').forEach(details => details.addEventListener('toggle', () => {
    stream?.measure();
  }));
  stream?.route(selected, counts[selected]);
  applyMotion();
})();
