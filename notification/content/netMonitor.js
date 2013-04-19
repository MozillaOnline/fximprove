/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

(function() {
  var Cc = Components.classes;
  var Ci = Components.interfaces;
  var Cu = Components.utils;

  var progListener = {
    QueryInterface: function(iid) {
      if (iid.equals(Ci.nsISupports) ||
        iid.equals(Ci.nsISupportWeakReference) ||
        iid.equals(Ci.nsIWebProgressListener)) {
        return this;
      }

      throw Cr.NS_ERROR_NO_INTERFACE;
    },

    onStateChange: function() {},

    onProgressChange: function() {},

    onStatusChange: function() {},

    onSecurityChange: function() {},

    onLocationChange: function(webProgress, request, uri) {
      var tabId = MOA.AN.Lib.getTabIdForWindow(webProgress.DOMWindow);
      MOA.AN.RuleCenter.checkAndShow({ URI: uri }, { tabId: tabId, isWindowURI: true });
      MOA.AN.Notification.showNotification(webProgress);
    },

    handleEvent: function(event) {
      MOA.AN.Notification.onTabClose(event.target.linkedPanel);
    }
  };
  function init() {
    var prefs = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch).QueryInterface(Ci.nsIPrefService);
    if (prefs.getCharPref("general.useragent.locale") != "zh-CN") {
      MOA.debug("general.useragent.locale is not zh-CN, no daily tip or addon recommendation should be displayed");
      return;
    }

    // do not use any mask which cause an "error" on Firefox5:
    // Error: gBrowser.addProgressListener was called with a second argument, which is not supported. See bug 608628.
    // Source: chrome://browser/content/tabbrowser.xml
    // Line: 1840
    gBrowser.addProgressListener(progListener/*, Ci.nsIWebProgress.NOTIFY_LOCATION*/);
    gBrowser.tabContainer.addEventListener("TabClose", progListener, false);
    // Set a interval, make sure that page is loaded and star-button is shown.
    window.setTimeout(function() {
      // MOA.AN.Notification.showFunctionTip();
      MOA.AN.Notification.showDayTip();
    }, 1000 * 15);
  }
  function uninit() {
    gBrowser.removeProgressListener(progListener);
    gBrowser.tabContainer.removeEventListener("TabClose", progListener, false);
  }

  window.addEventListener("load", function() {setTimeout(init, 500);}, false);
  window.addEventListener("unload", uninit, false);
})();

