var format = require('./format');

function normalizeUrl(rawUrl) {
  var value = format.trimText(rawUrl);
  if (!value) {
    return '';
  }

  if (!/^[a-zA-Z]+:\/\//.test(value) && value.indexOf('intent://') !== 0 && value.indexOf('market://') !== 0 && value.indexOf('app://') !== 0) {
    if (value.indexOf('.') >= 0) {
      value = 'https://' + value;
    }
  }

  return value;
}

function parseMiniProgramMeta(url) {
  var result = { appId: '', path: '' };
  var appMatch = /appid=([^&]+)/.exec(url);
  var pathMatch = /path=([^&]+)/.exec(url);

  if (appMatch && appMatch[1]) {
    result.appId = decodeURIComponent(appMatch[1]);
  }

  if (pathMatch && pathMatch[1]) {
    result.path = decodeURIComponent(pathMatch[1]);
  }

  return result;
}

function detectLinkType(rawUrl, explicitType) {
  var value = normalizeUrl(rawUrl);
  var chosen = explicitType || '';
  var meta = { type: 'web', url: value, appId: '', path: '' };

  if (chosen === 'web' || chosen === 'app' || chosen === 'miniProgram') {
    meta.type = chosen;
  } else if (/appid=/.test(value) || /^miniprogram:\/\//i.test(value) || /^wxapplet:\/\//i.test(value)) {
    meta.type = 'miniProgram';
  } else if (/^weixin:\/\//i.test(value) && /appid=/.test(value)) {
    meta.type = 'miniProgram';
  } else if (/^https?:\/\//i.test(value)) {
    meta.type = 'web';
  } else if (/^intent:\/\//i.test(value) || /^[a-zA-Z]+:\/\//.test(value)) {
    meta.type = 'app';
  }

  if (meta.type === 'miniProgram') {
    var parsed = parseMiniProgramMeta(value);
    meta.appId = parsed.appId;
    meta.path = parsed.path;
  }

  return meta;
}

function isAppRuntime() {
  return typeof wx !== 'undefined' && !!wx.miniapp;
}

function getRuntimePlatform() {
  var info = null;
  var platform = '';

  if (typeof wx === 'undefined' || typeof wx.getSystemInfoSync !== 'function') {
    return '';
  }

  try {
    info = wx.getSystemInfoSync();
    platform = info && info.platform ? String(info.platform).toLowerCase() : '';
  } catch (error) {
    platform = '';
  }

  return platform;
}

function isAndroidAppRuntime() {
  return isAppRuntime() && getRuntimePlatform() === 'android';
}

function copyText(text, successText) {
  wx.setClipboardData({
    data: String(text || ''),
    success: function () {
      wx.showToast({
        title: successText || 'Copied',
        icon: 'none'
      });
    }
  });
}

function getCandidateApis() {
  var apis = [];

  if (typeof wx === 'undefined') {
    return apis;
  }

  if (wx.miniapp) {
    if (typeof wx.miniapp.openUrl === 'function') {
      apis.push(wx.miniapp.openUrl);
    }
    if (typeof wx.miniapp.openURL === 'function') {
      apis.push(wx.miniapp.openURL);
    }
  }

  if (typeof wx.openUrl === 'function') {
    apis.push(wx.openUrl);
  }
  if (typeof wx.openURL === 'function') {
    apis.push(wx.openURL);
  }

  return apis;
}

function tryCallApi(api, url, onFail) {
  try {
    var result = api({
      url: url,
      fail: function () {
        if (typeof onFail === 'function') {
          onFail();
        }
      }
    });
    return result !== false;
  } catch (errorOne) {
    try {
      var fallbackResult = api(url);
      return fallbackResult !== false;
    } catch (errorTwo) {
      return false;
    }
  }
}

function tryOpenNativeUrl(url, onFail) {
  var apis = getCandidateApis();
  var i;

  for (i = 0; i < apis.length; i += 1) {
    if (tryCallApi(apis[i], url, onFail)) {
      return true;
    }
  }

  return false;
}

function openInBrowserPage(title, url) {
  wx.navigateTo({
    url: '/pages/browser/index?title=' + encodeURIComponent(title || '') + '&url=' + encodeURIComponent(url || '')
  });
}

function openMiniProgram(node) {
  var payload = {
    appId: node.appId || '',
    path: node.path || ''
  };

  if (typeof wx.navigateToMiniProgram === 'function' && payload.appId) {
    wx.navigateToMiniProgram(payload);
    return true;
  }

  if (wx.miniapp && typeof wx.miniapp.launchMiniProgram === 'function' && payload.appId) {
    wx.miniapp.launchMiniProgram(payload);
    return true;
  }

  copyText(node.url || (payload.appId + ' ' + payload.path), 'Mini program info copied');
  wx.showModal({
    title: 'Mini Program limited',
    content: 'This runtime cannot launch the target mini program directly. The appId or link has been copied for manual handoff.',
    showCancel: false
  });
  return false;
}

function showAppUnavailable() {
  wx.showToast({
    title: 'APP未安装，无法打开',
    icon: 'none'
  });
}

function openAppDeepLink(node) {
  if (tryOpenNativeUrl(node.url, showAppUnavailable)) {
    return true;
  }

  showAppUnavailable();
  return false;
}

function openNode(node) {
  if (!node) {
    return false;
  }

  if (node.kind === 'folder') {
    wx.navigateTo({
      url: '/pages/folder/index?id=' + encodeURIComponent(node.id)
    });
    return true;
  }

  if (node.type === 'miniProgram') {
    return openMiniProgram(node);
  }

  if (node.type === 'app') {
    return openAppDeepLink(node);
  }

  openInBrowserPage(node.title, node.url);
  return true;
}

module.exports = {
  normalizeUrl: normalizeUrl,
  parseMiniProgramMeta: parseMiniProgramMeta,
  detectLinkType: detectLinkType,
  isAppRuntime: isAppRuntime,
  getRuntimePlatform: getRuntimePlatform,
  isAndroidAppRuntime: isAndroidAppRuntime,
  copyText: copyText,
  tryOpenNativeUrl: tryOpenNativeUrl,
  openNode: openNode
};
