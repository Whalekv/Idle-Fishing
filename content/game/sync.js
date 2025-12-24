// 只负责：签名加载 + 跨 Tab 同步 + 全局 HappyFishing 接口（调用 UI + Core）
// +++和core.js之间的关联方式，看不懂
(() => {
    if (window.HappyFishing) {
        console.warn('HappyFishing 已经初始化，阻止重复注入');
        return window.HappyFishing;
    }

    // ================= 签名加载 =================
    let GLOBAL_SIGNATURE = '';
    chrome.storage.local.get('fishingSignature', (result) => {
        if (result.fishingSignature) {
            GLOBAL_SIGNATURE = result.fishingSignature;
        }
    });
    chrome.storage.onChanged.addListener((changes) => {
        if (changes.fishingSignature) {
            GLOBAL_SIGNATURE = changes.fishingSignature.newValue || '';
        }
    });

    // ================= 存储Key =================
    const { STORAGE_KEY } = window.HappyFishingConfig;

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
            onUpdate: (data) => uiInstance?.update?.(data), // +++
            onSinkStart: () => uiInstance?.sinkStart?.(),
            onSinkComplete: () => uiInstance?.sinkComplete?.(),
            onBiteStart: () => uiInstance?.showIndicator?.(),
            onSuccess: async (fish) => {                    // +++
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
        remove: removeGame,
        reset: removeGame
    };

    console.log('HappyFishing 同步模块加载完成（已切换到新核心）');

    // 向下兼容旧调用
    window.HappyFishingSpawn = (pos) => window.HappyFishing.spawn(pos);
    window.RemoveMinWin = () => window.HappyFishing.remove();
})()