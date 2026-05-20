var format = require('../utils/format');
var link = require('../utils/link');
var pageTools = require('../utils/page-tools');
var stateStore = require('../utils/state');

var COLOR_OPTIONS = ['#4b8eff', '#7d01b1', '#00a73e', '#E50914', '#F24E1E', '#1DB954', '#2d2d34', '#c20012', '#08B63B', '#515157'];
var TAB_MAP = {
  home1: {
    url: '/pages/home1/index',
    defaultIcon: '/assets/tabbar/home1-default.png',
    selectedIcon: '/assets/tabbar/home1-selected.png'
  },
  home2: {
    url: '/pages/home2/index',
    defaultIcon: '/assets/tabbar/home2-default.png',
    selectedIcon: '/assets/tabbar/home2-selected.png'
  },
  'fixed-page': {
    url: '/pages/fixed-page/index',
    defaultIcon: '/assets/tabbar/fixed-default.png',
    selectedIcon: '/assets/tabbar/fixed-selected.png'
  },
  settings: {
    url: '/pages/settings/index',
    defaultIcon: '/assets/tabbar/settings-default.png',
    selectedIcon: '/assets/tabbar/settings-selected.png'
  }
};
var ROUTE_TO_KEY = {
  'pages/home1/index': 'home1',
  'pages/home2/index': 'home2',
  'pages/fixed-page/index': 'fixed-page',
  'pages/settings/index': 'settings'
};

function getFolderLabel(folders, folderId) {
  var i;

  for (i = 0; i < folders.length; i += 1) {
    if (folders[i].id === folderId) {
      return folders[i].label;
    }
  }

  return 'Desktop root';
}

function getCurrentPage() {
  var pages = [];

  try {
    pages = getCurrentPages();
  } catch (error) {
    pages = [];
  }

  if (!pages.length) {
    return null;
  }

  return pages[pages.length - 1];
}

function getCurrentKey() {
  var page = getCurrentPage();
  var route = page && page.route ? page.route : '';

  return ROUTE_TO_KEY[route] || 'home1';
}

function getLaunchTabUrl() {
  var key = stateStore.getQuickAddTargetKey();

  if (key === 'home2') {
    return '/pages/home2/index';
  }
  return '/pages/home1/index';
}

function getTabLabel(component, key) {
  if (key === 'home1') {
    return component.data.home1Label;
  }
  if (key === 'home2') {
    return component.data.home2Label;
  }
  if (key === 'fixed-page') {
    return 'View';
  }
  return 'Settings';
}

function getDockKeys() {
  var ordered = stateStore.getPageOrder();
  var keys = ordered.slice();

  if (keys.indexOf('settings') < 0) {
    keys.push('settings');
  }

  return keys;
}

function buildTabItems(component) {
  var dockKeys = getDockKeys();
  var leftKeys = dockKeys.slice(0, 2);
  var rightKeys = dockKeys.slice(2, 4);
  var leftItems = [];
  var rightItems = [];
  var i;
  var key;
  var meta;
  var active;
  var target;

  for (i = 0; i < dockKeys.length; i += 1) {
    key = dockKeys[i];
    meta = TAB_MAP[key];
    if (!meta) {
      continue;
    }
    active = component.data.selected === key;
    target = i < 2 ? leftItems : rightItems;
    target.push({
      key: key,
      url: meta.url,
      label: getTabLabel(component, key),
      iconPath: active ? meta.selectedIcon : meta.defaultIcon,
      itemClass: active ? 'custom-tabbar__item custom-tabbar__item--active' : 'custom-tabbar__item',
      labelClass: active ? 'custom-tabbar__label custom-tabbar__label--active' : 'custom-tabbar__label'
    });
  }

  component.setData({
    leftTabItems: leftItems,
    rightTabItems: rightItems
  });
}

function syncUiState(component) {
  var colors = [];
  var i;

  for (i = 0; i < COLOR_OPTIONS.length; i += 1) {
    colors.push({
      value: COLOR_OPTIONS[i],
      activeClass: COLOR_OPTIONS[i] === component.data.color ? 'swatch--active' : ''
    });
  }

  component.setData({
    detectedInfo: component.data.detectedAppId ? 'Detected as ' + component.data.detectedType + ' - ' + component.data.detectedAppId : 'Detected as ' + component.data.detectedType,
    typeClassWeb: component.data.displayType === 'web' ? 'segmented__item--active' : '',
    typeClassApp: component.data.displayType === 'app' ? 'segmented__item--active' : '',
    typeClassMini: component.data.displayType === 'miniProgram' ? 'segmented__item--active' : '',
    desktopClassHome1: component.data.desktop === 'home1' ? 'segmented__item--active' : '',
    desktopClassHome2: component.data.desktop === 'home2' ? 'segmented__item--active' : '',
    colorItems: colors
  });
}

function buildFolderState(component) {
  var folders = pageTools.getFolderChoices(component.data.desktop, '');

  component.setData({
    folders: folders,
    selectedFolderLabel: component.data.folderId ? getFolderLabel(folders, component.data.folderId) : 'Desktop root'
  });
}

function refreshDetection(component) {
  var typeMeta = link.detectLinkType(component.data.url, component.data.explicitType);
  var title = format.trimText(component.data.title) || format.getFriendlyTitle(typeMeta.url);

  component.setData({
    displayType: component.data.explicitType || typeMeta.type,
    detectedType: typeMeta.type,
    detectedBadge: format.getBadge(title || 'MagicBox'),
    detectedAppId: typeMeta.appId,
    detectedPath: typeMeta.path
  });
  syncUiState(component);
}

function resetForm(component, desktopKey) {
  component.setData({
    formMode: 'create',
    editingItemId: '',
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
    desktop: desktopKey === 'home2' ? 'home2' : 'home1',
    folderId: '',
    selectedFolderLabel: 'Desktop root',
    color: '#4b8eff',
    createFolderTitle: '',
    canCreateFolder: false
  });

  buildFolderState(component);
  syncUiState(component);
}

function applyDraft(component, draft, desktopKey) {
  var mode;

  resetForm(component, desktopKey);

  if (!draft) {
    return;
  }

  mode = draft.mode === 'edit' ? 'edit' : 'create';

  component.setData({
    formMode: mode,
    editingItemId: draft.itemId || '',
    title: draft.title || '',
    url: draft.url || '',
    note: draft.note || '',
    explicitType: draft.explicitType || '',
    desktop: draft.desktop === 'home2' ? 'home2' : 'home1',
    folderId: draft.folderId || '',
    color: draft.color || '#4b8eff',
    createFolderTitle: '',
    canCreateFolder: false
  });

  buildFolderState(component);
  refreshDetection(component);
}

function notifyCurrentPageSaved(payload) {
  var page = getCurrentPage();

  if (page && typeof page.onQuickAddSaved === 'function') {
    page.onQuickAddSaved(payload);
  }
}

Component({
  options: {
    styleIsolation: 'shared'
  },

  data: {
    themeClass: 'theme-deep-tech',
    selected: 'home1',
    home1Label: 'Home 1',
    home2Label: 'Home 2',
    hidden: false,
    leftTabItems: [],
    rightTabItems: [],
    visible: false,
    formMode: 'create',
    editingItemId: '',
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

  lifetimes: {
    attached: function () {
      this.syncState();
      resetForm(this, getCurrentKey());
      refreshDetection(this);
    }
  },

  pageLifetimes: {
    show: function () {
      this.syncState();
    }
  },

  methods: {
    syncState: function (payload) {
      var shell = pageTools.buildShellData();
      var next = payload || {};
      var hidden = !!next.hidden;

      this.setData({
        selected: next.active || getCurrentKey(),
        themeClass: next.themeClass || shell.themeClass,
        home1Label: next.home1Label || shell.home1Label,
        home2Label: next.home2Label || shell.home2Label,
        hidden: hidden,
        visible: hidden ? false : this.data.visible
      });
      buildTabItems(this);
    },

    noop: function () {
    },

    onTabTap: function (event) {
      var key = event.currentTarget.dataset.key;
      var meta = TAB_MAP[key];

      if (!meta) {
        return;
      }

      if (key === this.data.selected) {
        return;
      }

      wx.switchTab({
        url: meta.url
      });
    },

    openPanel: function (draft) {
      var page = getCurrentPage();
      var nextDraft = draft;

      if (nextDraft && nextDraft.currentTarget) {
        nextDraft = null;
      }

      if (!page || page.route === 'pages/browser/index' || page.route === 'pages/fixed-page/index') {
        try {
          var app = getApp();
          if (app && typeof app.requestQuickAddOpen === 'function') {
            app.requestQuickAddOpen(nextDraft || null);
          }
        } catch (error) {
        }

        wx.switchTab({
          url: getLaunchTabUrl()
        });
        return;
      }

      applyDraft(this, nextDraft || null, this.data.selected);
      this.setData({
        visible: true
      });
    },

    closePanel: function () {
      this.setData({
        visible: false
      });
    },

    onTitleInput: function (event) {
      this.setData({
        title: event.detail.value
      });
      refreshDetection(this);
    },

    onUrlInput: function (event) {
      this.setData({
        url: event.detail.value
      });
      refreshDetection(this);
    },

    onNoteInput: function (event) {
      this.setData({
        note: event.detail.value
      });
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
      refreshDetection(this);
    },

    onPickDesktop: function (event) {
      this.setData({
        desktop: event.currentTarget.dataset.desktop,
        folderId: '',
        selectedFolderLabel: 'Desktop root'
      });
      buildFolderState(this);
      syncUiState(this);
    },

    onPickColor: function (event) {
      this.setData({
        color: event.currentTarget.dataset.color
      });
      syncUiState(this);
    },

    onPickFolder: function () {
      var component = this;
      var itemList = ['Desktop root'];
      var i;

      for (i = 0; i < this.data.folders.length; i += 1) {
        itemList.push(this.data.folders[i].label);
      }

      wx.showActionSheet({
        itemList: itemList,
        success: function (result) {
          var folder = result.tapIndex > 0 ? component.data.folders[result.tapIndex - 1] : null;
          component.setData({
            folderId: folder ? folder.id : '',
            selectedFolderLabel: folder ? folder.label : 'Desktop root'
          });
          syncUiState(component);
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
      buildFolderState(this);
      syncUiState(this);
      pageTools.showToast('Folder created');
      notifyCurrentPageSaved({
        kind: 'folder',
        id: folderId
      });
    },

    onSaveItem: function () {
      var typeMeta = link.detectLinkType(this.data.url, this.data.explicitType);
      var title = format.trimText(this.data.title) || format.getFriendlyTitle(typeMeta.url);
      var url = typeMeta.url;
      var itemId;
      var payload;

      if (!title) {
        pageTools.showToast('Enter a title');
        return;
      }

      if (!url) {
        pageTools.showToast('Enter a link or deep link');
        return;
      }

      payload = {
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
      };

      if (this.data.formMode === 'edit' && this.data.editingItemId) {
        stateStore.replaceItem(this.data.editingItemId, payload);
        itemId = this.data.editingItemId;
      } else {
        itemId = stateStore.addItem(payload);
      }

      pageTools.showToast(this.data.formMode === 'edit' ? 'Updated' : 'Saved');
      this.closePanel();
      resetForm(this, this.data.selected);
      refreshDetection(this);
      notifyCurrentPageSaved({
        kind: 'item',
        id: itemId
      });
    }
  }
});
