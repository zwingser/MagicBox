var format = require('./format');
var link = require('./link');
var pageTools = require('./page-tools');
var stateStore = require('./state');

var COLOR_OPTIONS = ['#4b8eff', '#7d01b1', '#00a73e', '#E50914', '#F24E1E', '#1DB954', '#2d2d34', '#c20012', '#08B63B', '#515157'];

function getDefaultDesktop(defaultDesktop) {
  return defaultDesktop === 'home2' ? 'home2' : 'home1';
}

function getFolderLabel(folders, folderId) {
  var i;

  for (i = 0; i < folders.length; i += 1) {
    if (folders[i].id === folderId) {
      return folders[i].label;
    }
  }

  return 'Desktop root';
}

function getInitialData(defaultDesktop, overlayMode) {
  return {
    quickAddVisible: false,
    quickAddOverlayMode: overlayMode || 'standard',
    quickAddTitle: '',
    quickAddUrl: '',
    quickAddNote: '',
    quickAddExplicitType: '',
    quickAddDisplayType: 'web',
    quickAddDetectedType: 'web',
    quickAddDetectedBadge: 'MB',
    quickAddDetectedAppId: '',
    quickAddDetectedPath: '',
    quickAddDetectedInfo: 'Detected as web',
    quickAddDesktop: getDefaultDesktop(defaultDesktop),
    quickAddFolderId: '',
    quickAddSelectedFolderLabel: 'Desktop root',
    quickAddColor: '#4b8eff',
    quickAddColorItems: [],
    quickAddTypeClassWeb: 'segmented__item--active',
    quickAddTypeClassApp: '',
    quickAddTypeClassMini: '',
    quickAddDesktopClassHome1: getDefaultDesktop(defaultDesktop) === 'home1' ? 'segmented__item--active' : '',
    quickAddDesktopClassHome2: getDefaultDesktop(defaultDesktop) === 'home2' ? 'segmented__item--active' : '',
    quickAddCreateFolderTitle: '',
    quickAddFolders: [],
    quickAddCanCreateFolder: false
  };
}

function syncUiState(page) {
  var colors = [];
  var i;

  for (i = 0; i < COLOR_OPTIONS.length; i += 1) {
    colors.push({
      value: COLOR_OPTIONS[i],
      activeClass: COLOR_OPTIONS[i] === page.data.quickAddColor ? 'swatch--active' : ''
    });
  }

  page.setData({
    quickAddDetectedInfo: page.data.quickAddDetectedAppId ? 'Detected as ' + page.data.quickAddDetectedType + ' - ' + page.data.quickAddDetectedAppId : 'Detected as ' + page.data.quickAddDetectedType,
    quickAddTypeClassWeb: page.data.quickAddDisplayType === 'web' ? 'segmented__item--active' : '',
    quickAddTypeClassApp: page.data.quickAddDisplayType === 'app' ? 'segmented__item--active' : '',
    quickAddTypeClassMini: page.data.quickAddDisplayType === 'miniProgram' ? 'segmented__item--active' : '',
    quickAddDesktopClassHome1: page.data.quickAddDesktop === 'home1' ? 'segmented__item--active' : '',
    quickAddDesktopClassHome2: page.data.quickAddDesktop === 'home2' ? 'segmented__item--active' : '',
    quickAddColorItems: colors
  });
}

function buildFolderState(page) {
  var folders = pageTools.getFolderChoices(page.data.quickAddDesktop, '');

  page.setData({
    quickAddFolders: folders,
    quickAddSelectedFolderLabel: page.data.quickAddFolderId ? getFolderLabel(folders, page.data.quickAddFolderId) : 'Desktop root'
  });
}

function refreshDetection(page) {
  var typeMeta = link.detectLinkType(page.data.quickAddUrl, page.data.quickAddExplicitType);
  var title = format.trimText(page.data.quickAddTitle) || format.getFriendlyTitle(typeMeta.url);

  page.setData({
    quickAddDisplayType: page.data.quickAddExplicitType || typeMeta.type,
    quickAddDetectedType: typeMeta.type,
    quickAddDetectedBadge: format.getBadge(title || 'MagicBox'),
    quickAddDetectedAppId: typeMeta.appId,
    quickAddDetectedPath: typeMeta.path
  });
  syncUiState(page);
}

function resetForm(page, defaultDesktop) {
  page.setData({
    quickAddTitle: '',
    quickAddUrl: '',
    quickAddNote: '',
    quickAddExplicitType: '',
    quickAddDisplayType: 'web',
    quickAddDetectedType: 'web',
    quickAddDetectedBadge: 'MB',
    quickAddDetectedAppId: '',
    quickAddDetectedPath: '',
    quickAddDetectedInfo: 'Detected as web',
    quickAddDesktop: getDefaultDesktop(defaultDesktop),
    quickAddFolderId: '',
    quickAddSelectedFolderLabel: 'Desktop root',
    quickAddColor: '#4b8eff',
    quickAddCreateFolderTitle: '',
    quickAddCanCreateFolder: false
  });

  buildFolderState(page);
  syncUiState(page);
}

function buildMethods(options) {
  var defaultDesktop = getDefaultDesktop(options.defaultDesktop);
  var onSaved = options.onSaved;

  return {
    onQuickAddNoop: function () {
    },

    openQuickAddPanel: function () {
      resetForm(this, defaultDesktop);
      refreshDetection(this);
      this.setData({
        quickAddVisible: true
      });
    },

    onQuickAddAfterLeave: function () {
      this.setData({
        quickAddVisible: false
      });
    },

    closeQuickAddPanel: function () {
      this.setData({
        quickAddVisible: false
      });
    },

    onQuickAddTitleInput: function (event) {
      this.setData({
        quickAddTitle: event.detail.value
      });
      refreshDetection(this);
    },

    onQuickAddUrlInput: function (event) {
      this.setData({
        quickAddUrl: event.detail.value
      });
      refreshDetection(this);
    },

    onQuickAddNoteInput: function (event) {
      this.setData({
        quickAddNote: event.detail.value
      });
    },

    onQuickAddFolderTitleInput: function (event) {
      this.setData({
        quickAddCreateFolderTitle: event.detail.value,
        quickAddCanCreateFolder: !!format.trimText(event.detail.value)
      });
    },

    onQuickAddPickType: function (event) {
      this.setData({
        quickAddExplicitType: event.currentTarget.dataset.type
      });
      refreshDetection(this);
    },

    onQuickAddPickDesktop: function (event) {
      this.setData({
        quickAddDesktop: event.currentTarget.dataset.desktop,
        quickAddFolderId: '',
        quickAddSelectedFolderLabel: 'Desktop root'
      });
      buildFolderState(this);
      syncUiState(this);
    },

    onQuickAddPickColor: function (event) {
      this.setData({
        quickAddColor: event.currentTarget.dataset.color
      });
      syncUiState(this);
    },

    onQuickAddPickFolder: function () {
      var page = this;
      var itemList = ['Desktop root'];
      var i;

      for (i = 0; i < this.data.quickAddFolders.length; i += 1) {
        itemList.push(this.data.quickAddFolders[i].label);
      }

      wx.showActionSheet({
        itemList: itemList,
        success: function (result) {
          var folder = result.tapIndex > 0 ? page.data.quickAddFolders[result.tapIndex - 1] : null;
          page.setData({
            quickAddFolderId: folder ? folder.id : '',
            quickAddSelectedFolderLabel: folder ? folder.label : 'Desktop root'
          });
          syncUiState(page);
        }
      });
    },

    onQuickAddCreateFolder: function () {
      var title = format.trimText(this.data.quickAddCreateFolderTitle);
      var folderId;

      if (!title) {
        pageTools.showToast('Enter a folder name');
        return;
      }

      folderId = stateStore.addFolder({
        title: title,
        badge: format.getBadge(title),
        color: this.data.quickAddColor,
        desktop: this.data.quickAddDesktop
      });

      this.setData({
        quickAddCreateFolderTitle: '',
        quickAddCanCreateFolder: false,
        quickAddFolderId: folderId
      });
      buildFolderState(this);
      syncUiState(this);
      pageTools.showToast('Folder created');

      if (typeof onSaved === 'function') {
        onSaved(this, {
          kind: 'folder',
          id: folderId
        });
      }
    },

    onQuickAddSaveItem: function () {
      var typeMeta = link.detectLinkType(this.data.quickAddUrl, this.data.quickAddExplicitType);
      var title = format.trimText(this.data.quickAddTitle) || format.getFriendlyTitle(typeMeta.url);
      var url = typeMeta.url;
      var itemId;

      if (!title) {
        pageTools.showToast('Enter a title');
        return;
      }

      if (!url) {
        pageTools.showToast('Enter a link or deep link');
        return;
      }

      itemId = stateStore.addItem({
        title: title,
        type: typeMeta.type,
        url: url,
        appId: typeMeta.appId,
        path: typeMeta.path,
        badge: format.getBadge(title),
        color: this.data.quickAddColor,
        desktop: this.data.quickAddDesktop,
        folderId: this.data.quickAddFolderId,
        note: this.data.quickAddNote
      });

      pageTools.showToast('Saved');
      this.closeQuickAddPanel();
      resetForm(this, defaultDesktop);
      refreshDetection(this);

      if (typeof onSaved === 'function') {
        onSaved(this, {
          kind: 'item',
          id: itemId
        });
      }
    }
  };
}

function mixPageConfig(pageConfig, options) {
  var mixinData = getInitialData(options.defaultDesktop, options.overlayMode);
  var mixinMethods = buildMethods(options);
  var key;

  pageConfig.data = pageConfig.data || {};

  for (key in mixinData) {
    if (mixinData.hasOwnProperty(key) && typeof pageConfig.data[key] === 'undefined') {
      pageConfig.data[key] = mixinData[key];
    }
  }

  for (key in mixinMethods) {
    if (mixinMethods.hasOwnProperty(key) && typeof pageConfig[key] === 'undefined') {
      pageConfig[key] = mixinMethods[key];
    }
  }

  return pageConfig;
}

module.exports = {
  mixPageConfig: mixPageConfig
};
