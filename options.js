const DEFAULTS = {
  youtubeEnabled: true,
  instagramEnabled: true,
  hideComments: true,
  hideYouTubeNav: true,
  extraYouTubeAllow: [],
  extraInstagramBlock: []
};

const fields = ['youtubeEnabled', 'instagramEnabled', 'hideComments', 'hideYouTubeNav'];

function linesToList(text) {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

async function load() {
  const stored = await browser.storage.local.get(DEFAULTS);
  for (const f of fields) {
    document.getElementById(f).checked = !!stored[f];
  }
  document.getElementById('extraYouTubeAllow').value = (stored.extraYouTubeAllow || []).join('\n');
  document.getElementById('extraInstagramBlock').value = (stored.extraInstagramBlock || []).join('\n');
}

async function save() {
  const data = {};
  for (const f of fields) {
    data[f] = document.getElementById(f).checked;
  }
  data.extraYouTubeAllow = linesToList(document.getElementById('extraYouTubeAllow').value);
  data.extraInstagramBlock = linesToList(document.getElementById('extraInstagramBlock').value);
  await browser.storage.local.set(data);

  const status = document.getElementById('status');
  status.textContent = 'Saved';
  setTimeout(() => { status.textContent = ''; }, 1500);
}

document.getElementById('save').addEventListener('click', save);
load();
