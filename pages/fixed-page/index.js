var pageTools = require('../../utils/page-tools');
var stateStore = require('../../utils/state');
var TAB_ICON_MAP = {
  home1: '/assets/tabbar/home1-default.png',
  home2: '/assets/tabbar/home2-default.png',
  'fixed-page': '/assets/tabbar/fixed-selected.png',
  settings: '/assets/tabbar/settings-default.png'
};

function getAppInstance() {
  var app = null;

  try {
    app = getApp();
  } catch (error) {
    app = null;
  }

  return app;
}

function goHome1Tab() {
  wx.switchTab({
    url: '/pages/home1/index'
  });
}

function getQuickAddTargetUrl() {
  var key = stateStore.getQuickAddTargetKey();

  if (key === 'home2') {
    return '/pages/home2/index';
  }

  return '/pages/home1/index';
}

function requestQuickAddOpen() {
  var app = getAppInstance();

  if (app && typeof app.requestQuickAddOpen === 'function') {
    app.requestQuickAddOpen();
  }
}

function getFixedPageFromApp() {
  var app = getAppInstance();

  if (app && app.globalData && app.globalData.preloadedFixedPage) {
    return app.globalData.preloadedFixedPage;
  }

  return stateStore.getFixedPageConfig();
}

function buildDockItems() {
  var order = stateStore.getPageOrder().concat(['settings']);
  var leftItems = [];
  var rightItems = [];
  var i;
  var key;
  var target;

  for (i = 0; i < order.length; i += 1) {
    key = order[i];
    target = i < 2 ? leftItems : rightItems;
    target.push({
      key: key,
      itemClass: key === 'fixed-page' ? 'fixed-page-dock__item fixed-page-dock__item--active' : 'fixed-page-dock__item',
      iconPath: TAB_ICON_MAP[key] || ''
    });
  }

  return {
    leftDockItems: leftItems,
    rightDockItems: rightItems
  };
}

function getWindowMetrics() {
  var info = null;
  var safeArea = null;
  var windowHeight = 812;
  var topInset = 0;
  var bottomInset = 0;

  if (typeof wx !== 'undefined') {
    try {
      if (typeof wx.getWindowInfo === 'function') {
        info = wx.getWindowInfo();
      } else if (typeof wx.getSystemInfoSync === 'function') {
        info = wx.getSystemInfoSync();
      }
    } catch (error) {
      info = null;
    }
  }

  safeArea = info && info.safeArea ? info.safeArea : null;
  windowHeight = info && info.windowHeight ? info.windowHeight : windowHeight;
  topInset = info && info.statusBarHeight ? info.statusBarHeight : 0;

  if (safeArea && safeArea.bottom) {
    bottomInset = Math.max(windowHeight - safeArea.bottom, 0);
    if (safeArea.top && safeArea.top > topInset) {
      topInset = safeArea.top;
    }
  }

  return {
    topInset: topInset,
    bottomInset: bottomInset
  };
}

function buildOverlayStyles() {
  var metrics = getWindowMetrics();
  var backTop = metrics.topInset + 10;
  var dockBottom = metrics.bottomInset + 10;

  return {
    fixedBackShellStyle: 'top:' + String(backTop) + 'px;left:12px;',
    fixedDockShellStyle: 'left:12px;right:12px;bottom:' + String(dockBottom) + 'px;'
  };
}

Page({
  data: {
    themeClass: '',
    home1Label: 'Home 1',
    home2Label: 'Home 2',
    fixedPageTitle: 'View',
    fixedPageHost: '',
    fixedPageUrl: '',
    hasFixedPage: false,
    webViewReady: false,
    webViewFailed: false,
    backLabel: '<',
    leftDockItems: [],
    rightDockItems: [],
    fixedBackShellStyle: '',
    fixedDockShellStyle: ''
  },

  onShow: function () {
    var shell = pageTools.buildShellData();
    var fixedPage = getFixedPageFromApp();
    var hasFixedPage = !!fixedPage.configured;
    var dockData = buildDockItems();
    var overlayStyles = buildOverlayStyles();

    this.setData({
      themeClass: shell.themeClass,
      home1Label: shell.home1Label,
      home2Label: shell.home2Label,
      fixedPageTitle: fixedPage.title || 'View',
      fixedPageHost: fixedPage.host,
      fixedPageUrl: fixedPage.url,
      hasFixedPage: hasFixedPage,
      webViewReady: false,
      webViewFailed: false,
      leftDockItems: dockData.leftDockItems,
      rightDockItems: dockData.rightDockItems,
      fixedBackShellStyle: overlayStyles.fixedBackShellStyle,
      fixedDockShellStyle: overlayStyles.fixedDockShellStyle
    });
    pageTools.syncTabBar(this, 'fixed-page', {
      hidden: hasFixedPage
    });
  },

  goHome1: function () {
    goHome1Tab();
  },

  onCustomBack: function () {
    goHome1Tab();
    return true;
  },

  onBackPress: function () {
    goHome1Tab();
    return true;
  },

  onFixedBackTap: function () {
    goHome1Tab();
  },

  onFixedDockTap: function (event) {
    var key = event.currentTarget.dataset.key;

    if (key === 'fixed-page') {
      return;
    }

    if (key === 'home1') {
      goHome1Tab();
      return;
    }

    if (key === 'home2') {
      wx.switchTab({
        url: '/pages/home2/index'
      });
      return;
    }

    if (key === 'settings') {
      wx.switchTab({
        url: '/pages/settings/index'
      });
      return;
    }

    if (key === 'add') {
      requestQuickAddOpen();
      wx.switchTab({
        url: getQuickAddTargetUrl()
      });
    }
  },

  onWebViewLoad: function () {
    this.setData({
      webViewReady: true,
      webViewFailed: false
    });
  },

  onWebViewError: function () {
    this.setData({
      webViewReady: false,
      webViewFailed: true
    });
  },

  goToFixedPageSettings: function () {
    var app = getAppInstance();

    if (app && typeof app.setPendingSettingsFocus === 'function') {
      app.setPendingSettingsFocus('fixed-page');
    }

    wx.switchTab({
      url: '/pages/settings/index'
    });
  }
});
