var back = require('../../utils/back');
var pageTools = require('../../utils/page-tools');
var stateStore = require('../../utils/state');

function mapItems(items) {
  var result = [];
  var i;
  for (i = 0; i < items.length; i += 1) {
    result.push(pageTools.enrichNode(items[i]));
  }
  return result;
}

function findItem(items, itemId) {
  var i;
  for (i = 0; i < items.length; i += 1) {
    if (items[i].id === itemId) {
      return items[i];
    }
  }
  return null;
}

function getItemNode(page, itemId) {
  var node = findItem(page.data.items, itemId);

  if (node) {
    return node;
  }

  return stateStore.getNodeById(itemId);
}

function refreshPage(page) {
  var shell = pageTools.buildShellData();
  var folder = stateStore.getFolderById(page.data.folderId);
  var items;

  if (!folder) {
    pageTools.showToast('Folder no longer exists');
    if (typeof wx.navigateBack === 'function') {
      wx.navigateBack({ delta: 1 });
    }
    return;
  }

  items = mapItems(stateStore.getFolderItems(page.data.folderId, ''));

  page.setData({
    themeClass: shell.themeClass,
    home1Label: shell.home1Label,
    home2Label: shell.home2Label,
    folderTitle: folder.title,
    folderBadge: folder.badge,
    folderColor: folder.color,
    folderDesktop: folder.desktop,
    folderDesktopLabel: stateStore.getDesktopLabel(folder.desktop),
    renameDraft: folder.title,
    itemCount: folder.itemIds.length,
    items: items
  });
}

Page({
  data: {
    themeClass: '',
    home1Label: 'Home 1',
    home2Label: 'Home 2',
    backLabel: '<',
    folderId: '',
    folderTitle: '',
    folderBadge: '',
    folderColor: '#4b8eff',
    folderDesktop: 'home1',
    folderDesktopLabel: 'Home 1',
    renameDraft: '',
    itemCount: 0,
    items: []
  },

  onLoad: function (options) {
    this.setData({
      folderId: options.id || ''
    });
  },

  onShow: function () {
    refreshPage(this);
  },

  onPullDownRefresh: function () {
    refreshPage(this);
    wx.stopPullDownRefresh();
  },

  goBack: function () {
    wx.navigateBack({ delta: 1 });
  },

  onCustomBack: function () {
    back.goHome1();
    return true;
  },

  onBackPress: function () {
    back.goHome1();
    return true;
  },

  onRenameInput: function (event) {
    this.setData({
      renameDraft: event.detail.value
    });
  },

  onRenameSave: function () {
    if (!this.data.renameDraft) {
      pageTools.showToast('Enter a folder name');
      return;
    }
    stateStore.renameFolder(this.data.folderId, this.data.renameDraft);
    refreshPage(this);
    pageTools.showToast('Folder updated');
  },

  onFolderMenu: function () {
    var page = this;
    var otherDesktopKey = pageTools.getOtherDesktopKey(this.data.folderDesktop);
    var otherDesktopLabel = stateStore.getDesktopLabel(otherDesktopKey);

    wx.showActionSheet({
      itemList: ['Move folder to ' + otherDesktopLabel, 'Delete folder'],
      success: function (event) {
        if (event.tapIndex === 0) {
          stateStore.moveNodeToDesktop(page.data.folderId, otherDesktopKey);
          refreshPage(page);
          pageTools.showToast('Folder moved');
          return;
        }

        wx.showModal({
          title: 'Delete folder',
          content: 'Items inside the folder will move back to its desktop.',
          success: function (result) {
            if (result.confirm) {
              stateStore.deleteNode(page.data.folderId);
              wx.navigateBack({ delta: 1 });
            }
          }
        });
      }
    });
  },

  onItemTap: function (event) {
    var node = getItemNode(this, event.currentTarget.dataset.id);
    var success;

    if (this.__suppressNextItemTap) {
      this.__suppressNextItemTap = false;
      return;
    }

    if (!node) {
      pageTools.showToast('Item not found');
      return;
    }

    success = pageTools.openAndRecordNode(node);

    if (!success) {
      refreshPage(this);
    }
  },

  onItemMenu: function (event) {
    var page = this;
    var node = getItemNode(this, event.currentTarget.dataset.id);

    this.__suppressNextItemTap = true;

    if (!node) {
      return;
    }

    wx.showActionSheet({
      itemList: [
        'Remove from folder',
        'Delete'
      ],
      success: function (action) {
        if (action.tapIndex === 0) {
          stateStore.moveItemOutOfFolder(node.id, page.data.folderDesktop);
          refreshPage(page);
          pageTools.showToast('Removed to ' + page.data.folderDesktopLabel);
          return;
        }

        if (action.tapIndex === 1) {
          wx.showModal({
            title: 'Delete item',
            content: 'Remove this item from your collection?',
            success: function (result) {
              if (result.confirm) {
                stateStore.deleteNode(node.id);
                refreshPage(page);
              }
            }
          });
          return;
        }
      }
    });
  }
});
