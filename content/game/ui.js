// content/game/ui.js
// UI 模块：负责所有 DOM 创建、样式、事件监听和界面更新

(() => {
	if (!window.HappyFishingConfig) {
		console.error("HappyFishingConfig 未加载");
		return;
	}

	const { UI_CONFIG, INDICATOR_CONFIG } = window.HappyFishingConfig;

	// 全局样式注入（只执行一次）
	if (!window.happyFishingStylesInjected) {
		const style = document.createElement("style");
		style.textContent = `
            .happy-fishing-indicator.red    { background: rgba(255,0,0,0.5)!important; box-shadow: 0 0 15px rgba(255,0,0,0.8), 0 0 40px rgba(255,0,0,0.6), 0 0 60px rgba(255,0,0,0.4)!important; }
            .happy-fishing-indicator.yellow { background: rgba(255,255,0,0.5)!important; box-shadow: 0 0 15px rgba(255,255,0,0.8), 0 0 40px rgba(255,255,0,0.6), 0 0 60px rgba(255,255,0,0.4)!important; }
            .happy-fishing-indicator.green  { background: rgba(0,255,0,0.5)!important; box-shadow: 0 0 15px rgba(0,255,0,0.8), 0 0 40px rgba(0,255,0,0.6), 0 0 60px rgba(0,255,0,0.4)!important; }
        `;
		document.head.appendChild(style);
		window.happyFishingStylesInjected = true;
	}

	/**
	 * 创建 mini 窗口并返回 UI 控制对象
	 */
	const createMiniWindow = ({ position, onPress, onRelease, onTriggerBite }) => {
		const { x, y } = position;
		const mini = document.createElement("div");
		mini.id = "happy-fishing-mini";
		mini.style.cssText = `
            all: initial;
            position: fixed !important;
            left: ${x - UI_CONFIG.windowSize.width / 2}px !important;
            top: ${y - UI_CONFIG.windowSize.height / 2}px !important;
            width: ${UI_CONFIG.windowSize.width}px !important;
            height: ${UI_CONFIG.windowSize.height}px !important;
            background: transparent !important;
            border-radius: ${UI_CONFIG.progressCornerRadius}px !important;
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
            pointer-events: auto !important;
            z-index: 2147483647 !important;
            font: bold 28px/1 system-ui !important;
            color: white !important;
            user-select: none !important;
            clip-path: inset(0 0 0 0 round ${UI_CONFIG.progressCornerRadius}px);
        `;

		// ==================== 鱼漂 ====================
		const bobber = document.createElement("div");
		bobber.style.cssText = `
            all: initial;
            position: absolute !important;
            bottom: 0 !important;
            left: 50% !important;
            width: 4px !important;
            height: 38px !important;
            background: url('${chrome.runtime.getURL("assets/fishingFloat.svg")}') center/cover no-repeat !important;
            pointer-events: none !important;
            z-index: 3 !important;
            contain: layout style !important;
            transform: translateX(-50%);
        `;
		mini.appendChild(bobber);

		// ==================== 进度条 SVG ====================
		const progressSVG = document.createElementNS("http://www.w3.org/2000/svg","svg");
		progressSVG.setAttribute(
			"viewBox",
			`0 0 ${UI_CONFIG.windowSize.width} ${UI_CONFIG.windowSize.height}`
		);
		progressSVG.style.cssText = `
            all: initial !important;
            position: absolute !important;
            inset: 0 !important;
            width: 100% !important;
            height: 100% !important;
            pointer-events: none !important;
            z-index: 4 !important;
        `;

		const offset = UI_CONFIG.progressRadiusOffset || 2;
		const innerW = UI_CONFIG.windowSize.width - offset * 2;
		const innerH = UI_CONFIG.windowSize.height - offset * 2;
		const corner = UI_CONFIG.progressCornerRadius - offset;

		const progressRect = document.createElementNS("http://www.w3.org/2000/svg","rect");
		progressRect.setAttribute("x", offset);
		progressRect.setAttribute("y", offset);
		progressRect.setAttribute("width", innerW);
		progressRect.setAttribute("height", innerH);
		progressRect.setAttribute("rx", corner);
		progressRect.setAttribute("ry", corner);
		progressRect.setAttribute("fill", "none");
		progressRect.setAttribute("stroke-width",UI_CONFIG.progressStrokeWidth);
		progressRect.setAttribute("stroke-linecap", "round");

		progressSVG.appendChild(progressRect);
		mini.appendChild(progressSVG);

		// 延迟计算 totalLength
		let totalLength = 0;
		const initProgressDash = () => {
			totalLength = progressRect.getTotalLength();
			progressRect.style.strokeDasharray = totalLength;
			progressRect.style.strokeDashoffset = totalLength;
			// 初始颜色
			progressRect.style.stroke = "#ff0000";
		};
		// ==================== 指示器 ====================
		const indicator = document.createElement("div");
		indicator.className = "happy-fishing-indicator red";
		indicator.style.cssText = `
            all: initial;
            position: absolute !important;
            width: ${UI_CONFIG.indicatorSize}px !important;
            height: ${UI_CONFIG.indicatorSize}px !important;
            border-radius: 50% !important;
            pointer-events: none !important;
            transition: background 1s ease, box-shadow 1s ease !important;
        `;

		// ==================== 长按事件 ====================
		const handlePressStart = (e) => {
			e.preventDefault();
			onPress();
		};

		const handlePressEnd = () => {
			onRelease();
		};

		mini.addEventListener("mousedown", handlePressStart);
		mini.addEventListener("mouseup", handlePressEnd);
		mini.addEventListener("mouseleave", handlePressEnd);
		mini.addEventListener("touchstart", handlePressStart, {
			passive: false,
		});
		mini.addEventListener("touchend", handlePressEnd);
		mini.addEventListener("touchcancel", handlePressEnd);

		// ==================== 界面更新方法 ====================
		const update = ({
			progress,
			progressColor,
			matchScore,
			indicatorColor,
			sinkY,
		} = {}) => {
			if (typeof progress === "number") {
				const offsetValue = totalLength * (1 - progress);
				progressRect.style.strokeDashoffset = offsetValue;
				if (progressColor) {
					progressRect.style.stroke =
						{
							red: "#ff0000",
							yellow: "#ffff00",
							green: "#00ff00",
						}[progressColor] || "#ff0000";
				}
			}

			if (indicatorColor) {
				indicator.classList.remove("red", "yellow", "green");
				void indicator.offsetLeft; // 强制重绘
				indicator.classList.add(indicatorColor);
			}
			if (typeof sinkY === "number") {
				bobber.style.transform = `translateX(-50%) translateY(${sinkY}px)`;
			}
		};

		const showIndicator = () => {
			if (!indicator.parentNode) {
                console.log('showIndicator 执行')
				mini.appendChild(indicator);
			}
		};

		const resetBobber = () => {
			bobber.style.transform = "translateX(-50%) translateY(0px)";
			if (indicator.parentNode) {
				indicator.remove();
			}
		};

		const remove = () => {
			mini.remove();
		};

		// ==================== 挂载到页面 ====================
		document.documentElement.appendChild(mini);

		// 挂载后下一帧计算，确保 SVG 已渲染
		requestAnimationFrame(initProgressDash);

		console.log("HappyFishing UI 小窗已创建");

		return {
			mini,
			update,
			showIndicator,
			resetBobber,
			remove,
		};
	};

	// 暴露接口
	window.HappyFishingUI = {
		createMiniWindow,
	};

	console.log("HappyFishingUI 模块加载完成");
})();
