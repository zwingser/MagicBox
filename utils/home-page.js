var format = require('./format');
var back = require('./back');
var pageTools = require('./page-tools');
var pageNav = require('./page-nav');
var stateStore = require('./state');

var DRAG_ARM_DELAY = 320;
var DRAG_MOVE_THRESHOLD = 8;
var DRAG_MERGE_DELAY = 650;
var HOME_SWIPE_TRIGGER = 14;
var HOME_SWIPE_MAX_VERTICAL_OFFSET = 96;
var HOME_SWIPE_COMMIT_RATIO = 0.32;
var HOME_SWIPE_COMMIT_DISTANCE = 88;
var HOME_SWIPE_COMMIT_VELOCITY = 0.36;
var HOME_TRANSITION_DURATION = 280;
var HOME_HANDOFF_FADE_DELAY = 80;
var HOME_HANDOFF_FADE_DURATION = 140;
var pendingPageHandoff = null;

function findNodeById(nodes, nodeId) {
  var i;
  for (i = 0; i < nodes.length; i += 1) {
    if (nodes[i].id === nodeId) {
      return nodes[i];
    }
  }
  return null;
}

function findNodeIndex(nodes, nodeId) {
  var i;
  for (i = 0; i < nodes.length; i += 1) {
    if (nodes[i].id === nodeId) {
      return i;
    }
  }
  return -1;
}

function mapNodes(nodes) {
  var result = [];
  var i;
  for (i = 0; i < nodes.length; i += 1) {
    result.push(pageTools.enrichNode(nodes[i]));
  }
  return result;
}

function getHomeOptionsByKey(desktopKey) {
  return {
    showRecent: desktopKey === 'home1'
  };
}

function buildDesktopViewData(desktopKey, options, recentCurrentValue) {
  var viewOptions = options || getHomeOptionsByKey(desktopKey);
  var recentEntries = viewOptions.showRecent ? stateStore.getRecentEntries(5) : [];
  var recentCurrent = clampRecentIndex(typeof recentCurrentValue === 'number' ? recentCurrentValue : 0, recentEntries.length);
  var nodes = mapNodes(stateStore.getDesktopNodes(desktopKey));
  var i;

  for (i = 0; i < recentEntries.length; i += 1) {
    recentEntries[i].metaLabel = recentEntries[i].type === 'app' ? 'App' : recentEntries[i].type === 'miniProgram' ? 'Mini' : 'Web';
  }

  return {
    desktopKey: desktopKey,
    showRecent: !!viewOptions.showRecent,
    showDesktopChrome: !!viewOptions.showRecent,
    topOffsetClass: desktopKey === 'home2' ? 'home2-top-offset' : 'home1-top-offset',
    gridClass: viewOptions.showRecent ? 'tile-grid home1-tile-grid' : 'tile-grid home-preview-tile-grid',
    emptyClass: viewOptions.showRecent ? 'glass-card empty-card home1-empty-grid' : 'glass-card empty-card',
    recentEntries: recentEntries,
    hasRecentEntries: recentEntries.length > 0,
    recentCurrent: recentCurrent,
    recentLoopEnabled: recentEntries.length > 1,
    showRecentIndicators: recentEntries.length > 1,
    recentIndicators: buildRecentIndicators(recentEntries, recentCurrent),
    nodes: nodes
  };
}

function resetPageTransition(page) {
  if (page.__pageTransitionTimer) {
    clearTimeout(page.__pageTransitionTimer);
    page.__pageTransitionTimer = null;
  }

  page.__pageSwipeState = null;

  if (!page || !page.data || !page.data.pageTransitionVisible) {
    return;
  }

  page.setData({
    pageTransitionVisible: false,
    pageTransitionPanels: [],
    pageTransitionTrackStyle: ''
  });
}

function clearPageHandoff(page) {
  if (!page) {
    return;
  }

  if (page.__pageHandoffTimer) {
    clearTimeout(page.__pageHandoffTimer);
    page.__pageHandoffTimer = null;
  }

  if (page.__pageHandoffCleanupTimer) {
    clearTimeout(page.__pageHandoffCleanupTimer);
    page.__pageHandoffCleanupTimer = null;
  }

  if (!page.data || !page.data.pageHandoffVisible) {
    return;
  }

  page.setData({
    pageHandoffVisible: false,
    pageHandoffPanel: null,
    pageHandoffClass: ''
  });
}

function consumePendingPageHandoff(page, desktopKey) {
  var handoff = null;

  if (!page || !pendingPageHandoff || pendingPageHandoff.targetKey !== desktopKey) {
    return;
  }

  handoff = pendingPageHandoff;
  pendingPageHandoff = null;

  if (page.__pageHandoffTimer) {
    clearTimeout(page.__pageHandoffTimer);
  }
  if (page.__pageHandoffCleanupTimer) {
    clearTimeout(page.__pageHandoffCleanupTimer);
  }

  page.setData({
    pageHandoffVisible: true,
    pageHandoffPanel: handoff.panel,
    pageHandoffClass: ''
  });

  page.__pageHandoffTimer = setTimeout(function () {
    page.__pageHandoffTimer = null;
    page.setData({
      pageHandoffClass: 'page-handoff-shell--leaving'
    });
  }, HOME_HANDOFF_FADE_DELAY);

  page.__pageHandoffCleanupTimer = setTimeout(function () {
    page.__pageHandoffCleanupTimer = null;
    clearPageHandoff(page);
  }, HOME_HANDOFF_FADE_DELAY + HOME_HANDOFF_FADE_DURATION + 40);
}

function getViewportWidth(page) {
  var info = null;
  var width = 375;

  if (page && page.__pageViewportWidth) {
    return page.__pageViewportWidth;
  }

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

  if (info && info.windowWidth) {
    width = info.windowWidth;
  }

  if (page) {
    page.__pageViewportWidth = width;
  }

  return width;
}

function buildPageTransitionStyle(offset, animate) {
  var rounded = Math.round(offset || 0);
  var transition = animate ? 'transform ' + HOME_TRANSITION_DURATION + 'ms cubic-bezier(0.22, 1, 0.36, 1)' : 'none';

  return 'transform: translate3d(' + rounded + 'px, 0, 0); transition: ' + transition + ';';
}

function createPageSwipeState(page, currentKey, targetRoute, direction) {
  var currentPanel;
  var targetOptions;
  var targetPanel;
  var panels;
  var width;
  var baseOffset;
  var targetOffset;

  if (!page || !targetRoute || (targetRoute.key !== 'home1' && targetRoute.key !== 'home2')) {
    return null;
  }

  currentPanel = buildDesktopViewData(currentKey, page.__homeOptions || getHomeOptionsByKey(currentKey), page.data.recentCurrent || 0);
  targetOptions = getHomeOptionsByKey(targetRoute.key);
  targetPanel = buildDesktopViewData(targetRoute.key, targetOptions, 0);
  width = getViewportWidth(page);

  if (direction === 'right') {
    panels = [targetPanel, currentPanel];
    baseOffset = -width;
    targetOffset = 0;
  } else {
    panels = [currentPanel, targetPanel];
    baseOffset = 0;
    targetOffset = -width;
  }

  return {
    currentKey: currentKey,
    targetRoute: targetRoute,
    direction: direction,
    width: width,
    baseOffset: baseOffset,
    targetOffset: targetOffset,
    currentOffset: baseOffset,
    startedAt: Date.now(),
    lastDeltaX: 0,
    settling: false,
    panels: panels
  };
}

function ensurePageSwipeState(page, currentKey, targetRoute, direction) {
  var swipe = page.__pageSwipeState;

  if (swipe) {
    return swipe;
  }

  swipe = createPageSwipeState(page, currentKey, targetRoute, direction);
  if (!swipe) {
    return null;
  }

  resetPageTransition(page);
  page.__pageSwipeState = swipe;
  page.setData({
    pageTransitionVisible: true,
    pageTransitionPanels: swipe.panels,
    pageTransitionTrackStyle: buildPageTransitionStyle(swipe.baseOffset, false)
  });

  return swipe;
}

function settlePageSwipe(page, shouldCommit) {
  var swipe = page.__pageSwipeState;
  var destination;
  var route;
  var targetPanel = null;

  if (!page || !swipe) {
    return false;
  }

  if (page.__pageTransitionTimer) {
    clearTimeout(page.__pageTransitionTimer);
    page.__pageTransitionTimer = null;
  }

  swipe.settling = true;
  destination = shouldCommit ? swipe.targetOffset : swipe.baseOffset;
  swipe.currentOffset = destination;
  route = swipe.targetRoute;
  targetPanel = shouldCommit && route ? buildDesktopViewData(route.key, getHomeOptionsByKey(route.key), 0) : null;

  page.setData({
    pageTransitionTrackStyle: buildPageTransitionStyle(destination, true)
  });

  page.__pageTransitionTimer = setTimeout(function () {
    page.__pageTransitionTimer = null;

    if (shouldCommit && route) {
      pendingPageHandoff = {
        targetKey: route.key,
        panel: targetPanel
      };
      wx.switchTab({
        url: route.url,
        fail: function () {
          pendingPageHandoff = null;
          resetPageTransition(page);
        }
      });
      return;
    }

    resetPageTransition(page);
  }, HOME_TRANSITION_DURATION + 24);

  return true;
}

function startPageTransition(page, currentKey, targetRoute, direction) {
  var swipe = ensurePageSwipeState(page, currentKey, targetRoute, direction);

  if (!swipe) {
    return false;
  }

  return settlePageSwipe(page, true);
}

function tryStartInteractivePageSwipe(page, currentKey, touch) {
  var start = page.__swipeTouch;
  var deltaX;
  var deltaY;
  var direction;
  var route;

  if (!page || !touch || page.__pageSwipeState) {
    return !!(page && page.__pageSwipeState);
  }

  if (page.data.dragActive) {
    return false;
  }

  start = page.__swipeTouch;
  if (!start) {
    return false;
  }

  deltaX = touch.clientX - start.x;
  deltaY = touch.clientY - start.y;

  if (Math.abs(deltaX) < HOME_SWIPE_TRIGGER) {
    return false;
  }

  if (Math.abs(deltaY) > HOME_SWIPE_MAX_VERTICAL_OFFSET) {
    return false;
  }

  if (Math.abs(deltaX) < Math.abs(deltaY) * 1.15) {
    return false;
  }

  direction = deltaX < 0 ? 'left' : 'right';
  route = pageNav.getAdjacentRoute(currentKey, direction);

  if (!route || (route.key !== 'home1' && route.key !== 'home2')) {
    return false;
  }

  return !!ensurePageSwipeState(page, currentKey, route, direction);
}

function updateInteractivePageSwipe(page, currentKey, touch) {
  var swipe = null;
  var start = null;
  var nextOffset;

  if (!page || !touch) {
    return false;
  }

  if (!page.__pageSwipeState) {
    if (!tryStartInteractivePageSwipe(page, currentKey, touch)) {
      return false;
    }
  }

  swipe = page.__pageSwipeState;
  start = page.__swipeTouch;

  if (!swipe || !start || swipe.settling) {
    return !!swipe;
  }

  nextOffset = swipe.baseOffset + (touch.clientX - start.x);
  if (nextOffset < -swipe.width) {
    nextOffset = -swipe.width;
  }
  if (nextOffset > 0) {
    nextOffset = 0;
  }

  swipe.currentOffset = nextOffset;
  swipe.lastDeltaX = touch.clientX - start.x;

  page.setData({
    pageTransitionTrackStyle: buildPageTransitionStyle(nextOffset, false)
  });

  return true;
}

function finishInteractivePageSwipe(page, touch) {
  var swipe = page.__pageSwipeState;
  var distance = 0;
  var elapsed = 1;
  var velocity = 0;
  var shouldCommit = false;

  if (!page || !swipe) {
    return false;
  }

  distance = Math.abs(swipe.currentOffset - swipe.baseOffset);
  elapsed = Math.max(Date.now() - swipe.startedAt, 1);
  velocity = Math.abs(distance / elapsed);
  shouldCommit = distance >= Math.max(HOME_SWIPE_COMMIT_DISTANCE, swipe.width * HOME_SWIPE_COMMIT_RATIO);

  if (!shouldCommit && velocity >= HOME_SWIPE_COMMIT_VELOCITY && distance >= 48) {
    shouldCommit = true;
  }

  settlePageSwipe(page, shouldCommit);
  return true;
}

function buildRecentIndicators(entries, currentIndex) {
  var result = [];
  var i;

  for (i = 0; i < entries.length; i += 1) {
    result.push({
      id: entries[i].historyId || entries[i].nodeId || String(i),
      activeClass: i === currentIndex ? 'recent-indicator--active' : ''
    });
  }

  return result;
}

function clampRecentIndex(currentIndex, total) {
  if (!total) {
    return 0;
  }
  if (currentIndex < 0) {
    return 0;
  }
  if (currentIndex >= total) {
    return total - 1;
  }
  return currentIndex;
}

function getTouchPoint(event) {
  if (!event) {
    return null;
  }

  if (event.changedTouches && event.changedTouches.length) {
    return event.changedTouches[0];
  }

  if (event.touches && event.touches.length) {
    return event.touches[0];
  }

  return null;
}

function clearGestureTimer(gesture) {
  if (gesture && gesture.timer) {
    clearTimeout(gesture.timer);
    gesture.timer = null;
  }
}

function clearNodeGesture(page) {
  if (page.__nodeGesture) {
    clearGestureTimer(page.__nodeGesture);
  }
  page.__nodeGesture = null;
}

function buildDragGhostStyle(x, y) {
  return 'left:' + x + 'px;top:' + y + 'px;';
}

function measureTileRects(page) {
  var query;

  if (!page || typeof wx.createSelectorQuery !== 'function' || !page.data || !page.data.nodes) {
    return;
  }

  query = page.createSelectorQuery ? page.createSelectorQuery() : wx.createSelectorQuery().in(page);
  query.selectAll('.tile-slot').boundingClientRect(function (rects) {
    var mapped = [];
    var i;
    var node;

    rects = rects || [];

    for (i = 0; i < rects.length && i < page.data.nodes.length; i += 1) {
      node = page.data.nodes[i];
      if (!node) {
        continue;
      }
      mapped.push({
        id: node.id,
        kind: node.kind,
        index: i,
        rect: rects[i],
        node: node
      });
    }

    page.__tileRects = mapped;
  });
  query.exec();
}

function getDragTarget(page, x, y) {
  var rects = page.__tileRects || [];
  var best = null;
  var bestDistance = Infinity;
  var i;
  var rect;
  var centerX;
  var centerY;
  var distance;

  for (i = 0; i < rects.length; i += 1) {
    rect = rects[i].rect;
    if (!rect) {
      continue;
    }

    if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
      return rects[i];
    }

    centerX = rect.left + rect.width / 2;
    centerY = rect.top + rect.height / 2;
    distance = Math.sqrt(Math.pow(centerX - x, 2) + Math.pow(centerY - y, 2));
    if (distance < bestDistance) {
      bestDistance = distance;
      best = rects[i];
    }
  }

  if (bestDistance <= 150) {
    return best;
  }

  return null;
}

function applyDragState(page, patch) {
  var next = {};
  var key;

  patch = patch || {};
  for (key in patch) {
    if (patch.hasOwnProperty(key)) {
      next[key] = patch[key];
    }
  }

  page.setData(next);
}

function resetDragState(page) {
  clearNodeGesture(page);
  page.__tileRects = page.__tileRects || [];
  page.__dragState = null;
  page.__dragSourceNode = null;
  page.__dragTargetMeta = null;
  page.__dragTargetNode = null;
  page.__dragOverSince = 0;
  applyDragState(page, {
    dragActive: false,
    dragSourceId: '',
    dragTargetId: '',
    dragTargetKind: '',
    dragHint: '',
    dragGhostStyle: '',
    dragGhostBadge: '',
    dragGhostTitle: '',
    dragGhostColor: '',
    dragGhostKind: ''
  });
}

function startDrag(page, node, touch) {
  clearNodeGesture(page);
  page.__dragState = {
    nodeId: node.id,
    kind: node.kind,
    desktopKey: page.data.desktopKey,
    startX: touch.clientX,
    startY: touch.clientY,
    lastX: touch.clientX,
    lastY: touch.clientY,
    startedAt: Date.now(),
    dragging: false,
    menuReady: false,
    menuShown: false,
    moved: false
  };
  page.__dragSourceNode = node;
  page.__dragTargetMeta = null;
  page.__dragTargetNode = null;
  page.__dragOverSince = 0;

  page.__nodeGesture = {
    timer: setTimeout(function () {
      if (page.__dragState && page.__dragState.nodeId === node.id) {
        page.__dragState.menuReady = true;
      }
    }, DRAG_ARM_DELAY)
  };
}

function updateDragHint(page, source, target, duration) {
  var hint = '';

  if (!target) {
    hint = 'Move here';
  } else if (target.kind === 'folder' && source && source.kind === 'item') {
    hint = 'Drop into folder';
  } else if (source && source.kind === 'item' && target.kind === 'item' && duration >= DRAG_MERGE_DELAY) {
    hint = 'Create folder';
  } else {
    hint = 'Move here';
  }

  return hint;
}

function updateDrag(page, touch) {
  var gesture = page.__dragState;
  var node;
  var deltaX;
  var deltaY;
  var distance;
  var target;
  var hint;

  if (!gesture) {
    return;
  }

  gesture.lastX = touch.clientX;
  gesture.lastY = touch.clientY;
  deltaX = gesture.lastX - gesture.startX;
  deltaY = gesture.lastY - gesture.startY;
  distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

  if (distance > DRAG_MOVE_THRESHOLD) {
    gesture.moved = true;
  }

  if (!gesture.dragging) {
    if (!gesture.menuReady) {
      return;
    }

    if (!gesture.moved) {
      return;
    }

    gesture.dragging = true;
    if (wx.vibrateShort) {
      try {
        wx.vibrateShort({
          type: 'light'
        });
      } catch (error) {
      }
    }
  }

  node = page.__dragSourceNode;
  target = getDragTarget(page, touch.clientX, touch.clientY);

  if (target && target.id === node.id) {
    target = null;
  }

  if (target) {
    if (!page.__dragTargetMeta || page.__dragTargetMeta.id !== target.id) {
      page.__dragOverSince = Date.now();
    }
    page.__dragTargetMeta = target;
    page.__dragTargetNode = target.node;
  } else {
    page.__dragTargetMeta = null;
    page.__dragTargetNode = null;
    page.__dragOverSince = 0;
  }

  hint = updateDragHint(page, node, page.__dragTargetNode, page.__dragOverSince ? Date.now() - page.__dragOverSince : 0);

  applyDragState(page, {
    dragActive: true,
    dragSourceId: node.id,
    dragTargetId: page.__dragTargetNode ? page.__dragTargetNode.id : '',
    dragTargetKind: page.__dragTargetNode ? page.__dragTargetNode.kind : '',
    dragHint: hint,
    dragGhostStyle: buildDragGhostStyle(touch.clientX, touch.clientY),
    dragGhostBadge: node.badge,
    dragGhostTitle: node.title,
    dragGhostColor: node.color,
    dragGhostKind: node.kind
  });
}

function finalizeDrag(page) {
  var gesture = page.__dragState;
  var source = page.__dragSourceNode;
  var targetMeta = page.__dragTargetMeta;
  var target = page.__dragTargetNode;
  var duration = page.__dragOverSince ? Date.now() - page.__dragOverSince : 0;
  var shouldMerge;
  var sourceIndex = findNodeIndex(page.data.nodes, source ? source.id : '');
  var insertIndex = targetMeta ? targetMeta.index : undefined;

  if (!gesture || !source) {
    resetDragState(page);
    return 'none';
  }

  if (!gesture.dragging) {
    if (gesture.menuReady && !gesture.moved) {
      gesture.menuShown = true;
      resetDragState(page);
      handleNodeMenu(page, source);
      return 'menu';
    }

    shouldMerge = !!gesture.moved;
    resetDragState(page);
    return shouldMerge ? 'cancel' : 'tap';
  }

  shouldMerge = !!(target && source.kind === 'item' && target.kind === 'item' && duration >= DRAG_MERGE_DELAY);

  if (target && target.kind === 'folder' && source.kind === 'item') {
    stateStore.moveItemToFolder(source.id, target.id);
  } else if (shouldMerge) {
    stateStore.createFolderFromItems(source.id, target.id, page.data.desktopKey, insertIndex, 'Folder');
  } else if (source.kind === 'folder' || source.kind === 'item') {
    if (typeof insertIndex === 'number' && sourceIndex >= 0 && targetMeta && sourceIndex < targetMeta.index) {
      insertIndex = targetMeta.index + 1;
    }
    stateStore.moveNodeToDesktop(source.id, page.data.desktopKey, insertIndex);
  }

  resetDragState(page);
  refreshPage(page, page.data.desktopKey, page.__homeOptions || {});
  return 'drag';
}

function consumePendingQuickAddOpen() {
  var app = null;
  var result = {
    shouldOpen: false,
    draft: null
  };

  try {
    app = getApp();
  } catch (error) {
    app = null;
  }

  if (app && typeof app.consumePendingQuickAddOpen === 'function') {
    result = app.consumePendingQuickAddOpen();
    if (typeof result === 'boolean') {
      return {
        shouldOpen: result,
        draft: null
      };
    }
    return result || {
      shouldOpen: false,
      draft: null
    };
  }

  return result;
}

function openPendingQuickAdd(page) {
  var pending = consumePendingQuickAddOpen();

  if (!pending || !pending.shouldOpen) {
    return;
  }

  setTimeout(function () {
    var tabBar = null;

    if (!page || typeof page.getTabBar !== 'function') {
      return;
    }

    try {
      tabBar = page.getTabBar();
    } catch (error) {
      tabBar = null;
    }

    if (tabBar && typeof tabBar.openPanel === 'function') {
      tabBar.openPanel(pending.draft || null);
    }
  }, 0);
}

function refreshPage(page, desktopKey, options) {
  options = options || page.__homeOptions || {};
  if (typeof options.showRecent === 'undefined') {
    options.showRecent = true;
  }

  var shell = pageTools.buildShellData();
  var otherDesktopKey = pageTools.getOtherDesktopKey(desktopKey);
  var desktopView = buildDesktopViewData(desktopKey, options, page.data.recentCurrent || 0);

  page.__homeOptions = options;

  page.setData({
    themeClass: shell.themeClass,
    home1Label: shell.home1Label,
    home2Label: shell.home2Label,
    desktopKey: desktopKey,
    otherDesktopKey: otherDesktopKey,
    otherDesktopLabel: stateStore.getDesktopLabel(otherDesktopKey),
    activeTab: desktopKey,
    recentEntries: desktopView.recentEntries,
    hasRecentEntries: desktopView.hasRecentEntries,
    recentCurrent: desktopView.recentCurrent,
    recentLoopEnabled: desktopView.recentLoopEnabled,
    showRecentIndicators: desktopView.showRecentIndicators,
    recentIndicators: desktopView.recentIndicators,
    nodes: desktopView.nodes,
    dragActive: false,
    dragSourceId: '',
    dragTargetId: '',
    dragTargetKind: '',
    dragHint: '',
    dragGhostStyle: '',
    dragGhostBadge: '',
    dragGhostTitle: '',
    dragGhostColor: '',
    dragGhostKind: ''
  });
  clearNodeGesture(page);
  resetPageTransition(page);
  page.__dragState = null;
  page.__dragSourceNode = null;
  page.__dragTargetMeta = null;
  page.__dragTargetNode = null;
  page.__dragOverSince = 0;
  page.__tileRects = [];
  setTimeout(function () {
    measureTileRects(page);
  }, 0);
  pageTools.syncTabBar(page, desktopKey);
}

function confirmDelete(node, onConfirm) {
  wx.showModal({
    title: node.kind === 'folder' ? 'Delete folder' : 'Delete item',
    content: node.kind === 'folder' ? 'Items inside this folder will move back to the desktop.' : 'This item will be removed from your collection.',
    success: function (result) {
      if (result.confirm) {
        onConfirm();
      }
    }
  });
}

function promptText(options, onConfirm) {
  wx.showModal({
    title: options.title,
    editable: true,
    placeholderText: options.placeholder || '',
    content: options.value || '',
    success: function (result) {
      var value = format.trimText(result.content);

      if (!result.confirm) {
        return;
      }

      if (!value) {
        pageTools.showToast(options.emptyText || 'Enter a value');
        return;
      }

      onConfirm(value);
    }
  });
}

function editFolder(page, node) {
  promptText({
    title: 'Edit folder',
    placeholder: 'Folder name',
    value: node.title,
    emptyText: 'Enter a folder name'
  }, function (value) {
    stateStore.renameFolder(node.id, value);
    refreshPage(page, page.data.desktopKey);
    pageTools.showToast('Folder updated');
  });
}

function editItem(page, node) {
  var tabBar = null;

  if (!page || typeof page.getTabBar !== 'function') {
    pageTools.showToast('Edit panel is unavailable');
    return;
  }

  try {
    tabBar = page.getTabBar();
  } catch (error) {
    tabBar = null;
  }

  if (!tabBar || typeof tabBar.openPanel !== 'function') {
    pageTools.showToast('Edit panel is unavailable');
    return;
  }

  tabBar.openPanel({
    mode: 'edit',
    itemId: node.id,
    title: node.title,
    url: node.url,
    note: node.note || '',
    explicitType: node.type || '',
    desktop: node.desktop || page.data.desktopKey,
    folderId: node.folderId || '',
    color: node.color || '#4b8eff'
  });
}

function handleNodeMenu(page, node) {
  if (!node) {
    return;
  }

  wx.showActionSheet({
    itemList: ['Edit', 'Delete'],
    success: function (event) {
      if (event.tapIndex === 0) {
        if (node.kind === 'folder') {
          editFolder(page, node);
          return;
        }
        editItem(page, node);
        return;
      }

      if (event.tapIndex === 1) {
        confirmDelete(node, function () {
          stateStore.deleteNode(node.id);
          refreshPage(page, page.data.desktopKey);
        });
      }
    }
  });
}

function createHomePage(desktopKey, options) {
  options = options || {};
  if (typeof options.showRecent === 'undefined') {
    options.showRecent = true;
  }

  return {
    data: {
      themeClass: '',
      home1Label: 'Home 1',
      home2Label: 'Home 2',
      activeTab: desktopKey,
      desktopKey: desktopKey,
      otherDesktopKey: '',
      otherDesktopLabel: '',
      recentEntries: [],
      hasRecentEntries: false,
      recentCurrent: 0,
      recentLoopEnabled: false,
      showRecentIndicators: false,
      recentIndicators: [],
      nodes: [],
      dragActive: false,
      dragSourceId: '',
      dragTargetId: '',
      dragTargetKind: '',
      dragHint: '',
      dragGhostStyle: '',
      dragGhostBadge: '',
      dragGhostTitle: '',
      dragGhostColor: '',
      dragGhostKind: '',
      pageTransitionVisible: false,
      pageTransitionPanels: [],
      pageTransitionTrackStyle: '',
      pageHandoffVisible: false,
      pageHandoffPanel: null,
      pageHandoffClass: ''
    },

    onShow: function () {
      refreshPage(this, desktopKey, options);
      consumePendingPageHandoff(this, desktopKey);
      openPendingQuickAdd(this);
    },

    onHide: function () {
      clearNodeGesture(this);
      resetPageTransition(this);
      clearPageHandoff(this);
    },

    onUnload: function () {
      clearNodeGesture(this);
      resetPageTransition(this);
      clearPageHandoff(this);
    },

    onPullDownRefresh: function () {
      refreshPage(this, desktopKey, options);
      wx.stopPullDownRefresh();
    },

    onCustomBack: function () {
      return back.handleTabBack(desktopKey);
    },

    onBackPress: function () {
      return back.handleTabBack(desktopKey);
    },

    onRecentChange: function (event) {
      var current = event.detail.current || 0;
      this.setData({
        recentCurrent: current,
        recentIndicators: buildRecentIndicators(this.data.recentEntries, current)
      });
    },

    onPageTouchStart: function (event) {
      if (this.__pageSwipeState && this.__pageSwipeState.settling) {
        return;
      }
      pageNav.captureTouchStart(this, event);
    },

    onPageTouchMove: function (event) {
      var touch = getTouchPoint(event);

      if (!touch || (this.__pageSwipeState && this.__pageSwipeState.settling)) {
        return;
      }

      updateInteractivePageSwipe(this, desktopKey, touch);
    },

    onPageTouchEnd: function (event) {
      if (finishInteractivePageSwipe(this, getTouchPoint(event))) {
        this.__swipeTouch = null;
        return;
      }

      pageNav.handleTouchEnd(this, desktopKey, event);
    },

    onPageTouchCancel: function () {
      if (finishInteractivePageSwipe(this, null)) {
        this.__swipeTouch = null;
        return;
      }

      this.__swipeTouch = null;
    },

    onSwipeRoute: function (route, direction) {
      if (!route || (route.key !== 'home1' && route.key !== 'home2')) {
        return false;
      }

      if (route.key === desktopKey) {
        return true;
      }

      return startPageTransition(this, desktopKey, route, direction);
    },

    onGestureBlock: function () {
    },

    onRecentTap: function (event) {
      var rawIndex = event.currentTarget.dataset.index;
      var index = typeof rawIndex === 'undefined' ? this.data.recentCurrent : Number(rawIndex);
      var entry = this.data.recentEntries[index];

      if (!entry) {
        return;
      }

      pageTools.openHistoryEntry(entry);
      refreshPage(this, desktopKey, options);
    },

    onNodeTap: function (event) {
      var nodeId = event.currentTarget.dataset.id;
      var node = findNodeById(this.data.nodes, nodeId);
      var success;
      if (this.__suppressNextTap) {
        this.__suppressNextTap = false;
        return;
      }
      if (this.__dragState || this.data.dragActive || this.data.pageTransitionVisible) {
        return;
      }
      if (!node) {
        return;
      }
      success = pageTools.openAndRecordNode(node);
      if (!success) {
        refreshPage(this, desktopKey, options);
      }
    },

    onNodeTouchStart: function (event) {
      var nodeId = event.currentTarget.dataset.id;
      var node = findNodeById(this.data.nodes, nodeId);
      var touch = getTouchPoint(event);

      if (this.__pageSwipeState && this.__pageSwipeState.settling) {
        return;
      }

      this.__suppressNextTap = false;
      pageNav.captureTouchStart(this, event);
      this.__lastNodeTouch = touch || null;

      if (!node || !touch) {
        return;
      }

      startDrag(this, node, touch);
      measureTileRects(this);
    },

    onNodeTouchMove: function (event) {
      var touch = getTouchPoint(event);
      var hadSwipe = !!this.__pageSwipeState;

      this.__lastNodeTouch = touch || this.__lastNodeTouch || null;

      if (!touch) {
        return;
      }

      if (this.__dragState && !this.__dragState.dragging && !this.__dragState.menuReady) {
        if (updateInteractivePageSwipe(this, desktopKey, touch)) {
          if (!hadSwipe && this.__pageSwipeState) {
            resetDragState(this);
          }
          return;
        }
      }

      if (this.__pageSwipeState) {
        updateInteractivePageSwipe(this, desktopKey, touch);
        return;
      }

      if (!this.__dragState) {
        return;
      }

      updateDrag(this, touch);
    },

    onNodeTouchEnd: function () {
      if (finishInteractivePageSwipe(this, this.__lastNodeTouch)) {
        this.__lastNodeTouch = null;
        this.__suppressNextTap = true;
        return;
      }

      var tappedNode = this.__dragSourceNode || null;
      var result = finalizeDrag(this);
      var navigatedBySwipe = false;
      var success;

      if (result === 'tap' || result === 'cancel' || result === 'none') {
        navigatedBySwipe = pageNav.handleTouchEnd(this, desktopKey, {
          changedTouches: this.__lastNodeTouch ? [this.__lastNodeTouch] : []
        });
      }

      if (result === 'tap' && !navigatedBySwipe && tappedNode) {
        success = pageTools.openAndRecordNode(tappedNode);
        if (!success) {
          refreshPage(this, desktopKey, options);
        }
      }

      this.__lastNodeTouch = null;
      this.__suppressNextTap = result === 'menu' || result === 'drag' || result === 'cancel' || result === 'tap';
    },

    onNodeTouchCancel: function () {
      if (finishInteractivePageSwipe(this, null)) {
        this.__lastNodeTouch = null;
        this.__suppressNextTap = true;
        return;
      }

      this.__lastNodeTouch = null;
      this.__suppressNextTap = !!this.__dragState;
      resetDragState(this);
    },

    onNodeMenu: function (event) {
      var nodeId = event.currentTarget.dataset.id;
      var node = findNodeById(this.data.nodes, nodeId);
      handleNodeMenu(this, node);
    },

    onQuickAddSaved: function () {
      refreshPage(this, desktopKey, options);
    }
  };
}

module.exports = createHomePage;
