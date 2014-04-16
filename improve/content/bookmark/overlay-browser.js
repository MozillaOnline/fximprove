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

  var cmImprove_BM = {
    handleEvent: function Improve_BM__handleEvent(aEvent) {
      switch (aEvent.type) {
        case "load":
          setTimeout(this.init.bind(this), 500);
          break;
        case "unload":
          this.uninit();
          break;
        case "popupshowing":
          this.bookmarksPopup_popupshowing();
          break;
      }
    },

    get bookmarksPopup() {
      delete this.bookmarksPopup;
      return this.bookmarksPopup = $("BMB_bookmarksPopup");
    },

    bookmarksPopup_popupshowing: function Improve_BM__bookmarksPopup_popupshowing() {
      var item_t = $("BMB_viewBookmarksToolbar");
      item_t && item_t.setAttribute("label", getString("menu.bookmarksToolbar"));
    },

    showBookmarkToolbar: function Improve_BM__showBookmarkToolbar() {
      // If pref "initialized" has been set to True, this means it's not a new profile.
      var prefs = Application.prefs;
      if (prefs.getValue("extensions.twimprove@mozillaonline.com.initialized", false)) {
        return;
      }

      if (!prefs.getValue("extensions.twimprove@mozillaonline.com.show_bookmark_toolbar", false)) {
        return;
      }

      prefs.setValue("extensions.twimprove@mozillaonline.com.show_bookmark_toolbar", false);
      // Show bookmark toolbar
      // Only affect FF4.0 or newer version
      if (window.setToolbarVisibility && $("PersonalToolbar")) {
                 setToolbarVisibility($("PersonalToolbar"), true);
      }
    },

    init: function Improve_BM__init() {
      BookmarkingUI.onCommand = function (aEvent){
        if (aEvent.target != aEvent.currentTarget) {
          return;
        }

        // Handle special case when the button is in the panel.
        let isBookmarked = this._itemIds.length > 0;

        var tfID = PlacesUtils.unfiledBookmarksFolderId;
        var showUI = true;
        try {
          tfID = Services.prefs.getIntPref("extensions.cmimprove.bookmarks.parentFolder");
          if (tfID == -1) {
            tfID = Services.prefs.getIntPref("extensions.cmimprove.bookmarks.add.defaultFolder");
          }
          showUI = (this._itemIds.length > 0) || Application.prefs.getValue("extensions.cmimprove.bookmarks.add.showEditUI", false);
          if (!showUI)
            tfID = PlacesUtils.unfiledBookmarksFolderId;
          var folderTitle = PlacesUtils.bookmarks.getItemTitle(tfID)
        } catch(e) {
          tfID = PlacesUtils.unfiledBookmarksFolderId;
          showUI = true;;
        }

        if (this._currentAreaType == CustomizableUI.TYPE_MENU_PANEL) {
          this._showSubview();
          return;
        }
        let widget = CustomizableUI.getWidget(this.BOOKMARK_BUTTON_ID)
                                   .forWindow(window);
        if (widget.overflowed) {
          // Allow to close the panel if the page is already bookmarked, cause
          // we are going to open the edit bookmark panel.
          if (showUI/*isBookmarked*/)
            widget.node.removeAttribute("closemenu");
          else
            widget.node.setAttribute("closemenu", "none");
        }

        // Ignore clicks on the star if we are updating its state.
        if (!this._pendingStmt) {
          if (!isBookmarked)
            this._showBookmarkedNotification();
          PlacesCommandHook.bookmarkCurrentPage(showUI/*isBookmarked*/, tfID);
        }
      }
      BookmarkingUI.__defineGetter__("_unstarredTooltip", function(){
        delete this._unstarredTooltip;
        return this._unstarredTooltip =
          getString("starButtonOff.tooltip");
      });


      StarUI.panel.addEventListener("popupshown", function () {
        StarUI._element("editBookmarkPanelTitle").value = getString("editBookmarkPanel.addBookmarkTitle");
        var footer = document.getAnonymousElementByAttribute(StarUI.panel, "class", "panel-inner-arrowcontentfooter");
        var link = document.getAnonymousElementByAttribute(footer, "anonid", "promo-link");
        link.setAttribute("href", "http://www.firefox.com.cn/sync/");
      }, false);

      this.bookmarksPopup && this.bookmarksPopup.addEventListener("popupshowing", this, false);

      gEditItemOverlay.tempContainer = 0;
      var _onFolderMenuListCommand = gEditItemOverlay.onFolderMenuListCommand.bind(gEditItemOverlay);
      gEditItemOverlay.onFolderMenuListCommand = (function(event) {
        _onFolderMenuListCommand(event);
        var t = event.target.tagName;
        if (event.target.id == "editBMPanel_chooseFolderMenuItem")
          return;
        gEditItemOverlay.tempContainer = gEditItemOverlay._getFolderIdFromMenuList();
      }).bind(gEditItemOverlay);

      StarUI.panel.addEventListener("popupshowing", function(event) {
        if (event.target.id == "editBookmarkPanel")
          gEditItemOverlay.tempContainer = 0;
      },false);
      StarUI.panel.addEventListener("popuphiding", function(event) {
        if (event.target.id == "editBookmarkPanel" && gEditItemOverlay.tempContainer && !StarUI._actionOnHide)
          Application.prefs.setValue("extensions.cmimprove.bookmarks.add.defaultFolder", gEditItemOverlay.tempContainer)
      },false);

      this.showBookmarkToolbar();
    },

    uninit: function Improve_BM__uninit() {
      this.bookmarksPopup && this.bookmarksPopup.removeEventListener("popupshowing", this, false);
    },
  }

  window.addEventListener("load", cmImprove_BM, false)
  window.addEventListener("unload", cmImprove_BM, false)
})();

