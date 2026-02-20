// popup.js
let userSignature = '';
let savedNickname = '';
let savedPassword = '';

async function initializeSignature() {
    try {
        const result = await chrome.storage.local.get(['savedNickname', 'savedPassword', 'userSignature', 'language']);
        
        if (result.language) {
            updateLanguage(result.language);
        } else {
            updateLanguage('zh');
        }

        if (result.savedNickname && result.savedPassword) {
            document.querySelector('.signature-input').value = result.savedNickname;
            document.querySelector('.password-input').value = result.savedPassword;
            savedNickname = result.savedNickname;
            savedPassword = result.savedPassword;
            userSignature = `${result.savedNickname}${generateId(result.savedNickname, result.savedPassword)}`;
            if (result.userSignature) {
                const signBtn = document.querySelector('.signature-btn');
                signBtn.dataset.i18n = 'signedBtn';
                signBtn.textContent = getText('signedBtn');
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

chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.language) {
        updateLanguage(changes.language.newValue);
    }
});

document.getElementById('langSwitch').addEventListener('click', () => {
    const newLang = currentLang === 'zh' ? 'en' : 'zh';
    updateLanguage(newLang);
    chrome.storage.local.set({ language: newLang });
});

document.querySelector('.signature-btn').addEventListener('click', () => {
    const nickname = document.querySelector('.signature-input').value.trim();
    const password = document.querySelector('.password-input').value.trim();

    if (!nickname || password.length !== 4 || !/^\d{4}$/.test(password)) {
        alert(getText('alertInput'));
        return;
    }

    chrome.storage.local.set({
        savedNickname: nickname,
        savedPassword: password
    });

    const id = generateId(nickname, password);
    userSignature = `${nickname}${id}`;

    chrome.storage.local.set({ userSignature: userSignature }, () => {
        alert(`${getText('alertSigned')}${userSignature}`);

        document.querySelector('.signature-input').disabled = true;
        document.querySelector('.password-input').disabled = true;
        
        const signBtn = document.querySelector('.signature-btn');
        signBtn.dataset.i18n = 'signedBtn';
        signBtn.textContent = getText('signedBtn');
        signBtn.disabled = true;
    });
});

document.querySelector('.re-enter-btn').addEventListener('click', () => {
  chrome.storage.local.remove(['savedNickname', 'savedPassword', 'userSignature'], () => {
    alert(getText('alertDeleted'));
  });
  document.querySelector('.signature-input').value = '';
  document.querySelector('.password-input').value = '';
  
  const signBtn = document.querySelector('.signature-btn');
  signBtn.dataset.i18n = 'signBtn';
  signBtn.textContent = getText('signBtn');
  signBtn.disabled = false;
  
  document.querySelector('.signature-input').disabled = false;
  document.querySelector('.password-input').disabled = false;
  
})

document.querySelector('.start-fishing-btn').addEventListener('click', async () => {
    const result = await chrome.storage.local.get('userSignature');
    if (!result.userSignature) {
      alert(getText('alertNoSign'));
      return;
    }
    chrome.runtime.sendMessage({ action: 'start' });
    window.close();
});

document.querySelector('.close-mini-win').addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'removeMini' });
  window.close();
});

document.getElementById('openFishpond').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
  window.close();
});

document.getElementById('openPublicFishpond').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('fishpond-public/fishpond-public.html') });
  window.close();
});
