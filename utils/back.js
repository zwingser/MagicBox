var EXIT_INTERVAL = 2000;

function getAppInstance() {
  var app = null;

  try {
    app = getApp();
  } catch (error) {
    app = null;
  }

  return app;
}

function goHome1() {
  wx.switchTab({
    url: '/pages/home1/index'
  });
}

function allowHomeExit() {
  var app = getAppInstance();
  var now = Date.now();
  var lastBackAt = app && app.globalData ? app.globalData.lastHomeBackAt || 0 : 0;

  if (now - lastBackAt <= EXIT_INTERVAL) {
    if (app && app.globalData) {
      app.globalData.lastHomeBackAt = 0;
    }
    return false;
  }

  if (app && app.globalData) {
    app.globalData.lastHomeBackAt = now;
  }

  wx.showToast({
    title: '再按一次退出',
    icon: 'none'
  });
  return true;
}

function handleTabBack(pageKey) {
  if (pageKey === 'home1') {
    return allowHomeExit();
  }

  goHome1();
  return true;
}

module.exports = {
  goHome1: goHome1,
  handleTabBack: handleTabBack
};
