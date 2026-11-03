const params = new URLSearchParams(location.search);
const site = params.get('site');

const descriptions = {
  youtube: "YouTube's home feed is blocked here.",
  reddit: "Reddit's front page is blocked here.",
  twitter: 'The timeline is blocked here.'
};
const hints = {
  youtube: 'Direct links still play fine.',
  reddit: 'Subreddits, posts, and search still work.',
  twitter: 'Search, posts, and profiles still work.'
};

document.getElementById('reason').textContent = descriptions[site] || 'This page is blocked.';
document.getElementById('hint').textContent = hints[site] || 'Direct links still work.';
