// fishpond.js
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

  allFishes.forEach(fish => {
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
    `;

    fragment.appendChild(card);
  });

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