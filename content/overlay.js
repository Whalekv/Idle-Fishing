(() => {
	if (document.getElementById("happy-fishing-overlay")) return;

	const i18nData = {
		zh: {
			clickToSelect: "点击选择钓鱼位置",
			allTabsSync: "所有标签页将同步"
		},
		en: {
			clickToSelect: "Click to select fishing position",
			allTabsSync: "All tabs will sync"
		}
	};

	let currentLang = 'zh';

	function updateOverlayLanguage(lang) {
		currentLang = lang;
		const texts = i18nData[lang] || i18nData.zh;
		
		const overlay = document.getElementById("happy-fishing-overlay");
		if (!overlay) return;
		
		const firstDiv = overlay.querySelector('div:first-child');
		const secondDiv = overlay.querySelector('div:nth-child(2)');
		
		if (firstDiv) firstDiv.textContent = texts.clickToSelect;
		if (secondDiv) secondDiv.textContent = texts.allTabsSync;
	}

	chrome.storage.local.get(["language"], (result) => {
		const currentLang = result.language || "zh";
		
		const overlay = document.createElement("div");
		overlay.id = "happy-fishing-overlay";
		overlay.style.cssText = `
	    all: initial !important;
	    position: fixed !important;
	    inset: 0 !important;
	    background: url('${chrome.runtime.getURL(
			"assets/pond.svg"
		)}') center/cover no-repeat !important;
	    backdrop-filter: blur(8px) !important;
	    z-index: 2147483647 !important;
	    pointer-events: auto !important;
	    cursor: crosshair !important;
	    display: flex !important;
	    flex-direction: column !important;
	    justify-content: center !important;
	    align-items: center !important;
	    color: white !important;
	    font: bold 28px/1.4 system-ui !important;
	    text-align: center !important;
	  `;
		
		const texts = i18nData[currentLang] || i18nData.zh;
		
		overlay.innerHTML = `
	    <div style="margin-bottom:20px">${texts.clickToSelect}</div>
	    <div style="font-size:16px">${texts.allTabsSync}</div>
	  `;

		overlay.onclick = (e) => {
			const pos = { x: e.clientX, y: e.clientY };
			localStorage.setItem("happy-fishing-pos", JSON.stringify(pos));
			if (window.HappyFishing && window.HappyFishing.spawn) {
	            console.log('立即生成成功');
				window.HappyFishing.spawn(pos);
			}

			overlay.remove();
		};

		document.documentElement.appendChild(overlay);
		
		chrome.storage.onChanged.addListener((changes, areaName) => {
			if (areaName === 'local' && changes.language && changes.language.newValue) {
				updateOverlayLanguage(changes.language.newValue);
			}
		});
	});
})();
