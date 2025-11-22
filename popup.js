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
