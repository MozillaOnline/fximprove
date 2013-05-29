/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

(function() {
  var safeflag_init = function() {
    try {
      Components.utils.import("resource://gre/modules/AddonManager.jsm");
      AddonManager.getAddonByID("safeflag@mozillaonline.com", function(addon) {
        if (!addon)
          return;
        addon.uninstall();
      });
    } catch (e) {}
  };
window.addEventListener("load", function() {setTimeout(safeflag_init, 500);}, false)
})();
