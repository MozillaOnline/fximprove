/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

(function() {
  var FeedbackListener = {
    onLocationChange: function(webProgress, request, uri) {
      document.getElementById("moz-cn-feedback-url").reset();
    }
  };

  function feedback_init() {
    var id = "moz_cn_feedback";
    var area = CustomizableUI.AREA_NAVBAR;

    var widget = CustomizableUI.getWidget(id);
    if (!widget || widget.provider != CustomizableUI.PROVIDER_API) {
      var strings = Services.strings.createBundle("chrome://cmfeedback/locale/overlay.properties");

      CustomizableUI.createWidget(
        { id : id,
          type : "button",
          defaultArea : area,
          label : strings.GetStringFromName("title.label"),
          tooltiptext : strings.GetStringFromName("title.label"),
          onCommand: function(aEvent) {
            var target = aEvent.target;
            var doc = target && target.ownerDocument || document;
            var win = doc.defaultView || window;
            if (!win) {
              return;
            }

            target = CustomizableUI.getWidget(id).forWindow(win).anchor;
            target = document.getAnonymousElementByAttribute(target, "class", "toolbarbutton-icon") || target;
            CustomizableUI.hidePanelForNode(target);
            win.ceFeedback.show_panel(target);
          }
        });
    }

    ceFeedback.panel.addEventListener("popupshown", function(e) {
      gBrowser.addProgressListener(FeedbackListener);
    }, false);
    ceFeedback.panel.addEventListener("popuphidden", function(e) {
      gBrowser.removeProgressListener(FeedbackListener);
      document.getElementById("moz-cn-feedback-url").reset();
    }, false);
  }

  window.addEventListener("load", function() {setTimeout(feedback_init, 500);}, false);
})();

