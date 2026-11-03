const DEFAULTS = {
  youtubeEnabled: true,
  instagramEnabled: true,
  redditEnabled: true,
  twitterEnabled: true,
  extraYouTubeAllow: [],
  extraInstagramBlock: [],
  extraRedditBlock: [],
  extraTwitterBlock: []
};

const fields = ['youtubeEnabled', 'instagramEnabled', 'redditEnabled', 'twitterEnabled'];

function linesToList(text) {
  return text.split('\n').map((l) => l.trim()).filter(Boolean);
}

async function load() {
  const stored = await browser.storage.local.get(DEFAULTS);
  for (const f of fields) {
    document.getElementById(f).checked = !!stored[f];
  }
  document.getElementById('extraYouTubeAllow').value = (stored.extraYouTubeAllow || []).join('\n');
  document.getElementById('extraInstagramBlock').value = (stored.extraInstagramBlock || []).join('\n');
  document.getElementById('extraRedditBlock').value = (stored.extraRedditBlock || []).join('\n');
  document.getElementById('extraTwitterBlock').value = (stored.extraTwitterBlock || []).join('\n');
}

async function save() {
  const data = {};
  for (const f of fields) {
    data[f] = document.getElementById(f).checked;
  }
  data.extraYouTubeAllow = linesToList(document.getElementById('extraYouTubeAllow').value);
  data.extraInstagramBlock = linesToList(document.getElementById('extraInstagramBlock').value);
  data.extraRedditBlock = linesToList(document.getElementById('extraRedditBlock').value);
  data.extraTwitterBlock = linesToList(document.getElementById('extraTwitterBlock').value);
  await browser.storage.local.set(data);

  const status = document.getElementById('status');
  status.textContent = 'SAVED.';
  setTimeout(() => { status.textContent = ''; }, 1500);
}

document.getElementById('save').addEventListener('click', save);
load();
