var pageTools = require('../../utils/page-tools');
var pageNav = require('../../utils/page-nav');
var stateStore = require('../../utils/state');

function refreshAppFixedPage() {
  var app = null;

  try {
    app = getApp();
  } catch (error) {
    app = null;
  }

  if (app && typeof app.refreshFixedPagePreload === 'function') {
    return app.refreshFixedPagePreload();
  }

  return stateStore.prepareFixedPage();
}

function syncMainTabBar() {
  var app = null;

  try {
    app = getApp();
  } catch (error) {
    app = null;
  }

  if (app && typeof app.syncMainTabBar === 'function') {
    app.syncMainTabBar();
  }
}

function getPendingFocus() {
  var app = null;
  var focus = '';

  try {
    app = getApp();
  } catch (error) {
    app = null;
  }

  if (app && typeof app.consumePendingSettingsFocus === 'function') {
    focus = app.consumePendingSettingsFocus();
  }

  return focus;
}

function refreshPage(page) {
  var shell = pageTools.buildShellData();
  var state = stateStore.getState();
  var exportText = stateStore.exportStateText();
  var themes = stateStore.getThemeOptions();
  var fixedPage = stateStore.getFixedPageConfig();
  var pageOrder = stateStore.getPageOrder();
  var pageOrderItems = [];
  var i;

  for (i = 0; i < themes.length; i += 1) {
    themes[i].active = themes[i].id === state.settings.theme;
    themes[i].activeClass = themes[i].active ? 'theme-card--active' : '';
  }

  for (i = 0; i < pageOrder.length; i += 1) {
    pageOrderItems.push({
      key: pageOrder[i],
      title: pageOrder[i] === 'home1' ? state.settings.pageNames.home1 : pageOrder[i] === 'home2' ? state.settings.pageNames.home2 : 'Fixed Page',
      subtitle: i === 0 ? 'Launch page' : 'Dock position ' + String(i + 1)
    });
  }

  page.setData({
    themeClass: shell.themeClass,
    home1Label: shell.home1Label,
    home2Label: shell.home2Label,
    selectedTheme: state.settings.theme,
    pageNameHome1: state.settings.pageNames.home1,
    pageNameHome2: state.settings.pageNames.home2,
    fixedPageUrlDraft: fixedPage.url,
    fixedPageConfigured: fixedPage.configured,
    fixedPageHost: fixedPage.host,
    fixedPageLabelClass: page.data.focusFixedPage ? 'section-label--focus' : '',
    fixedPageSectionClass: page.data.focusFixedPage ? 'field-card--focus' : '',
    themes: themes,
    pageOrderItems: pageOrderItems,
    exportText: exportText
  });
  pageTools.syncTabBar(page, 'settings');
}

Page({
  data: {
    themeClass: '',
    home1Label: 'Home 1',
    home2Label: 'Home 2',
    themes: [],
    selectedTheme: 'deep-tech',
    pageNameHome1: 'Home 1',
    pageNameHome2: 'Home 2',
    pageOrderItems: [],
    fixedPageUrlDraft: '',
    fixedPageConfigured: false,
    fixedPageHost: '',
    fixedPageLabelClass: '',
    fixedPageSectionClass: '',
    focusFixedPage: false,
    importText: '',
    exportText: ''
  },

  onLoad: function (options) {
    if (options && options.focus === 'fixed-page') {
      this.setData({
        focusFixedPage: true
      });
    }
  },

  onShow: function () {
    var pendingFocus = getPendingFocus();

    if (pendingFocus === 'fixed-page') {
      this.setData({
        focusFixedPage: true
      });
    }

    refreshPage(this);

    if (pendingFocus === 'fixed-page' && typeof wx.pageScrollTo === 'function') {
      wx.pageScrollTo({
        scrollTop: 0,
        duration: 0
      });
    }
  },

  onPageTouchStart: function (event) {
    pageNav.captureTouchStart(this, event);
  },

  onPageTouchEnd: function (event) {
    pageNav.handleTouchEnd(this, 'settings', event);
  },

  onThemePick: function (event) {
    stateStore.setTheme(event.currentTarget.dataset.id);
    refreshPage(this);
  },

  onHome1Input: function (event) {
    this.setData({
      pageNameHome1: event.detail.value
    });
  },

  onHome2Input: function (event) {
    this.setData({
      pageNameHome2: event.detail.value
    });
  },

  onFixedPageInput: function (event) {
    this.setData({
      fixedPageUrlDraft: event.detail.value
    });
  },

  onSaveFixedPage: function () {

    try {
      stateStore.setFixedPageUrl(this.data.fixedPageUrlDraft);
      refreshAppFixedPage();
      refreshPage(this);
      pageTools.showToast(this.data.fixedPageConfigured ? 'Fixed page saved' : 'Fixed page cleared');
    } catch (error) {
      wx.showModal({
        title: 'Fixed page save failed',
        content: error.message || 'The fixed page accepts http(s) links only.',
        showCancel: false
      });
    }
  },

  onClearFixedPage: function () {
    stateStore.setFixedPageUrl('');
    refreshAppFixedPage();
    refreshPage(this);
    pageTools.showToast('Fixed page cleared');
  },

  onSavePageNames: function () {
    stateStore.renamePageName('home1', this.data.pageNameHome1);
    stateStore.renamePageName('home2', this.data.pageNameHome2);
    syncMainTabBar();
    refreshPage(this);
    pageTools.showToast('Page names saved');
  },

  onMovePageOrder: function (event) {
    var key = event.currentTarget.dataset.key;
    var direction = event.currentTarget.dataset.direction;

    if (!key || !direction) {
      return;
    }

    stateStore.movePageOrder(key, direction);
    syncMainTabBar();
    refreshAppFixedPage();
    refreshPage(this);
    pageTools.showToast('Page order updated');
  },

  onImportInput: function (event) {
    this.setData({
      importText: event.detail.value
    });
  },

  onCopyExport: function () {
    wx.setClipboardData({
      data: this.data.exportText,
      success: function () {
        wx.showToast({
          title: 'Export copied',
          icon: 'none'
        });
      }
    });
  },

  onImportState: function () {
    var page = this;

    if (!this.data.importText) {
      pageTools.showToast('Paste exported JSON first');
      return;
    }

    try {
      stateStore.importStateText(this.data.importText);
      refreshAppFixedPage();
      syncMainTabBar();
      this.setData({
        importText: ''
      });
      refreshPage(this);
      pageTools.showToast('Import complete');
    } catch (error) {
      wx.showModal({
        title: 'Import failed',
        content: error.message || 'Invalid JSON payload',
        showCancel: false
      });
    }
  },

  onResetState: function () {
    var page = this;
    wx.showModal({
      title: 'Reset local data',
      content: 'This restores the seeded MagicBox demo data on this device.',
      success: function (result) {
        if (result.confirm) {
          stateStore.resetState();
          refreshAppFixedPage();
          syncMainTabBar();
          refreshPage(page);
        }
      }
    });
  }
});
