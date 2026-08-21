/**
 * rules.js
 * Shared between youtube.js and instagram.js (loaded first in manifest.json,
 * so everything declared here is a plain global by the time the site-
 * specific script runs).
 *
 * YouTube and Instagram use opposite models on purpose:
 *  - YouTube: allow-list. Almost everything is "the algorithm," so only a
 *    specific video/short/live/embed is let through.
 *  - Instagram: block-list. Messages, posting, search, profiles, and
 *    individual posts/reels are all normal, intentional uses — only the
 *    home feed, Explore, and the Reels tab are "the algorithm."
 */

const MFL_DEFAULTS = {
  youtubeEnabled: true,
  instagramEnabled: true,
  hideComments: true,
  hideYouTubeNav: true,
  extraYouTubeAllow: [],
  extraInstagramBlock: []
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

function mflBlockedUrl(site) {
  return browser.runtime.getURL('blocked.html') + '?site=' + encodeURIComponent(site);
}
