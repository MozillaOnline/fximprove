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
})();

