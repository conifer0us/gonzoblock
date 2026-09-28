/**
 * instagram.js — enforced on every instagram.com page.
 *
 * Two layers for navigation, same pattern as youtube.js: patches installed
 * synchronously before any async work, plus a polling backstop. Landing on
 * a blocked path redirects straight to the DM inbox.
 *
 * A third layer handles reels: a dedicated /reel/<id> page gets id-lock
 * treatment; a reel played inline inside a DM never changes the URL, so
 * this watches for a large video element instead. It locks the moment that
 * element EXISTS in the DOM (via a MutationObserver), not just once it
 * starts playing — waiting for 'play' left a gap right after clicking a
 * reel, before playback actually started, where scrolling still worked.
 * The lock persists through pause (pausing isn't an escape hatch) and
 * clears only when the element leaves the DOM or you navigate away.
 * Touch/pointer/wheel/arrow-key gestures are suppressed while locked,
 * except inside a genuinely scrollable panel (comments), so comments still
 * scroll normally.
 */
(function () {
  let instagramEnabled = true;
  let extraBlock = [];
  let allowedReelId = null;
  let onLockedReel = false;
  let lockedVideoEl = null;
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
    lockedVideoEl = null;

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

  function findMainVideo() {
    const videos = document.querySelectorAll('video');
    for (const v of videos) {
      if (isLikelyMainVideo(v)) return v;
    }
    return null;
  }

  let checkScheduled = false;
  function scheduleVideoCheck() {
    if (checkScheduled) return;
    checkScheduled = true;
    requestAnimationFrame(() => {
      checkScheduled = false;
      const v = findMainVideo();
      if (v) lockedVideoEl = v;
    });
  }
  new MutationObserver(scheduleVideoCheck).observe(document.documentElement, {
    childList: true,
    subtree: true
  });
  document.addEventListener('play', (e) => {
    if (isLikelyMainVideo(e.target)) lockedVideoEl = e.target;
  }, true);

  function shouldSuppressSwipe() {
    if (onLockedReel) return true;
    if (lockedVideoEl && currentPath && currentPath.startsWith('/direct/') && document.contains(lockedVideoEl)) {
      return true;
    }
    return false;
  }

  function suppressSwipe(e) {
    if (shouldSuppressSwipe() && !mflIsWithinScrollablePanel(e.target)) {
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
      if (
        shouldSuppressSwipe() &&
        (e.key === 'ArrowUp' || e.key === 'ArrowDown') &&
        !mflIsWithinScrollablePanel(e.target)
      ) {
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
