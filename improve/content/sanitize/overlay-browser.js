/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var ceSanitizeHistory = {
  handleEvent: function ce_sanitizeHistory__handleEvent(aEvent) {
    switch (aEvent.type) {
      case "load":
        setTimeout(this.init.bind(this), 500);
        break;
      case "aftercustomization":
        this.initUI();
        break;
    }
  },

  init: function ce_sanitizeHistory__init() {
    this.installButton("ce_sanitizeHistory");
    this.initUI();
    var toolbox = document.getElementById("navigator-toolbox");
    toolbox.addEventListener("aftercustomization", this, false)
  },

  initUI: function ice_sanitizeHistory__initUI() {
    this.bindPopup("ce_sanitizeHistory","ce_sanitizeHistory_popup")
  },

  bindPopup: function ce_sanitizeHistory__bindPopup(buttonId,menuId) {
    var button = document.getElementById(buttonId)
    if (!button)
      return;
    var menu = document.getElementById(menuId)
    button.addEventListener("mousedown", function(aEvent) {
      if (aEvent.button != 0)
        return;
      menu.openPopup(button, "before_start", 0, 0, false, false, aEvent);
    }, false);
  },

  installButton: function ce_sanitizeHistory__installButton(buttonId,toolbarId) {
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

  onPopupShowing: function ce_sanitizeHistory__onPopupShowing() {
    var selClose = Application.prefs.getValue("privacy.sanitize.sanitizeOnShutdown", false);
    if (selClose)
      document.getElementById("ce_sanitizeHistory_onclose").setAttribute("checked", "true");
    else
      document.getElementById("ce_sanitizeHistory_none").setAttribute("checked", "true");
  },

  onPopupHiding: function ce_sanitizeHistory__onPopupHiding() {
    var selClose = document.getElementById("ce_sanitizeHistory_onclose").getAttribute("checked") =="true";
    Application.prefs.setValue("privacy.sanitize.sanitizeOnShutdown",selClose);
  }
};

window.addEventListener("load", ceSanitizeHistory, false);

