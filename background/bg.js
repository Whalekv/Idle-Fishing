// bg.js
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
	if (msg.action === "start") {
		chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
			chrome.scripting.executeScript({
				target: { tabId: tabs[0].id },
				files: ["content/overlay.js"],
			});
		});
	}

	// 接收 popup 的关闭请求，在当前活跃标签页执行移除
	if (msg.action === "removeMini") {
		chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
			chrome.scripting.executeScript({
				target: { tabId: tabs[0].id },
				func: () => {
					if (window.HappyFishing && window.HappyFishing.remove) {
						window.HappyFishing.remove(); //+++这里为什么是remove()，而不是remove？
					}
				},
			});
		});
	}
});
