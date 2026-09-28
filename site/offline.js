/* Cache this site's files locally; Getty viewers and external papers stay online. */
(() => {
  if (!('serviceWorker' in navigator)) return;
  async function register() {
    try {
      await navigator.serviceWorker.register('/sw.js', {updateViaCache: 'none'});
      const ready = await navigator.serviceWorker.ready;
      // Cache media for the page being read, rather than downloading every video
      // on a visitor's first homepage load. The worker limits this to our manifest.
      const urls = [...document.querySelectorAll('img[src], video source[src], video[src]')]
        .map(el => new URL(el.getAttribute('src'), location.href))
        .filter(url => url.origin === location.origin).map(url => url.pathname);
      ready.active?.postMessage({type: 'CACHE_MEDIA', urls});
    } catch (error) {
      // Browsing still works if storage is disabled, full, or the network fails.
      console.info('Offline storage unavailable:', error.message);
    }
  }
  const schedule = () => 'requestIdleCallback' in window
    ? requestIdleCallback(register, {timeout: 3000}) : setTimeout(register, 1000);
  if (document.readyState !== 'loading') schedule();
  else addEventListener('DOMContentLoaded', schedule, {once: true});
})();
