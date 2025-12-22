// fishpond.js

const configScript = document.createElement('script');
configScript.src = chrome.runtime.getURL('config.js');
configScript.onload = function() {
  initFishpond();
};
configScript.onerror = function() {
  console.error('加载 config.js 失败');
  document.getElementById('fishGrid').innerHTML = 
    '<div class="empty">加载配置失败，请检查扩展是否正确安装</div>';
};
document.head.appendChild(configScript);

// ===== 真正的初始化函数（等 config 加载完成后再执行）=====
function initFishpond() {
  if (!window.FISH_POND_CONFIG) {
    console.error('CONFIG 未加载');
    return;
  }
  const { PUBLIC_GIST_ID, GITHUB_TOKEN, GIST_FILENAME } = window.FISH_POND_CONFIG;
  let allFishes = [];
  let contributeQueue = [];
  let isContributing = false;

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
      // console.log('签名：',fish.signature);
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
        <button class="contribute-btn">放入公共鱼池</button>
        <button class="delete-btn">删除</button>
      `;

      // 绑定事件（闭包安全）
      card.querySelector('.contribute-btn').addEventListener('click', () => {
        const originalIndex = allFishes.length - 1 - i;
        if (confirm(`确定要把 ${fish.name} (${fish.weight.toFixed(2)}kg) 放入公共鱼池吗？\n放入后本地记录将删除。`)) {
          contributeFish(fish, originalIndex);  // 确认后才加入队列
        }
      });

      // 新增：删除按钮
      card.querySelector('.delete-btn').addEventListener('click', () => {
        const originalIndex = allFishes.length - 1 - i;
        if (confirm(`确定要删除 ${fish.name} (${fish.weight.toFixed(2)}kg) 吗？\n删除后无法恢复。`)) {
          deleteFish(originalIndex);
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

  // 将鱼投放到公共鱼池（队列版，支持连续上传）
  // 将鱼加入上传队列（不在这里弹 confirm）
  function contributeFish(fish, originalIndex) {
    contributeQueue.push({ fish, originalIndex });
    if (!isContributing) {
      processQueue();
    }
  }

  // 新增：删除本地鱼的函数
  async function deleteFish(originalIndex) {
    try {
      const result = await chrome.storage.local.get('myFishes');
      let myFishes = result.myFishes || [];
      myFishes.splice(originalIndex, 1);
      await chrome.storage.local.set({ myFishes });

      alert('已删除该鱼');
      loadAndRender();
    } catch (err) {
      console.error('删除失败：', err);
      alert('删除失败，请刷新页面重试');
    }
  }

  async function processQueue() {
    if (contributeQueue.length === 0) {
      isContributing = false;
      return;
    }

    isContributing = true;
    const { fish, originalIndex } = contributeQueue.shift();

    let shouldDeleteLocal = false;  // 标记是否需要删除本地

    try {
      // console.log('开始处理队列中的一条鱼：', fish.name, fish.weight, fish.timestamp);
      // 1. 获取最新公共池
      const cacheBust = Date.now();
      // console.log('获取 Gist URL（带缓存破坏）:', `https://api.github.com/gists/${PUBLIC_GIST_ID}?ts=${cacheBust}`);
      const getRes = await fetch(`https://api.github.com/gists/${PUBLIC_GIST_ID}?ts=${cacheBust}`);
      if (!getRes.ok) throw new Error('获取公共池失败');
      const gistData = await getRes.json();
      const file = gistData.files[GIST_FILENAME];
      if (!file) throw new Error('Gist 文件名错误');
      let publicFishes = JSON.parse(file.content || '[]');
      // console.log('获取到 Gist 当前长度：', publicFishes.length, '完整内容：', publicFishes);
      // 2. 防重
      if (publicFishes.some(f => f.signature === fish.signature && f.timestamp === fish.timestamp)) {
        alert(`"${fish.name}" 已存在于公共鱼池，将删除本地记录。`);
        shouldDeleteLocal = true;  // 已存在也删本地
      } else {
        publicFishes.push(fish);
        // console.log('追加后新长度：', publicFishes.length);

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
                content: JSON.stringify(publicFishes, null, 2)
              }
            }
          })
        });

        if (!updateRes.ok) {
          const err = await updateRes.text();
          throw new Error('更新 Gist 失败：' + err);
        }

        alert(`成功放入公共鱼池：${fish.name} (${fish.weight.toFixed(2)}kg)`);
        shouldDeleteLocal = true;  // 成功上传才删本地
        // console.log('PATCH 更新成功，理论新长度：', publicFishes.length);
      }

    } catch (err) {
      console.error(err);
      alert(`放入失败（不删除本地记录，可重试）：${fish.name}\n错误：${err.message}`);
      // 失败不删除本地
    } finally {
      // 只有在需要时才删除本地（放在 finally 避免异常漏删）
      if (shouldDeleteLocal) {
        // 为了安全，这里重新读取最新 myFishes（避免 originalIndex 错位）
        const result = await chrome.storage.local.get('myFishes');
        let myFishes = result.myFishes || [];

        // 用鱼的 timestamp + signature 匹配要删除的（更可靠，不依赖索引）
        const deleteIdx = myFishes.findIndex(f => 
          f.timestamp === fish.timestamp && f.signature === fish.signature
        );
        if (deleteIdx !== -1) {
          myFishes.splice(deleteIdx, 1);
          await chrome.storage.local.set({ myFishes });
        }

        loadAndRender();  // 刷新显示
      }

      // 继续处理队列下一条（递归调用）
      processQueue();
    }
  }
}