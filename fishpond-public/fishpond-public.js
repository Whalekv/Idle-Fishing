// fishpond-public.js（批量删除版本）

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

const i18n = {
    zh: {
        pageTitle: "公共鱼池",
        publicPond: "公共鱼池",
        totalStats: "共有 <span id=\"total\">0</span> 条鱼",
        searchPlaceholder: "按签名搜索鱼...",
        emptyHint: "还没有钓到鱼哦～快去钓鱼吧！",
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
        noSignature: "无签名"
    },
    en: {
        pageTitle: "Public Pond",
        publicPond: "Public Pond",
        totalStats: "Total: <span id=\"total\">0</span> fish",
        searchPlaceholder: "Search by signature...",
        emptyHint: "No fish yet~ Go fishing!",
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
        noSignature: "No signature"
    }
};

let currentLang = 'zh';

function updateLanguage(lang) {
    currentLang = lang;
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

const configScript = document.createElement('script');
configScript.src = chrome.runtime.getURL('config.js'); //[[ffp1]]
configScript.onload = function() {
  initPublicFishpond();
};
configScript.onerror = function() {
  console.error('加载 config.js 失败');
  document.getElementById('fishGrid').innerHTML = '<div class="empty">加载配置失败</div>';
};
document.head.appendChild(configScript);

function initPublicFishpond() {
  if (!window.FISH_POND_CONFIG) {
    console.error('CONFIG 未加载');
    return;
  }

  const { PUBLIC_GIST_ID, GITHUB_TOKEN, GIST_FILENAME } = window.FISH_POND_CONFIG;

  async function initializeLanguage() {
    try {
      const result = await chrome.storage.local.get('language');
      const lang = result.language || 'zh';
      updateLanguage(lang);
    } catch (error) {
      console.error('读取语言设置失败:', error);
      updateLanguage('zh');
    }
  }

  initializeLanguage();

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.language) {
      updateLanguage(changes.language.newValue);
      renderFishes();
    }
  });

  let publicFishes = [];
  let filterSignature = '';
  const selectedFishes = new Set(); // 存储选中的鱼（用唯一键 timestamp|signature）[[ffp2]]
  let currentSelectedSignature = ''; // 当前选中的签名，用于过滤显示

  // 生成唯一键
  function getFishKey(fish) {
    return `${fish.timestamp}|${fish.signature}`;
  }

  async function loadAndRender() {
    console.log('开始加载公共鱼池数据...');
    try {
      const getRes = await fetch(`https://api.github.com/gists/${PUBLIC_GIST_ID}`, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
        },
        cache: 'reload'
      });
      if (!getRes.ok) throw new Error('加载失败');
      const gistData = await getRes.json();
      const file = gistData.files[GIST_FILENAME];
      if (!file) throw new Error('文件不存在');
      publicFishes = JSON.parse(file.content || '[]');

      publicFishes.sort((a, b) => b.timestamp - a.timestamp); // 最新在前

      console.log('获取到公共鱼池长度：', publicFishes.length);

      renderFishes();
    } catch (err) {
      console.error('加载公共鱼池失败：', err);
      document.getElementById('fishGrid').innerHTML = '<div class="empty">加载公共鱼池失败</div>';
    }
  }

  function renderFishes() {
    const grid = document.getElementById('fishGrid');
    const totalEl = document.getElementById('total');
    const bulkActions = document.getElementById('bulkActions');
    const selectedCountEl = document.getElementById('selectedCount');
    const texts = i18n[currentLang];
    const lowerFilter = filterSignature.trim().toLowerCase();
    let fishesToRender = lowerFilter
      ? publicFishes.filter(fish =>
          (fish.signature || '').toLowerCase().includes(lowerFilter)
        )
      : publicFishes;

    if (currentSelectedSignature) {
      fishesToRender = fishesToRender.filter(fish =>
        fish.signature === currentSelectedSignature
      );
    }

    totalEl.textContent = fishesToRender.length;
    selectedCountEl.textContent = selectedFishes.size;

    bulkActions.style.display = selectedFishes.size > 0 ? 'block' : 'none';
    const selectAllBtn = document.getElementById('selectAllBtn');
    if (selectAllBtn) {
      selectAllBtn.style.display = selectedFishes.size > 0 ? 'inline-block' : 'none';
    }

    grid.innerHTML = '';
    if (fishesToRender.length === 0) {
      grid.innerHTML = `<div class="empty">${
        publicFishes.length === 0 ? texts.emptyPond : texts.emptyNoMatch
      }</div>`;
      return;
    }

    const fragment = document.createDocumentFragment();
    fishesToRender.forEach((fish) => {
      const card = document.createElement('div');
      card.className = 'fish-card';

      const timeStr = new Date(fish.timestamp).toLocaleString(currentLang === 'zh' ? 'zh-CN' : 'en-US', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      }).replace(/\//g, '-');

      const key = getFishKey(fish);
      const isSelected = selectedFishes.has(key);

      card.innerHTML = `
        <div class="fish-name" title="${fish.name}">${fish.name}</div>
        <div class="fish-weight">${fish.weight.toFixed(2)} kg</div>
        <div class="rarity" title="${texts.rarity}：${fish.rarity}">${'★'.repeat(fish.rarity)}</div>
        <div class="timestamp">${timeStr}</div>
        <div class="fish-signature" title="${fish.signature || texts.noSignature}">${fish.signature || '-'}</div>
        <div class="select-wrapper">
          <input type="checkbox" class="select-checkbox" id="chk-${key}" ${isSelected ? 'checked' : ''} title="选中">
        </div>
      `;

      const checkbox = card.querySelector('.select-checkbox');
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          if (selectedFishes.size === 0) {
            currentSelectedSignature = fish.signature;
          } else {
            if (fish.signature !== currentSelectedSignature) {
              alert(texts.alertSameSignature);
              checkbox.checked = false;
              return;
            }
          }
          selectedFishes.add(key);
        } else {
          selectedFishes.delete(key);
          if (selectedFishes.size === 0) {
            currentSelectedSignature = '';
          }
        }
        selectedCountEl.textContent = selectedFishes.size;
        bulkActions.style.display = selectedFishes.size > 0 ? 'block' : 'none';
        const selectAllBtn = document.getElementById('selectAllBtn');
        if (selectAllBtn) {
          selectAllBtn.style.display = selectedFishes.size > 0 ? 'inline-block' : 'none';
        }
        renderFishes();
      });

      fragment.appendChild(card);
    });

    grid.appendChild(fragment);
  }

  function initSearch() {
    const input = document.getElementById('signatureSearch');
    if (!input) return;

    input.addEventListener('input', () => {
      filterSignature = input.value;
      renderFishes();
    });
  }

  // 批量删除函数
  async function bulkDelete() {
    const texts = i18n[currentLang];
    if (selectedFishes.size === 0) {
      alert(texts.alertSelectFirst);
      return;
    }

    const confirmMsg = texts.alertConfirmDelete.replace('{count}', selectedFishes.size);
    if (!confirm(confirmMsg)) {
      return;
    }

    const password = prompt(texts.alertPasswordPrompt);
    if (!password || password.length !== 4 || !/^\d{4}$/.test(password)) {
      alert(texts.alertPasswordError);
      return;
    }

    try {
      const getRes = await fetch(`https://api.github.com/gists/${PUBLIC_GIST_ID}`, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
        },
        cache: 'reload'
      });
      if (!getRes.ok) throw new Error('获取公共池失败');
      const gistData = await getRes.json();
      const file = gistData.files[GIST_FILENAME];
      if (!file) throw new Error('Gist 文件名错误');
      let currentFishes = JSON.parse(file.content || '[]');

      const keysToDelete = Array.from(selectedFishes);
      const fishesToDelete = currentFishes.filter(fish => {
        const key = getFishKey(fish);
        return keysToDelete.includes(key);
      });

      for (const fish of fishesToDelete) {
        if (fish.signature) {
          const nickname = fish.signature.slice(0, -6);
          const expectedSignature = `${nickname}${generateId(nickname, password)}`;
          if (expectedSignature !== fish.signature) {
            throw new Error(texts.alertSignatureError);
          }
        }
      }

      currentFishes = currentFishes.filter(fish => {
        const key = getFishKey(fish);
        return !keysToDelete.includes(key);
      });

      const updateRes = await fetch(`https://api.github.com/gists/${PUBLIC_GIST_ID}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          files: {
            [GIST_FILENAME]: {
              content: JSON.stringify(currentFishes, null, 2)
            }
          }
        })
      });

      if (!updateRes.ok) {
        const err = await updateRes.text();
        throw new Error('更新失败：' + err);
      }

      const successMsg = texts.alertDeleteSuccess.replace('{count}', selectedFishes.size);
      alert(successMsg);
      selectedFishes.clear();
      currentSelectedSignature = '';
      await loadAndRender();
    } catch (err) {
      console.error(err);
      alert(texts.alertDeleteFailed + err.message);
    }
  }

  // 初始化页面时添加批量操作栏
  function initBulkActions() {
    const container = document.querySelector('.container');
    if (!container) return;

    const bulkDiv = document.createElement('div');
    bulkDiv.id = 'bulkActions';
    bulkDiv.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%) translateY(0);
      padding: 20px 40px;
      border-radius: 16px;
      z-index: 1000;
      text-align: center;
      display: none;
      animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    `;
    bulkDiv.innerHTML = `
      <style>
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
        .bulk-btn {
          padding: 14px 36px;
          font-size: 16px;
          font-weight: 600;
          color: white;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          margin: 0 10px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: inline-flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
          position: relative;
          overflow: hidden;
        }
        .bulk-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
          transition: left 0.5s;
        }
        .bulk-btn:hover::before {
          left: 100%;
        }
        .bulk-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
        }
        .bulk-btn:active {
          transform: translateY(0);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }
        .btn-select {
          background: linear-gradient(135deg, #2196f3 0%, #1976d2 100%);
        }
        .btn-select:hover {
          background: linear-gradient(135deg, #42a5f5 0%, #1e88e5 100%);
        }
        .btn-delete {
          background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
        }
        .btn-delete:hover {
          background: linear-gradient(135deg, #ef5350 0%, #e53935 100%);
        }
        .btn-delete:disabled {
          background: linear-gradient(135deg, #bdbdbd 0%, #9e9e9e 100%);
          cursor: not-allowed;
          transform: none;
        }
        .btn-delete:disabled:hover {
          transform: none;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
        }
        .btn-delete:disabled::before {
          display: none;
        }
        .selected-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 28px;
          height: 28px;
          padding: 0 10px;
          background: rgba(255, 255, 255, 0.25);
          border-radius: 8px;
          font-size: 14px;
          font-weight: 700;
          margin-left: 4px;
        }
      </style>
      <button id="selectAllBtn" class="bulk-btn btn-select">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 11 12 14 22 4"></polyline>
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
        </svg>
        <span data-i18n="selectAll">全选</span>
      </button>
      <button id="bulkDeleteBtn" class="bulk-btn btn-delete">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
        <span data-i18n="deleteSelected">删除选中</span>
        <span class="selected-badge" id="selectedCount">0</span>
      </button>
    `;

    container.appendChild(bulkDiv);

    document.getElementById('selectAllBtn').addEventListener('click', () => {
      const texts = i18n[currentLang];
      if (!currentSelectedSignature) {
        alert(texts.alertSelectFishFirst);
        return;
      }
      
      const sameSignatureFishes = publicFishes.filter(fish => fish.signature === currentSelectedSignature);
      const sameSignatureCount = sameSignatureFishes.length;
      
      const isAllSelected = selectedFishes.size === sameSignatureCount && sameSignatureFishes.every(fish => {
        const key = getFishKey(fish);
        return selectedFishes.has(key);
      });
      
      if (isAllSelected) {
        selectedFishes.clear();
        currentSelectedSignature = '';
      } else {
        sameSignatureFishes.forEach(fish => {
          const key = getFishKey(fish);
          selectedFishes.add(key);
        });
      }
      
      renderFishes();
    });

    document.getElementById('bulkDeleteBtn').addEventListener('click', bulkDelete);
  }

  // 页面加载完成
  loadAndRender();
  initBulkActions();
  initSearch();
}
