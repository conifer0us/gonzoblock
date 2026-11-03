/**
 * twitter.js — runs on twitter.com and x.com (same site).
 *
 * Block-list, same pattern as reddit.js: only the home timeline is
 * blocked. Search, posts, hashtags, and profiles load normally.
 *
 * Video viewer: opening a video lets you swipe/scroll on to the next one,
 * same problem as Instagram reels. Two layers, matching Instagram:
 *  - URL lock: on a /status/<id>/video/<n> page, the first status id is
 *    trusted. Landing on a different video viewer afterward is redirected.
 *  - Gesture lock: touch/pointer/wheel/arrow-key events are blocked while
 *    the viewer is open (video viewer URL, or a near-fullscreen video in
 *    the DOM). It backs off inside genuinely scrollable panels, like the
 *    replies column. Pausing does not release it.
 */
(function () {
  let twitterEnabled = true;
  let extraBlock = [];
  let lastCheckedPath = null;
  let allowedViewerId = null;
  let onViewerPath = false;
  let lockedVideoEl = null;

  const VIEWER_RE = /^\/[^/]+\/status\/(\d+)\/video\/\d+/;
  const IMMERSIVE_RE = /^\/i\/videos\/(?:tweet\/)?(\d+)/;

  function redirect() {
    window.location.replace(mflBlockedUrl('twitter'));
  }

  function enforce() {
    const path = location.pathname;
    lastCheckedPath = path;
    onViewerPath = false;

    if (!twitterEnabled) return;
    if (mflIsTwitterPathBlocked(path, extraBlock)) {
      redirect();
      return;
    }

    const m = path.match(VIEWER_RE) || path.match(IMMERSIVE_RE);
    if (m) {
      const id = m[1];
      if (allowedViewerId === null) {
        allowedViewerId = id;
      } else if (id !== allowedViewerId) {
        redirect();
        return;
      }
      onViewerPath = true;
    } else {
      allowedViewerId = null;
      lockedVideoEl = null;
    }
  }

  for (const method of ['pushState', 'replaceState']) {
    const original = history[method];
    history[method] = function (...args) {
      const ret = original.apply(this, args);
      enforce();
      return ret;
    };
  }
  window.addEventListener('popstate', enforce);

  setInterval(() => {
    if (location.pathname !== lastCheckedPath) enforce();
  }, 400);

  // Near-fullscreen video = the viewer, even if the URL never changes.
  // Inline timeline videos are far smaller, so they never match.
  function isViewerVideo(v) {
    if (!v || v.tagName !== 'VIDEO') return false;
    const r = v.getBoundingClientRect();
    return r.width >= window.innerWidth * 0.9 && r.height >= window.innerHeight * 0.7;
  }

  let scheduled = false;
  function scheduleCheck() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      for (const v of document.querySelectorAll('video')) {
        if (isViewerVideo(v)) { lockedVideoEl = v; return; }
      }
    });
  }
  new MutationObserver(scheduleCheck).observe(document.documentElement, {
    childList: true,
    subtree: true
  });
  document.addEventListener('play', (e) => {
    if (isViewerVideo(e.target)) lockedVideoEl = e.target;
  }, true);

  function shouldSuppress() {
    if (!twitterEnabled) return false;
    // Desktop keeps normal scrolling; the URL lock above still stops a jump to
    // another video. Gesture blocking is only for touch/mobile layouts, where
    // swiping between videos never changes the URL.
    if (!mflIsMobileLayout()) return false;
    if (onViewerPath) return true;
    return !!(lockedVideoEl && document.contains(lockedVideoEl));
  }

  function suppress(e) {
    if (shouldSuppress() && !mflIsWithinScrollablePanel(e.target)) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }
  document.addEventListener('touchmove', suppress, { passive: false, capture: true });
  document.addEventListener('pointermove', suppress, { passive: false, capture: true });
  document.addEventListener('wheel', suppress, { passive: false, capture: true });
  document.addEventListener(
    'keydown',
    (e) => {
      if (
        shouldSuppress() &&
        (e.key === 'ArrowUp' || e.key === 'ArrowDown') &&
        !mflIsWithinScrollablePanel(e.target)
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    { capture: true }
  );

  enforce();

  mflGetOptions().then((options) => {
    twitterEnabled = options.twitterEnabled;
    extraBlock = options.extraTwitterBlock;
    enforce();
  });
})();
