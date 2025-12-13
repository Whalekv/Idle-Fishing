// popup.js
let userSignature = '';
let savedNickname = '';
let savedPassword = '';

// 轻量确定性哈希函数
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

// 页面加载时恢复上一次输入
chrome.storage.local.get(['savedNickname', 'savedPassword', 'fishingSignature'], (result) => {
  if (result.savedNickname && result.savedPassword) {
    document.querySelector('.signature-input').value = result.savedNickname;
    document.querySelector('.password-input').value = result.savedPassword;
    savedNickname = result.savedNickname;
    savedPassword = result.savedPassword;
    userSignature = `${result.savedNickname}${generateId(result.savedNickname, result.savedPassword)}`;

    // 如果已有签名，禁用按钮并显示已签名状态
    if (result.fishingSignature) {
      document.querySelector('.signature-btn').textContent = '已签名';
      document.querySelector('.signature-btn').disabled = true;
      document.querySelector('.signature-input').disabled = true;
      document.querySelector('.password-input').disabled = true;
    }
  }
});

// 确定签名按钮
document.querySelector('.signature-btn').addEventListener('click', () => {
  const nickname = document.querySelector('.signature-input').value.trim();
  const password = document.querySelector('.password-input').value.trim();

  if (!nickname || password.length !== 4 || !/^\d{4}$/.test(password)) {
    alert('请正确输入昵称和4位数字密码');
    return;
  }

  // 保存昵称和密码（用于下次自动填充）
  chrome.storage.local.set({
    savedNickname: nickname,
    savedPassword: password
  });

  const id = generateId(nickname, password);
  userSignature = `${nickname}${id}`;

  // 保存最终签名
  chrome.storage.local.set({ fishingSignature: userSignature }, () => {
    alert(`签名成功！\n你的签名：${userSignature}`);

    // 禁用输入和按钮
    document.querySelector('.signature-input').disabled = true;
    document.querySelector('.password-input').disabled = true;
    document.querySelector('.signature-btn').textContent = '已签名';
    document.querySelector('.signature-btn').disabled = true;
  });
});

// 重新输入按钮
document.querySelector('.re-enter-btn').addEventListener('click', () => {
  chrome.storage.local.remove(['savedNickname', 'savedPassword', 'fishingSignature'], () => {
    alert('已删除签名,请重新输入');
  });
  document.querySelector('.signature-input').value = '';
  document.querySelector('.password-input').value = '';
  document.querySelector('.signature-btn').textContent = '确定签名';
  document.querySelector('.signature-btn').disabled = false;
  document.querySelector('.signature-input').disabled = false;
  document.querySelector('.password-input').disabled = false;
  
})

// Start Fishing 按钮
document.querySelector('.start-fishing-btn').addEventListener('click', () => {
  chrome.storage.local.get('fishingSignature', (result) => {
    if (!result.fishingSignature) {
      alert('请先签名！');
      return;
    }
    chrome.runtime.sendMessage({ action: 'start' });
    window.close();
  });
});

// 关闭按钮
document.querySelector('.close-mini-win').addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'removeMini' });
  window.close();
});
// 查看鱼塘按钮
document.getElementById('openFishpond').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();  // 自动打开 fishpond.html
  window.close();
});
// 查看公共鱼池
document.getElementById('openPublicFishpond').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('fishpond-public.html') });
  window.close();
});