const DEFAULTS = { youtubeEnabled: true, instagramEnabled: true };

async function render() {
  const stored = await browser.storage.local.get(DEFAULTS);
  document.getElementById('yt-status').textContent = stored.youtubeEnabled ? 'Restricted' : 'Off';
  document.getElementById('ig-status').textContent = stored.instagramEnabled ? 'Restricted' : 'Off';
}

document.getElementById('open-options').addEventListener('click', () => {
  browser.runtime.openOptionsPage();
});

render();
