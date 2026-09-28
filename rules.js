/**
 * rules.js
 * Shared between youtube.js, instagram.js, reddit.js, and twitter.js (loaded
 * first in manifest.json, so everything here is a plain global by the time
 * the site-specific script runs).
 *
 * YouTube: allow-list — almost everything is "the algorithm."
 * Instagram, Reddit, Twitter: block-list — most of the site is a normal,
 * intentional use; only the home/front-page-equivalent surfaces are
 * blocked.
 */

const MFL_DEFAULTS = {
  youtubeEnabled: true,
  instagramEnabled: true,
  redditEnabled: true,
  twitterEnabled: true,
  hideComments: true,
  hideYouTubeNav: true,
  extraYouTubeAllow: [],
  extraInstagramBlock: [],
  extraRedditBlock: [],
  extraTwitterBlock: []
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

// Shared "is this a legitimately scrollable sub-panel (e.g. comments), not
// a full-height swipe/feed container?" check. No site-specific selectors —
// just scroll capability plus a height guard, so it works anywhere this is
// used (Instagram reels, YouTube Shorts).
function mflIsWithinScrollablePanel(target) {
  let el = target;
  while (el && el !== document.body && el !== document.documentElement) {
    const canScroll = el.scrollHeight > el.clientHeight + 1;
    if (canScroll) {
      const style = window.getComputedStyle(el);
      if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
        const rect = el.getBoundingClientRect();
        if (rect.height < window.innerHeight * 0.85) return true;
      }
    }
    el = el.parentElement;
  }
  return false;
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

const MFL_IG_BLOCKED_PREFIXES = ['/explore', '/reels'];

function mflIsInstagramPathBlocked(path, extraBlock) {
  if (path === '/') return true;
  if (MFL_IG_BLOCKED_PREFIXES.some((p) => path === p || path.startsWith(p + '/'))) return true;
  if (mflMatchesPrefix(path, extraBlock)) return true;
  return false;
}

const MFL_REDDIT_BLOCKED_EXACT = ['/', '/hot', '/new', '/top', '/rising', '/controversial', '/best'];
const MFL_REDDIT_BLOCKED_PREFIXES = ['/r/popular', '/r/all'];

function mflIsRedditPathBlocked(path, extraBlock) {
  const p = mflNoTrailingSlash(path);
  if (MFL_REDDIT_BLOCKED_EXACT.includes(p)) return true;
  if (MFL_REDDIT_BLOCKED_PREFIXES.some((bp) => p === bp || p.startsWith(bp + '/'))) return true;
  if (mflMatchesPrefix(path, extraBlock)) return true;
  return false;
}

// Twitter (twitter.com and x.com): only the home timeline is blocked.
// Search, individual posts, hashtags, and profiles are all allowed.
const MFL_TWITTER_BLOCKED_EXACT = ['/', '/home'];

function mflIsTwitterPathBlocked(path, extraBlock) {
  const p = mflNoTrailingSlash(path);
  if (MFL_TWITTER_BLOCKED_EXACT.includes(p)) return true;
  if (mflMatchesPrefix(path, extraBlock)) return true;
  return false;
}

function mflBlockedUrl(site) {
  return browser.runtime.getURL('blocked.html') + '?site=' + encodeURIComponent(site);
}
