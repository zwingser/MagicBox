function trimText(value) {
  return String(value || '').replace(/^\s+|\s+$/g, '');
}

function padNumber(value) {
  value = value < 10 ? '0' + value : String(value);
  return value;
}

function getHostLabel(url) {
  var value = trimText(url);
  if (!value) {
    return '';
  }

  value = value.replace(/^[a-zA-Z]+:\/\//, '');
  value = value.replace(/^intent:\/\//, '');
  value = value.split('/')[0];
  value = value.split('?')[0];
  value = value.split('#')[0];
  value = value.replace(/^www\./, '');
  return value;
}

function getFriendlyTitle(url) {
  var host = getHostLabel(url);
  if (!host) {
    return 'Untitled Link';
  }

  host = host.split('.')[0];
  host = host.replace(/[-_]+/g, ' ');
  if (!host) {
    return 'Untitled Link';
  }

  return host.replace(/\b([a-z])/g, function (all, letter) {
    return letter.toUpperCase();
  });
}

function getBadge(title) {
  var clean = trimText(title).replace(/[^0-9a-zA-Z\u4e00-\u9fa5]+/g, ' ');
  var parts = clean.split(/\s+/);
  var badge = '';
  var i;

  for (i = 0; i < parts.length && badge.length < 2; i += 1) {
    if (parts[i]) {
      badge += parts[i].charAt(0);
    }
  }

  if (!badge) {
    badge = 'MB';
  }

  return badge.toUpperCase();
}

function getRelativeTime(timestamp) {
  if (!timestamp) {
    return 'Just now';
  }

  var now = Date.now();
  var diff = Math.max(0, now - timestamp);
  var minute = 60 * 1000;
  var hour = 60 * minute;
  var day = 24 * hour;

  if (diff < minute) {
    return 'Just now';
  }

  if (diff < hour) {
    return Math.floor(diff / minute) + ' mins ago';
  }

  if (diff < day) {
    return Math.floor(diff / hour) + ' hours ago';
  }

  if (diff < 2 * day) {
    return 'Yesterday';
  }

  return formatDate(timestamp);
}

function formatDate(timestamp) {
  var date = new Date(timestamp);
  return date.getFullYear() + '-' + padNumber(date.getMonth() + 1) + '-' + padNumber(date.getDate());
}

function getHistoryBucket(timestamp) {
  var date = new Date(timestamp);
  var target = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  var now = new Date();
  var today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  var day = 24 * 60 * 60 * 1000;

  if (target === today) {
    return 'Today';
  }

  if (target === today - day) {
    return 'Yesterday';
  }

  return formatDate(timestamp);
}

module.exports = {
  trimText: trimText,
  padNumber: padNumber,
  getHostLabel: getHostLabel,
  getFriendlyTitle: getFriendlyTitle,
  getBadge: getBadge,
  getRelativeTime: getRelativeTime,
  getHistoryBucket: getHistoryBucket,
  formatDate: formatDate
};
