(() => {
    if(window.successExists) return;
    window.successExists = true;

    let successWin = null;
    //钓鱼成功窗口
    function createSuccessWin(){
        successWin = document.createElement('div');
        
        successWin.textContent = '钓鱼成功';
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