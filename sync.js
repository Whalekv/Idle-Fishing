// sync.js —— 跨 Tab 实时同步（创建 、 关闭）
(() => {
  if (window.happyFishingReady) return;
  window.happyFishingReady = true;

  // 位置
  const KEY_POS = 'happy-fishing-pos';
  let mini = null;
  let sinkRequestId = null;
  // 创建小窗
  function spawn({x, y}) {
    if (mini) mini.remove();
    mini = document.createElement('div');
    mini.id = 'happy-fishing-mini';
    mini.style.cssText = `
      all: initial ;
      position: fixed !important;
      left: ${x - 25}px !important;
      top: ${y - 25}px !important;
      width: 200px !important; 
      height: 100px !important;
      background: linear-gradient(135deg, #00d1ff, #0099cc) ;
      border-radius: 16px !important;
      box-shadow: 0 8px 30px rgba(0,209,255,0.5) !important;
      display: flex !important;
      justify-content: center !important;
      align-items: center !important;
      pointer-events: auto !important;
      z-index: 2147483647 !important;
      font: bold 28px/1 system-ui !important;
      color: white !important;
      user-select: none !important;
    `;
    // 钓鱼按钮
    const btn = document.createElement('button');
    btn.style.cssText = `
      all: initial !important;
      width: 30px !important;
      height: 30px !important;
      position: absolute !important;
      left: 10px !important;
      background: #ef2baeff !important;
    `
    btn.onclick = (e) =>{
      e.stopPropagation();
      window.createSuccessWin();
    };

    mini.onclick = (e) => {
      e.stopPropagation();
      console.log('点击小窗');
      bobberSinkDown();
    };
    mini.appendChild(btn);


    mini.style.clipPath = 'inset(0 0 0 0 round 16px)';  // 替代 border-radius，隐藏时保持圆角裁剪

    // 创建鱼漂（bobber）
    const bobber = document.createElement('div');
    bobber.className = 'happy-fishing-bobber';
    bobber.style.cssText = `
      all: initial ;
      position: absolute !important;
      bottom: 0px !important;
      left: 50% !important;
      width: 4px !important;
      height: 38px !important;
      background: url('${chrome.runtime.getURL('fishingFloat.svg')}') center/cover no-repeat !important;
      pointer-events: none !important;
      z-index: 3 !important;
      contain: layout style !important;
      transform: translateX(-50%);
    `;

    mini.appendChild(bobber);

    // 动画：鱼漂下沉
    window.bobberSinkDown = () => {
      if (!mini || !bobber.parentNode) return;

      // 彻底干掉任何旧动画和 CSS transition 干扰
      if (sinkRequestId) cancelAnimationFrame(sinkRequestId);
      const targetY = 40;
      const duration = 1600;
      const start = performance.now();
      const animate = (now) => {
        if (!mini || !bobber.parentNode) return;
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        const y = ease * targetY;

        bobber.style.transform = `translateX(-50%) translateY(${y}px)`;

        if (progress < 1) {
          sinkRequestId = requestAnimationFrame(animate);
        } else {
          sinkRequestId = null;
        }
      };

      sinkRequestId = requestAnimationFrame(animate);
    };
    document.documentElement.appendChild(mini);
  };

  // 页面刷新后或打开新的标签页后读取已有坐标
  const saved = localStorage.getItem(KEY_POS);
  if (saved) {
    try { spawn(JSON.parse(saved)); }
    catch(e) { localStorage.removeItem(KEY_POS); }
  }

  // 监听创建 & 删除广播
  window.addEventListener('storage', (e) => {
    if (e.key === KEY_POS && e.newValue) {
      spawn(JSON.parse(e.newValue));
    }
    if (e.key === KEY_POS + ':remove') {
      if (mini) {
        mini.remove();
        mini = null;
      }
    }
  });

  // 暴露给 overlay.js
  window.happyFishingSpawn = spawn;

    // 关闭miniwin
  window.RemoveMiniWin = () => {
    if (mini) {
      mini.remove();
      mini = null;
      localStorage.setItem('happy-fishing-pos:remove', Date.now().toString());
      localStorage.removeItem('happy-fishing-pos');
    }
  };

})();

