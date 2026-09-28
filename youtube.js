/**
 * youtube.js — enforced on every youtube.com page.
 *
 * Navigation lock: patches installed synchronously before any async work,
 * plus a polling backstop. A fresh load is trusted (a video/Short someone
 * sent you); moving to a different id afterward — related video, autoplay,
 * search, Shorts swipe — gets redirected.
 *
 * Shorts also get gesture suppression, same as Instagram reels: swiping to
 * the next Short doesn't reliably show up as a URL change, so touch/
 * pointer/wheel/arrow-key navigation is blocked outright while on a locked
 * Short, except inside a genuinely scrollable panel (comments).
 */
(function () {
  const options = { ...MFL_DEFAULTS };
  let allowedVideoId = null;
  let allowedShortId = null;
  let onLockedShort = false;
  let lastCheckedKey = null;

  function redirect() {
    window.location.replace(mflBlockedUrl('youtube'));
  }

  function enforce(isFreshLoad) {
    const path = location.pathname;
    const search = location.search;
    lastCheckedKey = path + search;
    onLockedShort = false;

    if (!mflIsYouTubePathAllowed(path, search, options.extraYouTubeAllow)) {
      redirect();
      return;
    }

    if (path === '/watch') {
      const vid = new URLSearchParams(search).get('v');
      if (isFreshLoad || allowedVideoId === null) {
        allowedVideoId = vid;
      } else if (vid !== allowedVideoId) {
        redirect();
        return;
      }
    } else if (/^\/shorts\//.test(path)) {
      const sid = path.split('/')[2];
      if (isFreshLoad || allowedShortId === null) {
        allowedShortId = sid;
      } else if (sid !== allowedShortId) {
        redirect();
        return;
      }
      onLockedShort = true;
    }

    applyCosmetics();
  }

  function applyCosmetics() {
    try {
      const toggle = document.querySelector(
        '.ytp-autonav-toggle-button[aria-checked="true"], #toggle.ytp-autonav-toggle-button[aria-checked="true"]'
      );
      if (toggle) toggle.click();
    } catch (e) {
      /* selector drift — ignore */
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
  document.addEventListener('yt-navigate-finish', () => enforce(false));

  setInterval(() => {
    if (location.pathname + location.search !== lastCheckedKey) enforce(false);
  }, 400);

  function suppressShortsSwipe(e) {
    if (onLockedShort && !mflIsWithinScrollablePanel(e.target)) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }
  document.addEventListener('touchmove', suppressShortsSwipe, { passive: false, capture: true });
  document.addEventListener('pointermove', suppressShortsSwipe, { passive: false, capture: true });
  document.addEventListener('wheel', suppressShortsSwipe, { passive: false, capture: true });
  document.addEventListener(
    'keydown',
    (e) => {
      if (
        onLockedShort &&
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

  const observer = new MutationObserver(() => applyCosmetics());
  observer.observe(document.documentElement, { childList: true, subtree: true });

  mflGetOptions().then((real) => {
    Object.assign(options, real);
    document.documentElement.classList.toggle('mfl-show-comments', !options.hideComments);
    document.documentElement.classList.toggle('mfl-show-nav', !options.hideYouTubeNav);
    enforce(true);
  });
})();
