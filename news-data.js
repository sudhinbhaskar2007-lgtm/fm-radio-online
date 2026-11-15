/*
 * ============================================================
 *  MIZHI UK MALAYALAM NEWS. Edit this file to add news.
 * ============================================================
 *  To add a story: copy one { ... } block, paste it at the TOP of
 *  window.MIZHI_NEWS and change the text. Only "title" and "date"
 *  are required; everything else is optional.
 *
 *    id:        short unique name, letters and dashes, e.g. "onam-2026"
 *    date:      "YYYY-MM-DD"
 *    category:  one of the ids in categories below, e.g. "uk"
 *    title:     headline in English
 *    titleMl:   headline in Malayalam
 *    summary:   one or two lines in English (shown on the card)
 *    summaryMl: one or two lines in Malayalam
 *    body:      the full story in English (shown when someone opens it).
 *               Use "\n\n" between paragraphs.
 *    bodyMl:    the full story in Malayalam
 *    image:     a picture, e.g. "assets/news/onam.jpg" (upload it to
 *               assets/news/) or a full https:// link to YOUR OWN photo
 *    featured:  true to show it as the big top story
 *    breaking:  true to show it in the red "Breaking" ticker
 *    link:      a web link for "Read more" (optional)
 *
 *  Write news in your own words and use your own photos (or photos
 *  you have permission to use). Don't copy articles or pictures from
 *  other news websites; link to them with "link" instead.
 */
window.MIZHI_NEWS_PAGE = {
  title: "Mizhi UK Malayalam News",
  titleMl: "മിഴി യുകെ മലയാളം വാർത്ത",
  tagline: "News for Malayalis in the UK",
  taglineMl: "യുകെ മലയാളികളുടെ വാർത്താ ലോകം",

  // Category menu (id, English, Malayalam, colour)
  categories: [
    { id: "uk",          en: "UK",          ml: "യുകെ",        color: "#3d7bff" },
    { id: "kerala",      en: "Kerala",      ml: "കേരളം",       color: "#3ddc84" },
    { id: "immigration", en: "Immigration", ml: "കുടിയേറ്റം",   color: "#ff9a1f" },
    { id: "community",   en: "Community",   ml: "സമൂഹം",       color: "#e0359f" },
    { id: "cinema",      en: "Cinema",      ml: "സിനിമ",       color: "#b05cff" },
    { id: "sports",      en: "Sports",      ml: "കായികം",      color: "#19b6c9" },
    { id: "jobs",        en: "Jobs",        ml: "ജോലി",        color: "#ffd23f" },
    { id: "mizhi",       en: "Mizhi FM",    ml: "മിഴി എഫ്എം",  color: "#e0359f" }
  ]
};

window.MIZHI_NEWS = [
  {
    id: "mizhi-fm-launch",
    date: "2026-11-15",
    category: "mizhi",
    featured: true,
    breaking: true,
    title: "Mizhi FM is now live, 24/7",
    titleMl: "മിഴി എഫ്എം ഇപ്പോൾ 24 മണിക്കൂറും തത്സമയം",
    summary: "Our new online radio station for Malayalis in the UK is on air. Press play and share the link with friends and family.",
    summaryMl: "യുകെയിലെ മലയാളികൾക്കായുള്ള ഞങ്ങളുടെ പുതിയ ഓൺലൈൻ റേഡിയോ ഇപ്പോൾ പ്രക്ഷേപണം തുടങ്ങി. പ്ലേ അമർത്തൂ, ലിങ്ക് കൂട്ടുകാർക്കും കുടുംബത്തിനും ഷെയർ ചെയ്യൂ.",
    body: "Mizhi FM, a new online radio station for the Malayali community in the UK, is now broadcasting 24 hours a day.\n\nYou can listen on any phone, tablet or computer: open the Mizhi FM page and press play. On a phone you can also add it to your home screen so it opens like an app.\n\nShows, community news and more are on the way. Tell your friends and family!",
    bodyMl: "യുകെയിലെ മലയാളി സമൂഹത്തിനായുള്ള പുതിയ ഓൺലൈൻ റേഡിയോ ആയ മിഴി എഫ്എം ഇപ്പോൾ 24 മണിക്കൂറും പ്രക്ഷേപണം ചെയ്യുന്നു.\n\nഏതു ഫോണിലും ടാബ്‌ലെറ്റിലും കമ്പ്യൂട്ടറിലും കേൾക്കാം: മിഴി എഫ്എം പേജ് തുറന്ന് പ്ലേ അമർത്തുക. ഫോണിൽ ഹോം സ്ക്രീനിലേക്ക് ചേർത്താൽ ഒരു ആപ്പ് പോലെ തുറക്കാം.\n\nപരിപാടികളും പ്രാദേശിക വാർത്തകളും ഉടൻ വരുന്നു. കൂട്ടുകാരെയും കുടുംബത്തെയും അറിയിക്കൂ!"
  },
  {
    id: "send-us-your-news",
    date: "2026-11-15",
    category: "community",
    title: "Send us your community news",
    titleMl: "നിങ്ങളുടെ പ്രദേശത്തെ വാർത്തകൾ ഞങ്ങൾക്ക് അയക്കൂ",
    summary: "Association events, church and temple programmes, achievements and announcements: tell us and we'll share them here and on air.",
    summaryMl: "അസോസിയേഷൻ പരിപാടികൾ, പള്ളി / അമ്പല പരിപാടികൾ, നേട്ടങ്ങൾ, അറിയിപ്പുകൾ: ഞങ്ങളെ അറിയിക്കൂ, ഇവിടെയും റേഡിയോയിലും പങ്കുവെക്കാം.",
    body: "Is your Malayali association planning an Onam or Christmas celebration? Has someone in your town achieved something special? Send us the details, a photo you took, and a contact name, and we'll publish it on Mizhi UK Malayalam News and mention it on Mizhi FM."
  },
  {
    id: "advertise-with-mizhi",
    date: "2026-11-15",
    category: "mizhi",
    title: "Advertise with Mizhi FM and Mizhi News",
    titleMl: "മിഴി എഫ്എമ്മിലും മിഴി ന്യൂസിലും പരസ്യം ചെയ്യൂ",
    summary: "Reach Malayalis across the UK. Affordable radio and website ads for shops, restaurants, travel agents and events.",
    summaryMl: "യുകെയിലെമ്പാടുമുള്ള മലയാളികളിലേക്ക് എത്തൂ. കടകൾക്കും റെസ്റ്റോറന്റുകൾക്കും ട്രാവൽ ഏജന്റുമാർക്കും പരിപാടികൾക്കും കുറഞ്ഞ നിരക്കിൽ പരസ്യം."
  }
];
