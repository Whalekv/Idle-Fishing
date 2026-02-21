const i18n = {
    zh: {
        pageTitle: "我的鱼塘 - Happy Fishing",
        myFishpond: "我的鱼塘",
        totalStats: "共捕获 <span id=\"total\">0</span> 条鱼",
        emptyHint: "还没有钓到鱼哦～快去钓鱼吧！",
        weight: "重量",
        capturedTime: "捕获时间",
        signature: "签名",
        contributeBtn: "放入公共鱼池",
        deleteBtn: "删除",
        confirmContribute: "确定要把 {name} ({weight}kg) 放入公共鱼池吗？\n放入后本地记录将删除。",
        confirmDelete: "确定要删除 {name} ({weight}kg) 吗？\n删除后无法恢复。",
        contributeSuccess: "成功放入公共鱼池：{name} ({weight}kg)",
        contributeExists: "\"{name}\" 已存在于公共鱼池，将删除本地记录。",
        contributeFail: "放入失败（不删除本地记录，可重试）：{name}\n错误：{error}",
        deleteSuccess: "已删除该鱼",
        deleteFail: "删除失败，请刷新页面重试",
        publicPond: "公共鱼池",
        searchPlaceholder: "按签名搜索鱼...",
        emptyNoMatch: "没有找到匹配该签名的鱼～",
        emptyPond: "公共鱼池空空如也～",
        selectAll: "全选",
        deleteSelected: "删除选中",
        alertSelectFirst: "请先选中要删除的鱼",
        alertConfirmDelete: "确定要删除选中的 {count} 条鱼吗？\n此操作不可恢复！",
        alertPasswordPrompt: "请输入4位数密码以验证签名：",
        alertPasswordError: "密码格式错误，请输入4位数字密码",
        alertSignatureError: "密码错误，签名验证失败",
        alertDeleteSuccess: "成功删除 {count} 条鱼！",
        alertDeleteFailed: "批量删除失败：",
        alertSelectFishFirst: "请先选中一条鱼",
        alertSameSignature: "只能选择相同签名的鱼",
        rarity: "稀有度",
        noSignature: "无签名",
        nicknamePlaceholder: "请输入昵称",
        passwordPlaceholder: "请输入4位数密码",
        signBtn: "确定签名",
        signedBtn: "已签名",
        resignBtn: "重新签名",
        startFishing: "开始钓鱼",
        stopFishing: "结束钓鱼",
        alertInput: "请正确输入昵称和4位数字密码",
        alertSigned: "签名成功！\n你的签名：",
        alertDeleted: "已删除签名,请重新输入",
        alertNoSign: "请先签名！",
        langBtn: "EN",
        clickToSelect: "点击选择钓鱼位置",
        allTabsSync: "所有标签页将同步"
    },
    en: {
        pageTitle: "My Fishpond - Happy Fishing",
        myFishpond: "My Fishpond",
        totalStats: "Total: <span id=\"total\">0</span> fish",
        emptyHint: "No fish yet~ Go fishing!",
        weight: "Weight",
        capturedTime: "Captured",
        signature: "Signature",
        contributeBtn: "Share",
        deleteBtn: "Delete",
        confirmContribute: "Share {name} ({weight}kg) to public pond?\nLocal record will be deleted.",
        confirmDelete: "Delete {name} ({weight}kg)?\nCannot be undone.",
        contributeSuccess: "Shared to public pond: {name} ({weight}kg)",
        contributeExists: "\"{name}\" already in public pond, deleting local record.",
        contributeFail: "Share failed (not deleted, retry): {name}\nError: {error}",
        deleteSuccess: "Fish deleted",
        deleteFail: "Delete failed, please refresh",
        publicPond: "Public Pond",
        searchPlaceholder: "Search by signature...",
        emptyNoMatch: "No matching fish found~",
        emptyPond: "Public pond is empty~",
        selectAll: "Select All",
        deleteSelected: "Delete",
        alertSelectFirst: "Please select fish to delete first",
        alertConfirmDelete: "Delete {count} selected fish?\nThis action cannot be undone!",
        alertPasswordPrompt: "Enter 4-digit password to verify signature:",
        alertPasswordError: "Invalid password, please enter 4-digit password",
        alertSignatureError: "Password error, signature verification failed",
        alertDeleteSuccess: "Successfully deleted {count} fish!",
        alertDeleteFailed: "Bulk delete failed:",
        alertSelectFishFirst: "Please select a fish first",
        alertSameSignature: "Can only select fish with same signature",
        rarity: "Rarity",
        noSignature: "No signature",
        nicknamePlaceholder: "Enter Nickname",
        passwordPlaceholder: "4-digit Password",
        signBtn: "Confirm",
        signedBtn: "Signed",
        resignBtn: "Reset",
        startFishing: "Start Fishing",
        stopFishing: "Stop Fishing",
        alertInput: "Please enter a valid nickname and 4-digit password",
        alertSigned: "Signed successfully!\nYour signature: ",
        alertDeleted: "Signature deleted, please re-enter",
        alertNoSign: "Please sign first!",
        langBtn: "中",
        clickToSelect: "Click to select fishing position",
        allTabsSync: "All tabs will sync"
    }
};

let currentLang = 'zh';

function getLangCode(lang) {
    return lang === 'zh' ? 'zh-CN' : 'en-US';
}

function updateLanguage(lang) {
    currentLang = lang;
    const langCode = getLangCode(lang);
    document.documentElement.lang = langCode;
    
    const texts = i18n[lang];
    
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
    return i18n[lang]?.[key] || i18n.zh[key] || key;
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

console.log('i18n.js: About to mount to window');
window.i18n = i18n;
window.updateLanguage = updateLanguage;
window.getText = getText;
console.log('i18n.js: Mounted to window', {
  i18n: !!window.i18n,
  updateLanguage: !!window.updateLanguage,
  getText: !!window.getText
});
