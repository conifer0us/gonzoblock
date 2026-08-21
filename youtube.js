/**
 * youtube.js — enforced on every youtube.com page.
 *
 * Two layers:
 *  1. Navigation lock (this file): the real boundary. A fresh page load is
 *     trusted (that's "a video someone sent you") and its video/short id is
 *     recorded. Any later in-page navigation (related video click, autoplay,
 *     search, Shorts swipe, clicking Home) that tries to move to a DIFFERENT
 *     id, or off /watch //shorts entirely, gets redirected to blocked.html.
 *  2. Cosmetic hiding (youtube.css + applyCosmetics below): removes related
 *     videos, end screens, comments, nav — best effort, not load-bearing.
 *
 * Detection has two parts, both installed before any async work (settings
 * load in the background and get applied once ready, using safe defaults
 * in the meantime) so nothing on the page gets a window to run unchecked:
 *  - history.pushState/replaceState are patched synchronously, first thing,
 *    so YouTube's own router can't capture a reference to the native
 *    versions before ours is in place.
 *  - a lightweight URL poll acts as a backstop in case some navigation ever
 *    slips past the patch anyway.
 */
(function () {
  const options = { ...MFL_DEFAULTS };
  let allowedVideoId = null;
  let allowedShortId = null;
  let lastCheckedKey = null;

  function redirect() {
    window.location.replace(mflBlockedUrl('youtube'));
  }

  function enforce(isFreshLoad) {
    const path = location.pathname;
    const search = location.search;
    lastCheckedKey = path + search;

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
