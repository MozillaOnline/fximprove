/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

(function() {
  function $(id) {
    return document.getElementById(id);
  }

  var _bundles = Cc["@mozilla.org/intl/stringbundle;1"].
          getService(Ci.nsIStringBundleService).
          createBundle("chrome://cmimprove/locale/browser.properties");

  function getString(key) {
    return _bundles.GetStringFromName(key);
  }

  var cmImprove_CE = {
    handleEvent: function Improve_CE__handleEvent(aEvent) {
      switch (aEvent.type) {
        case "load":
          setTimeout(this.init.bind(this), 500);
          break;
        case "unload":
          this.uninit();
          break;
      }
    },

    init: function() {
      if (Services.vc.compare(Application.version, "11.0") >= 0) {
        $("appcontent").addEventListener("DOMContentLoaded", cmImprove_CE, false);
      }
    },

    uninit: function() {
      if (Services.vc.compare(Application.version, "11.0") >= 0) {
        $("appcontent").removeEventListener("DOMContentLoaded", cmImprove_CE, false);
      }
    },
  }

  window.addEventListener("load", cmImprove_CE, false)
  window.addEventListener("unload", cmImprove_CE, false)
})();

