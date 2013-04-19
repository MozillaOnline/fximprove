/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

(function() {
  try {
    var twimprove_id = "twimprove@mozillaonline.com";
    var extstr = Services.prefs.getCharPref("extensions.enabledAddons");
    if(extstr.indexOf(encodeURIComponent(twimprove_id)) != -1){
      Components.utils.import("resource://gre/modules/AddonManager.jsm");
      AddonManager.getAddonByID(twimprove_id, function(addon) {
        if (!addon)
          return;
        addon.uninstall();
      });
    }
  } catch (e) {}

  var UIC = {
    handleEvent: function UIC__handleEvent(aEvent) {
      switch (aEvent.type) {
        case "load":
          setTimeout(this.init.bind(this), 500);
          break;
      }
    },

    init: function UIC__init() {
      this.installButton("downloads-button");
    },

    installButton: function UIC__installButton(buttonId,toolbarId) {
      toolbarId = toolbarId || "addon-bar";
      var key = "extensions.toolbarbutton.installed."+buttonId;
      if (Application.prefs.getValue(key, false))
        return;

      var toolbar = window.document.getElementById(toolbarId);
      let curSet = toolbar.currentSet;
      if (-1 == curSet.indexOf(buttonId)) {
        let newSet = curSet + "," + buttonId;
        toolbar.currentSet = newSet;
        toolbar.setAttribute("currentset", newSet);
        document.persist(toolbar.id, "currentset");
        try {
          BrowserToolboxCustomizeDone(true);
        } catch(e) {}
      }
      if (toolbar.getAttribute("collapsed") == "true") {
        toolbar.setAttribute("collapsed", "false");
      }
      document.persist(toolbar.id, "collapsed");
      Application.prefs.setValue(key, true);
    },
  }
  window.addEventListener("load", UIC, false);
})();

