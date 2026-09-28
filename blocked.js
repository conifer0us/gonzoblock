const params = new URLSearchParams(location.search);
const site = params.get('site');

const titles = {
  youtube: 'HELL NO.',
  reddit: 'FRONT PAGE IS OFF.',
  twitter: 'NICE TRY.'
};
const descriptions = {
  youtube: "That's the feed. Go watch the thing you picked.",
  reddit: "Homepage is off. Scram.",
  twitter: "Timeline's off limits."
};
const hints = {
  youtube: 'Direct links still play fine.',
  reddit: 'Subreddits, posts, and search still work.',
  twitter: 'Search, posts, and profiles still work.'
};

document.getElementById('title').textContent = titles[site] || 'BLOCKED.';
document.getElementById('reason').textContent = descriptions[site] || 'Algorithm territory. Not today.';
document.getElementById('hint').textContent = hints[site] || 'Direct links still work.';
