/**
 * instagram.js — enforced on every instagram.com page.
 *
 * Same two-part detection as youtube.js (see the comment there): patches
 * installed synchronously before any async work, plus a polling backstop.
 * This matters more here than it first seemed to — Instagram's router
 * appears to grab its own reference to history.pushState very early during
 * startup, so the previous version (which awaited settings before
 * patching) lost that race and the patch never actually caught anything.
 *
 * Landing on a blocked path redirects straight to the DM inbox rather than
 * a separate blocked page.
 */
(function () {
  let instagramEnabled = true; // sensible default, applied immediately
  let extraBlock = [];
  let allowedReelId = null;
  let lastCheckedPath = null;

  function redirectToMessages() {
    window.location.replace('/direct/inbox/');
  }

  function enforce(isFreshLoad) {
    const path = location.pathname;
    lastCheckedPath = path;

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
      }
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

  enforce(true);

  mflGetOptions().then((options) => {
    instagramEnabled = options.instagramEnabled;
    extraBlock = options.extraInstagramBlock;
    enforce(true);
  });
})();
