var stateStore = require('./utils/state');

var TAB_TEXT_MAP = {
  home1: 'home1',
  home2: 'home2',
  'fixed-page': 'View',
  settings: 'Settings'
};

function trySetTabBarItem(item) {
  var payload = {
    index: item.index,
    text: item.text
  };

  if (typeof wx !== 'undefined' && typeof wx.setTabBarItem === 'function') {
    try {
      wx.setTabBarItem(payload);
      return true;
    } catch (errorOne) {
    }
  }

  if (typeof dlt !== 'undefined' && dlt && typeof dlt.setTabBarItem === 'function') {
    try {
      dlt.setTabBarItem(payload);
      return true;
    } catch (errorTwo) {
    }
  }

  return false;
}

App({
  globalData: {
    preloadedFixedPage: null,
    pendingSettingsFocus: '',
    pendingQuickAddOpen: false,
    pendingQuickAddDraft: null,
    launchPageApplied: false,
    pendingFixedBrowserBackHome: null,
    lastHomeBackAt: 0
  },

  onLaunch: function () {
    stateStore.ensureState();
    this.refreshFixedPagePreload();
    this.syncMainTabBar();
  },

  onShow: function () {
    this.refreshFixedPagePreload();
    this.syncMainTabBar();
    this.applyLaunchPageOnce();
  },

  refreshFixedPagePreload: function () {
    this.globalData = this.globalData || {};
    this.globalData.preloadedFixedPage = stateStore.prepareFixedPage();
    return this.globalData.preloadedFixedPage;
  },

  setPendingSettingsFocus: function (focusKey) {
    this.globalData = this.globalData || {};
    this.globalData.pendingSettingsFocus = focusKey || '';
  },

  consumePendingSettingsFocus: function () {
    var value = '';

    this.globalData = this.globalData || {};
    value = this.globalData.pendingSettingsFocus || '';
    this.globalData.pendingSettingsFocus = '';
    return value;
  },

  requestQuickAddOpen: function (draft) {
    this.globalData = this.globalData || {};
    this.globalData.pendingQuickAddOpen = true;
    this.globalData.pendingQuickAddDraft = draft ? JSON.parse(JSON.stringify(draft)) : null;
  },

  consumePendingQuickAddOpen: function () {
    var value = {
      shouldOpen: false,
      draft: null
    };

    this.globalData = this.globalData || {};
    value.shouldOpen = !!this.globalData.pendingQuickAddOpen;
    value.draft = this.globalData.pendingQuickAddDraft ? JSON.parse(JSON.stringify(this.globalData.pendingQuickAddDraft)) : null;
    this.globalData.pendingQuickAddOpen = false;
    this.globalData.pendingQuickAddDraft = null;
    return value;
  },

  markPendingFixedBrowserBackHome: function (reason) {
    this.globalData = this.globalData || {};
    this.globalData.pendingFixedBrowserBackHome = {
      reason: reason || 'back',
      timestamp: Date.now()
    };
  },

  clearPendingFixedBrowserBackHome: function () {
    this.globalData = this.globalData || {};
    this.globalData.pendingFixedBrowserBackHome = null;
  },

  consumePendingFixedBrowserBackHome: function (maxAgeMs) {
    var payload = null;
    var age = 0;

    this.globalData = this.globalData || {};
    payload = this.globalData.pendingFixedBrowserBackHome;
    this.globalData.pendingFixedBrowserBackHome = null;

    if (!payload || !payload.timestamp) {
      return null;
    }

    age = Date.now() - payload.timestamp;
    if (typeof maxAgeMs === 'number' && age > maxAgeMs) {
      return null;
    }

    return payload;
  },

  syncMainTabBar: function () {
    var orderedKeys = stateStore.getPageOrder().concat(['settings']);
    var i;
    var key;
    var text;

    for (i = 0; i < orderedKeys.length; i += 1) {
      key = orderedKeys[i];
      text = TAB_TEXT_MAP[key];
      trySetTabBarItem({
        index: i,
        text: key === 'home1' || key === 'home2' ? stateStore.getDesktopLabel(text) : text
      });
    }
  },

  applyLaunchPageOnce: function () {
    var launchKey = '';
    var launchUrl = '';
    var pages = [];
    var current = null;
    var currentRoute = '';

    this.globalData = this.globalData || {};
    if (this.globalData.launchPageApplied) {
      return;
    }

    launchKey = stateStore.getLaunchPageKey();
    this.globalData.launchPageApplied = true;

    if (launchKey === 'home1') {
      return;
    }

    if (launchKey === 'home2') {
      launchUrl = '/pages/home2/index';
    } else if (launchKey === 'fixed-page') {
      launchUrl = '/pages/fixed-page/index';
    } else {
      return;
    }

    try {
      pages = getCurrentPages();
    } catch (error) {
      pages = [];
    }

    current = pages && pages.length ? pages[pages.length - 1] : null;
    currentRoute = current && current.route ? current.route : '';

    if (currentRoute === launchUrl.replace(/^\//, '')) {
      return;
    }

    setTimeout(function () {
      wx.switchTab({
        url: launchUrl
      });
    }, 0);
  },

  getStateStore: function () {
    return stateStore;
  }
});
