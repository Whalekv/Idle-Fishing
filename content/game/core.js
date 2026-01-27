// 游戏核心逻辑模块：纯状态机 + 规则，不涉及任何 DOM 操作


(()=>{
    if (!window.HappyFishingConfig || !window.HappyFishingFish) {
        console.error('依赖模块未加载:HappyFishingConfig 或 HappyFishingFish');
        return;
    }
    
    const { GAME_CONFIG, INDICATOR_CONFIG, getRandomInRange } = window.HappyFishingConfig;
    const { generateRandomFish } = window.HappyFishingFish;

    class FishingGame {
        
        constructor(options = {}) {
            this.onUpdate = options.onUpdate || (() => {});                     // 状态变化时通知UI
            this.onSinkStart = options.onSinkStart || (() => {});               // 鱼漂开始下沉
            this.onSinkComplete = options.onSinkComplete || (() => {});         // 鱼漂下沉动画结束
            this.onBiteStart = options.onBiteStart || (() => {});               // 开始显示咬钩指示器
            this.onSuccess = options.onSuccess || (() => {});                   // 钓鱼成功
            this.onFail = options.onFail || (() => {});                         // 钓鱼失败、跑鱼
            this.onRemove = options.onRemove || (() => {});                     // 游戏结束清理

            // 新增：支持预设的鱼与统一的咬钩时间
            this.initialFish = options.initialFish || null;
            this.initialBiteAt = options.initialBiteAt || null;

            this.resetState();//[[cgc1]] 
        }

        resetState() {
            //[[cgc2]]
            this.state = {
                pendingFish: null,                  // 当前等待钓的鱼（生成后但为咬钩）
                currentFish: null,                  // 当前上钩的鱼（咬钩后）

                progress: 0,                        // 0-1，进度条填充比例
                matchScore: 0,                      // 当前匹配分数（0-100）
                indicatorColor: 'red',              // 当前指示器颜色

                isPressing: false,                  // 是否长按鼠标
                
                // 计时器ID（外部无需关心，由core内部管理）
                timers: {
                    biteDelay: null,
                    colorSwitch: null,
                    matchCheck: null
                },

                sinkRequestId: null,
                progressRaf: null,
                zeroScoreStartTime: null
            };
        };

        // ================= 公共方法 =================
        // [[cgc3]]
        // 开始钓鱼（鱼漂放下后调用）
        start() {
            // 支持跨标签共享的鱼：若提供 initialFish 则使用它，否则生成随机鱼
            const pending = this.initialFish || generateRandomFish();
            this.state.pendingFish = pending;
            console.log("新鱼生成，准备咬钩：", this.state.pendingFish);
            // 随机或统一延迟后触发咬钩[[cgc5]]
            let delay;
            if (typeof this.initialBiteAt === 'number') {
                delay = Math.max(0, this.initialBiteAt - Date.now());
            } else {
                delay = getRandomInRange({min: this.state.pendingFish.sinkTimeMin, max: this.state.pendingFish.sinkTimeMax});
            }

            this.state.timers.biteDelay = setTimeout(() => {
                this.state.currentFish = { ...this.state.pendingFish };
                this.state.pendingFish = null;
                this.triggerBite();
                console.log('执行咬钩');
                
            }, delay);
        };

        // 触发咬钩
        triggerBite() {
            if (!this.state.currentFish || this.state.sinkRequestId) return; // 防止重复

            this.onBiteStart();
            this._startSinkAnimation();
            this._startIndicatorColorSwitch();
            console.log('咬钩触发：鱼漂下沉 + 指示器出现');
        }

        // 鼠标按下，开始拉杆
        press() {
            if (!this.state.currentFish || this.state.isPressing) return;
            this.state.isPressing = true;

            // 开启进度条上升 + 启动匹配检查
            this._startProgressForward();
            this._startMatchCheck();
        };

        // 松开鼠标，停止拉杆
        release() {
            if (!this.state.currentFish || !this.state.isPressing) return;
            this.state.isPressing = false;

            // 进度条开始下降 + 启动匹配检查
            this._startProgressBackward();
            this._startMatchCheck();
        };

        // 强制结束游戏（移除小窗时调用）
        destroy() {
            
            this._clearAllTimers();
            if (this.state.sinkRequestId) cancelAnimationFrame(this.state.sinkRequestId);
            if (this.state.progressRaf) cancelAnimationFrame(this.state.progressRaf)
            this.onRemove();
            this.resetState();
            // console.log('强制结束执行');
        };

        // ================= 私有方法 =================
        
        // 获取进度条颜色
        _getProgressColor(progress) {
            if (progress < UI_CONFIG.progressColorSegments.top) return 'red';
            if (progress < UI_CONFIG.progressColorSegments.right) return 'yellow';
            if (progress < UI_CONFIG.progressColorSegments.bottom) return 'yellow';
            return 'green';
        };

        // 开启进度条上升
        _startProgressForward() {
            if (this.state.progressRaf) cancelAnimationFrame(this.state.progressRaf);

            const animate = () => {
                this.state.progress = Math.min(this.state.progress + GAME_CONFIG.progressForwardSpeed, 1);
                const color = this._getProgressColor(this.state.progress);
                this.onUpdate({ progress: this.state.progress, progressColor: color });

                if (this.state.isPressing) {
                    this.state.progressRaf = requestAnimationFrame(animate);
                }
            };
            this.state.progressRaf = requestAnimationFrame(animate);
        };

        // 开启进度条下降
        _startProgressBackward() {
            if (this.state.progressRaf) cancelAnimationFrame(this.state.progressRaf);

            const animate = () => {
                this.state.progress = Math.max(this.state.progress - GAME_CONFIG.progressBackwardSpeed, 0);
                const color = this._getProgressColor(this.state.progress);
                this.onUpdate({ progress: this.state.progress, progressColor: color });

                if (!this.state.isPressing && this.state.progress > 0) {
                    this.state.progressRaf = requestAnimationFrame(animate);
                }
            };
            if (this.state.progress > 0) {
                this.state.progressRaf = requestAnimationFrame(animate);
            }
        };

        // 开启指示灯颜色切换
        _startIndicatorColorSwitch() {
            const change = () => {
                if (!this.state.currentFish) return;
                const colors = INDICATOR_CONFIG.colors;
                let next;
                do {
                    next = colors[Math.floor(Math.random() * colors.length)];
                } while (next === this.state.indicatorColor);

                this.state.indicatorColor = next;
                this.onUpdate({ indicatorColor: next });

                this.state.timers.colorSwitch = setTimeout(change, getRandomInRange(INDICATOR_CONFIG.switchDelay));
            };

            // 首次变色延迟
            this.state.timers.colorSwitch = setTimeout(change, getRandomInRange(INDICATOR_CONFIG.firstDelay));
        }

        // 开启分数检查器
        _startMatchCheck() {
            if (this.state.timers.matchCheck) clearInterval(this.state.timers.matchCheck);

            const upSpeed = this.state.currentFish.scoreUpSpeed;
            const downSpeed = this.state.currentFish.scoreDownSpeed;
            const interval = getRandomInRange(GAME_CONFIG.matchTickInterval);

            this.state.timers.matchCheck = setInterval(() => {
                if (!this.state.currentFish) return;

                const progressColor = this._getProgressColor(this.state.progress);
                const match = progressColor === this.state.indicatorColor;

                if (match && this.state.progress > 0) {
                    this.state.matchScore = Math.min(100, this.state.matchScore + upSpeed);
                } else {
                    this.state.matchScore = Math.max(0, this.state.matchScore - downSpeed);
                }

                this.onUpdate({ matchScore: this.state.matchScore });

                // 跑鱼判定
                if (this.state.matchScore === 0) {
                    this.state.zeroScoreStartTime ??= Date.now();
                    if (Date.now() - this.state.zeroScoreStartTime >= GAME_CONFIG.escapeTimeWhenZero) {
                        this.onFail('鱼跑了!');
                        this.destroy();
                        return;
                    }
                } else {
                    this.state.zeroScoreStartTime = null;
                }

                // 成功判定
                if (this.state.matchScore >= GAME_CONFIG.successfulScore) {
                    this.onSuccess(this.state.currentFish);
                    this.destroy();
                }

                console.log('得分:', this.state.matchScore);
            }, interval);
        };

        // 开启鱼漂下沉动画
        _startSinkAnimation() {
            console.log('开启鱼漂下沉动画方法');
            this.onSinkStart();
            const duration = GAME_CONFIG.bobberSinkAnimationDuration;
            const startTime = performance.now();
            const targetY = UI_CONFIG.bobberSinkDistance;                            // 注意：这里引用了 UI_CONFIG 的数值，但只是数值，不是 DOM

            const animate = (now) => {
                const elapsed = now - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const ease = 1 - Math.pow(1 - progress, 3);                          // easeOutCubic
                const y = ease * targetY;

                this.onUpdate({ sinkY: y});

                if (progress < 1) {
                    this.state.sinkRequestId = requestAnimationFrame(animate);
                } else {
                    this.state.sinkRequestId = null;
                    this.onSinkComplete();
                }
            };

            this.state.sinkRequestId = requestAnimationFrame(animate);
        };

        // 清除所有计时器
        _clearAllTimers() {
            Object.values(this.state.timers).forEach(id => id && clearTimeout(id)); // [[cgc4]]
            if (this.state.timers.matchCheck) clearInterval(this.state.timers.matchCheck);
            this.state.timers = { biteDelay: null, colorSwitch: null, matchCheck: null };
        };
    };

    window.HappyFishingCore = {
        createGame: (options) => new FishingGame(options)
    };

    console.log('HappyFishingCore 模块加载完成');
})()
