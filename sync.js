// sync.js —— 跨 Tab 实时同步（创建 、 关闭）
(() => {
  if (window.happyFishingReady) return;
  window.happyFishingReady = true;


  // ==================== 新增：鱼表 ====================
  const fishTable = [
    { name: "小虾米",    rarity: 1, weightMin: 0.05, weightMax: 0.3,  sinkTime: 1500, difficulty: 1 },
    { name: "鲫鱼",      rarity: 2, weightMin: 0.3,  weightMax: 1.5,  sinkTime: 2000, difficulty: 2 },
    { name: "草鱼",      rarity: 3, weightMin: 2,    weightMax: 8,    sinkTime: 3000, difficulty: 4 },
    { name: "青鱼",      rarity: 4, weightMin: 10,   weightMax: 25,   sinkTime: 4000, difficulty: 6 },
    { name: "鲢鱼",      rarity: 5, weightMin: 15,   weightMax: 40,   sinkTime: 5000, difficulty: 8 },
    { name: "金龙鱼",    rarity: 6, weightMin: 30,   weightMax: 100,  sinkTime: 6000, difficulty: 10 }
  ];

  // 根据稀有度加权随机（稀有度越高概率越低）
  const totalWeight = fishTable.reduce((sum, fish) => sum + (7 - fish.rarity), 0);
  // ===================================================


  // 位置
  const KEY_POS = 'happy-fishing-pos';
  let mini = null;
  let sinkRequestId = null;

  // 当前这一次钓鱼抽到的鱼（在点按钮时决定）
  let currentFish = null;

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
      background: transparent !important;
      border-radius: 16px !important;
      display: flex !important;
      justify-content: center !important;
      align-items: center !important;
      pointer-events: auto !important;
      z-index: 2147483647 !important;
      font: bold 28px/1 system-ui !important;
      color: white !important;
      user-select: none !important;
    `;
    // ==================== 修改钓鱼按钮行为 ====================
    // 把原来的 btn.onclick 整个替换成下面这段
    const btn = document.createElement('button');
    btn.style.cssText = `
      all: initial !important;
      width: 30px !important;
      height: 30px !important;
      position: absolute !important;
      left: 10px !important;
      background: #ef2baeff !important;
      border-radius: 50% !important;
      cursor: pointer !important;
    `;
    btn.onclick = (e) => {
      e.stopPropagation();

      // 1. 防止重复点击
      if (sinkRequestId) return;
      
      // 2. 加权随机选鱼
      let rand = Math.random() * totalWeight;
      let selected = fishTable[0];
      for (const fish of fishTable) {
        rand -= (7 - fish.rarity);
        if (rand <= 0) {
          selected = fish;
          break;
        }
      }
      currentFish = selected;

      // 3. 生成最终鱼对象（重量随机）
      const finalWeight = (Math.random() * (selected.weightMax - selected.weightMin) + selected.weightMin).toFixed(2);

      // 颜色色相：稀有度越高越偏金色（0~60），低稀有度偏蓝绿
      const hue = selected.rarity <= 3 ? 180 + selected.rarity * 30 : selected.rarity * 10;

      const caughtFish = {
        name: selected.name,
        rarity: selected.rarity,
        weight: parseFloat(finalWeight),
        timestamp: Date.now(),
        signature: "玩家昵称#1234",
        colorHue: hue,
        sizeLevel: selected.rarity  // 暂时用稀有度当尺寸等级
      };

      // 4. 延迟执行下沉动画（模拟鱼上钩时间）
      setTimeout(() => {
        bobberSinkDown(() => {
          // 下沉动画完全结束后的回调
          console.log("钓到鱼啦！", caughtFish);
          
          // 调用成功窗口（success.js 里已经暴露的全局函数）
          if (window.createSuccessWin) {
            // 可以把鱼信息临时挂到全局，successWin 里自行读取展示
            window.lastCaughtFish = caughtFish;
            createSuccessWin();
          }
        });
      }, currentFish.sinkTime);
    };
    mini.appendChild(btn);
    // ========================================================


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


    // 修改原来的 bobberSinkDown，让它支持完成回调
    window.bobberSinkDown = (onComplete) => {
      if (!mini || !bobber.parentNode) return;

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
          if (typeof onComplete === 'function') onComplete();
        }
      };
      sinkRequestId = requestAnimationFrame(animate);
    };


    // ===== 第一步：添加 SVG 进度条外框（固定颜色，待后续动画） =====
    const progressSVG = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    progressSVG.className = 'happy-fishing-progress-svg';
    progressSVG.setAttribute('viewBox', '0 0 200 100');
    progressSVG.style.cssText = `
      all: initial !important;
      position: absolute !important;
      inset: 0 !important;
      width: 100% !important;
      height: 100% !important;
      pointer-events: none !important;
      z-index: 4 !important;   /* 放在 bobber 和 indicator 上面，但低于按钮 */
    `;

    const progressRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    progressRect.setAttribute('x', '2');      // 向内偏移 2px，让 4px 粗的线正好贴边且不被裁剪
    progressRect.setAttribute('y', '2');
    progressRect.setAttribute('width', '196');
    progressRect.setAttribute('height', '96');
    progressRect.setAttribute('rx', '14');    // 16 - 2 = 14（因为 stroke 在内外各占一半，往内缩 2px 后圆角也要相应减小）
    progressRect.setAttribute('ry', '14');
    progressRect.setAttribute('fill', 'none');
    progressRect.setAttribute('stroke', '#b1b1b1ff');   // 先用绿色方便看见
    progressRect.setAttribute('stroke-width', '4');
    progressRect.setAttribute('stroke-linecap', 'round');

    progressSVG.appendChild(progressRect);
    mini.appendChild(progressSVG);

    // 把这个 path 暴露到全局，方便后面第二步直接操作（不需要再 query）
    window.happyFishingProgressPath = progressRect;
    // ============================================================


    // ===== 第二步：长按进度条动画（先不改颜色）=====
    let progress = 0;
    let progressRaf = null;
    let isPressing = false;

    let matchScore = 0;  // 新增：匹配度 0~100
    window.happyFishingMatchScore = matchScore; // 【可选】方便调试观察数值

    // 获取路径总长度（关键修复）
    const path = progressRect;
    let totalLength = null;

    const initProgressPath = () => {
      if (totalLength !== null) return;
      totalLength = path.getTotalLength();
      path.style.strokeDasharray = totalLength;
      path.style.strokeDashoffset = totalLength;
      console.log('Progress path initialized, length =', totalLength);
    };

    requestAnimationFrame(initProgressPath);
    setTimeout(initProgressPath, 100); // 双保险

    // 更新视觉进度 + 动态颜色（基于左上角起点，顺时针）
    const updateProgress = () => {
      if (totalLength === null) return;

      const offset = totalLength * (1 - progress);
      path.style.strokeDashoffset = offset;

      const headRatio = progress; // 0~1

      // 精确比例（基于 200×100 + rx=14 的路径，实测恒定）
      const topSideEnd    = 0.304;  // 0 ~ 30.4%    → 上边（从左上角到右上角）
      const rightSideEnd  = 0.478;  // 30.4% ~ 47.8% → 右边
      const bottomSideEnd = 0.826;  // 47.8% ~ 82.6% → 下边
      // 82.6% ~ 100% → 左边

      let color;
      if (headRatio < topSideEnd) {
        color = '#ff0000';     // 红色 - 上边框
      } else if (headRatio < rightSideEnd) {
        color = '#ffff00';     // 黄色 - 右边框
      } else if (headRatio < bottomSideEnd) {
        color = '#ffff00';     // 黄色 - 下边框
      } else {
        color = '#00ff00';     // 绿色 - 左边框
      }

      path.style.stroke = color;
    };


    // ===== 新增：根据当前 progress 值返回进度条头部当前颜色 =====
    function getCurrentProgressColor() {
      const headRatio = progress; // 0 ~ 1

      const topSideEnd    = 0.304;    // 上边：红
      const rightSideEnd  = 0.478;    // 右边：黄
      const bottomSideEnd = 0.826;    // 下边：黄

      if (headRatio < topSideEnd) {
        return 'red';
      } else if (headRatio < rightSideEnd) {
        return 'yellow';
      } else if (headRatio < bottomSideEnd) {
        return 'yellow';
      } else {
        return 'green';  // 左边：绿
      }
    }

    // ===== 新增：获取当前 indicator 的颜色 =====
    function getCurrentIndicatorColor() {
      if (!indicator || !indicator.parentNode) {
        return null; // 还没咬钩，还没有 indicator
      }

      if (indicator.classList.contains('red')) {
        return 'red';
      }
      if (indicator.classList.contains('yellow')) {
        return 'yellow';
      }
      if (indicator.classList.contains('green')) {
        return 'green';
      }

      // 兜底（正常不会走到这里）
      return null;
    }

    // 前进动画（长按时）
    const progressForward = () => {
      progress = Math.min(progress + 0.0008, 1);   // 约 2.0~2.2 秒填满，可调速度
      updateProgress();

      if (progress < 1 && isPressing) {
        progressRaf = requestAnimationFrame(progressForward);
      }
    };

    // 回退动画（松手时）
    const progressBackward = () => {
      progress = Math.max(progress - 0.002, 0);   // 回退稍慢一点，手感更好
      updateProgress();

      if (progress > 0) {
        progressRaf = requestAnimationFrame(progressBackward);
      }
    };

    // ===== 第四步：定时检测颜色匹配并更新 matchScore =====
    let matchScoreTimer = null;
    // 每隔随机 100~200ms 检查一次匹配状态
    function startMatchScoreTick() {
      if (matchScoreTimer) clearInterval(matchScoreTimer);

      const tickInterval = 100 + Math.random() * 100; // 100~200ms 随机，防止太规律

      matchScoreTimer = setInterval(() => {
        // 必须同时满足：正在长按 + indicator 已经出现
        if (progress==0 || progress == 1 || !indicator || !indicator.parentNode) {
          return;
        }

        const progressColor = getCurrentProgressColor();
        const indicatorColor = getCurrentIndicatorColor();

        // 只有两者都是有效颜色时才进行匹配判断
        if (progressColor && indicatorColor) {
          if (progressColor === indicatorColor) {
            // 颜色匹配：上升（每 tick +0.9，约 1.0~1.8 秒从 0 到 100）
            matchScore = Math.min(100, matchScore + 0.9);
          } else {
            // 颜色不匹配：下降更快（增加紧张感）
            matchScore = Math.max(0, matchScore - 1.8);
          }

          // 【可选】调试时查看实时数值
          console.log('matchScore:', matchScore.toFixed(1), progressColor, indicatorColor);
        }
      }, tickInterval);
    }


    // 绑定事件（支持鼠标 + 触摸）
    // 绑定事件（支持鼠标 + 触摸）
    mini.addEventListener('mousedown', (e) => {
      e.preventDefault();
      isPressing = true;
      if (progressRaf) cancelAnimationFrame(progressRaf);
      progressRaf = requestAnimationFrame(progressForward);
      
      startMatchScoreTick();  // ← 新增：开始计时
    });

    mini.addEventListener('mouseup', () => {
      endPress();  // ← 改成调用我们自己的 endPress
      startMatchScoreTick();
    });
    mini.addEventListener('mouseleave', () => {
      endPress();
      startMatchScoreTick();
    });

    mini.addEventListener('touchstart', (e) => {
      e.preventDefault();
      isPressing = true;
      if (progressRaf) cancelAnimationFrame(progressRaf);
      progressRaf = requestAnimationFrame(progressForward);
      
      startMatchScoreTick();  // ← 新增
    }, { passive: false });

    mini.addEventListener('touchend', endPress);
    mini.addEventListener('touchcancel', endPress);

    // 新增一个干净的 endPress 函数
    function endPress() {
      isPressing = false;
      if (progressRaf) cancelAnimationFrame(progressRaf);
      progressRaf = requestAnimationFrame(progressBackward);

      // 停止并清零 matchScore
      if (matchScoreTimer) {
        clearInterval(matchScoreTimer);
        matchScoreTimer = null;
      }
    }

    // 暴露方便调试（可选）
    window.happyFishingProgress = { progress: () => progress, reset: () => { progress = 0; updateProgress(); } };
    // ================================================

    // 指示器 - 每隔 5-10 秒随机平滑切换到红/黄/绿中的一种
    const indicator = document.createElement('div');
    indicator.className = 'happy-fishing-indicator';
    indicator.style.cssText = `
      width: 40px !important;
      height: 40px !important;
      border-radius: 50% !important;
      background: rgba(255, 0, 0, 0.5);
      box-shadow:
        0 0 15px rgba(255, 0, 0, 0.8),
        0 0 40px rgba(255, 0, 0, 0.6),
        0 0 60px rgba(255, 0, 0, 0.4);
      pointer-events: none !important;
      transition: background 1s ease, box-shadow 1s ease;
    `;

    // 注入三种颜色定义（只执行一次）
    if (!window.happyFishingRandomInjected) {
      const style = document.createElement('style');
      style.textContent = `
        .happy-fishing-indicator.red    { background: rgba(255, 0, 0, 0.5) !important;   box-shadow: 0 0 15px rgba(255,0,0,0.8),   0 0 40px rgba(255,0,0,0.6),   0 0 60px rgba(255,0,0,0.4) !important; }
        .happy-fishing-indicator.yellow { background: rgba(255, 255, 0, 0.5) !important; box-shadow: 0 0 15px rgba(255,255,0,0.8), 0 0 40px rgba(255,255,0,0.6), 0 0 60px rgba(255,255,0,0.4) !important; }
        .happy-fishing-indicator.green  { background: rgba(0, 255, 0, 0.5) !important;   box-shadow: 0 0 15px rgba(0,255,0,0.8),   0 0 40px rgba(0,255,0,0.6),   0 0 60px rgba(0,255,0,0.4) !important; }
      `;
      document.head.appendChild(style);
      window.happyFishingRandomInjected = true;
    }

    const colors = ['red', 'yellow', 'green'];
    let timer = null;

    // 随机切换颜色函数
    function randomChangeColor() {
      if (!indicator.parentNode) return; // 已移除则停止

      // 移除当前所有颜色类
      indicator.classList.remove('red', 'yellow', 'green');

      // 触发重排，保证每次 transition 都生效
      void indicator.offsetLeft;

      // 随机选择一种颜色
      const nextColor = colors[Math.floor(Math.random() * colors.length)];
      indicator.classList.add(nextColor);

      // 随机 5~10 秒后再次切换
      const nextDelay = 5000 + Math.random() * 5000; // 5000~10000ms
      timer = setTimeout(randomChangeColor, nextDelay);
    }

    // 鱼咬钩后开始自动随机切换
    const bite = () => {
      if (!mini || indicator.parentNode) return;

      // 重置为红色并显示
      indicator.className = 'happy-fishing-indicator red';
      mini.appendChild(indicator);

      // 清除可能遗留的定时器（防止多 Tab 重复触发）
      if (timer) clearTimeout(timer);

      // 首次延迟 5~10 秒后开始第一次随机切换
      const firstDelay = 5000 + Math.random() * 5000;
      timer = setTimeout(randomChangeColor, firstDelay);
    };

    // 重要：当小窗被移除时停止定时器，防止内存泄漏
    const originalRemoveMiniWin = window.RemoveMiniWin;
    window.RemoveMiniWin = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (indicator.parentNode) indicator.remove();
      originalRemoveMiniWin?.();
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

