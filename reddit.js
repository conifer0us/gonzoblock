/**
 * reddit.js — enforced on every reddit.com page.
 *
 * Same detection pattern as the other two: patches installed synchronously
 * before any async work, plus a polling backstop. Block-list model — only
 * the front page and its sort-order aliases (plus r/all and r/popular,
 * which are effectively the same thing) are blocked. Individual subreddits,
 * posts/comments, and profiles are allowed.
 */
(function () {
  let redditEnabled = true;
  let extraBlock = [];
  let lastCheckedPath = null;

  function redirect() {
    window.location.replace(mflBlockedUrl('reddit'));
  }

  function enforce() {
    const path = location.pathname;
    lastCheckedPath = path;

    if (!redditEnabled) return;
    if (mflIsRedditPathBlocked(path, extraBlock)) {
      redirect();
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

  enforce();

  mflGetOptions().then((options) => {
    redditEnabled = options.redditEnabled;
    extraBlock = options.extraRedditBlock;
    enforce();
  });
})();
