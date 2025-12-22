// fishpond-public.js（修改后版本）

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

  const { PUBLIC_GIST_ID, GITHUB_TOKEN, GIST_FILENAME, GITHUB_NAME } = window.FISH_POND_CONFIG;

  let publicFishes = [];

  async function loadAndRender() {
    try {
      // 添加随机查询参数绕过 CDN 缓存（GitHub Gist raw 默认缓存约 5 分钟）
      const cacheBust = Date.now();
      const rawUrl = `https://gist.githubusercontent.com/${GITHUB_NAME}/${PUBLIC_GIST_ID}/raw/${GIST_FILENAME}?cb=${cacheBust}`;
      
      const res = await fetch(rawUrl);
      if (!res.ok) throw new Error('加载失败');
      publicFishes = await res.json();
      console.log('public-fishes:',publicFishes);
      publicFishes.sort((a, b) => b.timestamp - a.timestamp); // 最新在前

      renderFishes();
    } catch (err) {
      console.error('加载公共鱼池失败：', err);
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
    publicFishes.forEach((fish, index) => {
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
        <div class="fish-signature">签名：${fish.signature}</div>
        <button class="delete-public-btn">删除</button>
      `;

      card.querySelector('.delete-public-btn').addEventListener('click', () => {
        if (confirm(`确定要删除公共鱼池中的 ${fish.name} (${fish.weight.toFixed(2)}kg) 吗？\n此操作不可恢复。`)) {
          deletePublicFish(index);
        }
      });

      fragment.appendChild(card);
    });
    grid.appendChild(fragment);
  }

  // 新增：删除公共鱼池中某条鱼的函数
  async function deletePublicFish(index) {
    try {
      // 1. 获取当前 Gist 内容
      const getRes = await fetch(`https://api.github.com/gists/${PUBLIC_GIST_ID}`);
      if (!getRes.ok) throw new Error('获取公共池失败');
      const gistData = await getRes.json();
      const file = gistData.files[GIST_FILENAME];
      if (!file) throw new Error('Gist 文件名错误');
      let currentFishes = JSON.parse(file.content || '[]');

      // 2. 删除指定索引的鱼
      currentFishes.splice(index, 1); // 删除的逻辑还是有问题，想删除一个，但是删除了两个

      // 3. 更新 Gist
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

      alert('成功删除该鱼');
      // 重新加载渲染
      await loadAndRender();
    } catch (err) {
      console.error(err);
      alert('删除失败：' + err.message);
    }
    await loadAndRender();
  }

  loadAndRender();
}