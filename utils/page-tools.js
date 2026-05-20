var format = require('./format');
var link = require('./link');
var stateStore = require('./state');

function buildShellData() {
  return {
    themeClass: stateStore.getThemeClass(),
    home1Label: stateStore.getDesktopLabel('home1'),
    home2Label: stateStore.getDesktopLabel('home2')
  };
}

function getOtherDesktopKey(desktopKey) {
  return desktopKey === 'home1' ? 'home2' : 'home1';
}

function getTypeLabel(type) {
  if (type === 'miniProgram') {
    return 'Mini';
  }
  if (type === 'app') {
    return 'App';
  }
  if (type === 'folder') {
    return 'Folder';
  }
  return 'Web';
}

function enrichNode(node) {
  var view = {};
  var key;

  for (key in node) {
    if (node.hasOwnProperty(key)) {
      view[key] = node[key];
    }
  }

  if (view.kind === 'folder') {
    view.typeLabel = 'Folder';
    view.metaLabel = String(view.count || 0) + ' items';
  } else {
    view.typeLabel = getTypeLabel(view.type);
    view.metaLabel = view.subtitle || getTypeLabel(view.type);
  }

  view.isFolder = view.kind === 'folder';
  view.hasPreview = !!(view.preview && view.preview.length);

  return view;
}

function enrichHistoryEntry(entry) {
  var view = {};
  var key;

  for (key in entry) {
    if (entry.hasOwnProperty(key)) {
      view[key] = entry[key];
    }
  }

  view.relativeTime = format.getRelativeTime(entry.openedAt);
  view.hostLabel = format.getHostLabel(entry.url) || entry.url || '';
  view.typeLabel = getTypeLabel(entry.type);
  return view;
}

function getFolderChoices(desktopFilter, excludeFolderId) {
  var folders = stateStore.getAllFolders();
  var result = [];
  var i;
  var folder;
  var desktopLabel;

  for (i = 0; i < folders.length; i += 1) {
    folder = folders[i];
    if (excludeFolderId && folder.id === excludeFolderId) {
      continue;
    }
    if (desktopFilter && folder.desktop !== desktopFilter) {
      continue;
    }

    desktopLabel = stateStore.getDesktopLabel(folder.desktop);
    result.push({
      id: folder.id,
      title: folder.title,
      count: folder.count,
      color: folder.color,
      desktop: folder.desktop,
      desktopLabel: desktopLabel,
      label: folder.title + ' - ' + desktopLabel
    });
  }

  return result;
}

function openAndRecordNode(node) {
  var success = link.openNode(node);
  if (node && node.id && node.kind !== 'folder') {
    stateStore.recordOpen(node.id, success ? 'opened' : 'fallback');
  }
  return success;
}

function openHistoryEntry(entry) {
  var liveNode = entry.nodeId ? stateStore.getNodeById(entry.nodeId) : null;
  var node = liveNode || {
    id: entry.nodeId,
    kind: 'item',
    title: entry.title,
    type: entry.type,
    url: entry.url,
    appId: entry.appId || '',
    path: entry.path || '',
    badge: entry.badge,
    color: entry.color
  };
  var success = link.openNode(node);

  if (liveNode && liveNode.id) {
    stateStore.recordOpen(liveNode.id, success ? 'opened' : 'fallback');
  }

  return success;
}

function showToast(title) {
  wx.showToast({
    title: title,
    icon: 'none'
  });
}

function syncTabBar(page, activeKey, options) {
  var tabBar = null;
  var shell;
  var payload;

  options = options || {};

  if (!page || typeof page.getTabBar !== 'function') {
    return;
  }

  shell = buildShellData();

  try {
    tabBar = page.getTabBar();
  } catch (error) {
    tabBar = null;
  }

  if (tabBar && typeof tabBar.syncState === 'function') {
    payload = {
      active: activeKey,
      themeClass: shell.themeClass,
      home1Label: shell.home1Label,
      home2Label: shell.home2Label,
      hidden: !!options.hidden
    };

    tabBar.syncState(payload);
  }
}

module.exports = {
  buildShellData: buildShellData,
  getOtherDesktopKey: getOtherDesktopKey,
  getTypeLabel: getTypeLabel,
  enrichNode: enrichNode,
  enrichHistoryEntry: enrichHistoryEntry,
  getFolderChoices: getFolderChoices,
  openAndRecordNode: openAndRecordNode,
  openHistoryEntry: openHistoryEntry,
  showToast: showToast,
  syncTabBar: syncTabBar
};
