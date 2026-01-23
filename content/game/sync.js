// 只负责：签名加载 + 跨 Tab 同步 + 全局 HappyFishing 接口（调用 UI + Core）
// +++和core.js之间的关联方式，看不懂
(() => {
    if (window.HappyFishing) {
        console.warn('HappyFishing 已经初始化，阻止重复注入');
        return window.HappyFishing;
    }

    // ================= 签名加载 =================
    let GLOBAL_SIGNATURE = '';
    //     if (result.fishingSignature) {
    //         GLOBAL_SIGNATURE = result.fishingSignature;
    //     }
    // });
    (async () => {
        const result = await chrome.storage.local.get('fishingSignature');
        if (result.fishingSignature) {
            GLOBAL_SIGNATURE = result.fishingSignature;
        }
    })();
    chrome.storage.onChanged.addListener((changes) => {
        if (changes.fishingSignature) {
            GLOBAL_SIGNATURE = changes.fishingSignature.newValue || '';
        }
    });

    // ================= 存储Key =================
    const { STORAGE_KEY } = window.HappyFishingConfig; //[[cgs1]]

    // ================= 游戏实例 =================
    let currentGame = null;
    let uiInstance = null;

    const initGame = (pos) => {
        // 使用UI模块创建界面
        uiInstance = window.HappyFishingUI.createMiniWindow({
            position: pos,
            onPress: () => currentGame?.press(),
            onRelease: () => currentGame?.release(),
            onTriggerBite: () => currentGame?.triggerBite(),
        });

        // 创建核心游戏实例
        currentGame = window.HappyFishingCore.createGame({
            onUpdate: (data) => uiInstance?.update?.(data), 
            onSinkStart: () => uiInstance?.sinkStart?.(),
            onSinkComplete: () => uiInstance?.sinkComplete?.(),
            onBiteStart: () => uiInstance?.showIndicator?.(),
            onSuccess: async (fish) => {                   
                // 保存鱼逻辑
                const caughtFish = {
                    ...fish,
                    timestamp: Date.now(),
                    signature: GLOBAL_SIGNATURE
                };
                try {
                    const result = await chrome.storage.local.get('myFishes');
                    let myFishes = Array.isArray(result.myFishes) ? result.myFishes : [];
                    myFishes.push(caughtFish);
                    await chrome.storage.local.set({ myFishes });
                    console.log('鱼已保存，本地数量：', myFishes.length);
                } catch (err) {
                    console.error('保存鱼失败：', err);
                }

                // 显示成功窗口
                if (window.createSuccessWin) {
                    // 可以把鱼信息临时挂到全局，successWin 里自行读取展示
                    window.lastCaughtFish = fish;
                    createSuccessWin();
                }
                removeGame();
            },
            onRemove: () => {
                uiInstance?.remove?.();
            },

        });

        // 开始游戏
        currentGame.start();
    };

    //[[cgs2]]
    const removeGame = () => {
        currentGame?.destroy();
        currentGame = null;
        uiInstance = null;

        localStorage.setItem(STORAGE_KEY.removeFlag, Date.now());
        localStorage.removeItem(STORAGE_KEY.position);
        console.log('HappyFishing 已关闭');
    };

    // ================= 跨 Tab 同步监听 =================
    window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY.position && e.newValue) {
            try {
                const pos = JSON.parse(e.newValue);
                initGame(pos);
            } catch (err) {
                console.error('位置解析失败', err);
            }
        }
        if (e.key === STORAGE_KEY.removeFlag) {
            removeGame();
        }
    });

    // ================= 全局接口 =================
    window.HappyFishing = {
        spawn: (pos) => {
            localStorage.setItem(STORAGE_KEY.position, JSON.stringify(pos));
            initGame(pos); // 本页立即生效
        },
        remove: removeGame, //[[cgs1]]
        reset: removeGame
    };

    console.log('HappyFishing 同步模块加载完成（已切换到新核心）');

    // 向下兼容旧调用
    window.RemoveMinWin = () => window.HappyFishing.remove();
})()





// 事件方式
// (() => {
//     if (window.HappyFishing) {
//         console.warn('HappyFishing 已经初始化，阻止重复注入');
//         return window.HappyFishing;
//     }

//     // ────────────────────────────────────────────────
//     //  极简事件总线（推荐放在单独文件，此处为内嵌演示）
//     // ────────────────────────────────────────────────
//     class EventBus {
//         constructor() {
//             this.listeners = new Map();
//         }

//         on(event, callback) {
//             if (!this.listeners.has(event)) {
//                 this.listeners.set(event, []);
//             }
//             this.listeners.get(event).push(callback);
//             return () => this.off(event, callback); // 返回取消订阅函数
//         }

//         off(event, callback) {
//             if (!this.listeners.has(event)) return;
//             const callbacks = this.listeners.get(event);
//             const idx = callbacks.indexOf(callback);
//             if (idx !== -1) callbacks.splice(idx, 1);
//         }

//         emit(event, ...args) {
//             if (!this.listeners.has(event)) return;
//             // 复制一份防止订阅/取消过程中出错
//             const callbacks = [...this.listeners.get(event)];
//             for (const cb of callbacks) {
//                 try {
//                     cb(...args);
//                 } catch (err) {
//                     console.error(`EventBus emit error on ${event}:`, err);
//                 }
//             }
//         }

//         clear() {
//             this.listeners.clear();
//         }
//     }

//     const bus = new EventBus();

//     // ────────────────────────────────────────────────
//     //  签名加载与同步
//     // ────────────────────────────────────────────────
//     let GLOBAL_SIGNATURE = '';

//     (async () => {
//         const result = await chrome.storage.local.get('fishingSignature');
//         if (result.fishingSignature) {
//             GLOBAL_SIGNATURE = result.fishingSignature;
//         }
//     })();

//     chrome.storage.onChanged.addListener((changes) => {
//         if (changes.fishingSignature) {
//             GLOBAL_SIGNATURE = changes.fishingSignature.newValue || '';
//         }
//     });

//     // ────────────────────────────────────────────────
//     //  存储Key 与 跨 Tab 同步
//     // ────────────────────────────────────────────────
//     const { STORAGE_KEY } = window.HappyFishingConfig;

//     const STORAGE_EVENTS = {
//         POSITION_CHANGED: 'storage:position-changed',
//         REMOVE_REQUESTED: 'storage:remove-requested'
//     };

//     // 监听 storage 事件 → 发出总线事件
//     window.addEventListener('storage', (e) => {
//         if (e.key === STORAGE_KEY.position && e.newValue) {
//             try {
//                 const pos = JSON.parse(e.newValue);
//                 bus.emit(STORAGE_EVENTS.POSITION_CHANGED, pos);
//             } catch (err) {
//                 console.error('位置解析失败', err);
//             }
//         }
//         if (e.key === STORAGE_KEY.removeFlag) {
//             bus.emit(STORAGE_EVENTS.REMOVE_REQUESTED);
//         }
//     });

//     // ────────────────────────────────────────────────
//     //  游戏生命周期管理
//     // ────────────────────────────────────────────────
//     let currentGame = null;
//     let uiInstance = null;

//     const GAME_EVENTS = {
//         UPDATE:          'game:update',
//         SINK_START:      'game:sink-start',
//         SINK_COMPLETE:   'game:sink-complete',
//         BITE_START:      'game:bite-start',
//         SUCCESS:         'game:success',
//         REMOVE:          'game:remove'
//     };

//     const UI_EVENTS = {
//         PRESS:        'ui:press',
//         RELEASE:      'ui:release',
//         TRIGGER_BITE: 'ui:trigger-bite'
//     };

//     // ─── 创建游戏 ───────────────────────────────────────
//     const initGame = (pos) => {
//         if (currentGame || uiInstance) {
//             console.warn('游戏实例已存在，先清理');
//             removeGame();
//         }

//         // 创建 UI（只监听用户输入 → 发出事件）
//         uiInstance = window.HappyFishingUI.createMiniWindow({
//             position: pos,
//             onPress:       () => bus.emit(UI_EVENTS.PRESS),
//             onRelease:     () => bus.emit(UI_EVENTS.RELEASE),
//             onTriggerBite: () => bus.emit(UI_EVENTS.TRIGGER_BITE),
//         });

//         // 创建核心逻辑（只发出状态变更事件）
//         currentGame = window.HappyFishingCore.createGame({
//             onUpdate:       (data)       => bus.emit(GAME_EVENTS.UPDATE, data),
//             onSinkStart:    ()           => bus.emit(GAME_EVENTS.SINK_START),
//             onSinkComplete: ()           => bus.emit(GAME_EVENTS.SINK_COMPLETE),
//             onBiteStart:    ()           => bus.emit(GAME_EVENTS.BITE_START),
//             onSuccess: async (fish) => {
//                 const caughtFish = {
//                     ...fish,
//                     timestamp: Date.now(),
//                     signature: GLOBAL_SIGNATURE
//                 };

//                 try {
//                     const result = await chrome.storage.local.get('myFishes');
//                     let myFishes = Array.isArray(result.myFishes) ? result.myFishes : [];
//                     myFishes.push(caughtFish);
//                     await chrome.storage.local.set({ myFishes });
//                     console.log('鱼已保存，本地数量：', myFishes.length);
//                 } catch (err) {
//                     console.error('保存鱼失败：', err);
//                 }

//                 if (window.createSuccessWin) {
//                     window.lastCaughtFish = fish;
//                     createSuccessWin();
//                 }

//                 bus.emit(GAME_EVENTS.SUCCESS);
//                 bus.emit(GAME_EVENTS.REMOVE);
//             },
//             onRemove: () => {
//                 bus.emit(GAME_EVENTS.REMOVE);
//             }
//         });

//         // UI 响应游戏状态
//         const unsubscribes = [];

//         unsubscribes.push(
//             bus.on(GAME_EVENTS.UPDATE,       data => uiInstance?.update?.(data)),
//             bus.on(GAME_EVENTS.SINK_START,   ()   => uiInstance?.sinkStart?.()),
//             bus.on(GAME_EVENTS.SINK_COMPLETE,()   => uiInstance?.sinkComplete?.()),
//             bus.on(GAME_EVENTS.BITE_START,   ()   => uiInstance?.showIndicator?.()),
//             bus.on(GAME_EVENTS.REMOVE,       ()   => {
//                 uiInstance?.remove?.();
//                 uiInstance = null;
//             })
//         );

//         // 游戏响应用户输入
//         unsubscribes.push(
//             bus.on(UI_EVENTS.PRESS,       () => currentGame?.press?.()),
//             bus.on(UI_EVENTS.RELEASE,     () => currentGame?.release?.()),
//             bus.on(UI_EVENTS.TRIGGER_BITE,() => currentGame?.triggerBite?.())
//         );

//         // 清理函数
//         bus.on(GAME_EVENTS.REMOVE, () => {
//             unsubscribes.forEach(unsub => unsub());
//             currentGame?.destroy?.();
//             currentGame = null;
//         }, { once: true });

//         currentGame.start();
//     };

//     // ─── 清理游戏 ───────────────────────────────────────
//     const removeGame = () => {
//         bus.emit(GAME_EVENTS.REMOVE);

//         localStorage.setItem(STORAGE_KEY.removeFlag, Date.now());
//         localStorage.removeItem(STORAGE_KEY.position);
//         console.log('HappyFishing 已关闭');
//     };

//     // ─── 跨 Tab 触发初始化 ──────────────────────────────
//     bus.on(STORAGE_EVENTS.POSITION_CHANGED, (pos) => {
//         initGame(pos);
//     });

//     bus.on(STORAGE_EVENTS.REMOVE_REQUESTED, () => {
//         removeGame();
//     });

//     // ────────────────────────────────────────────────
//     //  对外暴露的全局接口
//     // ────────────────────────────────────────────────
//     window.HappyFishing = {
//         spawn: (pos) => {
//             localStorage.setItem(STORAGE_KEY.position, JSON.stringify(pos));
//             initGame(pos); // 本标签页立即生效
//         },
//         remove: removeGame,
//         reset:  removeGame
//     };

//     console.log('HappyFishing 同步模块加载完成（事件总线版）');

//     // 向下兼容
//     window.RemoveMinWin = () => window.HappyFishing.remove();

// })();