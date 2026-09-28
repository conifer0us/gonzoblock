const DEFAULTS = { youtubeEnabled: true, instagramEnabled: true, redditEnabled: true, twitterEnabled: true };

async function render() {
  const stored = await browser.storage.local.get(DEFAULTS);
  document.getElementById('yt-status').textContent = stored.youtubeEnabled ? 'BLOCKED' : 'OFF';
  document.getElementById('ig-status').textContent = stored.instagramEnabled ? 'BLOCKED' : 'OFF';
  document.getElementById('rd-status').textContent = stored.redditEnabled ? 'BLOCKED' : 'OFF';
  document.getElementById('tw-status').textContent = stored.twitterEnabled ? 'BLOCKED' : 'OFF';
}

document.getElementById('open-options').addEventListener('click', () => {
  browser.runtime.openOptionsPage();
});

render();
