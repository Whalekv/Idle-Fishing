// 开始按钮点击事件
document.querySelector('.start-fishing-btn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'start' });
  window.close();
});

// 关闭小窗按钮点击事件
document.querySelector('.close-mini-win').addEventListener('click', () => {
  // 通过 background 转发到当前活跃标签页执行真正的移除（最可靠）
  chrome.runtime.sendMessage({ action: 'removeMini' });
  window.close();
});

// 查看鱼塘按钮
document.getElementById('openFishpond').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();  // 自动打开 fishpond.html
  window.close();
});