/**
 * rules.js
 * Shared between youtube.js, instagram.js, and reddit.js (loaded first in
 * manifest.json, so everything declared here is a plain global by the time
 * the site-specific script runs).
 *
 * YouTube: allow-list — almost everything is "the algorithm," so only a
 * specific video/short/live/embed is let through.
 * Instagram & Reddit: block-list — most of the site is a normal, intentional
 * use; only the home/front-page-equivalent surfaces are "the algorithm."
 */

const MFL_DEFAULTS = {
  youtubeEnabled: true,
  instagramEnabled: true,
  redditEnabled: true,
  hideComments: true,
  hideYouTubeNav: true,
  extraYouTubeAllow: [],
  extraInstagramBlock: [],
  extraRedditBlock: []
};

async function mflGetOptions() {
  try {
    const stored = await browser.storage.local.get(MFL_DEFAULTS);
    return { ...MFL_DEFAULTS, ...stored };
  } catch (e) {
    return { ...MFL_DEFAULTS };
  }
}

function mflMatchesPrefix(path, list) {
  return Array.isArray(list) && list.some((prefix) => prefix && path.startsWith(prefix));
}

function mflNoTrailingSlash(path) {
  return path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
}

// A specific video (watch?v=...), a Short, a livestream, or an embed —
// i.e. "a video", not "a feed of videos."
function mflIsYouTubePathAllowed(path, search, extraAllow) {
  if (path === '/watch') {
    if (new URLSearchParams(search).has('v')) return true;
  }
  if (/^\/shorts\/[\w-]{5,}/.test(path)) return true;
  if (/^\/live\/[\w-]{5,}/.test(path)) return true;
  if (/^\/embed\//.test(path)) return true;
  if (mflMatchesPrefix(path, extraAllow)) return true;
  return false;
}

// Only the home feed, Explore, and the Reels tab count as "the algorithm."
// Everything else on Instagram — direct messages, posting, search, account
// profiles, individual posts (/p/) and reels (/reel/) — is allowed.
const MFL_IG_BLOCKED_PREFIXES = ['/explore', '/reels'];

function mflIsInstagramPathBlocked(path, extraBlock) {
  if (path === '/') return true;
  if (MFL_IG_BLOCKED_PREFIXES.some((p) => path === p || path.startsWith(p + '/'))) return true;
  if (mflMatchesPrefix(path, extraBlock)) return true;
  return false;
}

// Only the front page, its sort-order aliases, and the two pseudo-subreddits
// that are really just the front page again (r/all, r/popular) count as
// "the algorithm." Individual subreddits, posts, comments, profiles, and
// search are all allowed.
const MFL_REDDIT_BLOCKED_EXACT = ['/', '/hot', '/new', '/top', '/rising', '/controversial', '/best'];
const MFL_REDDIT_BLOCKED_PREFIXES = ['/r/popular', '/r/all'];

function mflIsRedditPathBlocked(path, extraBlock) {
  const p = mflNoTrailingSlash(path);
  if (MFL_REDDIT_BLOCKED_EXACT.includes(p)) return true;
  if (MFL_REDDIT_BLOCKED_PREFIXES.some((bp) => p === bp || p.startsWith(bp + '/'))) return true;
  if (mflMatchesPrefix(path, extraBlock)) return true;
  return false;
}

function mflBlockedUrl(site) {
  return browser.runtime.getURL('blocked.html') + '?site=' + encodeURIComponent(site);
}
