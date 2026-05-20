var format = require('../../utils/format');
var link = require('../../utils/link');
var pageNav = require('../../utils/page-nav');
var pageTools = require('../../utils/page-tools');
var stateStore = require('../../utils/state');

var COLOR_OPTIONS = ['#4b8eff', '#7d01b1', '#00a73e', '#E50914', '#F24E1E', '#1DB954', '#2d2d34', '#c20012', '#08B63B', '#515157'];

function getFolderLabel(folders, folderId) {
  var i;
  for (i = 0; i < folders.length; i += 1) {
    if (folders[i].id === folderId) {
      return folders[i].label;
    }
  }
  return 'Desktop root';
}

function syncUiState(page) {
  var colors = [];
  var i;

  for (i = 0; i < COLOR_OPTIONS.length; i += 1) {
    colors.push({
      value: COLOR_OPTIONS[i],
      activeClass: COLOR_OPTIONS[i] === page.data.color ? 'swatch--active' : ''
    });
  }

  page.setData({
    detectedInfo: page.data.detectedAppId ? 'Detected as ' + page.data.detectedType + ' - ' + page.data.detectedAppId : 'Detected as ' + page.data.detectedType,
    typeClassWeb: page.data.displayType === 'web' ? 'segmented__item--active' : '',
    typeClassApp: page.data.displayType === 'app' ? 'segmented__item--active' : '',
    typeClassMini: page.data.displayType === 'miniProgram' ? 'segmented__item--active' : '',
    desktopClassHome1: page.data.desktop === 'home1' ? 'segmented__item--active' : '',
    desktopClassHome2: page.data.desktop === 'home2' ? 'segmented__item--active' : '',
    colorItems: colors
  });
}

function buildPageData(page) {
  var shell = pageTools.buildShellData();
  var folders = pageTools.getFolderChoices(page.data.desktop, '');
  page.setData({
    themeClass: shell.themeClass,
    home1Label: shell.home1Label,
    home2Label: shell.home2Label,
    folders: folders,
    selectedFolderLabel: page.data.folderId ? getFolderLabel(folders, page.data.folderId) : 'Desktop root'
  });
  syncUiState(page);
}

Page({
  data: {
    themeClass: '',
    home1Label: 'Home 1',
    home2Label: 'Home 2',
    title: '',
    url: '',
    note: '',
    explicitType: '',
    displayType: 'web',
    detectedType: 'web',
    detectedBadge: 'MB',
    detectedAppId: '',
    detectedPath: '',
    detectedInfo: 'Detected as web',
    desktop: 'home1',
    folderId: '',
    selectedFolderLabel: 'Desktop root',
    color: '#4b8eff',
    colorItems: [],
    typeClassWeb: 'segmented__item--active',
    typeClassApp: '',
    typeClassMini: '',
    desktopClassHome1: 'segmented__item--active',
    desktopClassHome2: '',
    createFolderTitle: '',
    folders: [],
    canCreateFolder: false
  },

  onShow: function () {
    buildPageData(this);
    this.refreshDetection();
  },

  onPageTouchStart: function (event) {
    pageNav.captureTouchStart(this, event);
  },

  onPageTouchEnd: function (event) {
    pageNav.handleTouchEnd(this, 'add', event);
  },

  refreshDetection: function () {
    var typeMeta = link.detectLinkType(this.data.url, this.data.explicitType);
    var title = format.trimText(this.data.title) || format.getFriendlyTitle(typeMeta.url);
    this.setData({
      displayType: this.data.explicitType || typeMeta.type,
      detectedType: typeMeta.type,
      detectedBadge: format.getBadge(title || 'MagicBox'),
      detectedAppId: typeMeta.appId,
      detectedPath: typeMeta.path
    });
    syncUiState(this);
  },

  onTitleInput: function (event) {
    this.setData({ title: event.detail.value });
    this.refreshDetection();
  },

  onUrlInput: function (event) {
    this.setData({ url: event.detail.value });
    this.refreshDetection();
  },

  onNoteInput: function (event) {
    this.setData({ note: event.detail.value });
  },

  onFolderTitleInput: function (event) {
    this.setData({
      createFolderTitle: event.detail.value,
      canCreateFolder: !!format.trimText(event.detail.value)
    });
  },

  onPickType: function (event) {
    this.setData({
      explicitType: event.currentTarget.dataset.type
    });
    this.refreshDetection();
  },

  onPickDesktop: function (event) {
    this.setData({
      desktop: event.currentTarget.dataset.desktop,
      folderId: ''
    });
    buildPageData(this);
  },

  onPickColor: function (event) {
    this.setData({
      color: event.currentTarget.dataset.color
    });
    syncUiState(this);
  },

  onPickFolder: function () {
    var page = this;
    var itemList = ['Desktop root'];
    var i;

    for (i = 0; i < this.data.folders.length; i += 1) {
      itemList.push(this.data.folders[i].label);
    }

    wx.showActionSheet({
      itemList: itemList,
      success: function (result) {
        var folder = result.tapIndex > 0 ? page.data.folders[result.tapIndex - 1] : null;
        page.setData({
          folderId: folder ? folder.id : '',
          selectedFolderLabel: folder ? folder.label : 'Desktop root'
        });
        syncUiState(page);
      }
    });
  },

  onCreateFolder: function () {
    var title = format.trimText(this.data.createFolderTitle);
    var folderId;

    if (!title) {
      pageTools.showToast('Enter a folder name');
      return;
    }

    folderId = stateStore.addFolder({
      title: title,
      badge: format.getBadge(title),
      color: this.data.color,
      desktop: this.data.desktop
    });

    this.setData({
      createFolderTitle: '',
      canCreateFolder: false,
      folderId: folderId
    });
    buildPageData(this);
    pageTools.showToast('Folder created');
  },

  onSaveItem: function () {
    var typeMeta = link.detectLinkType(this.data.url, this.data.explicitType);
    var title = format.trimText(this.data.title) || format.getFriendlyTitle(typeMeta.url);
    var url = typeMeta.url;

    if (!title) {
      pageTools.showToast('Enter a title');
      return;
    }

    if (!url) {
      pageTools.showToast('Enter a link or deep link');
      return;
    }

    stateStore.addItem({
      title: title,
      type: typeMeta.type,
      url: url,
      appId: typeMeta.appId,
      path: typeMeta.path,
      badge: format.getBadge(title),
      color: this.data.color,
      desktop: this.data.desktop,
      folderId: this.data.folderId,
      note: this.data.note
    });

    this.setData({
      title: '',
      url: '',
      note: '',
      explicitType: '',
      displayType: 'web',
      detectedType: 'web',
      detectedBadge: 'MB',
      detectedAppId: '',
      detectedPath: '',
      detectedInfo: 'Detected as web',
      folderId: '',
      selectedFolderLabel: 'Desktop root'
    });
    buildPageData(this);
    pageTools.showToast('Saved');
  }
});
