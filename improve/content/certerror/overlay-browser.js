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
        case "DOMContentLoaded":
          this.iFrameCertFix(aEvent);
          break;
      }
    },

    iFrameCertFix: function(evt) {
      var contentDoc = evt.target;
      if (contentDoc.documentURI.match(/^about:certerror/) && contentDoc.defaultView !== contentDoc.defaultView.top && !contentDoc.querySelector("#exceptionDialogButton")) {
        var iframeCert = Application.prefs.getValue("extensions.cmimprove.iframe_cert_fix.whitelist", "").split(",");
        if (iframeCert.some(function(host) contentDoc.location.host == host)) {
          var div = contentDoc.createElement("div");
          div.id = "expertContent";
          div.setAttribute("collapsed", "true");
          contentDoc.querySelector("#technicalContent").parentNode.appendChild(div);
          contentDoc.querySelector("#expertContent").innerHTML = ["<h2 onclick=\"toggle('expertContent');\" id=\"expertContentHeading\">",
              getString("certerror.expert.heading"),
              "</h2><div><p>",
              getString("certerror.expert.content"),
              "</p><p>",
              getString("certerror.expert.contentPara2"),
              "</p><button id='exceptionDialogButton'>",
              getString("certerror.addException.label"),
              "</button></div>"].join("");
        }
      }
      if (contentDoc.documentURI.match(/^about:certerror/) && contentDoc.defaultView !== contentDoc.defaultView.top && contentDoc.querySelector("#expertContent").hasAttribute("hidden")) {
        var iframeCert = Application.prefs.getValue("extensions.cmimprove.iframe_cert_fix.whitelist", "").split(",");
        if (iframeCert.some(function(host) contentDoc.location.host == host)) {
          contentDoc.querySelector("#expertContent").removeAttribute("hidden");
        }
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

