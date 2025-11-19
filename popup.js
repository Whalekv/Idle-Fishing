document.querySelector('.start-fishing-btn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'start' });
  window.close();
});