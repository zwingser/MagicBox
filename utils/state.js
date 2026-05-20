var format = require('./format');

var STORAGE_KEY = 'magicbox.collection.state.v1';
var cache = null;

var THEMES = [
  { id: 'deep-tech', name: 'Deep Tech', subname: 'Dark glass', color: '#adc6ff', dark: '#131315' },
  { id: 'cyber-neon', name: 'Cyber Neon', subname: 'Purple accent', color: '#e3aaff', dark: '#050505' },
  { id: 'clean-slate', name: 'Clean Slate', subname: 'Light mode', color: '#4b8eff', dark: '#f8fbff' },
  { id: 'ocean-deep', name: 'Ocean Deep', subname: 'Blue green', color: '#51dc8c', dark: '#082041' }
];
var PAGE_ORDER_KEYS = ['home1', 'home2', 'fixed-page'];

function cloneValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function createId(prefix) {
  return prefix + '-' + Date.now() + '-' + String(Math.floor(Math.random() * 10000));
}

function createItem(definition) {
  var createdAt = definition.createdAt || Date.now();
  return {
    id: definition.id,
    title: definition.title,
    type: definition.type || 'web',
    url: definition.url || '',
    appId: definition.appId || '',
    path: definition.path || '',
    badge: definition.badge || format.getBadge(definition.title),
    color: definition.color || '#4b8eff',
    desktop: definition.desktop || 'home1',
    folderId: definition.folderId || '',
    note: definition.note || '',
    createdAt: createdAt,
    updatedAt: definition.updatedAt || createdAt,
    lastOpenedAt: definition.lastOpenedAt || 0
  };
}

function createFolder(definition) {
  var createdAt = definition.createdAt || Date.now();
  return {
    id: definition.id,
    title: definition.title,
    badge: definition.badge || format.getBadge(definition.title),
    color: definition.color || '#7d01b1',
    desktop: definition.desktop || 'home1',
    itemIds: definition.itemIds ? definition.itemIds.slice() : [],
    createdAt: createdAt,
    updatedAt: definition.updatedAt || createdAt
  };
}

function createSeedState() {
  var now = Date.now();
  var items = {};
  var folders = {};
  var desktops = {
    home1: { id: 'home1', order: [] },
    home2: { id: 'home2', order: [] }
  };
  var history = [];
  var itemDefinitions = [
    { id: 'google', title: 'Google', type: 'web', url: 'https://www.google.com', badge: 'G', color: '#4285F4', desktop: 'home1' },
    { id: 'youtube', title: 'YouTube', type: 'web', url: 'https://www.youtube.com', badge: 'YT', color: '#FF0000', desktop: 'home1' },
    { id: 'spotify', title: 'Spotify', type: 'web', url: 'https://open.spotify.com', badge: 'SP', color: '#1DB954', desktop: 'home1' },
    { id: 'figma', title: 'Figma', type: 'web', url: 'https://www.figma.com', badge: 'FG', color: '#F24E1E', desktop: 'home1' },
    { id: 'notion', title: 'Notion', type: 'web', url: 'https://www.notion.so', badge: 'NO', color: '#111111', desktop: 'home1' },
    { id: 'wechat', title: 'WeChat', type: 'app', url: 'weixin://', badge: 'WX', color: '#07C160', desktop: 'home1' },
    { id: 'drive', title: 'Drive', type: 'web', url: 'https://drive.google.com', badge: 'DR', color: '#7fa8ff', desktop: 'home1' },
    { id: 'wallet', title: 'Wallet', type: 'app', url: 'wallet://', badge: 'WL', color: '#40d95b', desktop: 'home1' },
    { id: 'photos', title: 'Photos', type: 'web', url: 'https://photos.google.com', badge: 'PH', color: '#d2a5ff', desktop: 'home1' },
    { id: 'vscode', title: 'VS Code', type: 'app', url: 'vscode://', badge: 'VS', color: '#2d2d34', desktop: 'home1' },
    { id: 'maps', title: 'Maps', type: 'web', url: 'https://maps.google.com', badge: 'MP', color: '#c8d1e3', desktop: 'home1' },
    { id: 'schedule', title: 'Schedule', type: 'web', url: 'https://calendar.google.com', badge: 'SC', color: '#9dbbff', desktop: 'home2' },
    { id: 'radio', title: 'Radio', type: 'web', url: 'https://radio.garden', badge: 'RD', color: '#C20012', desktop: 'home2' },
    { id: 'shop', title: 'Shop', type: 'web', url: 'https://www.amazon.com', badge: 'SH', color: '#8B14CF', desktop: 'home2' },
    { id: 'arcade', title: 'Arcade', type: 'web', url: 'https://www.kongregate.com', badge: 'AR', color: '#08B63B', desktop: 'home2' },
    { id: 'netflix', title: 'Netflix', type: 'web', url: 'https://www.netflix.com', badge: 'NF', color: '#E50914', desktop: 'home2', lastOpenedAt: now - 2 * 60 * 1000 },
    { id: 'mini-demo', title: 'Mini Shop', type: 'miniProgram', url: 'weixin://dl/business/?appid=wx1234567890abcdef&path=pages/index/index', appId: 'wx1234567890abcdef', path: 'pages/index/index', badge: 'MP', color: '#0EA44A', desktop: 'home2' },
    { id: 'docs', title: 'Docs', type: 'web', url: 'https://developers.weixin.qq.com', badge: 'DC', color: '#4079ff', desktop: 'home2' },
    { id: 'mail', title: 'Inbox', type: 'web', url: 'https://mail.google.com', badge: 'IN', color: '#E15B56', desktop: 'home2' },
    { id: 'tasks', title: 'Tasks', type: 'web', url: 'https://todoist.com', badge: 'TK', color: '#F45B44', desktop: 'home2' },
    { id: 'discord', title: 'Discord', type: 'app', url: 'discord://', badge: 'DI', color: '#7D01B1', folderId: 'folder-social', desktop: 'home1' },
    { id: 'instagram', title: 'Instagram', type: 'app', url: 'instagram://', badge: 'IG', color: '#515157', folderId: 'folder-social', desktop: 'home1' },
    { id: 'x-app', title: 'X', type: 'app', url: 'twitter://', badge: 'X', color: '#4B8EFF', folderId: 'folder-social', desktop: 'home1' },
    { id: 'tiktok', title: 'TikTok', type: 'app', url: 'snssdk1128://', badge: 'TT', color: '#515157', folderId: 'folder-social', desktop: 'home1' },
    { id: 'linkedin', title: 'LinkedIn', type: 'app', url: 'linkedin://', badge: 'LI', color: '#4B8EFF', folderId: 'folder-social', desktop: 'home1' },
    { id: 'pinterest', title: 'Pinterest', type: 'app', url: 'pinterest://', badge: 'PI', color: '#B00012', folderId: 'folder-social', desktop: 'home1' },
    { id: 'reddit', title: 'Reddit', type: 'app', url: 'reddit://', badge: 'RE', color: '#55555B', folderId: 'folder-social', desktop: 'home1' },
    { id: 'snapchat', title: 'Snapchat', type: 'app', url: 'snapchat://', badge: 'SN', color: '#08B63B', folderId: 'folder-social', desktop: 'home1' },
    { id: 'twitch', title: 'Twitch', type: 'app', url: 'twitch://', badge: 'TW', color: '#A115D3', folderId: 'folder-social', desktop: 'home1' },
    { id: 'hyperion-console', title: 'Hyperion Cloud Console', type: 'web', url: 'https://console.hyperion.io', badge: 'HC', color: '#7D01B1', folderId: 'folder-studio', desktop: 'home2' },
    { id: 'security-protocol', title: 'Security Protocol X', type: 'app', url: 'app://system.security.auth', badge: 'SX', color: '#08B63B', folderId: 'folder-studio', desktop: 'home2' },
    { id: 'devtool-pro', title: 'DevTool Pro', type: 'web', url: 'https://dev.pro.tools/main', badge: 'DP', color: '#4B8EFF', folderId: 'folder-studio', desktop: 'home2' },
    { id: 'neural-mesh', title: 'Neural Mesh Interface', type: 'app', url: 'app://neural.mesh/sync', badge: 'NM', color: '#5A5A61', folderId: 'folder-studio', desktop: 'home2' },
    { id: 'traffic-analyzer', title: 'Traffic Analyzer', type: 'web', url: 'https://traffic.internal.io/view', badge: 'TA', color: '#A115D3', folderId: 'folder-studio', desktop: 'home2' }
  ];
  var folderDefinitions = [
    { id: 'folder-social', title: 'Social Media', badge: 'SM', color: '#7d01b1', desktop: 'home1', itemIds: [] },
    { id: 'folder-studio', title: 'Workbench', badge: 'WB', color: '#4b8eff', desktop: 'home2', itemIds: [] }
  ];
  var home1Order = ['folder-social', 'google', 'youtube', 'spotify', 'figma', 'notion', 'wechat', 'drive', 'wallet', 'photos', 'vscode', 'maps'];
  var home2Order = ['folder-studio', 'netflix', 'mini-demo', 'schedule', 'radio', 'shop', 'arcade', 'docs', 'mail', 'tasks'];
  var i;
  var item;
  var folder;

  for (i = 0; i < folderDefinitions.length; i += 1) {
    folder = createFolder(folderDefinitions[i]);
    folders[folder.id] = folder;
  }

  for (i = 0; i < itemDefinitions.length; i += 1) {
    item = createItem(itemDefinitions[i]);
    items[item.id] = item;
    if (item.folderId && folders[item.folderId]) {
      folders[item.folderId].itemIds.push(item.id);
    }
  }

  desktops.home1.order = home1Order.slice();
  desktops.home2.order = home2Order.slice();

  history.push({
    id: createId('hist'),
    nodeId: 'hyperion-console',
    title: 'Hyperion Cloud Console',
    url: 'https://console.hyperion.io',
    type: 'web',
    badge: 'HC',
    color: '#7D01B1',
    openedAt: now - 10 * 60 * 1000,
    result: 'opened'
  });
  history.push({
    id: createId('hist'),
    nodeId: 'security-protocol',
    title: 'Security Protocol X',
    url: 'app://system.security.auth',
    type: 'app',
    badge: 'SX',
    color: '#08B63B',
    openedAt: now - 42 * 60 * 1000,
    result: 'opened'
  });
  history.push({
    id: createId('hist'),
    nodeId: 'devtool-pro',
    title: 'DevTool Pro',
    url: 'https://dev.pro.tools/main',
    type: 'web',
    badge: 'DP',
    color: '#4B8EFF',
    openedAt: now - 2 * 60 * 60 * 1000,
    result: 'opened'
  });
  history.push({
    id: createId('hist'),
    nodeId: 'neural-mesh',
    title: 'Neural Mesh Interface',
    url: 'app://neural.mesh/sync',
    type: 'app',
    badge: 'NM',
    color: '#5A5A61',
    openedAt: now - 24 * 60 * 60 * 1000,
    result: 'opened'
  });
  history.push({
    id: createId('hist'),
    nodeId: 'traffic-analyzer',
    title: 'Traffic Analyzer',
    url: 'https://traffic.internal.io/view',
    type: 'web',
    badge: 'TA',
    color: '#A115D3',
    openedAt: now - 26 * 60 * 60 * 1000,
    result: 'opened'
  });

  return {
    version: 1,
    updatedAt: now,
    settings: {
      theme: 'deep-tech',
      pageNames: {
        home1: 'Home 1',
        home2: 'Home 2'
      },
      pageOrder: PAGE_ORDER_KEYS.slice(),
      fixedPageUrl: ''
    },
    desktops: desktops,
    folders: folders,
    items: items,
    history: history
  };
}

function normalizeState(rawState) {
  var seed = createSeedState();
  var state = rawState || {};
  var key;

  if (!state.settings) {
    state.settings = cloneValue(seed.settings);
  }
  if (!state.settings.pageNames) {
    state.settings.pageNames = cloneValue(seed.settings.pageNames);
  }
  if (!state.settings.theme) {
    state.settings.theme = seed.settings.theme;
  }
  if (!state.settings.pageOrder || !state.settings.pageOrder.slice) {
    state.settings.pageOrder = cloneValue(seed.settings.pageOrder);
  } else {
    state.settings.pageOrder = normalizePageOrder(state.settings.pageOrder);
  }
  if (typeof state.settings.fixedPageUrl !== 'string') {
    state.settings.fixedPageUrl = seed.settings.fixedPageUrl;
  }

  if (!state.desktops) {
    state.desktops = cloneValue(seed.desktops);
  }
  if (!state.desktops.home1) {
    state.desktops.home1 = cloneValue(seed.desktops.home1);
  }
  if (!state.desktops.home2) {
    state.desktops.home2 = cloneValue(seed.desktops.home2);
  }
  if (!state.desktops.home1.order) {
    state.desktops.home1.order = [];
  }
  if (!state.desktops.home2.order) {
    state.desktops.home2.order = [];
  }

  if (!state.items) {
    state.items = {};
  }
  if (!state.folders) {
    state.folders = {};
  }
  if (!state.history || !state.history.slice) {
    state.history = [];
  }

  for (key in state.items) {
    if (state.items.hasOwnProperty(key)) {
      state.items[key] = createItem(state.items[key]);
    }
  }
  for (key in state.folders) {
    if (state.folders.hasOwnProperty(key)) {
      state.folders[key] = createFolder(state.folders[key]);
    }
  }

  return state;
}

function saveState(state) {
  state.updatedAt = Date.now();
  cache = state;
  try {
    wx.setStorageSync(STORAGE_KEY, cloneValue(state));
  } catch (error) {
    cache = state;
  }
  return cache;
}

function getRawState() {
  if (cache) {
    return cache;
  }

  try {
    cache = wx.getStorageSync(STORAGE_KEY);
  } catch (error) {
    cache = null;
  }

  if (!cache || !cache.items || !cache.desktops) {
    cache = createSeedState();
    saveState(cache);
  } else {
    cache = normalizeState(cache);
    saveState(cache);
  }

  return cache;
}

function ensureState() {
  getRawState();
}

function getState() {
  return cloneValue(getRawState());
}

function mutate(updater) {
  var state = cloneValue(getRawState());
  updater(state);
  return saveState(normalizeState(state));
}

function getThemeOptions() {
  return cloneValue(THEMES);
}

function getThemeClass(themeId) {
  var id = themeId || getRawState().settings.theme;
  return 'theme-' + String(id || 'deep-tech').replace(/[^a-z0-9-]+/g, '');
}

function findNodeById(state, nodeId) {
  if (!state) {
    state = getRawState();
  }
  return state.items[nodeId] || state.folders[nodeId] || null;
}

function getNodeById(stateOrId, maybeNodeId) {
  var state = stateOrId;
  var nodeId = maybeNodeId;

  if (typeof stateOrId === 'string' && typeof maybeNodeId === 'undefined') {
    state = getRawState();
    nodeId = stateOrId;
  }

  if (!state) {
    state = getRawState();
  }

  if (!nodeId) {
    return null;
  }

  return cloneValue(findNodeById(state, nodeId));
}

function getFolderById(folderId) {
  var state = getRawState();
  if (!state.folders[folderId]) {
    return null;
  }
  return cloneValue(state.folders[folderId]);
}

function getDesktopLabel(desktopKey) {
  var state = getRawState();
  return state.settings.pageNames[desktopKey] || desktopKey;
}

function normalizePageOrder(rawOrder) {
  var seen = {};
  var result = [];
  var i;
  var key;

  rawOrder = rawOrder && rawOrder.slice ? rawOrder : [];

  for (i = 0; i < rawOrder.length; i += 1) {
    key = rawOrder[i];
    if (PAGE_ORDER_KEYS.indexOf(key) < 0 || seen[key]) {
      continue;
    }
    seen[key] = true;
    result.push(key);
  }

  for (i = 0; i < PAGE_ORDER_KEYS.length; i += 1) {
    key = PAGE_ORDER_KEYS[i];
    if (!seen[key]) {
      result.push(key);
    }
  }

  return result;
}

function getPageOrder() {
  var state = getRawState();
  return cloneValue(normalizePageOrder(state.settings.pageOrder));
}

function setPageOrder(pageOrder) {
  return mutate(function (state) {
    state.settings.pageOrder = normalizePageOrder(pageOrder);
  });
}

function movePageOrder(pageKey, direction) {
  return mutate(function (state) {
    var order = normalizePageOrder(state.settings.pageOrder);
    var index = order.indexOf(pageKey);
    var swapIndex = -1;

    if (index < 0) {
      state.settings.pageOrder = order;
      return;
    }

    if (direction === 'up' && index > 0) {
      swapIndex = index - 1;
    } else if (direction === 'down' && index < order.length - 1) {
      swapIndex = index + 1;
    } else {
      state.settings.pageOrder = order;
      return;
    }

    order[index] = order[swapIndex];
    order[swapIndex] = pageKey;
    state.settings.pageOrder = order;
  });
}

function getLaunchPageKey() {
  var order = getPageOrder();
  return order.length ? order[0] : 'home1';
}

function getQuickAddTargetKey() {
  var order = getPageOrder();
  var i;
  var key;

  for (i = 0; i < order.length; i += 1) {
    key = order[i];
    if (key === 'home1' || key === 'home2') {
      return key;
    }
  }

  return 'home1';
}

function normalizeFixedPageUrl(rawUrl) {
  var value = format.trimText(rawUrl);
  if (!value) {
    return '';
  }

  if (!/^https?:\/\//i.test(value) && value.indexOf('.') >= 0) {
    value = 'https://' + value;
  }

  return value;
}

function isFixedPageUrl(value) {
  return /^https?:\/\//i.test(String(value || ''));
}

function getFixedPageConfig() {
  var state = getRawState();
  var url = normalizeFixedPageUrl(state.settings.fixedPageUrl);
  var configured = isFixedPageUrl(url);

  return {
    url: configured ? url : '',
    configured: configured,
    title: configured ? format.getFriendlyTitle(url) : '',
    host: configured ? format.getHostLabel(url) : ''
  };
}

function getNodeSubtitle(item) {
  if (item.type === 'miniProgram') {
    if (item.appId) {
      return 'Mini Program ' + item.appId;
    }
    return 'Mini Program';
  }

  if (item.type === 'app') {
    return 'App deep link';
  }

  return format.getHostLabel(item.url);
}

function mapFolderNode(state, folderId) {
  var folder = state.folders[folderId];
  var preview = [];
  var i;
  var itemId;
  var item;

  if (!folder) {
    return null;
  }

  for (i = 0; i < folder.itemIds.length && preview.length < 4; i += 1) {
    itemId = folder.itemIds[i];
    item = state.items[itemId];
    if (item) {
      preview.push({
        badge: item.badge,
        color: item.color
      });
    }
  }

  return {
    id: folder.id,
    kind: 'folder',
    title: folder.title,
    badge: folder.badge,
    color: folder.color,
    count: folder.itemIds.length,
    desktop: folder.desktop,
    preview: preview
  };
}

function mapItemNode(state, itemId) {
  var item = state.items[itemId];
  if (!item) {
    return null;
  }

  return {
    id: item.id,
    kind: 'item',
    title: item.title,
    badge: item.badge,
    color: item.color,
    desktop: item.desktop,
    folderId: item.folderId,
    subtitle: getNodeSubtitle(item),
    type: item.type,
    url: item.url,
    appId: item.appId,
    path: item.path,
    note: item.note,
    lastOpenedAt: item.lastOpenedAt
  };
}

function matchesQuery(node, query) {
  var value = format.trimText(query).toLowerCase();
  var pool;
  if (!value) {
    return true;
  }

  pool = [
    node.title || '',
    node.subtitle || '',
    node.badge || '',
    node.kind === 'folder' ? String(node.count || '') : ''
  ].join(' ').toLowerCase();

  return pool.indexOf(value) !== -1;
}

function getDesktopNodes(desktopKey, query) {
  var state = getRawState();
  var desktop = state.desktops[desktopKey];
  var nodes = [];
  var i;
  var id;
  var node;

  if (!desktop) {
    return [];
  }

  for (i = 0; i < desktop.order.length; i += 1) {
    id = desktop.order[i];
    if (state.folders[id]) {
      node = mapFolderNode(state, id);
    } else {
      node = mapItemNode(state, id);
    }

    if (node && matchesQuery(node, query)) {
      nodes.push(node);
    }
  }

  return nodes;
}

function getFoldersForDesktop(desktopKey) {
  var state = getRawState();
  var result = [];
  var id;
  var folder;

  for (id in state.folders) {
    if (state.folders.hasOwnProperty(id)) {
      folder = state.folders[id];
      if (folder.desktop === desktopKey) {
        result.push({
          id: folder.id,
          title: folder.title,
          count: folder.itemIds.length,
          color: folder.color,
          desktop: folder.desktop,
          badge: folder.badge
        });
      }
    }
  }

  result.sort(function (left, right) {
    return left.title.localeCompare(right.title);
  });

  return result;
}

function getAllFolders() {
  var state = getRawState();
  var result = [];
  var id;
  var folder;

  for (id in state.folders) {
    if (state.folders.hasOwnProperty(id)) {
      folder = state.folders[id];
      result.push({
        id: folder.id,
        title: folder.title,
        count: folder.itemIds.length,
        color: folder.color,
        desktop: folder.desktop,
        badge: folder.badge
      });
    }
  }

  result.sort(function (left, right) {
    var desktopSort = left.desktop.localeCompare(right.desktop);
    if (desktopSort !== 0) {
      return desktopSort;
    }
    return left.title.localeCompare(right.title);
  });

  return result;
}

function getFolderItems(folderId, query) {
  var state = getRawState();
  var folder = state.folders[folderId];
  var items = [];
  var i;
  var node;

  if (!folder) {
    return [];
  }

  for (i = 0; i < folder.itemIds.length; i += 1) {
    node = mapItemNode(state, folder.itemIds[i]);
    if (node && matchesQuery(node, query)) {
      items.push(node);
    }
  }

  return items;
}

function getRecentEntry() {
  var state = getRawState();
  var entry;
  var item;

  if (!state.history.length) {
    return null;
  }

  entry = state.history[0];
  item = state.items[entry.nodeId];

  return {
    id: entry.nodeId,
    title: entry.title,
    badge: entry.badge || (item ? item.badge : 'MB'),
    color: entry.color || (item ? item.color : '#4b8eff'),
    subtitle: format.getRelativeTime(entry.openedAt),
    url: entry.url,
    type: entry.type,
    appId: entry.appId || (item ? item.appId : ''),
    path: entry.path || (item ? item.path : '')
  };
}

function getRecentEntries(limit) {
  var state = getRawState();
  var max = typeof limit === 'number' && limit > 0 ? limit : 5;
  var result = [];
  var i;
  var entry;
  var item;

  for (i = 0; i < state.history.length && result.length < max; i += 1) {
    entry = state.history[i];
    item = state.items[entry.nodeId];

    result.push({
      historyId: entry.id,
      nodeId: entry.nodeId,
      title: entry.title,
      badge: entry.badge || (item ? item.badge : 'MB'),
      color: entry.color || (item ? item.color : '#4b8eff'),
      subtitle: format.getRelativeTime(entry.openedAt),
      openedAt: entry.openedAt,
      url: entry.url,
      type: entry.type,
      appId: entry.appId || (item ? item.appId : ''),
      path: entry.path || (item ? item.path : '')
    });
  }

  return result;
}

function getHistoryGroups(query) {
  var state = getRawState();
  var groups = {};
  var keys = [];
  var value = format.trimText(query).toLowerCase();
  var i;
  var entry;
  var bucket;
  var pool;
  var groupIndex;
  var result = [];

  for (i = 0; i < state.history.length; i += 1) {
    entry = state.history[i];
    pool = ((entry.title || '') + ' ' + (entry.url || '')).toLowerCase();
    if (value && pool.indexOf(value) === -1) {
      continue;
    }

    bucket = format.getHistoryBucket(entry.openedAt);
    if (!groups[bucket]) {
      groups[bucket] = [];
      keys.push(bucket);
    }
    groups[bucket].push(cloneValue(entry));
  }

  for (groupIndex = 0; groupIndex < keys.length; groupIndex += 1) {
    result.push({
      label: keys[groupIndex],
      entries: groups[keys[groupIndex]]
    });
  }

  return result;
}

function removeId(list, nodeId) {
  var index = list.indexOf(nodeId);
  if (index >= 0) {
    list.splice(index, 1);
  }
  return index;
}

function insertId(list, nodeId, index) {
  if (!list) {
    return;
  }

  if (typeof index !== 'number' || index < 0 || index > list.length) {
    index = list.length;
  }

  list.splice(index, 0, nodeId);
}

function removeNodeFromCurrentLocation(state, nodeId) {
  var item = state.items[nodeId];
  var folder = state.folders[nodeId];
  var desktopId;
  var key;

  if (folder) {
    desktopId = folder.desktop;
    if (state.desktops[desktopId]) {
      removeId(state.desktops[desktopId].order, nodeId);
    }
    return;
  }

  if (!item) {
    return;
  }

  if (item.folderId && state.folders[item.folderId]) {
    removeId(state.folders[item.folderId].itemIds, nodeId);
    return;
  }

  for (key in state.desktops) {
    if (state.desktops.hasOwnProperty(key)) {
      removeId(state.desktops[key].order, nodeId);
    }
  }
}

function addItem(payload) {
  var createdId = '';
  mutate(function (state) {
    var targetDesktop = payload.desktop || 'home1';
    var item;
    if (!state.desktops[targetDesktop]) {
      targetDesktop = 'home1';
    }

    createdId = createId('item');
    item = createItem({
      id: createdId,
      title: payload.title,
      type: payload.type,
      url: payload.url,
      appId: payload.appId,
      path: payload.path,
      badge: payload.badge,
      color: payload.color,
      desktop: targetDesktop,
      folderId: payload.folderId,
      note: payload.note
    });

    state.items[createdId] = item;
    if (payload.folderId && state.folders[payload.folderId]) {
      state.folders[payload.folderId].itemIds.push(createdId);
      state.folders[payload.folderId].updatedAt = Date.now();
    } else {
      state.desktops[targetDesktop].order.push(createdId);
    }
  });
  return createdId;
}

function addFolder(payload) {
  var createdId = '';
  mutate(function (state) {
    var desktop = payload.desktop || 'home1';
    var folder;
    if (!state.desktops[desktop]) {
      desktop = 'home1';
    }

    createdId = createId('folder');
    folder = createFolder({
      id: createdId,
      title: payload.title,
      badge: payload.badge,
      color: payload.color,
      desktop: desktop,
      itemIds: []
    });

    state.folders[createdId] = folder;
    state.desktops[desktop].order.push(createdId);
  });
  return createdId;
}

function createFolderFromItems(sourceItemId, targetItemId, desktopKey, targetIndex, title) {
  var createdId = '';

  mutate(function (state) {
    var source = state.items[sourceItemId];
    var target = state.items[targetItemId];
    var desktop = desktopKey || (source ? source.desktop : '') || (target ? target.desktop : '') || 'home1';
    var folderTitle = format.trimText(title || 'Folder') || 'Folder';
    var sourceIndex = -1;
    var targetIndexBefore = -1;
    var insertIndex = targetIndex;
    var folder;

    if (!source || !target || sourceItemId === targetItemId) {
      return;
    }

    if (!state.desktops[desktop]) {
      desktop = source.desktop || target.desktop || 'home1';
    }

    if (state.desktops[desktop]) {
      sourceIndex = state.desktops[desktop].order.indexOf(sourceItemId);
      targetIndexBefore = state.desktops[desktop].order.indexOf(targetItemId);
    }

    removeNodeFromCurrentLocation(state, sourceItemId);
    removeNodeFromCurrentLocation(state, targetItemId);

    createdId = createId('folder');
    folder = createFolder({
      id: createdId,
      title: folderTitle,
      color: source.color || target.color || '#7d01b1',
      desktop: desktop,
      itemIds: [sourceItemId, targetItemId]
    });

    state.folders[createdId] = folder;

    source.folderId = createdId;
    source.desktop = desktop;
    source.updatedAt = Date.now();

    target.folderId = createdId;
    target.desktop = desktop;
    target.updatedAt = Date.now();

    if (typeof insertIndex !== 'number' || insertIndex < 0) {
      insertIndex = targetIndexBefore;
    }

    if (sourceIndex >= 0 && targetIndexBefore >= 0 && sourceIndex < targetIndexBefore) {
      insertIndex = targetIndexBefore - 1;
    }

    insertId(state.desktops[desktop].order, createdId, insertIndex);
    state.folders[createdId].updatedAt = Date.now();
  });

  return createdId;
}

function renameFolder(folderId, title) {
  return mutate(function (state) {
    var clean = format.trimText(title);
    if (!state.folders[folderId] || !clean) {
      return;
    }
    state.folders[folderId].title = clean;
    state.folders[folderId].badge = format.getBadge(clean);
    state.folders[folderId].updatedAt = Date.now();
  });
}

function renamePageName(pageKey, title) {
  return mutate(function (state) {
    var clean = format.trimText(title);
    state.settings.pageNames[pageKey] = clean || pageKey;
  });
}

function setTheme(themeId) {
  return mutate(function (state) {
    var i;
    for (i = 0; i < THEMES.length; i += 1) {
      if (THEMES[i].id === themeId) {
        state.settings.theme = themeId;
        return;
      }
    }
  });
}

function setFixedPageUrl(rawUrl) {
  var nextUrl = normalizeFixedPageUrl(rawUrl);

  if (nextUrl && !isFixedPageUrl(nextUrl)) {
    throw new Error('The fixed page accepts http(s) links only.');
  }

  return mutate(function (state) {
    state.settings.fixedPageUrl = nextUrl;
  });
}

function prepareFixedPage() {
  return getFixedPageConfig();
}

function moveNodeToDesktop(nodeId, targetDesktop, targetIndex) {
  return mutate(function (state) {
    var folder = state.folders[nodeId];
    var item = state.items[nodeId];
    var sourceDesktop = '';
    var sourceIndex = -1;
    var movingWithinSameDesktop = false;
    if (!state.desktops[targetDesktop]) {
      return;
    }

    if (folder) {
      sourceDesktop = folder.desktop;
      sourceIndex = state.desktops[sourceDesktop] ? state.desktops[sourceDesktop].order.indexOf(nodeId) : -1;
    } else if (item) {
      sourceDesktop = item.desktop;
      sourceIndex = state.desktops[sourceDesktop] ? state.desktops[sourceDesktop].order.indexOf(nodeId) : -1;
    }

    movingWithinSameDesktop = sourceDesktop && sourceDesktop === targetDesktop;

    removeNodeFromCurrentLocation(state, nodeId);

    if (folder) {
      folder.desktop = targetDesktop;
      folder.updatedAt = Date.now();
    }

    if (item) {
      item.desktop = targetDesktop;
      item.folderId = '';
      item.updatedAt = Date.now();
    }

    if (typeof targetIndex !== 'number' || targetIndex < 0 || targetIndex > state.desktops[targetDesktop].order.length) {
      targetIndex = state.desktops[targetDesktop].order.length;
    }

    if (movingWithinSameDesktop && sourceIndex >= 0 && sourceIndex < targetIndex) {
      targetIndex -= 1;
    }

    state.desktops[targetDesktop].order.splice(targetIndex, 0, nodeId);
  });
}

function moveItemToFolder(itemId, folderId) {
  return mutate(function (state) {
    var item = state.items[itemId];
    var folder = state.folders[folderId];
    if (!item || !folder) {
      return;
    }

    removeNodeFromCurrentLocation(state, itemId);
    item.desktop = folder.desktop;
    item.folderId = folderId;
    item.updatedAt = Date.now();
    folder.itemIds.push(itemId);
    folder.updatedAt = Date.now();
  });
}

function moveItemOutOfFolder(itemId, desktopKey) {
  return moveNodeToDesktop(itemId, desktopKey || 'home1');
}

function moveNodeUp(nodeId) {
  return mutate(function (state) {
    var desktopId = '';
    var order;
    var index;
    var item = state.items[nodeId];
    var folder = state.folders[nodeId];

    if (item && item.folderId && state.folders[item.folderId]) {
      order = state.folders[item.folderId].itemIds;
    } else {
      desktopId = folder ? folder.desktop : item ? item.desktop : '';
      order = desktopId ? state.desktops[desktopId].order : null;
    }

    if (!order) {
      return;
    }

    index = order.indexOf(nodeId);
    if (index > 0) {
      order.splice(index, 1);
      order.splice(index - 1, 0, nodeId);
    }
  });
}

function moveNodeDown(nodeId) {
  return mutate(function (state) {
    var desktopId = '';
    var order;
    var index;
    var item = state.items[nodeId];
    var folder = state.folders[nodeId];

    if (item && item.folderId && state.folders[item.folderId]) {
      order = state.folders[item.folderId].itemIds;
    } else {
      desktopId = folder ? folder.desktop : item ? item.desktop : '';
      order = desktopId ? state.desktops[desktopId].order : null;
    }

    if (!order) {
      return;
    }

    index = order.indexOf(nodeId);
    if (index >= 0 && index < order.length - 1) {
      order.splice(index, 1);
      order.splice(index + 1, 0, nodeId);
    }
  });
}

function updateItem(itemId, patch) {
  return mutate(function (state) {
    var item = state.items[itemId];
    var key;
    if (!item) {
      return;
    }

    for (key in patch) {
      if (patch.hasOwnProperty(key)) {
        item[key] = patch[key];
      }
    }
    item.updatedAt = Date.now();
  });
}

function replaceItem(itemId, payload) {
  return mutate(function (state) {
    var item = state.items[itemId];
    var targetDesktop = payload.desktop || (item ? item.desktop : 'home1');
    var targetFolderId = payload.folderId || '';
    var targetFolder = null;
    var sourceContainerType = 'desktop';
    var sourceContainerId = '';
    var sourceIndex = -1;
    var targetContainerType = 'desktop';
    var targetContainerId = '';
    var targetList = null;

    if (!item) {
      return;
    }

    if (item.folderId && state.folders[item.folderId]) {
      sourceContainerType = 'folder';
      sourceContainerId = item.folderId;
      sourceIndex = state.folders[item.folderId].itemIds.indexOf(itemId);
    } else if (item.desktop && state.desktops[item.desktop]) {
      sourceContainerId = item.desktop;
      sourceIndex = state.desktops[item.desktop].order.indexOf(itemId);
    }

    if (!state.desktops[targetDesktop]) {
      targetDesktop = item.desktop || 'home1';
    }

    if (targetFolderId && state.folders[targetFolderId]) {
      targetFolder = state.folders[targetFolderId];
    } else {
      targetFolderId = '';
    }

    removeNodeFromCurrentLocation(state, itemId);

    item.title = payload.title;
    item.type = payload.type;
    item.url = payload.url;
    item.appId = payload.appId || '';
    item.path = payload.path || '';
    item.badge = payload.badge || format.getBadge(payload.title);
    item.color = payload.color || item.color;
    item.note = payload.note || '';
    item.folderId = targetFolderId;
    item.desktop = targetFolder ? targetFolder.desktop : targetDesktop;
    item.updatedAt = Date.now();

    if (targetFolder) {
      targetContainerType = 'folder';
      targetContainerId = targetFolderId;
      targetList = targetFolder.itemIds;
      insertId(
        targetList,
        itemId,
        sourceContainerType === targetContainerType && sourceContainerId === targetContainerId ? sourceIndex : targetList.length
      );
      targetFolder.updatedAt = Date.now();
      return;
    }

    targetContainerId = item.desktop;
    targetList = state.desktops[item.desktop].order;
    insertId(
      targetList,
      itemId,
      sourceContainerType === targetContainerType && sourceContainerId === targetContainerId ? sourceIndex : targetList.length
    );
  });
}

function deleteNode(nodeId) {
  return mutate(function (state) {
    var folder = state.folders[nodeId];
    var item = state.items[nodeId];
    var i;
    var childId;
    var nextHistory = [];

    if (folder) {
      removeId(state.desktops[folder.desktop].order, nodeId);
      for (i = 0; i < folder.itemIds.length; i += 1) {
        childId = folder.itemIds[i];
        if (state.items[childId]) {
          state.items[childId].folderId = '';
          state.items[childId].desktop = folder.desktop;
          state.items[childId].updatedAt = Date.now();
          state.desktops[folder.desktop].order.push(childId);
        }
      }
      delete state.folders[nodeId];
      return;
    }

    if (!item) {
      return;
    }

    removeNodeFromCurrentLocation(state, nodeId);
    delete state.items[nodeId];

    for (i = 0; i < state.history.length; i += 1) {
      if (state.history[i].nodeId !== nodeId) {
        nextHistory.push(state.history[i]);
      }
    }
    state.history = nextHistory;
  });
}

function recordOpen(nodeId, result) {
  return mutate(function (state) {
    var node = state.items[nodeId];
    if (!node) {
      return;
    }

    node.lastOpenedAt = Date.now();
    node.updatedAt = Date.now();
    state.history.unshift({
      id: createId('hist'),
      nodeId: nodeId,
      title: node.title,
      url: node.url,
      type: node.type,
      badge: node.badge,
      color: node.color,
      appId: node.appId || '',
      path: node.path || '',
      openedAt: node.lastOpenedAt,
      result: result || 'opened'
    });
    state.history = state.history.slice(0, 80);
  });
}

function removeHistoryEntry(entryId) {
  return mutate(function (state) {
    var i;
    for (i = 0; i < state.history.length; i += 1) {
      if (state.history[i].id === entryId) {
        state.history.splice(i, 1);
        break;
      }
    }
  });
}

function clearHistory() {
  return mutate(function (state) {
    state.history = [];
  });
}

function exportStateText() {
  return JSON.stringify(getRawState(), null, 2);
}

function importStateText(text) {
  var parsed = JSON.parse(text);
  if (!parsed || !parsed.desktops || !parsed.items || !parsed.folders) {
    throw new Error('Invalid MagicBox export payload.');
  }
  saveState(normalizeState(parsed));
  return getState();
}

function resetState() {
  saveState(createSeedState());
  return getState();
}

module.exports = {
  THEMES: THEMES,
  ensureState: ensureState,
  getState: getState,
  getThemeOptions: getThemeOptions,
  getThemeClass: getThemeClass,
  getDesktopNodes: getDesktopNodes,
  getFoldersForDesktop: getFoldersForDesktop,
  getAllFolders: getAllFolders,
  getFolderItems: getFolderItems,
  getRecentEntry: getRecentEntry,
  getRecentEntries: getRecentEntries,
  getHistoryGroups: getHistoryGroups,
  getFolderById: getFolderById,
  getDesktopLabel: getDesktopLabel,
  getPageOrder: getPageOrder,
  getLaunchPageKey: getLaunchPageKey,
  getQuickAddTargetKey: getQuickAddTargetKey,
  getFixedPageConfig: getFixedPageConfig,
  addItem: addItem,
  addFolder: addFolder,
  createFolderFromItems: createFolderFromItems,
  renameFolder: renameFolder,
  renamePageName: renamePageName,
  setPageOrder: setPageOrder,
  movePageOrder: movePageOrder,
  setTheme: setTheme,
  setFixedPageUrl: setFixedPageUrl,
  prepareFixedPage: prepareFixedPage,
  moveNodeToDesktop: moveNodeToDesktop,
  moveItemToFolder: moveItemToFolder,
  moveItemOutOfFolder: moveItemOutOfFolder,
  moveNodeUp: moveNodeUp,
  moveNodeDown: moveNodeDown,
  updateItem: updateItem,
  replaceItem: replaceItem,
  deleteNode: deleteNode,
  recordOpen: recordOpen,
  removeHistoryEntry: removeHistoryEntry,
  clearHistory: clearHistory,
  exportStateText: exportStateText,
  importStateText: importStateText,
  resetState: resetState,
  getNodeById: getNodeById
};
