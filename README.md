# Gonzo Block

Firefox extension that kills the algorithmic scroll on YouTube, Instagram,
Reddit, and Twitter. Direct links, DMs, search, and profiles still work.

## What it blocks

**YouTube** (allow-list): minimal and layout-free, nothing on the page is hidden.
Clicks on links that leave the video you're on (logo/home, search, channels,
related videos, other videos) are swallowed, and the URL lock redirects
anything else (autoplay, search box, typed URLs) to the blocked page. Shorts
also get gesture blocking since swiping rarely changes the URL.

**Instagram** (block-list): on desktop, home, Explore, and the Reels tab
redirect to your DMs. On mobile, home and Explore still load, so the heart
(new followers) and search work, but the feed, stories tray, and post grid
are hidden and scrolling on home is blocked; Reels and hashtag pages stay
blocked. Messages, posting, profiles, and individual posts and reels work. A
reel opened from a DM locks as soon as the video shows up, keeps the lock
through a pause, and still lets comments scroll.

**Reddit** (block-list): front page, `/hot`, `/new`, `/top`, `/rising`,
`/controversial`, `/best`, `/r/all`, and `/r/popular` are blocked. Subreddits,
posts, profiles, messages, and search work.

**Twitter** (block-list): `/` and `/home` are blocked. Opening a video locks you to
that tweet (another video redirects); on mobile layouts swiping is blocked
too, on desktop scrolling is left alone. Both twitter.com and
x.com are covered. Search, posts, hashtags, and profiles work.

## How it works

1. **URL lock.** `history.pushState` and `replaceState` get patched
   synchronously before anything else runs, with a 400ms poll as backup. The
   patch has to land first, because some routers grab their own copy of
   `pushState` during startup and would skip a late patch for good.
2. **Gesture blocking** (Instagram reels, YouTube Shorts). Swiping between
   reels usually never changes the URL, so touch, pointer, wheel, and arrow
   key events get blocked directly. `mflIsWithinScrollablePanel` in
   `rules.js` backs off inside anything that scrolls on its own, like a
   comments drawer, by checking scroll size and height rather than site
   selectors.
3. **CSS hiding.** Best effort. If a selector breaks after a redesign, the
   page looks messier but layers 1 and 2 still hold.

## Files

`manifest.json`, `rules.js` (shared rules), `youtube.js/.css`,
`instagram.js/.css`, `reddit.js`, `twitter.js`, `blocked.*`, `options.*`,
`popup.*`, `common.css`, `icons/icon.svg`.

## Testing

`about:debugging#/runtime/this-firefox`, then Load Temporary Add-on and pick
`manifest.json`. Use Reload after changes.

## Publishing

The extension id is `{feb7bfd1-1189-4b52-be1f-5c3b954fcc7a}`. It matches the
existing AMO listing, so leave it alone unless you want a new listing.

## Tuning

Settings lets you turn each site off and add extra paths (allowed on YouTube,
blocked on the others). Bigger changes go in the matching function in
`rules.js`.

## Caveats

- Never tested against the live sites. The URL lock and gesture blocking
  should hold up. The CSS selectors are what breaks first after a redesign.
- The 60% width check for the main video and the 85% height check for
  comment panels are guesses based on typical layouts. Adjust them if they
  misfire.
- Reddit multireddits and subreddit-scoped search are allowed by default.
