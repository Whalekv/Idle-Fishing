// sync.js —— 跨 Tab 实时同步（创建 、 关闭）

// ==================== 新增：鱼表 ====================
const FISH_TABLE = [
  { name: "小虾米", rarity: 1, weightMin: 0.05, weightMax: 0.3,  sinkTime: 1500, difficulty: 1, scoreUpSpeed: 3,    scoreDownSpeed: 1   },
  { name: "鲫鱼",   rarity: 2, weightMin: 0.3,  weightMax: 1.5,  sinkTime: 2000, difficulty: 2, scoreUpSpeed: 2,    scoreDownSpeed: 1.5 },
  { name: "草鱼",   rarity: 3, weightMin: 2,    weightMax: 8,    sinkTime: 3000, difficulty: 4, scoreUpSpeed: 1.5,  scoreDownSpeed: 2   },
  { name: "青鱼",   rarity: 4, weightMin: 10,   weightMax: 25,   sinkTime: 4000, difficulty: 6, scoreUpSpeed: 1,    scoreDownSpeed: 2.5 },
  { name: "鲢鱼",   rarity: 5, weightMin: 15,   weightMax: 40,   sinkTime: 5000, difficulty: 8, scoreUpSpeed: 0.5,  scoreDownSpeed: 4   },
  { name: "金龙鱼", rarity: 6, weightMin: 30,   weightMax: 100,  sinkTime: 6000, difficulty: 10,scoreUpSpeed: 0.3,  scoreDownSpeed: 6   }
];
// ==================== 游戏全局平衡参数 ====================
const GAME_CONFIG = {
  totalWeight: FISH_TABLE.reduce((sum, f) => sum + (7 - f.rarity), 0),    // 根据稀有度加权随机（稀有度越高概率越低）
  progressForwardSpeed: 0.0008,                                           // 长按时进度条每帧增加多少
  progressBackwardSpeed: 0.002,                                           // 松手时进度条每帧减少多少
  matchTickInterval: { min: 100, max: 200 },                              // 颜色匹配检查时间间隔
  escapeTimeWhenZero: 5000,                                               // matchScore 连续为 0 超过多少毫秒跑鱼
  bobberSinkAnimationDuration: 1600,                                            // 鱼漂下沉动画总时长 ms
};
// ==================== UI 尺寸和样式 ====================
const UI_CONFIG = {
  windowSize: { width: 200, height: 100 },                                // mini窗口大小
  progressCornerRadius: 16,                                               // mini窗口圆角
  buttonSize: 30,                                                         // btn测试按钮大小
  buttonColor: '#ef2baeff',                                             // btn测试按钮颜色
  bobberSinkDistance: 40,                                                 // 鱼漂下沉像素
  progressStrokeWidth: 4,                                                 // 进度条线宽
  progressRadiusOffset: 2,                                                // 进度条向内偏移
  // 进度条四条边的分段比例（实测值，保持不变即可）
  progressColorSegments: {
    top:    0.304,                                                        // 0% ~ 30.4%   上边 → 红
    right:  0.478,                                                        // 30.4% ~ 47.8% 右边 → 黄
    bottom: 0.826                                                         // 47.8% ~ 82.6% 下边 → 黄
                                                                          // 82.6% ~ 100%  左边 → 绿
  },
  indicatorSize: 40,                                                      // 指示器宽高
};
// ==================== 咬钩指示器配置 ====================
const INDICATOR_CONFIG = {
  firstDelay: { min: 5000, max: 10000 },                                   // 首次切换颜色的时间
  switchDelay: { min: 5000, max: 10000 },                                  // 切换颜色的时间
  colors: ['red', 'yellow', 'green']                                       // 指示器颜色
};
// 本地存储 Key
const STORAGE_KEY = {
  position: 'happy-fishing-pos',                                           // mini窗口的位置
  removeFlag: 'happy-fishing-pos:remove'                                   // 移除mini窗口的key
};
// =============================================================================================================================

// ==================== 通用随机范围工具函数 ==================== 
const getRandomInRange = ({ min, max }) => min + Math.random() * (max - min);
// =============================================================================================================================


window.HappyFishing = (()=>{
  if (window.HappyFishing) {
    console.warn('HappyFishing 已经初始化，阻止重复注入');
    return window.HappyFishing;
  };

  // ==================== 私有状态 ====================
  const state = {
    mini: null,                                                            // 当前小窗DOM
    btn: null,                                                             // 测试按钮
    bobber: null,                                                          // 鱼漂DOM
    progressSVG: null,                                                     // 进度条SVG
    progressRect: null,                                                    // 进度条路径
    indicator: null,                                                       // 指示器DOM

    // 运行时状态
    currentFish: null,                                                     // 当前这一次钓鱼抽到的鱼（在点按钮时决定）
    pendingFish: null,                                                     // 等待提竿成功的鱼
    fishingStartTime: 0,                                                   // 起鱼计时起点

    progress: 0,                                                           // 进度条 0~1
    isPressing: null,                                                      // 是否正在长按
    matchScore: 0,                                                         // 当前匹配分数
    matchScoreTimer: null,                                                 // 颜色匹配计分计时器
    indicatorTimer: null,                                                  // 指示器颜色变化计时器
    progressRaf: null,                                                     // 进度条动画 raf
    sinkRequestId: null,                                                   // 下沉动画的raf（requestAnimationFrame返回的 ID）
    zeroStartTime: null,                                                   // matchScore 为 0 的计时起点
  };
  
  // ==================== 私有方法 ====================
  const privateMethods = {
    resetState() {
      // 一键重置所有运行时状态（关闭小窗时调用）
      state.mini = null;
      state.currentFish = null;
      state.pendingFish = null;
      state.fishingStartTime = 0;
      state.progress = 0;
      state.isPressing = false;
      state.matchScore = 0;
      state.zeroStartTime = null;
      // 清理所有定时器/动画
      if (state.matchScoreTimer) clearInterval(state.matchScoreTimer);
      if (state.indicatorTimer) clearTimeout(state.indicatorTimer);
      if (state.sinkRequestId) cancelAnimationFrame(state.sinkRequestId);
      if (state.progressRaf) cancelAnimationFrame(state.progressRaf);

      Object.keys(state).forEach(key => {
        if (key.endsWith('Timer') || key.includes('RequestId') || key.includes('Raf')) {
          state[key] = null; 
        }
      });
    }
  };

  return {
    version: '2.0-final',
    state,  // 调试用，可在控制台查看 HappyFishing.state
    /** 创建/恢复小窗 */
    spawn({ x, y }) {
      // 防止重复创建
      if (state.mini) {
        state.mini.style.left = `${x - UI_CONFIG.windowSize.width / 2}px`;
        state.mini.style.top  = `${y - UI_CONFIG.windowSize.height / 2}px`;
        return;
      };

      // #region  ==================== 创建主容器 ====================
      mini = document.createElement('div');
      mini.id = 'happy-fishing-mini';
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
      state.mini = mini; // state.mini 应该始终指向“已经完成初始化的组件实例”，而不应该指向一个裸的空 div。
      // #endregion

      // #region ==================== 红色按钮（点它抽鱼） ====================
      const btn = document.createElement('button');
      btn.style.cssText = `
        all: initial !important;
        position: absolute !important;
        left: 10px !important;
        width: ${UI_CONFIG.buttonSize}px !important;
        height: ${UI_CONFIG.buttonSize}px !important;
        background: ${UI_CONFIG.buttonColor} !important;
        border-radius: 50% !important;
        cursor: pointer !important;
      `;
      btn.onclick = (e) => {
        e.stopPropagation();
        if (state.sinkRequestId) return; // 防止重复点击
        // 1. 加权随机选鱼
        let rand = Math.random() * GAME_CONFIG.totalWeight;
        let selected = FISH_TABLE[0];
        for (const fish of FISH_TABLE) {
          rand -= (7 - fish.rarity);
          if (rand <= 0) { 
            selected = fish; 
            break; 
          };
        }
        state.currentFish = selected; 
        // 2. 生成最终鱼对象
        const weight = (Math.random() * (selected.weightMax - selected.weightMin) + selected.weightMin).toFixed(2);
        const hue = selected.rarity <= 3 ? 180 + selected.rarity * 30 : selected.rarity * 10;
        state.pendingFish = {
          name: selected.name,
          rarity: selected.rarity,
          weight: parseFloat(weight),
          timestamp: Date.now(),
          signature: "玩家昵称#1234",
          colorHue: hue,
          sizeLevel: selected.rarity
        };
        // 3. 延迟执行下沉动画
        setTimeout(() => {
          this._sinkBobber(() => { 
            state.bobber.style.transform = `translateX(-50%) translateY(${UI_CONFIG.bobberSinkDistance}px)`;
            this._startBiteIndicator();
            state.fishingStartTime = Date.now();
            console.log("鱼已上钩！请在指示器变绿时长按起鱼", state.pendingFish);
          });
        }, selected.sinkTime);
      };
      mini.appendChild(btn);
      state.btn = btn; 
      // #endregion

      // #region ==================== 鱼漂 ====================
      const bobber = document.createElement('div');
      bobber.style.cssText = `
        all: initial ;
        position: absolute !important;
        bottom: 0 !important;
        left: 50% !important;
        width: 4px !important;
        height: 38px !important;
        background: url('${chrome.runtime.getURL && chrome.runtime.getURL('fishingFloat.svg')}') center/cover no-repeat !important;
        pointer-events: none !important;
        z-index: 3 !important;
        contain: layout style !important;
        transform: translateX(-50%);
      `;
      mini.appendChild(bobber);
      state.bobber = bobber; 
      // #endregion
      
      // #region ==================== 进度条 SVG ====================
      const progressSVG = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      progressSVG.setAttribute('viewBox', `0 0 ${UI_CONFIG.windowSize.width} ${UI_CONFIG.windowSize.height}`);
      progressSVG.style.cssText = `
        all: initial !important; 
        position: absolute !important; 
        inset: 0 !important; 
        width: 100% !important; 
        height: 100% !important; 
        pointer-events: none !important; 
        z-index: 4 !important;`;

      const offset = UI_CONFIG.progressRadiusOffset || 2;
      const innerW = UI_CONFIG.windowSize.width - offset * 2;
      const innerH = UI_CONFIG.windowSize.height - offset * 2;
      const corner = UI_CONFIG.progressCornerRadius - offset;

      const progressRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      progressRect.setAttribute('x', offset);
      progressRect.setAttribute('y', offset);
      progressRect.setAttribute('width', innerW);
      progressRect.setAttribute('height', innerH);
      progressRect.setAttribute('rx', corner);
      progressRect.setAttribute('ry', corner);
      progressRect.setAttribute('fill', 'none');
      progressRect.setAttribute('stroke', UI_CONFIG.progressIdleColor || '#b1b1b1ff');
      progressRect.setAttribute('stroke-width', UI_CONFIG.progressStrokeWidth);
      progressRect.setAttribute('stroke-linecap', 'round');


      document.documentElement.appendChild(mini);
      console.log('HappyFishing 小窗已创建', { x, y });
      progressSVG.appendChild(progressRect);
      mini.appendChild(progressSVG);
      state.progressSVG = progressSVG;
      state.progressRect = progressRect;

      const totalLength = progressRect.getTotalLength();
      progressRect.style.strokeDasharray = totalLength;
      progressRect.style.strokeDashoffset = totalLength;
      // #endregion

      // #region ==================== 指示器 ====================
      const indicator = document.createElement('div');
      indicator.className = 'happy-fishing-indicator';
      indicator.style.cssText = `
        all: initial;
        position: absolute !important;
        width: ${UI_CONFIG.indicatorSize}px !important;
        height: ${UI_CONFIG.indicatorSize}px !important;
        border-radius: 50% !important;
        background: rgba(255,0,0,0.5);
        box-shadow: 0 0 15px rgba(255,0,0,0.8), 0 0 40px rgba(255,0,0,0.6), 0 0 60px rgba(255,0,0,0.4);
        pointer-events: none !important;
        transition: background 1s ease, box-shadow 1s ease !important;
      `;
      state.indicator = indicator;

      // 注入颜色类（只执行一次）
      if (!window.happyFishingStylesInjected) {
        const style = document.createElement('style');
        style.textContent = `
          .happy-fishing-indicator.red    { background: rgba(255,0,0,0.5)!important; box-shadow: 0 0 15px rgba(255,0,0,0.8), 0 0 40px rgba(255,0,0,0.6), 0 0 60px rgba(255,0,0,0.4)!important; }
          .happy-fishing-indicator.yellow { background: rgba(255,255,0,0.5)!important; box-shadow: 0 0 15px rgba(255,255,0,0.8), 0 0 40px rgba(255,255,0,0.6), 0 0 60px rgba(255,255,0,0.4)!important; }
          .happy-fishing-indicator.green  { background: rgba(0,255,0,0.5)!important; box-shadow: 0 0 15px rgba(0,255,0,0.8), 0 0 40px rgba(0,255,0,0.6), 0 0 60px rgba(0,255,0,0.4)!important; }
        `;
        document.head.appendChild(style);
        window.happyFishingStylesInjected = true;
      }
      // #endregion

      // #region ==================== 长按与进度条逻辑 ====================
      let pressStartTime = 0;
      const updateProgress = () => {
        if (!state.progressRect) return;
        const offset = totalLength * (1 - state.progress);
        state.progressRect.style.strokeDashoffset = offset;

        const headRatio = state.progress;
        let color;
        if (headRatio < 0.304) color = '#ff0000';
        else if (headRatio < 0.478) color = '#ffff00';
        else if (headRatio < 0.826) color = '#ffff00';
        else color = '#00ff00';
        state.progressRect.style.stroke = color;
      };
      const getCurrentProgressColor = () => {
        const r = state.progress;
        if (r < 0.304) return 'red';
        if (r < 0.478) return 'yellow';
        if (r < 0.826) return 'yellow';
        return 'green';
      };

      const getCurrentIndicatorColor = () => {
        if (!state.indicator || !state.indicator.parentNode) return null;
        if (state.indicator.classList.contains('red')) return 'red';
        if (state.indicator.classList.contains('yellow')) return 'yellow';
        if (state.indicator.classList.contains('green')) return 'green';
        return null;
      };

      const forward = () => {
        state.progress = Math.min(state.progress + GAME_CONFIG.progressForwardSpeed, 1);
        updateProgress();
        if (state.isPressing) state.progressRaf = requestAnimationFrame(forward);
      };
      const backward = () => {
        state.progress = Math.max(state.progress - GAME_CONFIG.progressBackwardSpeed, 0);
        updateProgress();
        if (state.progress > 0) state.progressRaf = requestAnimationFrame(backward);
      };

      const startMatchScoreTick = () => {
        if (state.matchScoreTimer) clearInterval(state.matchScoreTimer);
        const interval = getRandomInRange(GAME_CONFIG.matchTickInterval);
        const up = state.currentFish?.scoreUpSpeed || 0; 
        const down = state.currentFish?.scoreDownSpeed || 0;

        state.matchScoreTimer = setInterval(() => {
          if (!state.indicator?.parentNode) return;
          const match = getCurrentProgressColor() === getCurrentIndicatorColor();

          if (match && state.progress > 0) {
            state.matchScore = Math.min(100, state.matchScore + up);
          } else {
            state.matchScore = Math.max(0, state.matchScore - down);
          }

          if (state.matchScore === 0) {
            state.zeroStartTime ??= Date.now(); 
            console.log('state.zeroStartTime:',state.zeroStartTime);
            if (Date.now() - state.zeroStartTime >= GAME_CONFIG.escapeTimeWhenZero) {
              console.log("鱼跑掉了！");
              state.bobber.style.transform = 'translateX(-50%) translateY(0px)';
              state.indicator.remove();
              this._clearAllTimers(); 
              state.pendingFish = null;
              state.progress = 0;
              updateProgress();
              state.zeroStartTime = null;
            }
          } else {
            state.zeroStartTime = null;
          }

          if (state.matchScore > 10) {
            console.log('钓鱼成功');          
            this._biteSuccess();
          }

          console.log(`匹配得分：${state.matchScore}`);
        }, interval);
      };

      const handlePressStart = (e) => {
        e.preventDefault();
        state.isPressing = true;
        if (state.progressRaf) cancelAnimationFrame(state.progressRaf);
        state.progressRaf = requestAnimationFrame(forward);
        startMatchScoreTick();
      };

      const handlePressEnd = () => {
        state.isPressing = false;
        if (state.progressRaf) cancelAnimationFrame(state.progressRaf);
        state.progressRaf = requestAnimationFrame(backward);
        startMatchScoreTick();
      };

      mini.addEventListener('mousedown', handlePressStart);
      mini.addEventListener('mouseup', handlePressEnd);
      mini.addEventListener('mouseleave', handlePressEnd);
      mini.addEventListener('touchstart', handlePressStart, { passive: false });
      mini.addEventListener('touchend', handlePressEnd);
      mini.addEventListener('touchcancel', handlePressEnd);
      // #endregion

      // #region ==================== 私有方法（下沉、咬钩、钓鱼成功、清空计时器） ====================
      // 鱼漂下沉
      this._sinkBobber = (onComplete) => {
        if (!state.bobber) return;
        if (state.sinkRequestId) cancelAnimationFrame(state.sinkRequestId);

        const start = performance.now();
        const duration = GAME_CONFIG.bobberSinkAnimationDuration || 1600;
        const targetY = UI_CONFIG.bobberSinkDistance;

        const animate = (now) => { // 只有当函数被 requestAnimationFrame 直接调用时，它才会传入 now 这个参数。
          const elapsed = now - start;
          const progress = Math.min(elapsed / duration, 1);
          const ease = 1 - Math.pow(1 - progress, 3);
          const y = ease * targetY;
          state.bobber.style.transform = `translateX(-50%) translateY(${y}px)`;
          if (progress < 1) {
            state.sinkRequestId = requestAnimationFrame(animate);
            console.log('动画执行中...:',state.bobber.style.transform);
          } else {
            state.sinkRequestId = null;
            onComplete?.();
          }
        };
        state.sinkRequestId = requestAnimationFrame(animate);
        console.log('state.sinkRequestId:',state.sinkRequestId);
      };
      // 咬钩
      this._startBiteIndicator = () => {
        if (!state.indicator || state.indicator.parentNode) return;
        indicator.className = 'happy-fishing-indicator red';
        mini.appendChild(indicator);
        // 指示器自动随机变色
        const changeColor = () => {
          if (!state.indicator?.parentNode) return;
          indicator.classList.remove('red', 'yellow', 'green');
          void indicator.offsetLeft;
          const next = INDICATOR_CONFIG.colors[Math.floor(Math.random() * 3)];
          indicator.classList.add(next);
          state.indicatorTimer = setTimeout(changeColor, getRandomInRange(INDICATOR_CONFIG.switchDelay));
        };

        state.indicatorTimer = setTimeout(changeColor, getRandomInRange(INDICATOR_CONFIG.firstDelay));
      };
      // 钓鱼成功
      this._biteSuccess = async () => { 
        if (!state.pendingFish) {
          console.warn('pendingFish 为空，异常情况');
          this.remove();
          return;
        };
        // 生成完整鱼对象并保存到 chrome.storage.local
        const caughtFish = {
          ...state.pendingFish,                               // name, weight, rarity 等原有属性
          timestamp: Date.now(),                              // 钓到时间
          signature: `fish_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` // 唯一标识，防重
        };
        try {
          const result = await chrome.storage.local.get('myFishes');
          let myFishes = result.myFishes;

          if (!Array.isArray(myFishes)) {
            myFishes = [];  // 首次使用或数据损坏时初始化为空数组
          };

          myFishes.push(caughtFish);  // 追加最新钓到的鱼（顺序即为钓鱼历史）

          await chrome.storage.local.set({ myFishes });
          console.log('鱼已保存，本地总数量：', myFishes.length, caughtFish);
        } catch (err) {
          console.error('保存鱼到 chrome.storage 失败：', err);
        };

        if (window.createSuccessWin) {
          // 可以把鱼信息临时挂到全局，successWin 里自行读取展示
          window.lastCaughtFish = state.pendingFish;
          createSuccessWin();
        };
        this.remove();
      };
      // 清空计时器
      this._clearAllTimers = () => {
        if (state.indicatorTimer) clearTimeout(state.indicatorTimer);
        if (state.matchScoreTimer) clearInterval(state.matchScoreTimer);
        state.indicatorTimer = state.matchScoreTimer = null;
      };
      // #endregion

    },
    /** 关闭小窗（跨 Tab 同步） */
    remove() {
      if (state.mini) {
        state.mini.remove();
        privateMethods.resetState();
        localStorage.setItem(STORAGE_KEY.removeFlag, Date.now().toString());
        localStorage.removeItem(STORAGE_KEY.position);
        console.log('HappyFishing 已关闭');
      }
    },
    /** 调试用：强制重置 */
    reset() {
      this.remove();
      privateMethods.resetState();
      console.log('HappyFishing 已强制重置');
    }
  };

})();

// 向下兼容旧调用（必须保留！否则 overlay.js 报错）
window.happyFishingSpawn = (pos) => window.HappyFishing.spawn(pos);
window.RemoveMiniWin = () => window.HappyFishing.remove();