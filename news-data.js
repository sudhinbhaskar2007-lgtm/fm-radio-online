/*
 * ============================================================
 *  MIZHI UK MALAYALAM NEWS: page settings
 * ============================================================
 *  The news stories and photo albums are NOT in this file any more.
 *  They live in:
 *     data/news.json      (news stories)
 *     data/gallery.json   (photo albums)
 *  and your team edits them on the admin page (see admin.html,
 *  or go to https://app.pagescms.org and open this repository).
 *
 *  This file only holds the page title and the category menu.
 *  If you add a category here, add it to the "category" list in
 *  .pages.yml too so it shows up in the admin page.
 */
window.MIZHI_NEWS_PAGE = {
  title: "Mizhi UK Malayalam News",
  titleMl: "മിഴി യുകെ മലയാളം വാർത്ത",
  tagline: "News for Malayalis in the UK",
  taglineMl: "യുകെ മലയാളികളുടെ വാർത്താ ലോകം",

  // Category menu (id, English, Malayalam, colour)
  categories: [
    { id: "uk",          en: "UK",          ml: "യുകെ",        color: "#3d7bff" },
    { id: "association", en: "Malayali Associations", ml: "മലയാളി അസോസിയേഷൻ", color: "#ff6b6b" },
    { id: "ads",         en: "Advertisements", ml: "പരസ്യങ്ങൾ",   color: "#c9a227" },
    { id: "kerala",      en: "Kerala",      ml: "കേരളം",       color: "#3ddc84" },
    { id: "immigration", en: "Immigration", ml: "കുടിയേറ്റം",   color: "#ff9a1f" },
    { id: "community",   en: "Community",   ml: "സമൂഹം",       color: "#e0359f" },
    { id: "cinema",      en: "Cinema",      ml: "സിനിമ",       color: "#b05cff" },
    { id: "sports",      en: "Sports",      ml: "കായികം",      color: "#19b6c9" },
    { id: "jobs",        en: "Jobs",        ml: "ജോലി",        color: "#ffd23f" },
    { id: "mizhi",       en: "Mizhi FM",    ml: "മിഴി എഫ്എം",  color: "#e0359f" }
  ]
};

// Backup copy used only if data/news.json can't be loaded.
window.MIZHI_NEWS = [];
window.MIZHI_GALLERY = [];
