/**
 * instagram.js — enforced on every instagram.com page.
 *
 * Two layers for navigation, same pattern as youtube.js: patches installed
 * synchronously before any async work (settings load in the background and
 * apply once ready, using safe defaults meanwhile), plus a polling backstop.
 * Landing on a blocked path redirects straight to the DM inbox rather than
 * a separate blocked page.
 *
 * A third layer exists just for reels: swiping to the next reel appears to
 * happen entirely client-side, with no corresponding URL change — so
 * neither the patch nor the poll can see it. While viewing a locked reel,
 * touch/wheel/arrow-key navigation is suppressed directly instead.
 */
(function () {
  let instagramEnabled = true;
  let extraBlock = [];
  let allowedReelId = null;
  let onLockedReel = false;
  let lastCheckedPath = null;

  function redirectToMessages() {
    window.location.replace('/direct/inbox/');
  }

  function enforce(isFreshLoad) {
    const path = location.pathname;
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

  function suppressSwipe(e) {
    if (onLockedReel) e.preventDefault();
  }
  document.addEventListener('touchmove', suppressSwipe, { passive: false, capture: true });
  document.addEventListener('wheel', suppressSwipe, { passive: false, capture: true });
  document.addEventListener(
    'keydown',
    (e) => {
      if (onLockedReel && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
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
