# Feed Limiter — YouTube & Instagram

A Firefox extension that blocks the algorithmic parts of YouTube and
Instagram while leaving specific, intentional uses working.

## What it does

**YouTube** (allow-list) — only `/watch` (with a video id), `/shorts/<id>`,
`/live/<id>`, and `/embed/` pages load. Everything else (home, search,
trending, subscriptions, channel pages) redirects to a blocked page. On an
allowed watch/Shorts page, the tab locks onto whichever video id first
loaded — clicking a related video, letting autoplay run, or swiping to
another Short all get redirected too. Related videos, end-screen
suggestions, comments, and the top nav bar are hidden by default
(comments/nav are toggleable in Settings).

**Instagram** (block-list) — only the home feed (`/`), Explore, and the
Reels tab are blocked; landing on any of those redirects straight to your
DM inbox rather than a separate blocked page. Everything else works
normally: messages (reels/photos sent to you play inline), posting, search,
viewing profiles, and individual posts. An individual `/reel/<id>` (say,
one opened from a DM or a profile) is allowed and locked to that id —
swiping to a different reel from there gets redirected the same way the
blocked routes do.

## How enforcement works (and why it's resilient)

Two layers, on purpose:

1. **Navigation lock** (`rules.js` + `youtube.js`/`instagram.js`) — the real
   boundary. It works entirely off the URL, checked on every full page load
   and every in-app (SPA) navigation, synchronously and immediately (not
   deferred), so there's no gap for a blocked route to render before the
   redirect fires. This doesn't depend on either site's HTML/CSS at all, so
   it keeps working through a redesign.
2. **Cosmetic hiding** (`youtube.css`, `instagram.css`, the autoplay-toggle
   click in `youtube.js`) — best-effort decluttering using selectors that
   are reasonably stable but not guaranteed forever. If a selector goes
   stale, the UI just looks messier — the navigation lock still holds.

If something visually leaks through after a site redesign, open DevTools
(`Ctrl+Shift+I` → Inspector), find the new class/id, and update the matching
`.css` file. The `.js` files should rarely need touching.

## Files

| File | Purpose |
|---|---|
| `manifest.json` | Extension manifest (MV3) |
| `rules.js` | Shared allow/block-list logic |
| `youtube.js` / `youtube.css` | YouTube enforcement + hiding |
| `instagram.js` / `instagram.css` | Instagram enforcement + hiding |
| `blocked.html/.css/.js` | Page shown when YouTube blocks something |
| `options.html/.css/.js` | Settings UI |
| `popup.html/.css/.js` | Toolbar status popup |
| `common.css` | Shared styling for the pages above |
| `icons/` | Toolbar/listing icons |

## Test it locally (no publishing needed)

1. `about:debugging#/runtime/this-firefox`
2. **Load Temporary Add-on** → select `manifest.json` from the unzipped
   folder. Already loaded it before? Just hit **Reload** on that same page
   instead of re-adding it.
3. It's live until Firefox restarts — good for iterating.

## Adjusting the rules

- **Options page** (toolbar icon → Settings, or `about:addons` → this
  extension → Preferences): toggle comments/nav, add extra allowed path
  prefixes on YouTube (e.g. `/playlist`), or extra *blocked* path prefixes
  on Instagram (e.g. `/stories` if Stories should count as the algorithm
  too) — no code changes needed.
- **`rules.js`**: edit `mflIsYouTubePathAllowed` / `mflIsInstagramPathBlocked`
  directly for anything more structural.

## Known limitations

- Built from knowledge of YouTube/Instagram's structure, not tested against
  the live sites in this environment — the navigation lock should be solid,
  but check that the cosmetic CSS hiding still matches current markup and
  adjust selectors if not.
- Instagram's `/reel/` vs `/reels/` distinction (singular = one shared reel,
  plural = the browsing tab) is based on their historical URL scheme; verify
  it still holds and adjust `rules.js` if not.
- Stories aren't restricted by default — add `/stories` to the Instagram
  "extra blocked paths" option if you want them blocked too.
- If the Instagram redirect still shows a flash of feed content before
  landing on messages, that likely means Instagram keeps feed content
  mounted behind the messages view rather than this being a pure timing
  issue — worth reporting back so the fix can target that specifically.
- If a YouTube link someone sends you includes `&list=` (a playlist), only
  that one video loads — it won't auto-advance through the rest.
