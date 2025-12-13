// fishpond.js

const PUBLIC_GIST_ID = '';  

const GITHUB_TOKEN = '';

const GIST_FILENAME = '';  // 你创建 Gist 时用的文件名，必须一致


let allFishes = [];

async function loadAndRender() {
  try {
    const result = await chrome.storage.local.get('myFishes');
    allFishes = Array.isArray(result.myFishes) ? result.myFishes : [];
    allFishes = allFishes.slice().reverse(); // 最新在前
    renderFishes();
  } catch (err) {
    console.error('读取鱼塘数据失败：', err);
    document.getElementById('fishGrid').innerHTML = 
      '<div class="empty">读取失败，请刷新页面重试</div>';
  }
}

function renderFishes() {
  const grid = document.getElementById('fishGrid');
  const totalEl = document.getElementById('total');
  totalEl.textContent = allFishes.length;

  grid.innerHTML = '';

  if (allFishes.length === 0) {
    grid.innerHTML = `<div class="empty">鱼塘空空如也～<br><br>快去钓鱼吧！</div>`;
    return;
  }

  const fragment = document.createDocumentFragment();

  // 改用 for 循环，这样 i 才存在
  for (let i = 0; i < allFishes.length; i++) {
    const fish = allFishes[i];

    const card = document.createElement('div');
    card.className = 'fish-card';

    const timeStr = new Date(fish.timestamp).toLocaleString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).replace(/\//g, '-');

    card.innerHTML = `
      <div class="fish-name">${fish.name}</div>
      <div class="fish-weight">重量：${fish.weight.toFixed(2)} kg</div>
      <div class="rarity">${'★'.repeat(fish.rarity)} <small style="opacity:0.7; font-size:16px;">${fish.rarity}/6</small></div>
      <div class="timestamp">捕获时间：${timeStr}</div>
      <button class="contribute-btn">放入公共鱼池</button>
    `;

    // 绑定事件（闭包安全）
    card.querySelector('.contribute-btn').addEventListener('click', () => {
      const originalIndex = allFishes.length - 1 - i; // 因为 allFishes 是 reverse 的，所以原索引要这样算
      if (confirm(`确定要把 ${fish.name} (${fish.weight.toFixed(2)}kg) 放入公共鱼池吗？\n放入后本地记录将删除。`)) {
        contributeFish(fish, originalIndex);
      }
    });

    fragment.appendChild(card);
  }

  grid.appendChild(fragment);
}

// 页面加载完成就执行
loadAndRender();

// 实时监听新鱼（跨标签页同步）
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.myFishes) {
    const newList = changes.myFishes.newValue || [];
    allFishes = Array.isArray(newList) ? newList.slice().reverse() : [];
    renderFishes();
  }
});

// 将鱼投放到公共鱼池
async function contributeFish(fish, originalIndex) {
  try {
    // 1. 获取当前公共池
    const getRes = await fetch(`https://api.github.com/gists/${PUBLIC_GIST_ID}`);
    if (!getRes.ok) throw new Error('获取公共池失败');
    const gistData = await getRes.json();
    const file = gistData.files[GIST_FILENAME];
    if (!file) throw new Error('Gist 文件名错误');
    let publicFishes = JSON.parse(file.content || '[]');

    // 2. 防重
    if (publicFishes.some(f => f.signature === fish.signature)) {
      alert('这条鱼已存在于公共鱼池！');
      return;
    }

    // 3. 追加
    publicFishes.push(fish);

    // 4. 更新 Gist
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
            content: JSON.stringify(publicFishes, null, 2)
          }
        }
      })
    });

    if (!updateRes.ok) {
      const err = await updateRes.text();
      throw new Error('更新失败：' + err);
    }

    // 5. 本地删除
    const result = await chrome.storage.local.get('myFishes');
    let myFishes = result.myFishes || [];
    myFishes.splice(originalIndex, 1);
    await chrome.storage.local.set({ myFishes });

    alert('成功放入公共鱼池！');
    loadAndRender();
  } catch (err) {
    console.error(err);
    alert('放入失败：' + err.message);
  }
}