// 只负责：签名加载 + 跨 Tab 同步 + 全局 HappyFishing 接口（调用 UI + Core）
// +++和core.js之间的关联方式，看不懂
(() => {
    if (window.HappyFishing) {
        console.warn('HappyFishing 已经初始化，阻止重复注入');
        return window.HappyFishing;
    }

    // ================= 签名加载 =================
    let GLOBAL_SIGNATURE = '';
    (async () => {
        const result = await chrome.storage.local.get('userSignature');
        if (result.userSignature) {
            GLOBAL_SIGNATURE = result.userSignature;
        }
    })();
    chrome.storage.onChanged.addListener((changes) => {
        if (changes.userSignature) {
            GLOBAL_SIGNATURE = changes.userSignature.newValue || '';
        }
    });

    // ================= 存储Key =================
    const { STORAGE_KEY } = window.HappyFishingConfig; //[[cgs1]]

    // 新增：本标签页的 tabId（用于在咬钩后仅保留当前活动标签页）
    let MY_TAB_ID = null;
    chrome.runtime.sendMessage({ action: 'getTabId' }).then(res => {
        MY_TAB_ID = res?.tabId || null;
        // 获取到 tabId 后，重新评估会话（若已选主标签页则触发非主标签页移除）
        setTimeout(() => { tryResumeFromSession?.(); }, 0);
    }).catch(() => {});

    // 新增：当前会话 ID（用于与后台协调）
    let CURRENT_SESSION_ID = null;

    // ================= 游戏实例 =================
    let currentGame = null;
    let uiInstance = null;
    // 防重入：避免并发初始化导致重复 mini/bobber
    let isInitializing = false;

    const initGame = (pos, session) => {
        if (isInitializing || currentGame) return; // 防止重复创建
        isInitializing = true;
        // 使用UI模块创建界面
        uiInstance = window.HappyFishingUI.createMiniWindow({
            position: pos,
            onPress: () => currentGame?.press(),
            onRelease: () => currentGame?.release(),
            onTriggerBite: () => currentGame?.triggerBite(),
        });

        // 创建核心游戏实例（支持跨标签共享鱼与统一咬钩时间）
        currentGame = window.HappyFishingCore.createGame({
            onUpdate: (data) => uiInstance?.update?.(data), 
            onSinkStart: () => uiInstance?.sinkStart?.(),
            onSinkComplete: () => uiInstance?.sinkComplete?.(),
            onBiteStart: () => {
                uiInstance?.showIndicator?.();
                if (CURRENT_SESSION_ID) {
                    chrome.runtime.sendMessage({ action: 'biteTriggered', sessionId: CURRENT_SESSION_ID }).catch(() => {});
                }
            },
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
            onFail: () => {
                removeGame();
            },
            onRemove: () => {
                uiInstance?.remove?.();
            },
            // 关键：跨标签共享的随机鱼 + 统一咬钩时间（绝对时间戳）
            initialFish: session?.fish || null,
            initialBiteAt: session?.biteAt || null
        });

        // 开始游戏
        currentGame.start();
        isInitializing = false;
    };

    //[[cgs2]]
    const removeGame = (opts = { clearSession: true }) => {
        currentGame?.destroy();
        currentGame = null;
        uiInstance = null;
        isInitializing = false;

        // 兜底：如果页面上存在残留的 mini/bobber，全部移除
        try {
            document.querySelectorAll('#happy-fishing-mini').forEach(el => {
                try { el.remove(); } catch {}
            });
        } catch {}
    
        // 清理本地广播（兼容旧逻辑）
        localStorage.setItem(STORAGE_KEY.removeFlag, Date.now());
        localStorage.removeItem(STORAGE_KEY.position);
    
        // 根据选项决定是否清理全局会话
        if (opts.clearSession) {
            chrome.storage.local.remove(STORAGE_KEY.session).catch(() => {});
            CURRENT_SESSION_ID = null;
        }
        console.log('HappyFishing 已关闭');
    };

    // ================= 跨 Tab 同步监听（localStorage 兼容旧逻辑） =================
    window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY.position && e.newValue) {
            // 旧逻辑兼容：改为尝试从会话恢复，避免未携带 session 的 initGame 导致不同步
            tryResumeFromSession();
            return;
        }
        if (e.key === STORAGE_KEY.removeFlag) {
            // 如果存在会话（利用 chrome.storage.local 广播），忽略旧的 removeFlag 防止误清理主标签页
            if (CURRENT_SESSION_ID) return;
            removeGame();
        }
    });

    // ================= 新增：chrome.storage.local 会话同步 =================
    const tryResumeFromSession = async () => {
        try {
            const result = await chrome.storage.local.get(STORAGE_KEY.session);
            const session = result[STORAGE_KEY.session];
            if (!session || session.endedAt) return;
            CURRENT_SESSION_ID = session.id;
            // 若已经选择了咬钩的主标签页，且本标签不是主标签，则不显示 mini
            if (session.biteHostTabId && MY_TAB_ID && session.biteHostTabId !== MY_TAB_ID) {
                return; // 非主标签页：保持不显示
            }
            if (!currentGame && !isInitializing) {
                const pos = session.position || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
                initGame(pos, session);
            }
        } catch (err) {
            console.error('读取会话失败', err);
        }
    };
    tryResumeFromSession();

    chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local') return;
        if (changes[STORAGE_KEY.session]) {
            const session = changes[STORAGE_KEY.session].newValue;
            if (!session) {
                // 会话清理：移除游戏
                removeGame();
                return;
            }
            CURRENT_SESSION_ID = session.id;
            // 咬钩主标签页已选定：非主标签页移除 mini
            if (session.biteHostTabId && MY_TAB_ID && session.biteHostTabId !== MY_TAB_ID) {
                if (currentGame) removeGame({ clearSession: false });
                return;
            }
            // 没有游戏则初始化（用于 spawn 或刷新场景）
            if (!currentGame && !isInitializing) {
                const pos = session.position || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
                initGame(pos, session);
            }
        }
    });

    // ================= 全局接口 =================
    window.HappyFishing = {
        spawn: async (pos) => {
            // 生成共享随机鱼与统一的咬钩时间
            const fish = window.HappyFishingFish.generateRandomFish();
            const biteDelay = Math.floor(fish.sinkTimeMin + Math.random() * (fish.sinkTimeMax - fish.sinkTimeMin));
            const biteAt = Date.now() + biteDelay;
            const session = {
                id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
                fish,
                biteAt,
                position: pos
            };
            CURRENT_SESSION_ID = session.id;
            try {
                await chrome.storage.local.set({ [STORAGE_KEY.session]: session });
            } catch (err) {
                console.error('写入会话失败', err);
            }

            // 兼容旧的 localStorage 广播（同域多标签）
            localStorage.setItem(STORAGE_KEY.position, JSON.stringify(pos));
            initGame(pos, session); // 本页立即生效
        },
        remove: removeGame, //[[cgs1]]
        reset: removeGame
    };

    console.log('HappyFishing 同步模块加载完成（已切换到新核心）');

    // 向下兼容旧调用
    window.RemoveMinWin = () => window.HappyFishing.remove();

    // 后台广播：非主标签页立即移除 mini（保留会话）
    chrome.runtime.onMessage.addListener((msg) => {
        if (msg?.action === 'removeNonHost') {
            if (currentGame || CURRENT_SESSION_ID) {
                removeGame({ clearSession: false });
            }
        }
    });
})()

