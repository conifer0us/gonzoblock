/**
 * instagram.js — enforced on every instagram.com page.
 *
 * Navigation: patches installed synchronously before any async work, plus a
 * polling backstop. Blocked paths redirect to the DM inbox.
 *
 * Desktop: home, Explore, and Reels are all blocked (redirect to DMs).
 * Mobile layout: home and the Explore landing page load on purpose, so the
 * heart (new followers) and search work. Their feed and post grid are hidden
 * by instagram.css, and on home all scrolling is blocked. Reels and hashtag
 * pages stay blocked.
 *
 * Reels: a dedicated /reel/<id> page gets id-lock treatment; a reel played
 * inline in a DM never changes the URL, so a large video element locks the
 * moment it exists in the DOM. The lock survives pause and clears when the
 * element leaves the DOM or you navigate. Gestures are blocked while locked,
 * except inside genuinely scrollable panels (comments).
 */
(function () {
  let instagramEnabled = true;
  let extraBlock = [];
  let allowedReelId = null;
  let onLockedReel = false;
  let homeMode = false;
  let lockedVideoEl = null;
  let currentPath = null;
  let lastCheckedPath = null;
  let lastMobile = null;
  const root = document.documentElement;

  function redirectToMessages() {
    window.location.replace('/direct/inbox/');
  }

  function setModes(home, explore) {
    homeMode = home;
    root.classList.toggle('mfl-ig-home', home);
    root.classList.toggle('mfl-ig-explore', explore);
  }

  function enforce(isFreshLoad) {
    const path = location.pathname;
    currentPath = path;
    lastCheckedPath = path;
    onLockedReel = false;
    lockedVideoEl = null;
    const mobile = mflIsMobileLayout();
    lastMobile = mobile;
    root.classList.toggle('mfl-ig-mobile', mobile);
    setModes(false, false);

    if (!instagramEnabled) return;
    if (path === '/direct/inbox/') return;

    if (mflIsInstagramPathBlocked(path, extraBlock, mobile)) {
      redirectToMessages();
      return;
    }

    if (mobile) setModes(path === '/', path === '/explore' || path.startsWith('/explore/'));

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
    if (location.pathname !== lastCheckedPath || mflIsMobileLayout() !== lastMobile) enforce(false);
  }, 400);

  function isLikelyMainVideo(video) {
    if (!video || video.tagName !== 'VIDEO') return false;
    const rect = video.getBoundingClientRect();
    return rect.width >= window.innerWidth * 0.6 && rect.height >= window.innerHeight * 0.3;
  }

  function findMainVideo() {
    for (const v of document.querySelectorAll('video')) {
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
  new MutationObserver(scheduleVideoCheck).observe(root, { childList: true, subtree: true });
  document.addEventListener('play', (e) => {
    if (isLikelyMainVideo(e.target)) lockedVideoEl = e.target;
  }, true);

  function reelLocked() {
    if (onLockedReel) return true;
    return !!(lockedVideoEl && currentPath && currentPath.startsWith('/direct/') && document.contains(lockedVideoEl));
  }

  // Fixed-position layers (the desktop notifications flyout, dialogs) keep
  // their own scrolling even on the home page.
  function isInFixedLayer(target) {
    let el = target;
    while (el && el !== document.body && el !== root) {
      if (el.nodeType === 1 && window.getComputedStyle(el).position === 'fixed') return true;
      el = el.parentElement;
    }
    return false;
  }

  function shouldBlock(target) {
    if (!instagramEnabled) return false;
    const reel = reelLocked();
    const home = homeMode && !isInFixedLayer(target);
    return (reel || home) && !mflIsWithinScrollablePanel(target);
  }

  function suppress(e) {
    if (shouldBlock(e.target)) {
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
      const t = e.target;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      const keys = homeMode
        ? ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'End', 'Home', ' ']
        : ['ArrowUp', 'ArrowDown'];
      if (keys.includes(e.key) && shouldBlock(t)) {
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
