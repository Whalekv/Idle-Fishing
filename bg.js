// bg.js
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'start') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        files: ['overlay.js']
      });
    });
  }

  // 新增：接收 popup 的关闭请求，在当前活跃标签页执行移除
  if (msg.action === 'removeMini') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: () => {
          if (window.RemoveMiniWin) window.RemoveMiniWin();
        }
      });
    });
  }
});

