/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

(function() {
  var ns = MOA.ns("AN.RuleCenter");

  var _daytips = [];
  var _reminders = {};
  var _reminders_lm = {};
  var _reminders_plugin_pfs = {};
  var _reminders_text = {};
  var _rules = {};
  var _regexps = {};        // for rules which have trigger type: window

  var _daytips_avail = [];
  var _reminders_avail = {};
  var _rules_avail = [];
  var _hit_times = {};
  var _max_daily_addon = 0;

  var _getRuleById = function(id) {
    return _rules[id];
  };

  ns.getRulesAvailCount = function() {
    return _rules_avail.length
  }

  ns.getRuleAvailByIndex = function(index) {
    return _rules_avail[index]
  }

  ns.getReminderById = function(rid) {
    return _reminders[rid];
  };

  ns.getReminderAvailById = function(rid) {
    return _reminders_avail[rid];
  };

  // remove reminder and rules/regexp related.
  ns.removeReminder = function(rid) {
    var reminder = this.getReminderById(rid);
    if (!reminder)
      return;

    for (var i = 0, len = reminder.rule_ids.length; i < len; i++) {
      var rule_id = reminder.rule_ids[i];
      var rule = _rules[rule_id];

      if (rule) {
        switch (rule.trigger) {
          case "window":
            var domain_regexps = _regexps[_rules[rule_id].domain];
            if (!!domain_regexps) {
              delete domain_regexps[rule_id];

              // if rules under domain is empty, delete domain
              var has_more = false;
              for (var tmp in domain_regexps) {
                has_more = true;
                break;
              }
              if (!has_more)
                delete _regexps[_rules[rule_id].domain];
            }
            break;
        }

        delete _rules[rule_id];
      }
    }
    delete _reminders[rid];
  };

  ns.getRID = function(reminder) {
    switch (reminder.type) {
      case "addon":
        return reminder.addon_id;
      case "lm":
        return reminder.app_uid;
      case "plugin_pfs":
        return reminder.mime_type + "__" + reminder.type;
      case "text":
        return reminder.short_name;
      case "tip":
        return reminder.addon_id + "__" + reminder.btn_id;
    }
  };

  ns.hitReminder = function(rid) {
    var reminder = this.getReminderById(rid);

    _hit_times[rid] = _hit_times[rid] + 1;
    MOA.AN.Lib.setFilePref(rid + "__hits", _hit_times[rid]);
    return _hit_times[rid] >= (reminder.times ? reminder.times : 1);
  };

  ns.checkAndShow = function(httpChannel, info) {
    if (!MOA.AN.Lib.getPrefs().getBoolPref("showAddon")) {
      return
    }
    if (!info.isWindowURI)
      return;

    var baseDomain = null;
    for (var addition = 0; ; addition++) {
      try {
        baseDomain = MOA.AN.Lib.getBaseDomain(httpChannel.URI, addition)
      } catch(err) {
        MOA.debug(err);
        break
      }
      var rule_related = _regexps[baseDomain];
      for (var rule_id in rule_related) {
        var rule = _getRuleById(rule_id);
        if (new RegExp(rule.regexp, "i").test(httpChannel.URI.spec)) {
          if (this.hitReminder(rule.reminder_id)) {
            MOA.debug("Rule valid: " + this.getReminderById(rule.reminder_id).desc);
            MOA.AN.Notification.addNotification(rule.reminder_id, info);
          }
        }
      }
    }
  };

  ns.clickOnInstall = function(reminder_id) {
    MOA.AN.Lib.setFilePref(reminder_id + "__nomore", Date.now());
  };

  ns.clickOnNoMore = function(reminder_id) {
    MOA.AN.Lib.setFilePref(reminder_id + "__nomore", Date.now());
  };

  ns.clickOnLater = function(reminder_id) {
    MOA.AN.Lib.setFilePref(reminder_id + "__later", Date.now());
  };

  ns.clickOnCloseIcon = function(reminder_id) {
    var close_count = MOA.AN.Lib.getFilePref(reminder_id + "__closecount", 0);
    MOA.AN.Lib.setFilePref(reminder_id + "__closecount", close_count + 1);
  };

  ns.notificationShown = function() {
    MOA.AN.Lib.setFilePref("addon_show_time", Date.now());
    var dailyAddonCount = MOA.AN.Lib.getFilePref("addon_daily_count", 0) + 1;
    MOA.AN.Lib.setFilePref("addon_daily_count", dailyAddonCount);
    if (dailyAddonCount >= _max_daily_addon) {
      _regexps = {};
      _rules = {};
    }
  }

  ns.reload = function(isReset) {
    if (isReset) {
      MOA.AN.Lib.clearFilePrefs()
    }
    MOA.AN.Notification.clearAll();
    _daytips = [];
    _reminders = {};
    _reminders_lm = {};
    _reminders_plugin_pfs = {};
    _reminders_text = {};
    _regexps = {};
    _rules = {};
    _daytips_avail = [];
    _reminders_avail = {};
    _rules_avail = [];
    _hit_times = {};
    _max_daily_addon = 0;
    init();
  };

  ns.getDayTipReminders = function(force) {
    return (force ? _daytips_avail : _daytips).filter(function(reminder) {
          var btn = MOA.AN.Lib.get(reminder.btn_id);
          return btn && btn.hidden == false && btn.clientWidth > 0
        })
  };

  ns.getDayTipAvailReminders = function() {
    return _daytips_avail
  }

  /**
   * Read rules from rules.json.
   * If it is null, use default_rules and save it to pref.
   */
  function _getAvailableRules() {
    var reminder_rules = null;

    var version = null;
    try {
      version = MOA.AN.Lib.getPrefs().getCharPref("default_rules_version", "0");
    } catch (err) {}

    if (version != MOA.AN.DefaultRules.VERSION) {
      MOA.debug("Default rules\' version has been updated, empty rules.json")
      MOA.AN.Lib.setStrToProFile(MOA.AN.Lib.getProFilePath("rules.json"), "");
      MOA.AN.Lib.getPrefs().setCharPref("default_rules_version", MOA.AN.DefaultRules.VERSION);
    } else {
      try {
        reminder_rules = JSON.parse(MOA.AN.Lib.readStrFromProFile(MOA.AN.Lib.getProFilePath("rules.json")));
      } catch (err) { }
    }

    if (!reminder_rules) {
      reminder_rules = MOA.AN.DefaultRules.getDefaultRules();
    }
    return reminder_rules;
  }

  function init() {
    var defaultRules = _getAvailableRules();
    defaultRules = MOA.AN.Lib.extend(defaultRules, {
      consts: {
        max_daily_addon: 1,
        later_wait_days: 3,
        close_multiple: 5,
        max_close_count: 5
      }
    })
    var prefs = MOA.AN.Lib.getFilePrefs();
    var now = Date.now();

    var last_addon_show = MOA.AN.Lib.getFilePref("addon_show_time", null);
    if (last_addon_show) {
      if (MOA.AN.Lib.roundToDay(now) - MOA.AN.Lib.roundToDay(last_addon_show)) {
        MOA.AN.Lib.setFilePref("addon_daily_count", 0)
      }
    }
    var alt_max_daily_addon = MOA.AN.Lib.getPrefs().getIntPref("maxDailyAddon");
    _max_daily_addon = alt_max_daily_addon || defaultRules.consts.max_daily_addon;
    var max_daily_addon = _max_daily_addon - MOA.AN.Lib.getFilePref("addon_daily_count", 0);
    var laterWaitDays = defaultRules.consts.later_wait_days;
    var closeMultiple = defaultRules.consts.close_multiple;
    var maxCloseCount = defaultRules.consts.max_close_count;

    for (var i = 0, len = defaultRules.reminders.length; i < len; i++) {
      var reminder = defaultRules.reminders[i];
      var reminder_id = MOA.AN.RuleCenter.getRID(reminder);

      if (reminder.type == "tip") {
        _daytips_avail.push(reminder);
        if (!!MOA.AN.Lib.getFilePref(reminder_id + "__nomore", false))
          continue;

        _daytips.push(reminder)
      } else if (["addon", "lm", "plugin_pfs", "text"].indexOf(reminder.type) > -1) {
        _reminders_avail[reminder_id] = reminder;

        if (max_daily_addon <= 0) {
          continue
        }
        var close_count = MOA.AN.Lib.getFilePref(reminder_id + "__closecount", 0);
        if (!!prefs[reminder_id + "__nomore"]/* || close_count > maxCloseCount*/)
          continue;

        if (!!prefs[reminder_id + "__later"] && now - prefs[reminder_id + "__later"] < laterWaitDays * (close_count ? closeMultiple : 1)/*Math.pow(2, close_count)*/ * 86400000)
          continue;

        if (reminder.type == "addon") {
          _reminders[reminder_id] = reminder;
        } else if (reminder.type == "lm") {
          _reminders_lm[reminder_id] = reminder;
        } else if (reminder.type == "plugin_pfs") {
          _reminders_plugin_pfs[reminder_id] = reminder;
        } else if (reminder.type == "text") {
          _reminders_text[reminder_id] = reminder;
        }
        _hit_times[reminder_id] = MOA.AN.Lib.getFilePref(reminder_id + "__hits", 0);
        reminder.rule_ids = [];      // rules' id which uses the reminder
      }
    }

    if (MOA.LM4) {
      var apps = Object.keys(_reminders_lm).filter(function(reminder_id) {
        var jsm = {};
        Cu.import("resource://livemargins/dao.jsm", jsm);
        var reminder = _reminders_lm[reminder_id];
        return jsm.AppCenterDAO.appExists(reminder.app_uid) && !!jsm.AppCenterDAO.query("SELECT visits FROM apps WHERE uid=:uid;", {uid: reminder.app_uid})[0].visits;
      });
      for (var i in apps) {
        delete _reminders_lm[apps[i]]
      }
    } else {
      _reminders_lm = {};
    }

    var plugins = Object.keys(_reminders_plugin_pfs).filter(function(mime_type) {
      mime_type = mime_type.split("__")[0];
      return !!navigator.mimeTypes[mime_type];
    });
    for (var i in plugins) {
      delete _reminders_plugin_pfs[plugins[i]]
    }

    MOA.AN.Lib.filterInstalledAddons(Object.keys(_reminders), function(addons) {
      for (var i in addons) {
        delete _reminders[addons[i]]
      }
      _reminders = MOA.AN.Lib.extend(_reminders, _reminders_lm);
      _reminders = MOA.AN.Lib.extend(_reminders, _reminders_plugin_pfs);
      _reminders = MOA.AN.Lib.extend(_reminders, _reminders_text);
      var OS = Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsIXULRuntime).OS;
      for (var i in _reminders) {
        var reminder = _reminders[i];
        if (reminder.platform && reminder.platform != OS) {
          delete _reminders[i]
        }
      }
      var rule_id = 0;
      for (var i = 0, len = defaultRules.rules.length; i < len; i++) {
        // break composite rules into singles.
        var com_rules = defaultRules.rules[i];

        for (var j = 0, jlen = com_rules.reminder_ids.length; j < jlen; j++) {
          var rule = {
            trigger: com_rules.trigger,
            domain: com_rules.domain,
            regexp: com_rules.regexp,
            reminder_id: com_rules.reminder_ids[j]
          };
          _rules_avail.push(rule);
          var reminder = _reminders[rule.reminder_id];
          if (!reminder)
            continue;

          _rules[rule_id] = rule;

          // remember rules' id
          reminder.rule_ids.push(rule_id);

          switch (rule.trigger) {
            case "window":
              if (!_regexps[rule.domain])
                _regexps[rule.domain] = {};
              _regexps[rule.domain][rule_id] = 1;
              break;
          }

          rule_id++;
        }
      }
    });
  };

  init();

  // Read rules from server periodically.
  function _update_rules() {
    var last_update = MOA.AN.Lib.getFilePref("update_rule_from_server", 0);

    if ("" != MOA.AN.Lib.readStrFromProFile(MOA.AN.Lib.getProFilePath("rules.json"))
      && (Date.now() - last_update) < 86400000) {
      MOA.debug("Rules has been updated in 24 hour, skip.");
      return;
    }

    var _updateurl = null;
    try {
      _updateurl = MOA.AN.Lib.getPrefs().getCharPref("rules_update_url_sincefx4")
    } catch (e) {
      MOA.debug("Update url does not exists, abort.");
      return;
    }
    // If this extension is not updated, rules of the old version will be needed.
    _updateurl = _updateurl.replace("%VERSION%", MOA.AN.DefaultRules.VERSION)
                .replace("%TSTAMP%", Date.now());

    MOA.debug("Update rules from server.");
    MOA.AN.Lib.httpGet(_updateurl, function(response) {
      if (response.readyState == 4 && 200 == response.status) {
        var rules = null;
        try {
          rules = JSON.parse(response.responseText);
        } catch (err) {
          MOA.debug("Rules file\' format is wrong: " + err);
        }

        if (rules) {
          MOA.AN.Lib.setStrToProFile(MOA.AN.Lib.getProFilePath("rules.json"), response.responseText);
          MOA.AN.Lib.setFilePref("update_rule_from_server", Date.now());
          MOA.AN.RuleCenter.reload(false)
        }
      }
    });
  }

  var _interval = 1000 * 5;
  try {
    _interval = MOA.AN.Lib.getPrefs().getIntPref("update_rules_time_after_load");
    MOA.debug("update_rules_time_after_load: " + _interval);
  } catch (e) {
    MOA.debug("update_rules_time_after_load is null.");
  }

  window.setTimeout(_update_rules, _interval);
})();

