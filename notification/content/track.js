/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

(function() {
  var ns = MOA.ns("AN.Tracker");

  var _trackurl = "http://adu.myfirefox.com.tw/addons/notification.gif";

  ns.track = function(option) {
    // getDataChoices
    if(! Application.prefs.getValue("extensions.tpmanager.tracking.enabled",false))
      return;
    option = MOA.AN.Lib.extend(option, {
      type: "",
      rid: "",
      action: ""
    });

    if (!option.type && !option.rid && !option.action)
      return;

    var image = new Image();
    image.src = _trackurl + "?r=" + Math.random()
      + "&c=" + "notification"
      + "&t=" + encodeURIComponent(option.type)
      + "&d=" + encodeURIComponent(option.rid)
      + "&a=" + encodeURIComponent(option.action)
      + "&cid=" + Application.prefs.getValue("app.chinaedition.channel", "www.firefox.com.cn");
  };
})();

