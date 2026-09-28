/**
 * twitter.js — runs on twitter.com and x.com (same site).
 *
 * Block-list, same pattern as reddit.js. Only the home timeline is
 * blocked. Search, posts, hashtags, and profiles all load normally.
 */
(function () {
  let twitterEnabled = true;
  let extraBlock = [];
  let lastCheckedPath = null;

  function redirect() {
    window.location.replace(mflBlockedUrl('twitter'));
  }

  function enforce() {
    const path = location.pathname;
    lastCheckedPath = path;

    if (!twitterEnabled) return;
    if (mflIsTwitterPathBlocked(path, extraBlock)) {
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
    twitterEnabled = options.twitterEnabled;
    extraBlock = options.extraTwitterBlock;
    enforce();
  });
})();
