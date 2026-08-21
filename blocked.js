const params = new URLSearchParams(location.search);
const site = params.get('site');
const reasonEl = document.getElementById('reason');

if (site === 'youtube') {
  reasonEl.textContent =
    'Feed Limiter blocked the algorithm here — only videos you open directly get through.';
} else {
  reasonEl.textContent = 'Feed Limiter blocked the algorithm here.';
}
