var back = require('../../utils/back');
var pageTools = require('../../utils/page-tools');
var stateStore = require('../../utils/state');

var FIXED_HEADER_CONTROL_HEIGHT = 44;

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

function goHome2Tab() {
  wx.switchTab({
    url: '/pages/home2/index'
  });
}

function getFixedPageFromApp() {
  var app = getAppInstance();

  if (app && app.globalData && app.globalData.preloadedFixedPage) {
    return app.globalData.preloadedFixedPage;
  }

  return stateStore.getFixedPageConfig();
}

function getWindowMetrics() {
  var info = null;
  var windowWidth = 375;
  var pixelRatio = 1;
  var topInset = 0;

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

  windowWidth = info && info.windowWidth ? info.windowWidth : windowWidth;
  pixelRatio = info && info.pixelRatio ? info.pixelRatio : pixelRatio;
  topInset = info && info.statusBarHeight ? info.statusBarHeight : 0;

  if (windowWidth > 750 && pixelRatio > 1) {
    windowWidth = windowWidth / pixelRatio;
  }

  if (topInset > 80 && pixelRatio > 1) {
    topInset = topInset / pixelRatio;
  }

  return {
    windowWidth: Math.round(windowWidth),
    topInset: Math.max(0, Math.min(Math.round(topInset), 40))
  };
}

function getTitleWidth(title, windowWidth) {
  var text = String(title || 'View');
  var maxWidth = Math.max(120, windowWidth - 190);
  var width = text.length * 16 + 48;

  if (/[\u4e00-\u9fa5]/.test(text)) {
    width = text.length * 22 + 46;
  }

  return Math.min(Math.max(width, 92), Math.min(maxWidth, 220));
}

function buildHeaderStyle(title) {
  var metrics = getWindowMetrics();
  var titleWidth = getTitleWidth(title, metrics.windowWidth);
  var titleLeft = Math.max((metrics.windowWidth - titleWidth) / 2, 72);
  var controlTop = 0;

  return {
    fixedHeaderShellStyle: 'top:0;height:' + String(FIXED_HEADER_CONTROL_HEIGHT) + 'px;',
    fixedHeaderTitleStyle: 'top:' + String(controlTop) + 'px;left:' + String(titleLeft) + 'px;width:' + String(titleWidth) + 'px;height:44px;',
    fixedHeaderHomeStyle: 'top:' + String(controlTop) + 'px;left:16px;',
    fixedHeaderHome2Style: 'top:' + String(controlTop) + 'px;right:16px;'
  };
}

function handleHomeGestureTap(page) {
  var now = Date.now();
  var lastTap = page._lastHomeGestureTapTime || 0;

  if (now - lastTap < 400) {
    page._lastHomeGestureTapTime = 0;
    goHome1Tab();
  } else {
    page._lastHomeGestureTapTime = now;
  }
}

Page({
  data: {
    themeClass: '',
    fixedPageTitle: 'View',
    fixedPageHost: '',
    fixedPageUrl: '',
    hasFixedPage: false,
    webViewReady: false,
    webViewFailed: false,
    fixedHeaderShellStyle: '',
    fixedHeaderTitleStyle: '',
    fixedHeaderHomeStyle: '',
    fixedHeaderHome2Style: ''
  },

  onShow: function () {
    var shell = pageTools.buildShellData();
    var fixedPage = getFixedPageFromApp();
    var hasFixedPage = !!fixedPage.configured;
    var fixedPageTitle = fixedPage.title || 'View';
    var headerStyle = buildHeaderStyle(fixedPageTitle);

    this.setData({
      themeClass: shell.themeClass,
      fixedPageTitle: fixedPageTitle,
      fixedPageHost: fixedPage.host,
      fixedPageUrl: fixedPage.url,
      hasFixedPage: hasFixedPage,
      webViewReady: false,
      webViewFailed: false,
      fixedHeaderShellStyle: headerStyle.fixedHeaderShellStyle,
      fixedHeaderTitleStyle: headerStyle.fixedHeaderTitleStyle,
      fixedHeaderHomeStyle: headerStyle.fixedHeaderHomeStyle,
      fixedHeaderHome2Style: headerStyle.fixedHeaderHome2Style
    });

    this.clearNativeTitle();

    pageTools.syncTabBar(this, 'fixed-page', {
      hidden: false
    });
  },

  goHome1: function () {
    goHome1Tab();
  },

  goHome2: function () {
    goHome2Tab();
  },

  onCustomBack: function () {
    return back.handleTabBack('fixed-page');
  },

  onBackPress: function () {
    return back.handleTabBack('fixed-page');
  },

  onFixedTitleTap: function () {
    handleHomeGestureTap(this);
  },

  onFixedTitleLongPress: function () {
    goHome1Tab();
    return true;
  },

  clearNativeTitle: function () {
    var apply = function () {
      if (typeof wx.setNavigationBarTitle === 'function') {
        wx.setNavigationBarTitle({
          title: ' '
        });
      }
    };

    apply();

    if (this._nativeTitleClearTimer) {
      clearTimeout(this._nativeTitleClearTimer);
    }

    this._nativeTitleClearTimer = setTimeout(apply, 450);
  },

  onWebViewLoad: function () {
    this.setData({
      webViewReady: true,
      webViewFailed: false
    });
    this.clearNativeTitle();
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
  },

  onUnload: function () {
    if (this._nativeTitleClearTimer) {
      clearTimeout(this._nativeTitleClearTimer);
      this._nativeTitleClearTimer = null;
    }
  }
});
