var stateStore = require('./state');

var PAGE_ROUTE_MAP = {
  home1: { key: 'home1', url: '/pages/home1/index' },
  home2: { key: 'home2', url: '/pages/home2/index' },
  'fixed-page': { key: 'fixed-page', url: '/pages/fixed-page/index' },
  settings: { key: 'settings', url: '/pages/settings/index' }
};

var SWIPE_MIN_DISTANCE = 84;
var SWIPE_MAX_VERTICAL_OFFSET = 96;
var SWIPE_MAX_DURATION = 1800;

function getOrderedRoutes() {
  var order = stateStore.getPageOrder();
  var routes = [];
  var seen = {};
  var i;
  var key;

  for (i = 0; i < order.length; i += 1) {
    key = order[i];
    if (PAGE_ROUTE_MAP[key]) {
      routes.push(PAGE_ROUTE_MAP[key]);
      seen[key] = true;
    }
  }

  if (!seen.settings) {
    routes.push(PAGE_ROUTE_MAP.settings);
  }

  return routes;
}

function getPageIndex(pageKey) {
  var routes = getOrderedRoutes();
  var i;

  for (i = 0; i < routes.length; i += 1) {
    if (routes[i].key === pageKey) {
      return i;
    }
  }

  return -1;
}

function getRouteByKey(pageKey) {
  var routes = getOrderedRoutes();
  var i;

  for (i = 0; i < routes.length; i += 1) {
    if (routes[i].key === pageKey) {
      return routes[i];
    }
  }

  return PAGE_ROUTE_MAP[pageKey] || null;
}

function getAdjacentRoute(pageKey, direction) {
  var routes = getOrderedRoutes();
  var index = getPageIndex(pageKey);

  if (index < 0) {
    return null;
  }

  if (direction === 'left') {
    index += 1;
  } else if (direction === 'right') {
    index -= 1;
  } else {
    return null;
  }

  if (index < 0 || index >= routes.length) {
    return null;
  }

  return routes[index];
}

function navigateToRoute(route) {
  if (!route) {
    return false;
  }

  wx.switchTab({
    url: route.url
  });

  return true;
}

function navigateByDirection(page, pageKey, direction) {
  var route = getAdjacentRoute(pageKey, direction);
  var handled = false;

  if (!route) {
    return false;
  }

  if (page && typeof page.onSwipeRoute === 'function') {
    handled = page.onSwipeRoute(route, direction);
    if (handled) {
      return true;
    }
  }

  return navigateToRoute(route);
}

function getTouch(event) {
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

function captureTouchStart(page, event) {
  var touch = getTouch(event);

  if (!touch) {
    return;
  }

  page.__swipeTouch = {
    x: touch.clientX,
    y: touch.clientY,
    time: Date.now()
  };
}

function handleTouchEnd(page, pageKey, event) {
  var start = page.__swipeTouch;
  var touch = getTouch(event);
  var deltaX;
  var deltaY;
  var duration;
  var direction;

  page.__swipeTouch = null;

  if (!start || !touch) {
    return false;
  }

  deltaX = touch.clientX - start.x;
  deltaY = touch.clientY - start.y;
  duration = Date.now() - start.time;

  if (duration > SWIPE_MAX_DURATION) {
    return false;
  }

  if (Math.abs(deltaX) < SWIPE_MIN_DISTANCE) {
    return false;
  }

  if (Math.abs(deltaY) > SWIPE_MAX_VERTICAL_OFFSET) {
    return false;
  }

  if (Math.abs(deltaX) < Math.abs(deltaY) * 1.15) {
    return false;
  }

  direction = deltaX < 0 ? 'left' : 'right';
  return navigateByDirection(page, pageKey, direction);
}

module.exports = {
  getRouteByKey: getRouteByKey,
  getAdjacentRoute: getAdjacentRoute,
  getOrderedRoutes: getOrderedRoutes,
  navigateByDirection: navigateByDirection,
  captureTouchStart: captureTouchStart,
  handleTouchEnd: handleTouchEnd
};
