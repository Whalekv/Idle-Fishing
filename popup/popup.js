// popup.js
let userSignature = ''; //用户签名
let savedNickname = ''; //用户名
let savedPassword = ''; //密码
let currentLang = 'zh'; // 默认语言

const i18n = {
    zh: {
        nicknamePlaceholder: "请输入昵称",
        passwordPlaceholder: "请输入4位数密码",
        signBtn: "确定签名",
        signedBtn: "已签名",
        resignBtn: "重新签名",
        startFishing: "开始钓鱼",
        stopFishing: "结束钓鱼",
        myFishpond: "查看鱼塘",
        publicPond: "公共鱼池",
        alertInput: "请正确输入昵称和4位数字密码",
        alertSigned: "签名成功！\n你的签名：",
        alertDeleted: "已删除签名,请重新输入",
        alertNoSign: "请先签名！",
        langBtn: "EN"
    },
    en: {
        nicknamePlaceholder: "Enter Nickname",
        passwordPlaceholder: "4-digit Password",
        signBtn: "Confirm",
        signedBtn: "Signed",
        resignBtn: "Reset",
        startFishing: "Start Fishing",
        stopFishing: "Stop Fishing",
        myFishpond: "My Fishpond",
        publicPond: "Public Pond",
        alertInput: "Please enter a valid nickname and 4-digit password",
        alertSigned: "Signed successfully!\nYour signature: ",
        alertDeleted: "Signature deleted, please re-enter",
        alertNoSign: "Please sign first!",
        langBtn: "中"
    }
};

function updateLanguage(lang) {
    currentLang = lang;
    const texts = i18n[lang];
    
    // 更新带有 data-i18n 的元素
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        if (texts[key]) {
            el.textContent = texts[key];
        }
    });

    // 更新 placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.dataset.i18nPlaceholder;
        if (texts[key]) {
            el.placeholder = texts[key];
        }
    });

    // 更新切换按钮文字
    document.getElementById('langSwitch').textContent = texts.langBtn;
}

// 轻量确定性哈希函数，通过用户名和密码确定签名后缀
function generateId(nickname, password) {
  const str = nickname + password + "haveagoodtime.";
  let hash = 0;
  const utf8 = new TextEncoder().encode(str);
  for (let i = 0; i < utf8.length; i++) {
    hash = ((hash << 5) - hash) + utf8[i];
    hash = hash & hash;
  }
  hash = Math.abs(hash);
  return hash.toString(36).slice(0, 6).padEnd(6, '0');
}

// 页面加载时恢复上一次输入 [[pp1]]
async function initializeSignature() {
    try {
        const result = await chrome.storage.local.get(['savedNickname', 'savedPassword', 'userSignature', 'language']);
        
        // 恢复语言设置
        if (result.language) {
            updateLanguage(result.language);
        } else {
            updateLanguage('zh'); // 默认中文
        }

        if (result.savedNickname && result.savedPassword) {
            document.querySelector('.signature-input').value = result.savedNickname;
            document.querySelector('.password-input').value = result.savedPassword;
            savedNickname = result.savedNickname;
            savedPassword = result.savedPassword;
            //签名 = 用户名 + 签名后缀
            userSignature = `${result.savedNickname}${generateId(result.savedNickname, result.savedPassword)}`;
            // 如果已有签名，禁用按钮并显示已签名状态
            if (result.userSignature) {
                const signBtn = document.querySelector('.signature-btn');
                signBtn.dataset.i18n = 'signedBtn'; // 更新 key
                signBtn.textContent = i18n[currentLang].signedBtn; // 立即更新显示
                signBtn.disabled = true;
                document.querySelector('.signature-input').disabled = true;
                document.querySelector('.password-input').disabled = true;
            }
        }
    } catch (error) {
        console.error("读取存储失败:", error);
    }
}

initializeSignature();

// 语言切换按钮
document.getElementById('langSwitch').addEventListener('click', () => {
    const newLang = currentLang === 'zh' ? 'en' : 'zh';
    updateLanguage(newLang);
    chrome.storage.local.set({ language: newLang });
});

// 确定签名按钮
document.querySelector('.signature-btn').addEventListener('click', () => {
    const nickname = document.querySelector('.signature-input').value.trim();
    const password = document.querySelector('.password-input').value.trim();

    if (!nickname || password.length !== 4 || !/^\d{4}$/.test(password)) {
        alert(i18n[currentLang].alertInput);
        return;
    }

    // 保存昵称和密码（用于下次自动填充）
    chrome.storage.local.set({
        savedNickname: nickname,
        savedPassword: password
    });

    const id = generateId(nickname, password);
    userSignature = `${nickname}${id}`;

    // 保存最终签名
    chrome.storage.local.set({ userSignature: userSignature }, () => {
        alert(`${i18n[currentLang].alertSigned}${userSignature}`);

        // 禁用输入和按钮
        document.querySelector('.signature-input').disabled = true;
        document.querySelector('.password-input').disabled = true;
        
        const signBtn = document.querySelector('.signature-btn');
        signBtn.dataset.i18n = 'signedBtn';
        signBtn.textContent = i18n[currentLang].signedBtn;
        signBtn.disabled = true;
    });
});

// 重新输入按钮
document.querySelector('.re-enter-btn').addEventListener('click', () => {
  chrome.storage.local.remove(['savedNickname', 'savedPassword', 'userSignature'], () => {
    alert(i18n[currentLang].alertDeleted);
  });
  document.querySelector('.signature-input').value = '';
  document.querySelector('.password-input').value = '';
  
  const signBtn = document.querySelector('.signature-btn');
  signBtn.dataset.i18n = 'signBtn'; // 恢复 key
  signBtn.textContent = i18n[currentLang].signBtn;
  signBtn.disabled = false;
  
  document.querySelector('.signature-input').disabled = false;
  document.querySelector('.password-input').disabled = false;
  
})

// Start Fishing 按钮
document.querySelector('.start-fishing-btn').addEventListener('click', async () => {
    const result = await chrome.storage.local.get('userSignature');
    if (!result.userSignature) {
      alert(i18n[currentLang].alertNoSign);
      return;
    }
    chrome.runtime.sendMessage({ action: 'start' });
    window.close();
});

// 关闭按钮
document.querySelector('.close-mini-win').addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'removeMini' });
  window.close();
});
// 查看鱼塘按钮
document.getElementById('openFishpond').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();  // 自动打开 fishpond.html
  window.close();
});
// 查看公共鱼池
document.getElementById('openPublicFishpond').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('fishpond-public/fishpond-public.html') });
  window.close();
});
