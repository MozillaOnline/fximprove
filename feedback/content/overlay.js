/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var ceFeedback = {
  el: function(id) {
    if (typeof id == "string")
      return document.getElementById(id);
    else
      return id;
  },

  get panel() {
    delete this.panel;
    return this.panel = this.el("moz-cn-feedback-popup");
  },

  get toolbarbutton() {
    delete this.toolbarbutton;
    if (this.el("moz_cn_feedback"))
      return this.toolbarbutton = this.el("moz_cn_feedback");
  },

  show_url: function() {
    if (ceFeedback.el("moz-cn-feedback-url").disabled == false) {
      this.el("moz-cn-feedback-require").style.display = "none";
      this.el("moz-cn-feedback-url").value = gBrowser.contentDocument.location;
    }
  },

  show_panel: function() {
    if (this.panel.state === "open" || this.panel.state === "showing") {
      this.panel.hidePopup();
    }
    this.panel.openPopup(this.toolbarbutton, "after_end", -15, 0, false, false);
  },

  show_success: function() {
    this.el("moz-cn-feedback-messp").style.display = "none";
    this.el("moz-cn-feedback-messf").style.display = "none";
    this.el("moz-cn-feedback-submit").style.display = "none";
    this.el("moz-cn-feedback-messs").style.display = "block";
    this.el("moz-cn-feedback-url").reset();
    this.el("moz-cn-feedback-comment").reset();
    window.setTimeout(function() {
      ceFeedback.close_panel();
      ceFeedback.input_recover();
    }, 2000);
  },

  reset_button: function() {
    this.el("moz-cn-feedback-messp").style.display = "none";
    this.el("moz-cn-feedback-messf").style.display = "none";
    this.el("moz-cn-feedback-messs").style.display = "none";
    this.el("moz-cn-feedback-submit").style.display = "block";
    this.el("moz-cn-feedback-url").reset();
  },

  close_panel: function() {
    this.reset_button();
    this.el("moz-cn-feedback-require").style.display = "none";
    if (this.panel.state === "open" || this.panel.state === "showing") {
      this.panel.hidePopup();
    }
  },

  send_request: function() {
    var content = "url=" + this.el("moz-cn-feedback-url").value + "&comment=" + this.el("moz-cn-feedback-comment").value;
    var url = "http://feedback.myfirefox.com.tw/apply/feed_addon.php";
    var request = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(Components.interfaces.nsIXMLHttpRequest);
    request.onload = function(aEvent) {
      ceFeedback.show_success();
    };
    request.onerror = function(aEvent) {
      ceFeedback.input_recover();
      ceFeedback.el("moz-cn-feedback-messp").style.display = "none";
      ceFeedback.el("moz-cn-feedback-messf").style.display = "block";
    };
    request.open("POST", url, true);
    request.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    request.send(content);
  },

  input_disable: function() {
    this.el("moz-cn-feedback-comment").disabled = true;
    this.el("moz-cn-feedback-url").disabled = true;
  },

  input_recover: function() {
    this.el("moz-cn-feedback-comment").disabled = false;
    this.el("moz-cn-feedback-url").disabled = false;
  },

  submit: function() {
    if (this.el("moz-cn-feedback-url").value == "" && this.el("moz-cn-feedback-comment").value == "") {
      this.el("moz-cn-feedback-require").style.display = "block";
    } else {
      this.send_request();
      this.input_disable();
      this.el("moz-cn-feedback-require").style.display = "none";
      this.el("moz-cn-feedback-submit").style.display = "none";
      this.el("moz-cn-feedback-messp").style.display = "block";
    }
  },

  resubmit: function() {
    if (this.el("moz-cn-feedback-url").value == "" && this.el("moz-cn-feedback-comment").value == "") {
      this.el("moz-cn-feedback-require").style.display = "block";
    } else {
      this.input_disable();
      this.el("moz-cn-feedback-require").style.display = "none";
      this.el("moz-cn-feedback-messf").style.display = "none";
      this.el("moz-cn-feedback-messp").style.display = "block";
      this.send_request();
    }
  }
};

