let currentLang = 'zh';

function getLangCode(lang) {
    return lang === 'zh' ? 'zh-CN' : 'en-US';
}

function updateLanguage(lang) {
    currentLang = lang;
    const langCode = getLangCode(lang);
    document.documentElement.lang = langCode;
    console.log('updateLanguage called with lang:', lang, 'currentLang:', currentLang);
    
    const texts = i18nData[lang];
    
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        if (texts[key]) {
            el.innerHTML = texts[key];
        }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.dataset.i18nPlaceholder;
        if (texts[key]) {
            el.placeholder = texts[key];
        }
    });

    const langBtn = document.getElementById('langSwitch');
    if (langBtn) {
        langBtn.textContent = texts.langBtn;
    }

    const selectAllBtn = document.getElementById('selectAllBtn');
    const deleteSelectedBtn = document.getElementById('bulkDeleteBtn');
    if (selectAllBtn && texts.selectAll) {
        const selectAllSpan = selectAllBtn.querySelector('[data-i18n="selectAll"]');
        if (selectAllSpan) {
            selectAllSpan.textContent = texts.selectAll;
        }
    }
    if (deleteSelectedBtn && texts.deleteSelected) {
        const deleteSelectedSpan = deleteSelectedBtn.querySelector('[data-i18n="deleteSelected"]');
        if (deleteSelectedSpan) {
            deleteSelectedSpan.textContent = texts.deleteSelected;
        }
    }
}

function getText(key, lang = 'zh') {
    return i18nData[lang]?.[key] || i18nData.zh[key] || key;
}

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

window.i18n = i18nData;
window.updateLanguage = updateLanguage;
window.getText = getText;
