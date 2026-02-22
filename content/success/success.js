(() => {
    if(window.successExists) return;
    window.successExists = true;

    let successWin = null;
    let successLang = 'zh';

    async function getLanguage() {
        try {
            const result = await chrome.storage.local.get('language');
            return result.language || 'zh';
        } catch (error) {
            console.error("读取语言设置失败:", error);
            return 'zh';
        }
    }

    function getText(key) {
        const langCode = successLang === 'zh' ? 'zh-CN' : 'en-US';
        if (typeof i18nData !== 'undefined' && i18nData[successLang]) {
            return i18nData[successLang][key] || key;
        }
        return key;
    }

    async function createSuccessWin(){
        successLang = await getLanguage();

        successWin = document.createElement('div');
        successWin.innerHTML = `
        <div style="margin-top:120px; line-height:1.4">
            <div style="font-size:48px">${getText('fishingSuccess')}</div>
            ${window.lastCaughtFish ? `
            <div style="font-size:36px; margin:20px 0">${window.lastCaughtFish.name}</div>
            <div style="font-size:28px">${getText('weightLabel')}：${window.lastCaughtFish.weight} kg</div>
            <div style="font-size:24px; color:#fffa">${getText('rarityLabel')}：${'★'.repeat(window.lastCaughtFish.rarity)} ${window.lastCaughtFish.rarity}/6</div>
            ` : ''}
        </div>
        `;
        successWin.style.cssText = `
            all: initial !important;
            position: fixed !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            width: 500px !important;
            height: 500px !important;
            background: #f37f41 !important;
            color: white !important;
            font: bold 60px/500px system-ui !important;
            text-align: center !important;
            border-radius: 30px !important;
            box-shadow: 0 20px 60px rgba(0,0,0,0.6) !important;
            z-index: 2147483647 !important;
            pointer-events: auto !important;
            cursor: pointer !important;
        `;
        successWin.onclick = ()=>{
            successWin.remove();
        }
        document.documentElement.appendChild(successWin);
    };

    window.createSuccessWin = createSuccessWin;
})();