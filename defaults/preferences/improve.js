pref("startup.homepage_override_url", "https://mozilla.com.tw/firefox/%VERSION%/whatsnew/?oldversion=%OLD_VERSION%");
pref("startup.homepage_welcome_url", "https://mozilla.com.tw/firefox/%VERSION%/firstrun/");

pref("browser.uitour.url", "https://mozilla.com.tw/firefox/%VERSION%/tour/");
pref("browser.uitour.whitelist.add.mocotw", "mozilla.com.tw");

pref("browser.tabs.autoHide", false);

pref("extensions.twimprove@mozillaonline.com.show_bookmark_toolbar", true);

// In which folder do we bookmark the page:
// -1 last selected
// 1  the Places root
// 2  the bookmarks menu folder
// 3  the personal toolbar folder
// 4  the top-level folder that contain the tag "folders"
// 5  the unfiled-bookmarks folder
pref("extensions.cmimprove.bookmarks.parentFolder", -1);
pref("extensions.cmimprove.bookmarks.add.defaultFolder", 5);

// whether or not to show the edit-bookmark UI when adds a bookmark to the page
pref("extensions.cmimprove.bookmarks.add.showEditUI", true);

// features enable
pref("extensions.cmimprove.features.undocloseanimation.enable", true);
