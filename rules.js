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

// Mobile and desktop differ on purpose.
// Desktop: home ('/'), Explore, and the Reels tab are all blocked (redirect to DMs).
// Mobile: home and the Explore landing page load so the heart (new followers)
// and search work, with the feed/grid neutralized by instagram.js/.css. The
// Reels tab and hashtag/location pages are still blocked.
const MFL_IG_BLOCKED_DESKTOP = ['/explore', '/reels'];
const MFL_IG_BLOCKED_MOBILE = ['/reels', '/explore/tags', '/explore/locations'];

function mflIsMobileLayout() {
  const w = window.innerWidth;
  const coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  return (w > 0 && w < 768) || coarse;
}

function mflIsInstagramPathBlocked(path, extraBlock, mobile) {
  if (!mobile && path === '/') return true;
  const list = mobile ? MFL_IG_BLOCKED_MOBILE : MFL_IG_BLOCKED_DESKTOP;
  if (list.some((p) => path === p || path.startsWith(p + '/'))) return true;
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
