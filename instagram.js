/**
 * instagram.js — enforced on every instagram.com page.
 *
 * Two layers for navigation (URL-based), same pattern as youtube.js: patches
 * installed synchronously before any async work, plus a polling backstop.
 * Landing on a blocked path redirects straight to the DM inbox.
 *
 * A third layer handles reels specifically, since swiping to the next reel
 * doesn't reliably show up as a URL change at all:
 *  - a dedicated /reel/<id> page still gets the id-lock treatment (a
 *    different id after the first one triggers a redirect)
 *  - a reel played *inline inside a DM thread* never changes the URL, so
 *    this instead watches for a large, actively-playing <video> element
 *    while on a /direct/ page and treats that the same way. The size check
 *    (60%+ of viewport width) is there so it doesn't also catch small
 *    autoplay-preview thumbnails elsewhere.
 * Suppression blocks both native touch scrolling (preventDefault) and any
 * of Instagram's own JS-based gesture handling (stopImmediatePropagation),
 * in case their swipe implementation tracks pointer movement manually
 * rather than relying on the browser's native scroll.
 */
(function () {
  let instagramEnabled = true;
  let extraBlock = [];
  let allowedReelId = null;
  let onLockedReel = false;
  let mainVideoPlaying = false;
  let currentPath = null;
  let lastCheckedPath = null;

  function redirectToMessages() {
    window.location.replace('/direct/inbox/');
  }

  function enforce(isFreshLoad) {
    const path = location.pathname;
    currentPath = path;
    lastCheckedPath = path;
    onLockedReel = false;

    if (!instagramEnabled) return;
    if (path === '/direct/inbox/') return;

    if (mflIsInstagramPathBlocked(path, extraBlock)) {
      redirectToMessages();
      return;
    }

    const reelMatch = path.match(/^\/reel\/([\w-]+)/);
    if (reelMatch) {
      const rid = reelMatch[1];
      if (isFreshLoad || allowedReelId === null) {
        allowedReelId = rid;
      } else if (rid !== allowedReelId) {
        redirectToMessages();
        return;
      }
      onLockedReel = true;
    }
  }

  for (const method of ['pushState', 'replaceState']) {
    const original = history[method];
    history[method] = function (...args) {
      const ret = original.apply(this, args);
      enforce(false);
      return ret;
    };
  }
  window.addEventListener('popstate', () => enforce(false));

  setInterval(() => {
    if (location.pathname !== lastCheckedPath) enforce(false);
  }, 400);

  function isLikelyMainVideo(video) {
    if (!video || video.tagName !== 'VIDEO') return false;
    const rect = video.getBoundingClientRect();
    return rect.width >= window.innerWidth * 0.6 && rect.height >= window.innerHeight * 0.3;
  }

  document.addEventListener('play', (e) => {
    if (isLikelyMainVideo(e.target)) mainVideoPlaying = true;
  }, true);
  document.addEventListener('pause', () => { mainVideoPlaying = false; }, true);
  document.addEventListener('ended', () => { mainVideoPlaying = false; }, true);

  function shouldSuppressSwipe() {
    if (onLockedReel) return true;
    if (mainVideoPlaying && currentPath && currentPath.startsWith('/direct/')) return true;
    return false;
  }

  function suppressSwipe(e) {
    if (shouldSuppressSwipe()) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }
  document.addEventListener('touchmove', suppressSwipe, { passive: false, capture: true });
  document.addEventListener('pointermove', suppressSwipe, { passive: false, capture: true });
  document.addEventListener('wheel', suppressSwipe, { passive: false, capture: true });
  document.addEventListener(
    'keydown',
    (e) => {
      if (shouldSuppressSwipe() && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    { capture: true }
  );

  enforce(true);

  mflGetOptions().then((options) => {
    instagramEnabled = options.instagramEnabled;
    extraBlock = options.extraInstagramBlock;
    enforce(true);
  });
})();
