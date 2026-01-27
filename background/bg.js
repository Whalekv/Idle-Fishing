// bg.js
chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
    // 返回当前消息来源的 tabId（同步返回）
    if (msg.action === "getTabId") {
        sendResponse({ tabId: sender?.tab?.id });
        return; // 同步 sendResponse 不需要 return true
    }

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

    // 记录首次触发咬钩的主标签页（first-wins）
    if (msg.action === "biteTriggered") {
        try {
            const KEY = 'happy-fishing-session';
            const res = await chrome.storage.local.get(KEY);
            const session = res[KEY];
            if (!session) return;
            // 若已存在主标签页，忽略后续设置；否则记录首次咬钩的标签页
            if (!session.biteHostTabId) {
                session.biteHostTabId = sender?.tab?.id || null;
                await chrome.storage.local.set({ [KEY]: session });
                // 广播给其它非主标签页，立即移除 mini
                const hostTabId = session.biteHostTabId;
                const tabs = await chrome.tabs.query({});
                for (const t of tabs) {
                    if (t.id !== hostTabId) {
                        try {
                            await chrome.tabs.sendMessage(t.id, { action: 'removeNonHost', sessionId: session.id });
                        } catch (e) {
                            // 某些标签页可能没有注入内容脚本或权限不足，忽略错误
                        }
                    }
                }
            }
        } catch (err) {
            console.error('记录主标签页失败:', err);
        }
    }
});

