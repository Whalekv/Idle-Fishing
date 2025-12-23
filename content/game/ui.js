// 小窗、鱼漂、进度条、指示器等 DOM 创建与样式

// content/game/ui.js
// UI 模块（暂时空壳，后续填充）

(() => {
  console.log('HappyFishingUI 模块加载（暂未实现）');

  // 临时暴露一个空对象，防止后面调用报错
  window.HappyFishingUI = {
    createMiniWindow: (options) => {
      console.warn('UI 未实现，游戏逻辑正常运行，但无界面');
      // 返回一个假的 mini 对象，包含必要方法防止崩溃
      return {
        mini: null,
        addEventListener: () => {},
        appendChild: () => {},
        remove: () => console.log('假 remove')
      };
    }
  };
})();