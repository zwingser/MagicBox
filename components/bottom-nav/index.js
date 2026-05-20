Component({
  properties: {
    active: {
      type: String,
      value: 'home1'
    },
    home1Label: {
      type: String,
      value: 'Home 1'
    },
    home2Label: {
      type: String,
      value: 'Home 2'
    },
    inline: {
      type: Boolean,
      value: false
    }
  },

  data: {
    shellClass: '',
    home1Class: '',
    home2Class: '',
    fixedPageClass: '',
    settingsClass: ''
  },

  observers: {
    active: function () {
      this.syncState();
    },
    inline: function () {
      this.syncState();
    }
  },

  lifetimes: {
    attached: function () {
      this.syncState();
    }
  },

  methods: {
    syncState: function () {
      this.setData({
        shellClass: this.data.inline ? 'dock-shell--inline' : '',
        home1Class: this.data.active === 'home1' ? 'dock__item--active' : '',
        home2Class: this.data.active === 'home2' ? 'dock__item--active' : '',
        fixedPageClass: this.data.active === 'fixed-page' ? 'dock__item--active' : '',
        settingsClass: this.data.active === 'settings' ? 'dock__item--active' : ''
      });
    },

    goHome1: function () {
      wx.switchTab({ url: '/pages/home1/index' });
    },

    goHome2: function () {
      wx.switchTab({ url: '/pages/home2/index' });
    },

    goAdd: function () {
      wx.switchTab({ url: '/pages/add/index' });
    },

    goFixedPage: function () {
      wx.switchTab({ url: '/pages/fixed-page/index' });
    },

    goSettings: function () {
      wx.switchTab({ url: '/pages/settings/index' });
    }
  }
});
