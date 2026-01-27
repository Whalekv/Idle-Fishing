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

const configScript = document.createElement('script');
configScript.src = chrome.runtime.getURL('config.js');
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

  let publicFishes = [];
  let filterSignature = '';
  const selectedFishes = new Set(); // 存储选中的鱼（用唯一键 timestamp|signature）
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
    const lowerFilter = filterSignature.trim().toLowerCase();
    let fishesToRender = lowerFilter
      ? publicFishes.filter(fish =>
          (fish.signature || '').toLowerCase().includes(lowerFilter)
        )
      : publicFishes;

    // 如果有选中的签名，只显示相同签名的鱼
    if (currentSelectedSignature) {
      fishesToRender = fishesToRender.filter(fish =>
        fish.signature === currentSelectedSignature
      );
    }

    totalEl.textContent = fishesToRender.length;
    selectedCountEl.textContent = selectedFishes.size;

    // 显示/隐藏批量操作栏和全选按钮
    bulkActions.style.display = selectedFishes.size > 0 ? 'block' : 'none';
    const selectAllBtn = document.getElementById('selectAllBtn');
    if (selectAllBtn) {
      selectAllBtn.style.display = selectedFishes.size > 0 ? 'inline-block' : 'none';
    }

    grid.innerHTML = '';
    if (fishesToRender.length === 0) {
      grid.innerHTML = `<div class="empty">${
        publicFishes.length === 0 ? '公共鱼池空空如也～' : '没有找到匹配该签名的鱼～'
      }</div>`;
      return;
    }

    const fragment = document.createDocumentFragment();
    fishesToRender.forEach((fish) => {
      const card = document.createElement('div');
      card.className = 'fish-card';

      const timeStr = new Date(fish.timestamp).toLocaleString('zh-CN', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      }).replace(/\//g, '-');

      const key = getFishKey(fish);
      const isSelected = selectedFishes.has(key);

      card.innerHTML = `
        <div class="fish-name" title="${fish.name}">${fish.name}</div>
        <div class="fish-weight">${fish.weight.toFixed(2)} kg</div>
        <div class="rarity" title="稀有度：${fish.rarity}">${'★'.repeat(fish.rarity)}</div>
        <div class="timestamp">${timeStr}</div>
        <div class="fish-signature" title="${fish.signature || '无签名'}">${fish.signature || '-'}</div>
        <div class="select-wrapper">
          <input type="checkbox" class="select-checkbox" id="chk-${key}" ${isSelected ? 'checked' : ''} title="选中">
        </div>
      `;

      // 复选框事件
      const checkbox = card.querySelector('.select-checkbox');
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          // 检查是否已经有选中的签名
          if (selectedFishes.size === 0) {
            // 首次选中，设置当前签名
            currentSelectedSignature = fish.signature;
          } else {
            // 不是首次选中，检查签名是否相同
            if (fish.signature !== currentSelectedSignature) {
              alert('只能选择相同签名的鱼');
              checkbox.checked = false;
              return;
            }
          }
          selectedFishes.add(key);
        } else {
          selectedFishes.delete(key);
          // 如果没有选中的鱼了，重置当前签名
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
        // 重新渲染以更新显示
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
    if (selectedFishes.size === 0) {
      alert('请先选中要删除的鱼');
      return;
    }

    if (!confirm(`确定要删除选中的 ${selectedFishes.size} 条鱼吗？\n此操作不可恢复！`)) {
      return;
    }

    // 验证密码
    const password = prompt('请输入4位数密码以验证签名：');
    if (!password || password.length !== 4 || !/^\d{4}$/.test(password)) {
      alert('密码格式错误，请输入4位数字密码');
      return;
    }

    try {
      // 1. 获取最新 Gist 内容
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

      // 2. 验证签名密码
      const keysToDelete = Array.from(selectedFishes);
      const fishesToDelete = currentFishes.filter(fish => {
        const key = getFishKey(fish);
        return keysToDelete.includes(key);
      });

      // 验证每条鱼的签名
      for (const fish of fishesToDelete) {
        if (fish.signature) {
          // 提取昵称（签名的前部分，去掉最后6位哈希值）
          const nickname = fish.signature.slice(0, -6);
          // 生成签名并验证
          const expectedSignature = `${nickname}${generateId(nickname, password)}`;
          if (expectedSignature !== fish.signature) {
            throw new Error('密码错误，签名验证失败');
          }
        }
      }

      // 3. 过滤掉所有选中的鱼
      currentFishes = currentFishes.filter(fish => {
        const key = getFishKey(fish);
        return !keysToDelete.includes(key);
      });

      // 4. 更新 Gist（只发一次请求）
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

      alert(`成功删除 ${selectedFishes.size} 条鱼！`);
      selectedFishes.clear(); // 清空选择
      currentSelectedSignature = ''; // 重置当前选中的签名
      await loadAndRender();  // 只 reload 一次
    } catch (err) {
      console.error(err);
      alert('批量删除失败：' + err.message);
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
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(244, 67, 54, 0.9);
      padding: 16px 32px;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
      z-index: 1000;
      text-align: center;
      display: none;
    `;
    bulkDiv.innerHTML = `
      <button id="selectAllBtn" style="
        padding: 12px 32px;
        font-size: 18px;
        background: #1976d2;
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        margin-right: 16px;
      ">
        全选
      </button>
      <button id="bulkDeleteBtn" style="
        padding: 12px 32px;
        font-size: 18px;
        background: #d32f2f;
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
      ">
        删除选中鱼（<span id="selectedCount">0</span>条）
      </button>
    `;

    container.appendChild(bulkDiv);

    // 全选按钮事件
    document.getElementById('selectAllBtn').addEventListener('click', () => {
      if (!currentSelectedSignature) {
        alert('请先选中一条鱼');
        return;
      }
      
      // 选中所有相同签名的鱼
      publicFishes.forEach(fish => {
        if (fish.signature === currentSelectedSignature) {
          const key = getFishKey(fish);
          selectedFishes.add(key);
        }
      });
      
      // 更新显示
      selectedCountEl.textContent = selectedFishes.size;
      renderFishes();
    });

    document.getElementById('bulkDeleteBtn').addEventListener('click', bulkDelete);
  }

  // 页面加载完成
  loadAndRender();
  initBulkActions();
  initSearch();
}
