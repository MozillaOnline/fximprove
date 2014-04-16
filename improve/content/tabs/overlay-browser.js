/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// tabs context menu
(function() {

  var ns = MOA.ns("Improve.Tabs");

  function $(id) {
    if (typeof id == "string") {
      return document.getElementById(id);
    } else {
      return id;
    }
  }

  var _bundles = Cc["@mozilla.org/intl/stringbundle;1"].
          getService(Ci.nsIStringBundleService).
          createBundle("chrome://cmimprove/locale/browser.properties");

  function getString(key) {
    return _bundles.GetStringFromName(key);
  }

  var undoclose_obj = {
    handleEvent: function UC_handleEvent(aEvent) {
      switch (aEvent.type) {
        case "load":
          setTimeout(this.init.bind(this), 500);
          break;
        case "unload":
          this.uninit();
          break;
        case "TabClose":
          this.animate(aEvent.originalTarget);
        case "TabOpen":
        case "aftercustomization":
          this.toggleRecentlyClosedTabs();
          break;
        case "popupshowing":
          this.redirectToSubView(aEvent);
          break;
        case "ViewShowing":
          this.onViewShowing(aEvent);
          break;
        case "ViewHiding":
          this.onViewHiding(aEvent);
        break;
      }
    },

    buttonID: "ce-undo-close-toolbar-button",
    viewID: "PanelUI-MOA-undoCloseView",
    createButton: function() {
      var area = CustomizableUI.AREA_NAVBAR;

      var widget = CustomizableUI.getWidget(this.buttonID);
      if (widget && widget.provider == CustomizableUI.PROVIDER_API) {
        return;
      }

      var self = this;
      CustomizableUI.createWidget(
        { id : this.buttonID,
          type : "button",
          defaultArea : area,
          label : getString("ce.undoCloseTab.label"),
          tooltiptext : getString("ce.undoCloseTab.label"),
          onCreated: function(aNode) {
            var doc = aNode.ownerDocument || document;
            aNode.setAttribute("type", "menu-button");

            var observes = doc.createElement("observes");
            observes.setAttribute("element", "History:UndoCloseTab");
            observes.setAttribute("attribute", "disabled");
            aNode.appendChild(observes);

            // see comments in redirectToSubView
            var menupopup = doc.createElement("menupopup");
            menupopup.setAttribute("position", "after_end");
            menupopup.addEventListener("popupshowing", self);
            aNode.appendChild(menupopup);
          },
          onCommand: function(aEvent) {
            var doc = aEvent.target &&
                      aEvent.target.ownerDocument || document;
            var win = doc && doc.defaultView || window;

            var area = CustomizableUI.getWidget(self.buttonID).areaType;
            if (area == CustomizableUI.TYPE_MENU_PANEL) {
              self.showSubView(win, aEvent.target, CustomizableUI.AREA_PANEL);
              return;
            }

            win.undoCloseTab();
          },
        });
    },

    redirectToSubView: function(aEvent) {
      /*
       * Prevent toolbarbutton[type="menu-button"] > menupopup from showing on
       * dropmarker click, and show the subview instead.
       */
      aEvent.preventDefault();
      aEvent.stopPropagation();

      var doc = aEvent.target &&
                aEvent.target.ownerDocument || document;
      var win = doc && doc.defaultView || window;

      var widgetGroup = CustomizableUI.getWidget(this.buttonID);
      var widget = widgetGroup.forWindow(win);

      if (widgetGroup.areaType == CustomizableUI.TYPE_MENU_PANEL) {
        this.showSubView(win, widget.node, CustomizableUI.AREA_PANEL);
        return;
      }

      CustomizableUI.hidePanelForNode(widget.node);
      var dm = doc.getAnonymousElementByAttribute(widget.anchor,
        "anonid", "dropmarker");

      this.showSubView(win, dm ? doc.getAnonymousElementByAttribute(dm,
        "class", "dropmarker-icon") : widget.anchor,
        CustomizableUI.AREA_NAVBAR);
    },

    populateUndo: function(aEvent) {
      var tagName = "menuitem";
      var doc = aEvent.target &&
                aEvent.target.ownerDocument || document;
      var win = doc && doc.defaultView || window;

      var recentlyClosedTabs = aEvent.target;
      while (recentlyClosedTabs.firstChild) {
        recentlyClosedTabs.removeChild(recentlyClosedTabs.firstChild);
      }

      if (recentlyClosedTabs.tagName == "panelview") {
        tagName = "toolbarbutton";

        var header = doc.createElement("label");
        header.setAttribute("value", getString("ce.undoCloseTab.label"));
        header.classList.add("panel-subview-header");
        recentlyClosedTabs.appendChild(header);
      }

      var utils = RecentlyClosedTabsAndWindowsMenuUtils;
      var tabsFragment = utils.getTabsFragment(win, tagName, false);
      var elementCount = tabsFragment.childElementCount;
      while (--elementCount >= 0) {
        // skip menuseparator for proper styling
        if (tabsFragment.children[elementCount].tagName == "toolbarbutton") {
          tabsFragment.children[elementCount].classList.add("subviewbutton");
        }
      }

      var restoreAll = tabsFragment.lastElementChild;
      var clearAll = doc.createElement(restoreAll.tagName);
      clearAll.className = restoreAll.className;
      clearAll.setAttribute("label", getString("ce.menuClearAllTabs.label"));
      clearAll.setAttribute("oncommand", "MOA.Improve.Tabs.clearUndo()");
      tabsFragment.insertBefore(clearAll, restoreAll);

      recentlyClosedTabs.appendChild(tabsFragment);
    },

    onViewShowing: function(aEvent) {
      var doc = aEvent.target &&
                aEvent.target.ownerDocument || document;
      var win = doc && doc.defaultView || window;

      this.populateUndo(aEvent);

      var widget = CustomizableUI.getWidget(this.buttonID).forWindow(win);
      if (!widget.anchor.open) {
        widget.anchor.setAttribute("open", "true");
      }

      aEvent.target.removeEventListener("ViewShowing", this);
    },

    onViewHiding: function(aEvent) {
      var doc = aEvent.target &&
                aEvent.target.ownerDocument || document;
      var win = doc && doc.defaultView || window;
      var widget = CustomizableUI.getWidget(this.buttonID).forWindow(win);

      if (widget.anchor.open) {
        widget.anchor.removeAttribute("open");
      }

      aEvent.target.removeEventListener("ViewHiding", this);
    },

    showSubView: function(aWin, aAnchor, aArea) {
      var view = aWin.document.getElementById(this.viewID);
      view.addEventListener("ViewShowing", this);
      view.addEventListener("ViewHiding", this);
      aAnchor.setAttribute("closemenu", "none");
      aWin.PanelUI.showSubView(this.viewID, aAnchor, aArea);
    },

    clearUndo: function() {
      var max = 10;
      try {
        max = Services.prefs.getIntPref("browser.sessionstore.max_tabs_undo");
        Services.prefs.setIntPref("browser.sessionstore.max_tabs_undo", 0);
        Services.prefs.setIntPref("browser.sessionstore.max_tabs_undo", max);
      } catch(ex) {
        max = 10;
        Services.prefs.setIntPref("browser.sessionstore.max_tabs_undo", max);
      }

      this.toggleRecentlyClosedTabs();
    },

    init: function UC_init() {
      gBrowser.tabContainer.addEventListener("TabOpen", this, false);
      gBrowser.tabContainer.addEventListener("TabClose", this, false);
      var toolbox = $("navigator-toolbox");
      toolbox.addEventListener("aftercustomization", this, false)
      this.createButton();
      setTimeout(this.toggleRecentlyClosedTabs,200);
    },

    uninit: function UC_uninit() {
      gBrowser.tabContainer.removeEventListener("TabClose", this, false);
      gBrowser.tabContainer.removeEventListener("TabOpen", this, false);
      var toolbox = $("navigator-toolbox");
      toolbox.removeEventListener("aftercustomization", this, false)
    },

    toggleRecentlyClosedTabs: function UC_toggleRecentlyClosedTabs() {
      var uctCommand = document.getElementById("History:UndoCloseTab");
      if (uctCommand) {
        if (SessionStore.getClosedTabCount(window) == 0) {
          uctCommand.setAttribute("disabled", true);
        } else {
          uctCommand.removeAttribute("disabled");
        }
      }
    },

    iQ: function UC_iQ(elem) {
      return {
        elem: elem,
        // ----------
        // Function: css
        // Sets or gets CSS properties on the receiver. When setting certain numerical properties,
        // will automatically add "px". A property can be removed by setting it to null.
        //
        // Possible call patterns:
        //   a: object, b: undefined - sets with properties from a
        //   a: string, b: undefined - gets property specified by a
        //   a: string, b: string/number - sets property specified by a to b
        css: function animation_content_css(a, b) {
          let properties = null;

          if (typeof a === "string") {
            let key = a;
            if (b === undefined) {
              return window.getComputedStyle(this.elem, null).getPropertyValue(key);
            }
            properties = {};
            properties[key] = b;
          } else if (a instanceof Rect) {
            properties = {
              left: a.left,
              top: a.top,
              width: a.width,
              height: a.height
            };
          } else {
            properties = a;
          }

          let pixels = {
            "left": true,
            "top": true,
            "right": true,
            "bottom": true,
            "width": true,
            "height": true
          };

          for (let key in properties) {
            let value = properties[key];

            if (pixels[key] && typeof value != "string")
              value += "px";

            if (value == null) {
              this.elem.style.removeProperty(key);
            } else if (key.indexOf("-") != -1)
              this.elem.style.setProperty(key, value, "");
            else
              this.elem.style[key] = value;
          }
          return this;
        },

        // ----------
        // Function: animate
        // Uses CSS transitions to animate the element.
        //
        // Parameters:
        //   css - an object map of the CSS properties to change
        //   options - an object with various properites (see below)
        //
        // Possible "options" properties:
        //   duration - how long to animate, in milliseconds
        //   easing - easing function to use. Possibilities include
        //     "tabviewBounce", "easeInQuad". Default is "ease".
        //   complete - function to call once the animation is done, takes nothing
        //     in, but "this" is set to the element that was animated.
        animate: function animation_content_animate(css, options) {
          if (!options)
            options = {};

          let easings = {
            tabviewBounce: "cubic-bezier(0.0, 0.63, .6, 1.29)",
            easeInQuad: "ease-in", // TODO: make it a real easeInQuad, or decide we don't care
            fast: "cubic-bezier(0.7,0,1,1)"
          };

          let duration = (options.duration || 400);
          let easing = (easings[options.easing] || "ease");

          if (css instanceof Rect) {
            css = {
              left: css.left,
              top: css.top,
              width: css.width,
              height: css.height
            };
          }

          // The latest versions of Firefox do not animate from a non-explicitly
          // set css properties. So for each element to be animated, go through
          // and explicitly define 'em.
          let rupper = /([A-Z])/g;
          let cStyle = window.getComputedStyle(this.elem, null);
          for (let prop in css) {
            prop = prop.replace(rupper, "-$1").toLowerCase();
            this.css(prop, cStyle.getPropertyValue(prop));
          }

          this.css({
            "-moz-transition-property": Object.keys(css).join(", "),
            "-moz-transition-duration": (duration / 1000) + "s",
            "-moz-transition-timing-function": easing
          });

          this.css(css);
          let self = this;
          setTimeout(function() {
            self.css({
              "-moz-transition-property": "none",
              "-moz-transition-duration": "",
              "-moz-transition-timing-function": ""
            });

            if (typeof options.complete == "function")
              options.complete.apply(self);
          }, duration);

          return this;
        },

        // ----------
        // Function: fadeOut
        // Animates the receiver to full transparency. Calls callback on completion.
        fadeOut: function animation_content_fadeOut(callback) {
          let self = this;
          this.animate({
            opacity: 0
          }, {
            duration: 400,
            complete: function() {
              self.css({display: "none"});
              if (typeof callback == "function")
                callback.apply(self);
            }
          });

          return this;
        },

        // ----------
        // Function: fadeIn
        // Animates the receiver to full opacity.
        fadeIn: function animation_content_fadeIn() {
          this.css({display: ""});
          this.animate({
            opacity: 1
          }, {
            duration: 400
          });

          return this;
        },

        // ----------
        // Function: hide
        // Hides the receiver.
        hide: function animation_content_hide() {
          this.css({display: "none", opacity: 0});
          return this;
        },

        // ----------
        // Function: show
        // Shows the receiver.
        show: function animation_content_show() {
          this.css({display: "", opacity: 1});
          return this;
        },
      };
    },

    animateCount: 0,

    animate: function UC_animate(aTab) {
      try {
        if (!Services.prefs.getBoolPref("extensions.cmimprove.features.undocloseanimation.enable", true)) {
          return;
        }
      } catch(e) {}
      var button = CustomizableUI.getWidget("ce-undo-close-toolbar-button").forWindow(window).anchor;
      if (!button)
        return;
      if (aTab != window.gBrowser.selectedTab)
        return;
      var panel = $("browser-panel");

      var linkedBrowser = window.gBrowser.selectedTab.linkedBrowser
      var top1 = linkedBrowser.boxObject.screenY - panel.boxObject.screenY + panel.boxObject.y;
      var left1 = linkedBrowser.boxObject.screenX - panel.boxObject.screenX + panel.boxObject.x;
      var width1 = linkedBrowser.boxObject.width;
      var height1 = linkedBrowser.boxObject.height;

      var top2 = button.boxObject.screenY - panel.boxObject.screenY + panel.boxObject.y + button.boxObject.height/2;
      var left2 = button.boxObject.screenX - panel.boxObject.screenX + panel.boxObject.x + button.boxObject.width/2;
      var width2 = 0;
      var height2 = 0;

      if (left2 == 0) //no animation when close about:addons
        return;
      if (this.animateCount++ > 0)
        return;
      var win = linkedBrowser.contentWindow.content;
      var canvas = $("ce-animation-canvas");
      canvas.width = width1;
      canvas.height = height1;
      let ctx = canvas.getContext("2d");
      ctx.drawWindow(win, win.scrollX, win.scrollY, width1, height1, "rgba(255,255,255,0.5)");
      var ac = this.iQ(canvas);

      ac.show();
      ac.css({
        top: top1,
        left: left1,
        width:  width1,
        height: height1,
        opacity: 0.5
      });
      ac.animate({
        top: top2,
        left: left2,
        width:  width2,
        height: height2,
      }, {
        duration: 900,
        complete: function undo_close_animate_complete() {
          ac.hide();
        }
      });
    },
  };

  ns.populateUndo = undoclose_obj.populateUndo;
  ns.clearUndo = undoclose_obj.clearUndo.bind(undoclose_obj);

  window.addEventListener("load", undoclose_obj, false);
  window.addEventListener("unload", undoclose_obj, false);
})();

