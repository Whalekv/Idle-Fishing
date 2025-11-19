// sync.js —— 跨 Tab 实时同步（创建 、 关闭）
(() => {
  if (window.happyFishingReady) return;
  window.happyFishingReady = true;

  // 位置
  const KEY_POS = 'happy-fishing-pos';
  // 全局结束时间戳
  const KEY_END = 'happy-fishing-end';
  let mini = null;
  let counter = null;
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
      width: 100px !important; height: 100px !important;
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
    // 专门显示数字的层
    counter = document.createElement('div');
    counter.style.cssText = `
      all: initial ;
      position: absolute !important;
      inset: 0 !important;
      display: flex !important;
      justify-content: center !important;
      align-items: center !important;
      font-weight: bold !important;
      pointer-events: none !important;
      z-index: 1 !important;
    `;
    const close = document.createElement('span');
    close.textContent = '×';
    close.style.cssText = `
      all: initial !important;
      position: absolute !important;
      top: -10px !important; right: -10px !important;
      width: 24px !important; height: 24px !important;
      background: #ff3b30 !important;
      border-radius: 50% !important;
      font-size: 16px !important;
      line-height: 24px !important;
      text-align: center !important;
      cursor: pointer !important;
      z-index: 2 !important;
    `;


    // 关闭时：1. 删除 DOM  2. 清除 localStorage  3. 广播 null
    close.onclick = (e) => {
      e.stopPropagation();
      mini.remove();
      mini = null;
      localStorage.removeItem(KEY_POS);           // 清除坐标
      localStorage.removeItem(KEY_END);          // 清除结束时间戳
      localStorage.setItem(KEY_POS + ':remove', Date.now()); // 触发广播
    };

    mini.appendChild(counter);
    mini.appendChild(close);

    // 创建鱼漂（bobber）
    const bobber = document.createElement('div');
    bobber.className = 'happy-fishing-bobber';
    bobber.style.cssText = `
      all: initial ;
      position: absolute ;
      bottom: 20px ;
      left: 50% ;
      transform: translateX(-50%);
      width: 4px !important;
      height: 38px !important;
      background: url('${chrome.runtime.getURL('fishingFloat.svg')}') center/cover no-repeat !important;
      pointer-events: none !important;
      z-index: 3 !important;
    `;
    mini.appendChild(bobber);
    
    // JS 浮动动画
    let bobberPhase = 0;
    const bobberAnimate = () => {
      if (!mini || !bobber.parentNode) return;  // 已移除则停止
      
      bobberPhase = (bobberPhase + 0.01) % (Math.PI * 2);
      const offsetY = Math.sin(bobberPhase) * 15;  // -15px ~ +15px
      bobber.style.transform = `translateX(-50%) translateY(${offsetY}px)`;
      requestAnimationFrame(bobberAnimate); 
    };
    bobberAnimate();  // 启动

    

    document.documentElement.appendChild(mini);
    // 启动全局倒计时
    startGlobalCountdown();
  }

  // 全局倒计时（所有标签共享）
  function startGlobalCountdown() {
    // 第一次创建时，设置结束时间
    if (!localStorage.getItem(KEY_END)) {
      const endTime = Date.now() + 10000;
      localStorage.setItem(KEY_END, endTime);
    }

    const update = () => {
      if (!mini) return;

      const endTime = Number(localStorage.getItem(KEY_END));
      const left = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));

      if (left > 0) {
        counter.textContent = left;
        const deg = (10 - left) * 36;
        mini.style.background = `conic-gradient(#00d1ff ${deg}deg, #f2ff00ff 0)`;
      } else {
        counter.textContent = 'Finish';
        mini.style.background = '#4caf50';
        localStorage.removeItem(KEY_END);
      }

      requestAnimationFrame(update);
    };
    update();
  }

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
})();


