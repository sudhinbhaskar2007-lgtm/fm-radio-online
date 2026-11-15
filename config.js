/*
 * ============================================================
 *  STATION SETTINGS. Edit this file to make the site yours.
 * ============================================================
 *  You only need to change the values below. No other file
 *  needs editing to launch your station.
 */
window.RADIO_CONFIG = {
  // ---- Branding -------------------------------------------------
  stationName: "Mizhi FM",
  stationNameMl: "മിഴി എഫ്എം",    // Malayalam name shown under the English one ("" to hide)
  tagline: "Your music. Your community. Live, 24/7.",
  frequency: "",                 // e.g. "101.4" shown as a badge; leave "" for online-only
  logoText: "MIZHI",              // big letters in the logo (used if logoImage is "")
  logoImage: "",                 // e.g. "assets/logo.png" to use your own logo
  accentColor: "#e0359f",        // main brand colour (magenta from the eye)
  accentColor2: "#ff9a1f",       // second gradient colour (orange glow)

  // ---- Music credits ---------------------------------------------
  // Shown in the footer of every page. Creative Commons (CC BY) music
  // must credit the artist: add one line per artist you use.
  musicCredits: [
    "Music by Kevin MacLeod (incompetech.com), licensed under Creative Commons: By Attribution 4.0 (creativecommons.org/licenses/by/4.0/)"
  ],

  // ---- Background video ------------------------------------------
  // The looping blinking-eye animation behind the page. Set both to ""
  // to use a plain gradient instead.
  backgroundVideo: "assets/eye-bg.mp4",
  backgroundVideoMobile: "assets/eye-bg-mobile.mp4",
  backgroundPoster: "assets/eye-poster.jpg",

  // ---- Stream ---------------------------------------------------
  // The direct audio URL of your stream. MUST be https:// for the
  // site to play when hosted on GitHub Pages.
  //   Icecast:    https://your.server:8000/live
  //   Shoutcast:  https://your.server:8000/;  (note the ";")
  //   Zeno.fm:    https://stream.zeno.fm/xxxxxxxx
  //   AzuraCast:  https://your.azuracast/listen/station/radio.mp3
  streamUrl: "https://mizhifm.duckdns.org/listen/mizhi_fm/radio.mp3",

  // ---- Now playing (optional) ------------------------------------
  // How the site finds the current song title. Pick one:
  //   "none"       - show the station name only
  //   "icecast"    - reads Icecast's /status-json.xsl
  //   "azuracast"  - reads AzuraCast's /api/nowplaying/<station>
  //   "shoutcast"  - reads Shoutcast v2 /stats?json=1
  //   "json"       - any URL returning {"title": "...", "artist": "..."}
  nowPlayingType: "azuracast",
  nowPlayingUrl: "https://mizhifm.duckdns.org/api/nowplaying/mizhi_fm", // e.g. "https://your.server:8000/status-json.xsl"
  nowPlayingInterval: 15,        // seconds between checks

  // ---- Contact & social -----------------------------------------
  email: "mizhinews@gmail.com",
  phone: ["07438 407865", "07868 466691"],   // one number, or several in [ ] separated by commas
  whatsapp: "",                  // digits only, with country code, e.g. "447700900000"
  social: {
    facebook: "",
    instagram: "",
    youtube: "",
    x: "",
    tiktok: ""
  },

  // ---- About ----------------------------------------------------
  about:
    "Mizhi FM is an independent online radio station bringing you the best " +
    "music, talk and community news around the clock. Tune in from anywhere " +
    "in the world on your phone, laptop or smart speaker.",

  // ---- Timezone of the schedule ---------------------------------
  // The schedule below is written in this timezone. Listeners see
  // the show that is on air *now* highlighted automatically.
  timezone: "Europe/London",

  // ---- Shows / presenters -----------------------------------------
  shows: [
    { id: "morning", name: "Morning Drive", host: "Anu & Rahul",
      description: "Wake up with fresh hits, traffic, weather and lots of laughs." },
    { id: "midday", name: "Midday Melodies", host: "Priya",
      description: "Feel-good classics and your requests to get you through the day." },
    { id: "evening", name: "Evening Express", host: "Arun",
      description: "The biggest new songs, interviews and the daily top 10." },
    { id: "night", name: "Night Lounge", host: "Auto DJ",
      description: "Smooth, non-stop music to wind down your evening." },
    { id: "weekend", name: "Weekend Special", host: "Meera",
      description: "Themed music marathons, guests and community shout-outs." }
  ],

  // ---- Weekly schedule --------------------------------------------
  // days: 0=Sun 1=Mon 2=Tue 3=Wed 4=Thu 5=Fri 6=Sat
  // times are 24h "HH:MM"; "24:00" means midnight at the end of the day.
  schedule: [
    { show: "morning", days: [1,2,3,4,5], start: "06:00", end: "10:00" },
    { show: "midday",  days: [1,2,3,4,5], start: "10:00", end: "15:00" },
    { show: "evening", days: [1,2,3,4,5], start: "15:00", end: "20:00" },
    { show: "weekend", days: [0,6],       start: "08:00", end: "14:00" },
    { show: "midday",  days: [0,6],       start: "14:00", end: "20:00" },
    { show: "night",   days: [0,1,2,3,4,5,6], start: "20:00", end: "24:00" },
    { show: "night",   days: [0,1,2,3,4,5,6], start: "00:00", end: "06:00" },
    { show: "night",   days: [0,6],       start: "06:00", end: "08:00" }
  ]
};
