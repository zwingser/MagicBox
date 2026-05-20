var link = require('../../utils/link');
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

function requestQuickAddOpen() {
  var app = getAppInstance();

  if (app && typeof app.requestQuickAddOpen === 'function') {
    app.requestQuickAddOpen();
  }
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
      active: key === 'fixed-page',
      itemClass: key === 'fixed-page' ? 'browser-fixed-dock__item browser-fixed-dock__item--active' : 'browser-fixed-dock__item',
      iconPath: TAB_ICON_MAP[key] || ''
    });
  }

  return {
    leftItems: leftItems,
    rightItems: rightItems
  };
}

function getLaunchTabUrl() {
  var key = stateStore.getQuickAddTargetKey();

  if (key === 'home2') {
    return '/pages/home2/index';
  }
  return '/pages/home1/index';
}

function goHome1() {
  wx.switchTab({
    url: '/pages/home1/index'
  });
}

Page({
  data: {
    themeClass: '',
    title: '',
    url: '',
    canPreview: false,
    useWebView: false,
    mode: '',
    runtimeLabel: 'Mini Program',
    restrictionText: '',
    fixedBrowserMode: false,
    showFixedChrome: false,
    showFixedBackButton: false,
    backLabel: '<',
    leftDockItems: [],
    rightDockItems: []
  },

  onLoad: function (options) {
    var title = decodeURIComponent(options.title || '');
    var url = decodeURIComponent(options.url || '');
    var mode = options.mode || '';
    var isFixedMode = mode === 'fixed';
    var canPreview = /^https?:\/\//i.test(url);
    var isApp = link.isAppRuntime();
    var forceInternalPreview = isFixedMode || options.preview === '1';
    var page = this;

    this.setData({
      themeClass: stateStore.getThemeClass(),
      title: title || 'View',
      url: url,
      canPreview: canPreview,
      useWebView: canPreview && (isApp || forceInternalPreview),
      mode: mode,
      fixedBrowserMode: isFixedMode,
      runtimeLabel: forceInternalPreview ? 'Fixed Page' : isApp ? 'Standalone App Runtime' : 'WeChat Mini Program Runtime',
      restrictionText: forceInternalPreview ? 'The fixed page stays inside MagicBox. Use the floating controls or your system back action to return to Home 1.' : isApp ? 'Embedded preview is attempted first. If it fails, you can still hand off to the system browser.' : 'WeChat personal mini programs cannot guarantee arbitrary external website preview without prior domain setup.'
    });

    this.setData(buildDockItems());

    if (isFixedMode) {
      this.__fixedChromeTimer = setTimeout(function () {
        page.setData({
          showFixedChrome: true,
          showFixedBackButton: true
        });
      }, 320);
    }

    if (typeof wx.setNavigationBarTitle === 'function') {
      wx.setNavigationBarTitle({
        title: title || 'View'
      });
    }

    this.__suppressPendingBackHome = false;
  },

  onTryPreview: function () {
    if (!this.data.canPreview) {
      return;
    }
    this.setData({
      useWebView: true
    });
  },

  onWebViewLoad: function () {
    if (this.data.fixedBrowserMode) {
      this.setData({
        showFixedChrome: true,
        showFixedBackButton: true
      });
    }
  },

  onWebViewError: function () {
    if (this.data.fixedBrowserMode) {
      this.setData({
        showFixedChrome: true,
        showFixedBackButton: true
      });
    }
  },

  onOpenExternal: function () {
    if (!this.data.url) {
      return;
    }

    if (link.tryOpenNativeUrl(this.data.url)) {
      wx.showToast({
        title: 'Opened externally',
        icon: 'none'
      });
      return;
    }

    link.copyText(this.data.url, 'Link copied');
  },

  onCopyLink: function () {
    link.copyText(this.data.url, 'Link copied');
  },

  goHome1: function () {
    goHome1();
  },

  onFixedBackTap: function () {
    this.goHome1();
  },

  onFixedDockTap: function (event) {
    var key = event.currentTarget.dataset.key;

    if (key === 'fixed-page') {
      return;
    }

    if (key === 'home1') {
      this.goHome1();
      return;
    }

    if (key === 'home2') {
      this.__suppressPendingBackHome = true;
      wx.switchTab({
        url: '/pages/home2/index'
      });
      return;
    }

    if (key === 'settings') {
      this.__suppressPendingBackHome = true;
      wx.switchTab({
        url: '/pages/settings/index'
      });
      return;
    }

    if (key === 'add') {
      this.__suppressPendingBackHome = true;
      requestQuickAddOpen();
      wx.switchTab({
        url: getLaunchTabUrl()
      });
    }
  },

  onBackPress: function () {
    if (this.data.fixedBrowserMode) {
      goHome1();
      return true;
    }

    return false;
  },

  onUnload: function () {
    if (this.__fixedChromeTimer) {
      clearTimeout(this.__fixedChromeTimer);
      this.__fixedChromeTimer = null;
    }
  }
});
