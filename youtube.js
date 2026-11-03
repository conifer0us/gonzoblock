/**
 * youtube.js — enforced on every youtube.com page. Deliberately minimal: it
 * doesn't touch the page layout at all.
 *
 *  1. Link clicks: a click (or middle-click) on a link that leaves the video
 *     you're on is swallowed. That covers the logo/home, search, channels,
 *     related videos, and other video links. Same-video links (timestamps,
 *     #anchors) still work.
 *  2. URL lock (backstop for anything that isn't a link: autoplay, search box,
 *     typed URLs): a fresh load of /watch or /shorts is trusted and its id
 *     remembered; moving anywhere else redirects to the blocked page.
 *  3. Shorts: swipe/scroll/arrow gestures are blocked on a Short (swiping
 *     rarely changes the URL), except inside scrollable panels (comments).
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

  function currentId() {
    if (location.pathname === '/watch') return new URLSearchParams(location.search).get('v');
    if (/^\/shorts\//.test(location.pathname)) return location.pathname.split('/')[2];
    return null;
  }

  function enforce(isFreshLoad) {
    const path = location.pathname;
    const search = location.search;
    lastCheckedKey = path + search;
    onLockedShort = false;

    if (!options.youtubeEnabled) return;

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
  }

  function linkBlocked(href) {
    let u;
    try { u = new URL(href, location.href); } catch (e) { return false; }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    const cur = currentId();
    if (u.hostname === 'youtu.be') return u.pathname.slice(1) !== cur;
    if (!/(^|\.)youtube\.com$/.test(u.hostname)) return false; // other sites are fine
    if (u.pathname === location.pathname && u.search === location.search) return false;
    if (!mflIsYouTubePathAllowed(u.pathname, u.search, options.extraYouTubeAllow)) return true;
    let id = null;
    if (u.pathname === '/watch') id = u.searchParams.get('v');
    else if (/^\/shorts\//.test(u.pathname)) id = u.pathname.split('/')[2];
    return id !== null && cur !== null && id !== cur;
  }

  function onLinkClick(e) {
    if (!options.youtubeEnabled) return;
    const a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (a && linkBlocked(a.href)) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }
  document.addEventListener('click', onLinkClick, true);
  document.addEventListener('auxclick', onLinkClick, true);

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

  mflGetOptions().then((real) => {
    Object.assign(options, real);
    enforce(true);
  });
})();
