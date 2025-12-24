// overlay.js
(() => {
	if (document.getElementById("happy-fishing-overlay")) return;

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
	overlay.innerHTML = `
    <div style="margin-bottom:20px">点击选择钓鱼位置</div>
    <div style="font-size:16px">所有标签页将同步</div>
  `;

	overlay.onclick = (e) => {
		const pos = { x: e.clientX, y: e.clientY };
		localStorage.setItem("happy-fishing-pos", JSON.stringify(pos));

		// 立即在本页生成小窗（使用新接口）
		if (window.HappyFishing && window.HappyFishing.spawn) {
			window.HappyFishing.spawn(pos);
		}

		overlay.remove();
	};

	document.documentElement.appendChild(overlay);
})();

