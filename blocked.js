const params = new URLSearchParams(location.search);
const site = params.get('site');

const descriptions = {
  youtube: "That's not a video you opened — that's the feed.",
  reddit: "That's the homepage scroll, not a link or a sub."
};
const hints = {
  youtube: 'Open a direct link and it plays fine.',
  reddit: 'Individual posts, subreddits, and search still work — just not the homepage.'
};

document.getElementById('reason').textContent =
  descriptions[site] || "That's the algorithm, not a link you opened.";
document.getElementById('hint').textContent = hints[site] || 'Direct links still work fine.';
