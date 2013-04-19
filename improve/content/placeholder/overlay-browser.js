/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

(function() {
  var isMac = (Services.appinfo.OS == "Darwin");
  var placeholder = {
    handleEvent: function placeholder__handleEvent(aEvent) {
      switch (aEvent.type) {
        case "load":
          setTimeout(this.init.bind(this), 500);
          break;
      }
    },

    init: function placeholder__init() {
      var urlbar = document.getElementById("urlbar")
      if (urlbar) {
        var urlText = urlbar.getAttribute(isMac ? "keyLabelMac" : "keyLabelNonMac");
        urlbar.setAttribute("placeholder", urlbar.getAttribute("placeholder") + urlText);

      }
      var searchbar = document.getElementById("searchbar")
      if (searchbar) {
        function updateSearchbar() {
          var searchText = searchbar.getAttribute(isMac ? "keyLabelMac" : "keyLabelNonMac");
          var name = searchbar.currentEngine.name;
          searchbar._textbox.placeholder = name + searchText;
        }
        var updateDisplay = searchbar.updateDisplay.bind(searchbar);
        searchbar.updateDisplay = (function() {
          updateDisplay();
          updateSearchbar();
        }).bind(searchbar);
        updateSearchbar();
      }
    },
  }
  window.addEventListener("load", placeholder, false);
})();

