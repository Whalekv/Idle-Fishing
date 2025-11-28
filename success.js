(() => {
    if(window.successExists) return;
    window.successExists = true;

    let successWin = null;
    //钓鱼成功窗口
    function createSuccessWin(){

        successWin = document.createElement('div');
        successWin.innerHTML = `
        <div style="margin-top:120px; line-height:1.4">
            <div style="font-size:48px">钓鱼成功！</div>
            ${window.lastCaughtFish ? `
            <div style="font-size:36px; margin:20px 0">${window.lastCaughtFish.name}</div>
            <div style="font-size:28px">重量：${window.lastCaughtFish.weight} kg</div>
            <div style="font-size:24px; color:#fffa">稀有度：${'★'.repeat(window.lastCaughtFish.rarity)} ${window.lastCaughtFish.rarity}/6</div>
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