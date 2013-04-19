/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

(function() {
  var ns = MOA.ns("AN.Notification");
  var Cu = Components.utils;

  /**
   * One tab can only attach one notification at the same time.
   * One notification can be attached to sevral tabs.
   * tabNotiQueue = {
   *   tab1_id: reminder1_id,
   *  tab2_id: reminder1_id
   *   ...
   * };
   *
   * Same notification should be removed simultaneously.
   *
   * notiTabQueue = {
   *   reminder1_id: [tab1_id, tab2_id]
   *  ...
   * }
   */
  var tabNotiQueue = {};
  var notiTabQueue = {};

  function _removeNotiFromQueue(rid) {
    if (!rid || !notiTabQueue[rid])
      return;

    var tabids = notiTabQueue[rid];
    for (var i = 0, len = tabids.length; i < len; i++) {
      delete tabNotiQueue[tabids[i]]
    }
    delete notiTabQueue[rid];
  }

  function _removeNotification(rid) {
    if (!rid || !notiTabQueue[rid])
      return;

    _removeNotiFromQueue(rid);
    // Already been shown, so do not show it again.
    // Remove the reminder from RuleCenter
    MOA.AN.RuleCenter.removeReminder(rid);
  }

  var showingNotifications = {};
  function _closeInstallNoti(tabId) {
    var notification = tabNotiQueue[tabId];
    if (!notification)
      return;

    var rid = notification.reminder_id;
    _removeNotification(rid);
    delete showingNotifications[rid];
  };

  var installAddon = function(tabId) {
    MOA.debug("Install right now: " + this);

    var notification = tabNotiQueue[tabId];
    if (!!notification) {
      var reminder = MOA.AN.RuleCenter.getReminderById(notification.reminder_id);
      if (!!reminder) {
        if (reminder.type == "addon") {
          Cu["import"]("resource://gre/modules/AddonManager.jsm")
          AddonManager.getInstallForURL([reminder.xpi_url, "?src=external-cmnotification"].join(""), function(addonInstall) {
            var webInstallListener = Cc["@mozilla.org/addons/web-install-listener;1"]
                          .getService(Ci.amIWebInstallListener);
            AddonManager.addInstallListener(webInstallListener);
            var browser = MOA.AN.Lib.getBrowserForTabId(tabId);
            //AddonManager.installAddonsFromWebpage("application/x-xpinstall", browser.contentWindow, browser.currentURI, [addonInstall])
            AddonManager.installAddonsFromWebpage("application/x-xpinstall",
              browser.contentWindow,
              Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService).newURI(reminder.xpi_url, null, null),
              [addonInstall])
          }, "application/x-xpinstall", null, reminder.addon_name);
        } else if (reminder.type == "lm") {
          var jsm = {};
          Cu.import("resource://livemargins/appcenter.jsm", jsm);
          jsm.AppCenter.installAndOpenApp(reminder.app_uid);
        } else if (reminder.type == "text") {
          gBrowser.selectedTab = gBrowser.addTab(reminder.learnmore_url);
        }
        _closeInstallNoti(tabId);
        MOA.AN.RuleCenter.clickOnInstall(notification.reminder_id);
        return;
      }
      MOA.AN.RuleCenter.clickOnInstall(notification.reminder_id);
    } else {
      _closeInstallNoti(tabId);
    }
  };

  function reminderMeLater(tabId) {
    var notification = tabNotiQueue[tabId];
    if (!!notification) {
      MOA.AN.RuleCenter.clickOnLater(notification.reminder_id);
    }
    _closeInstallNoti(tabId);
  };

  function noMoreReminder(tabId) {
    var notification = tabNotiQueue[tabId];
    if (!!notification) {
      MOA.AN.RuleCenter.clickOnNoMore(notification.reminder_id);
    }
    _closeInstallNoti(tabId);
  };

  function closeIconClicked(tabId) {
    var notification = tabNotiQueue[tabId];
    if (!!notification) {
      MOA.AN.RuleCenter.clickOnCloseIcon(notification.reminder_id);
    }
  }

  /**
   * Add notification, called by RuleCenter.
   */
  ns.addNotification = function(rid, info) {
    if (!!tabNotiQueue[info.tabId])
      return;

    tabNotiQueue[info.tabId] = {
      reminder_id: rid,
      info: info
    };

    if (!notiTabQueue[rid])
      notiTabQueue[rid] = [];
    notiTabQueue[rid].push(info.tabId);
  };

  function _track_addon_noti(action, tabId) {
    var notification = tabNotiQueue[tabId];
    if (!notification)
      return;

    var reminder = MOA.AN.RuleCenter.getReminderById(notification.reminder_id);
    if (!reminder)
      return;

    MOA.AN.Tracker.track({
      type: reminder.type,
      rid: notification.reminder_id,
      action: action ? action : "show"
    });
  };

  function _show_popup_notification(tabId, reminder) {
    var _notification = null;
    var _notify_countdown = new MOA.AN.Lib.CountDown({
      onFinish: function() {
        //PopupNotifications.remove(_notification)
        MOA.AN.Lib.get("notification-popup").hidePopup()
      }
    });

    var mainAction = {
      label: MOA.AN.Lib.getString(reminder.type + ".InstallNow"),
      accessKey: "O",
      callback: function() {
        _track_addon_noti("install", tabId);
        setTimeout(installAddon, 25, tabId);
      }
    };

    var popupOption = {
      timeout: Date.now() + 15000,
      eventCallback: function(state) {
        MOA.debug("popup state is "+state)
        switch (state) {
          case "dismissed":
            _notify_countdown.reset();
            break;
          case "removed":
            setTimeout(reminderMeLater, 50, tabId);
            _notify_countdown.destroy();
            break;
          case "shown":
            _notify_countdown.start();
            break;
        }
      },

      countdown: _notify_countdown,
      title: reminder.title || MOA.AN.Lib.getString(reminder.type + ".title"),

      closeicon: function() {
        _track_addon_noti("closeicon", tabId);
        closeIconClicked(tabId);
      },

      links: {
        learnmore: {
          text: MOA.AN.Lib.getString(reminder.type + ".LearnMore"),
          href: reminder.url,
          tooltip: MOA.AN.Lib.getString(reminder.type + ".tooltip.LearnMore", [reminder.addon_name || reminder.app_name || reminder.title]),
          callback: function(evt) {
            _track_addon_noti("learnmore", tabId);
            gBrowser.selectedTab = gBrowser.addTab(reminder.url);
            evt.preventDefault()
          }
        },

        neverremind: {
          text: MOA.AN.Lib.getString(reminder.type + ".NeverRemind"),
          tooltip: MOA.AN.Lib.getString(reminder.type + ".tooltip.NeverRemind", [reminder.addon_name || reminder.app_name || reminder.title]),
          callback: function() {
            _track_addon_noti("nomore", tabId);
            noMoreReminder(tabId);
            PopupNotifications.remove(_notification)
          }
        },
      }
    }

    var message = [MOA.AN.Lib.getString(reminder.type + ".FCERec2U", [reminder.addon_name || reminder.app_name || reminder.title]),
                   reminder.desc].join(" ")
    _notification = PopupNotifications.show(MOA.AN.Lib.getBrowserForTabId(tabId),
      "addon-notification-" + reminder.type,
      message,
      reminder.type + "s-notification-icon",
      mainAction,
      null,
      popupOption);
    _track_addon_noti("show", tabId);
  }

  /**
   * Show installation notification triggered by window url.
   */
  function _show_install_notification(tabId) {
    var notification = tabNotiQueue[tabId];
    var reminder = MOA.AN.RuleCenter.getReminderById(notification.reminder_id);

    if (showingNotifications[notification.reminder_id])
      return;
    else
      showingNotifications[notification.reminder_id] = 1;

    var curBrowser = MOA.AN.Lib.getBrowserForTabId(tabId);
    if (reminder.type == "plugin_pfs") {
      var plugin = curBrowser.contentDocument.createElement("object");
      plugin.type = reminder.mime_type;
      gPluginHandler.pluginUnavailable(plugin, "PluginNotFound");
      return;
    }
    _system_popup_countdown = new MOA.AN.Lib.CountDown({
      onCounting: function() {
        if (!PopupNotifications.isPanelOpen) {
          _system_popup_countdown.option.onFinish()
        } else {
          var _current_notification = PopupNotifications.getNotification("password-save", curBrowser) ||
                        PopupNotifications.getNotification("password-change", curBrowser) ||
                        PopupNotifications.getNotification("indexedDB-permissions-prompt", curBrowser) ||
                        PopupNotifications.getNotification("indexedDB-quota-prompt", curBrowser) ||
                        PopupNotifications.getNotification("indexedDB-quota-cancel", curBrowser) ||
                        PopupNotifications.getNotification("geolocation", curBrowser);
          if (!_current_notification) {
            _system_popup_countdown.option.onFinish()
          }
        }
      },

      onFinish: function() {
        MOA.AN.Lib.get("notification-popup").hidePopup()
        _show_popup_notification(tabId, reminder);
        _system_popup_countdown.destroy()
      }
    });
    _system_popup_countdown.start()
  };

  /**
   * Show notification related with current tabBrowser.
   * Called by WebProgressListener.
   */
  ns.showNotification = function(webProgress) {
    // Get current tab browser ID.
    var win = webProgress.DOMWindow;
    var tabId = MOA.AN.Lib.getTabIdForWindow(win);
    if (!tabNotiQueue[tabId])
      return;

    var notification = tabNotiQueue[tabId];
    var reminder = MOA.AN.RuleCenter.getReminderById(notification.reminder_id);

    if (["addon", "lm", "plugin_pfs", "text"].indexOf(reminder.type) > -1) {
      _show_install_notification(tabId);
    }
    MOA.AN.RuleCenter.notificationShown()
  };

  ns.onTabClose = function(tabId) {
    var notification = tabNotiQueue[tabId];
    if (!notification)
      return;

    _removeNotiFromQueue(notification.reminder_id);
  };

  ns.clearAll = function() {
    tabNotiQueue = {};
    notiTabQueue = {};
    showingBalloonId = null;
    showingNotifications = {};
  };

  /******One tip one day*******/
  var _daytipreminders = null;
  var _current_day_tip_reminder = null;
  var _hide_daytip_countdown = new MOA.AN.Lib.CountDown({
    onFinish: function() {
      _track_daytip("auto_hide");
      _closeDayTip();
    },
  });

  function _closeDayTip() {
    MOA.AN.Lib.get("addon-notification-popup").hidePopup();
    try {
      _hide_daytip_countdown.destroy();
    } catch(e) {}
  };

  function _track_daytip(action) {
    MOA.AN.Tracker.track({
      type: "daytip",
      rid: MOA.AN.RuleCenter.getRID(_current_day_tip_reminder),
      action: action ? action : "show"
    });
  };

  function _show_day_tips(reminder) {
    var reminder_id = MOA.AN.RuleCenter.getRID(reminder);

    var target = MOA.AN.Lib.get(reminder.btn_id);
    if (!target)
      return;

    var panel = MOA.AN.Lib.get("addon-notification-popup");
    while (panel.lastChild)
      panel.removeChild(panel.lastChild);

    const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

    let doc = window.document;
    let popupnotification = doc.createElementNS(XUL_NS, "popupnotification");
    [title, desc] = reminder.desc.split(/<br\s?\/>/g);
    popupnotification.setAttribute("label", desc);
    popupnotification.setAttribute("id", "addon-notification-daytip");
    popupnotification.setAttribute("popupid", "addon-notification-daytip");
    popupnotification.setAttribute("closebuttoncommand", "MOA.AN.Notification.onClickDayTipCloseIcon()");
    var options = {
      countdown: _hide_daytip_countdown,
      title: title,
      links: {
        close: {
          text: MOA.AN.Lib.getString("daytip.CloseDaytip"),
          tooltip: MOA.AN.Lib.getString("daytip.tooltip.CloseDaytip"),
          callback: function() {
            MOA.AN.Notification.onClickDayTipClose()
          }
        },

        turnoff: {
          text: MOA.AN.Lib.getString("daytip.TurnOff"),
          tooltip: MOA.AN.Lib.getString("daytip.tooltip.TurnOff"),
          callback: function() {
            MOA.AN.Notification.onClickDayTipTurnOff()
          }
        }
      }
    }
    if (reminder.url) {
      options.links["learnmore"] = {
        text: MOA.AN.Lib.getString("daytip.ViewVideo"),
        href: reminder.url,
        callback: function(evt) {
          gBrowser.selectedTab = gBrowser.addTab(reminder.url);
          MOA.AN.Notification.onClickLearnMore();
          evt.preventDefault()
        }
      }
    }
    if (_daytipreminders.length) {
      options.links["nexttip"] = {
        text: MOA.AN.Lib.getString("daytip.NextDaytip"),
        callback: function() {
          MOA.AN.Notification.onClickNextDayTip()
        }
      }
    }
    popupnotification.notification = {
      options: options
    };
    panel.appendChild(popupnotification);
    panel.hidden = false;
    panel.openPopup(target, "bottomcenter topleft");
  }

  ns.showDayTip = function(force) {
    var last_show_time = MOA.AN.Lib.getFilePref("day_tip_show_time", null);

    if (!force) {
      if (!MOA.AN.Lib.getPrefs().getBoolPref("showDaytip")) {
        MOA.debug("Day tip has been turned off!");
        return;
      } else if (last_show_time) {
        var now = Date.now();
        if (MOA.AN.Lib.roundToDay(last_show_time) >= MOA.AN.Lib.roundToDay(now)) {
          MOA.debug("Tip has been show today.");
          return;
        }
      }

      MOA.AN.Lib.setFilePref("day_tip_show_time", Date.now());
    }

    _daytipreminders = MOA.AN.RuleCenter.getDayTipReminders(force);
    this.nextDayTip();
  };

  ns.nextDayTip = function() {
    if (_daytipreminders.length == 0) {
      MOA.debug("Reminders is empty.");
      return;
    }

    MOA.AN.Lib.get("addon-notification-popup").hidePopup();
    // set a interval to show next tip
    // make that popup's position will be refreshed.
    window.setTimeout(function() {
      _current_day_tip_reminder = _daytipreminders.shift();
      MOA.AN.RuleCenter.clickOnNoMore(MOA.AN.RuleCenter.getRID(_current_day_tip_reminder));
      _show_day_tips(_current_day_tip_reminder);
      try {
        _hide_daytip_countdown.start();
        _track_daytip();
      } catch(e) {}
    }, 1);
  };

  ns.onClickLearnMore = function() {
    _track_daytip("learnmore");
    _closeDayTip();
  }

  ns.onClickNextDayTip = function() {
    _track_daytip("next");
    this.nextDayTip();
  };

  ns.onClickDayTipCloseIcon = function() {
    _track_daytip("closeicon");
    _closeDayTip();
  };

  ns.onClickDayTipClose = function() {
    _track_daytip("close");
    _closeDayTip();
  };

  ns.onClickDayTipTurnOff = function() {
    _track_daytip("turnoff");
    MOA.AN.Lib.getPrefs().setBoolPref("showDaytip", false);
    _closeDayTip();
  };
})();
