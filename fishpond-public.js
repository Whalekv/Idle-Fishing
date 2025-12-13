

let publicFishes = [];

async function loadAndRender() {
  try {
    const rawUrl = `https://gist.githubusercontent.com/${GITHUB_NAME}/${PUBLIC_GIST_ID}/raw/${GIST_FILENAME}`;
    const res = await fetch(rawUrl);
    console.log('res: ', res);
    if (!res.ok) throw new Error('加载失败');
    publicFishes = await res.json();
    publicFishes.sort((a, b) => b.timestamp - a.timestamp); // 最新在前

    renderFishes();
  } catch (err) {
    document.getElementById('fishGrid').innerHTML = '<div class="empty">加载公共鱼池失败</div>';
  }
}

function renderFishes() {
  const grid = document.getElementById('fishGrid');
  const totalEl = document.getElementById('total');
  totalEl.textContent = publicFishes.length;

  grid.innerHTML = '';
  if (publicFishes.length === 0) {
    grid.innerHTML = `<div class="empty">公共鱼池空空如也～</div>`;
    return;
  }

  const fragment = document.createDocumentFragment();
  publicFishes.forEach(fish => {
    console.log('fish: ', fish);
    const card = document.createElement('div');
    card.className = 'fish-card';
    const timeStr = new Date(fish.timestamp).toLocaleString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).replace(/\//g, '-');


    card.innerHTML = `
      <div class="fish-name">${fish.name} </div>
      <div class="fish-weight">重量：${fish.weight.toFixed(2)} kg</div>
      <div class="rarity">${'★'.repeat(fish.rarity)} <small style="opacity:0.7; font-size:16px;">${fish.rarity}/6</small></div>
      <div class="timestamp">捕获时间：${timeStr}</div>
      <div class="fish-signature">签名：${fish.signature}</div>
    `;
    fragment.appendChild(card);
  });
  grid.appendChild(fragment);
}

loadAndRender();