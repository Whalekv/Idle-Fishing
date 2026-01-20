// bg.js
chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
	if (msg.action === "start") {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        chrome.scripting.executeScript({
            target: { tabId: tabs[0].id},
            files: ["content/overlay.js"],
        });
	}

	// 接收 popup 的关闭请求，在当前活跃标签页执行移除
	if (msg.action === "removeMini") {
		const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: () => {
                if (window.HappyFishing && window.HappyFishing.remove) {
                    window.HappyFishing.remove(); //[[bb1]]
                }
            },
        });
	}
});

