// fishpond.js

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
        deleteFail: "删除失败，请刷新页面重试"
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
        deleteFail: "Delete failed, please refresh"
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
}

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

  async function loadAndRender() {
    try {
      const result = await chrome.storage.local.get('myFishes');
      allFishes = Array.isArray(result.myFishes) ? result.myFishes : [];
      allFishes = allFishes.slice().reverse();
      renderFishes();
    } catch (err) {
      console.error('读取鱼塘数据失败：', err);
      document.getElementById('fishGrid').innerHTML = 
        '<div class="empty">读取失败，请刷新页面重试</div>';
    }
  }

  function renderFishes() {
    const list = document.getElementById('fishList');
    const totalEl = document.getElementById('total');
    const emptyHint = document.getElementById('emptyHint');
    const texts = i18n[currentLang];

    totalEl.textContent = allFishes.length;

    list.innerHTML = '';

    if (allFishes.length === 0) {
      emptyHint.style.display = 'block';
      return;
    }

    emptyHint.style.display = 'none';

    const fragment = document.createDocumentFragment();

    for (let i = 0; i < allFishes.length; i++) {
      const fish = allFishes[i];
      const originalIndex = allFishes.length - 1 - i;

      const li = document.createElement('li');

      const timeStr = new Date(fish.timestamp).toLocaleString(currentLang === 'zh' ? 'zh-CN' : 'en-US', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      }).replace(/\//g, '-');

      li.innerHTML = `
        <div class="fish-name">${fish.name}</div>
        <div class="fish-weight">${texts.weight}：${fish.weight.toFixed(2)} kg</div>
        <div class="rarity">${'★'.repeat(fish.rarity)} <small style="opacity:0.7;">${fish.rarity}/6</small></div>
        <div class="timestamp">${texts.capturedTime}：${timeStr}</div>
        <div class="fish-signature">${texts.signature}：${fish.signature}</div>
        <div class="btn-group" style="margin-top:12px; display:flex; gap:8px;">
          <button class="contribute-btn">${texts.contributeBtn}</button>
          <button class="delete-btn">${texts.deleteBtn}</button>
        </div>
      `;

      li.querySelector('.contribute-btn').addEventListener('click', () => {
        const confirmMsg = texts.confirmContribute
          .replace('{name}', fish.name)
          .replace('{weight}', fish.weight.toFixed(2));
        if (confirm(confirmMsg)) {
          contributeFish(fish, originalIndex);
        }
      });

      li.querySelector('.delete-btn').addEventListener('click', () => {
        const confirmMsg = texts.confirmDelete
          .replace('{name}', fish.name)
          .replace('{weight}', fish.weight.toFixed(2));
        if (confirm(confirmMsg)) {
          deleteFish(originalIndex);
        }
      });

      fragment.appendChild(li);
    }

    list.appendChild(fragment);
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

  // 将鱼加入上传队列
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

      alert(i18n[currentLang].deleteSuccess);
      loadAndRender();
    } catch (err) {
      console.error('删除失败：', err);
      alert(i18n[currentLang].deleteFail);
    }
  }

  async function processQueue() {
    if (contributeQueue.length === 0) {
      isContributing = false;
      return;
    }

    isContributing = true;
    const { fish, originalIndex } = contributeQueue.shift();
    const texts = i18n[currentLang];

    let shouldDeleteLocal = false;

    try {
      const cacheBust = Date.now();
      const getRes = await fetch(`https://api.github.com/gists/${PUBLIC_GIST_ID}?ts=${cacheBust}`);
      if (!getRes.ok) throw new Error('获取公共池失败');
      const gistData = await getRes.json();
      const file = gistData.files[GIST_FILENAME];
      if (!file) throw new Error('Gist 文件名错误');
      let publicFishes = JSON.parse(file.content || '[]');

      if (publicFishes.some(f => f.signature === fish.signature && f.timestamp === fish.timestamp)) {
        alert(texts.contributeExists.replace('{name}', fish.name));
        shouldDeleteLocal = true;
      } else {
        publicFishes.push(fish);

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

        alert(texts.contributeSuccess
          .replace('{name}', fish.name)
          .replace('{weight}', fish.weight.toFixed(2)));
        shouldDeleteLocal = true;
      }

    } catch (err) {
      console.error(err);
      alert(texts.contributeFail
        .replace('{name}', fish.name)
        .replace('{error}', err.message));
    } finally {
      if (shouldDeleteLocal) {
        const result = await chrome.storage.local.get('myFishes');
        let myFishes = result.myFishes || [];

        const deleteIdx = myFishes.findIndex(f => 
          f.timestamp === fish.timestamp && f.signature === fish.signature
        );
        if (deleteIdx !== -1) {
          myFishes.splice(deleteIdx, 1);
          await chrome.storage.local.set({ myFishes });
        }

        loadAndRender();
      }

      processQueue();
    }
  }


  // ===== 新增：Canvas 鱼游动动画系统 =====
  const canvas = document.getElementById('fishCanvas');
  const ctx = canvas.getContext('2d');

  let animationId = null;
  let fishObjects = []; // 存储每条鱼的动画对象

  // 稀有度对应的颜色（可自行调整）
  const RARITY_COLORS = [
    null,                  // index 0 不使用
    '#A0A0A0',             // 1★ 小虾米 - 灰色
    '#88C0FF',             // 2★ 鲫鱼 - 浅蓝
    '#FFD700',             // 3★ 草鱼 - 金黄
    '#FF8C00',             // 4★ 青鱼 - 橙色
    '#FF4040',             // 5★ 鲢鱼 - 红色
    '#B9F2F2'              // 6★ 金龙鱼 - 闪耀青（带白色高光感）
  ];

  // 调整画布大小以匹配容器
  function resizeCanvas() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // 单个鱼的动画类
  class SwimmingFish {
    constructor(fishData) {
      this.data = fishData; // 原始鱼数据（name, weight, rarity 等）
      this.resetPosition();
      this.angle = Math.random() * Math.PI * 2; // 初始方向
      this.speed = 0.2 + Math.random() * 0.4;   // 基础速度
      this.flip = 1; // 1 = 向右，-1 = 向左（用于翻转身体）
    }

    resetPosition() {
      // 随机初始位置（避开左侧列表面板）
      this.x = canvas.width * 0.3 + Math.random() * (canvas.width * 0.7);
      this.y = Math.random() * canvas.height;
    }

    update() {
      // 简单随机转向
      this.angle += (Math.random() - 0.5) * 0.15;

      this.x += Math.cos(this.angle) * this.speed;
      this.y += Math.sin(this.angle) * this.speed;

      // 边界检测与反弹
      const margin = 50;
      if (this.x < canvas.width * 0.25 || this.x > canvas.width - margin) {
        this.angle = Math.PI - this.angle;
      }
      if (this.y < margin || this.y > canvas.height - margin) {
        this.angle = -this.angle;
      }

      // 确定翻转方向（向左时翻转）
      this.flip = Math.cos(this.angle) > 0 ? 1 : -1;

      // 限制在可见区域
      this.x = Math.max(canvas.width * 0.25, Math.min(canvas.width - 50, this.x));
      this.y = Math.max(50, Math.min(canvas.height - 50, this.y));
    }

    draw() {
      const scale = 0.3 + this.data.weight / 50; // 重量越大鱼越大（上限合理）
      const bodyLength = 60 * scale;
      const bodyHeight = 30 * scale;
      const tailSize = 20 * scale;

      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.scale(this.flip, 1);

      // 身体（椭圆）
      ctx.fillStyle = RARITY_COLORS[this.data.rarity];
      ctx.beginPath();
      ctx.ellipse(0, 0, bodyLength, bodyHeight, 0, 0, Math.PI * 2);
      ctx.fill();

      // 尾巴（三角）
      ctx.beginPath();
      ctx.moveTo(-bodyLength, 0);
      ctx.lineTo(-bodyLength - tailSize, -tailSize * 0.8);
      ctx.lineTo(-bodyLength - tailSize, tailSize * 0.8);
      ctx.closePath();
      ctx.fill();

      // 眼睛（小白圆 + 黑瞳孔）
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(bodyLength * 0.6, -bodyHeight * 0.3, 8 * scale, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'black';
      ctx.beginPath();
      ctx.arc(bodyLength * 0.6 + 2 * scale, -bodyHeight * 0.3, 4 * scale, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  // 动画循环
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const fish of fishObjects) {
      fish.update();
      fish.draw();
    }

    animationId = requestAnimationFrame(animate);
  }

  // 根据当前 allFishes 更新动画鱼群
  function updateFishAnimation() {
    // 简单同步：重建所有鱼对象（数量不多时最简单可靠）
    fishObjects = allFishes.map(fish => new SwimmingFish(fish));

    // 如果正在动画，先取消再重启（避免多重循环）
    if (animationId) cancelAnimationFrame(animationId);
    if (allFishes.length > 0) {
      animate();
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (animationId) cancelAnimationFrame(animationId);
      animationId = null;
    }
  }

  // 在渲染完列表后立即更新动画
  const originalRenderFishes = renderFishes;
  renderFishes = function() {
    originalRenderFishes();
    updateFishAnimation();
  };

  // 初始加载时也执行一次
  loadAndRender();

  // 窗口大小变化时重置鱼位置
  window.addEventListener('resize', () => {
    resizeCanvas();
    fishObjects.forEach(f => f.resetPosition());
  });
}