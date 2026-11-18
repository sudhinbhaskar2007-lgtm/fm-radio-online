(function () {
  "use strict";

  var C = window.RADIO_CONFIG || {};
  var body = document.body;
  var DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var $ = function (id) { return document.getElementById(id); };

  // ---------------------------------------------------------------
  // Branding
  // ---------------------------------------------------------------
  document.title = (C.stationName || "Online Radio") + (C.frequency ? " " + C.frequency : "") + " | Listen Live";
  var meta = document.querySelector('meta[name="description"]');
  if (meta && C.tagline) meta.setAttribute("content", C.tagline);
  if (C.accentColor) document.documentElement.style.setProperty("--accent", C.accentColor);
  if (C.accentColor2) document.documentElement.style.setProperty("--accent2", C.accentColor2);

  document.querySelectorAll("[data-bind]").forEach(function (el) {
    var v = C[el.getAttribute("data-bind")];
    if (v) el.textContent = v;
  });

  var logo = $("logo");
  if (C.logoImage) {
    var img = new Image();
    img.src = C.logoImage;
    img.alt = C.stationName || "Logo";
    logo.appendChild(img);
    logo.classList.add("has-img");
  } else {
    logo.textContent = C.logoText || (C.stationName || "FM").slice(0, 4).toUpperCase();
  }
  if (C.frequency) $("freq").textContent = C.frequency + " FM";
  $("year").textContent = new Date().getFullYear();

  // Music credits (footer)
  var mc = document.getElementById("musicCredits");
  if (mc) (C.musicCredits || []).forEach(function (line) {
    var p = document.createElement("p");
    p.textContent = line;
    mc.appendChild(p);
  });

  // ---------------------------------------------------------------
  // Background video
  // ---------------------------------------------------------------
  var bg = $("bgVideo");
  var reduceMotion = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (C.backgroundPoster) bg.parentNode.style.backgroundImage = "url(" + JSON.stringify(C.backgroundPoster) + ")";
  var bgSrc = (window.innerWidth < 900 && C.backgroundVideoMobile) || C.backgroundVideo;
  if (bgSrc && !reduceMotion) {
    if (C.backgroundPoster) bg.poster = C.backgroundPoster;
    bg.src = bgSrc;
    var bp = bg.play();
    if (bp && bp.catch) bp.catch(function () {});
  } else {
    bg.remove();
    if (!C.backgroundPoster) body.classList.add("no-video");
  }
  window.addEventListener("scroll", function () {
    body.classList.toggle("scrolled", window.scrollY > window.innerHeight * 0.6);
  }, { passive: true });

  // ---------------------------------------------------------------
  // Mobile menu
  // ---------------------------------------------------------------
  var nav = $("nav"), menuBtn = $("menuBtn");
  menuBtn.addEventListener("click", function () {
    var open = nav.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", open);
  });
  nav.addEventListener("click", function (e) {
    if (e.target.tagName === "A") { nav.classList.remove("open"); menuBtn.setAttribute("aria-expanded", false); }
  });

  // ---------------------------------------------------------------
  // Audio player
  // ---------------------------------------------------------------
  var audio = $("audio");
  var status = $("status");
  var wantPlaying = false;
  var retryTimer = null;
  var retries = 0;

  function setState(state) {
    body.classList.toggle("playing", state === "playing");
    body.classList.toggle("loading", state === "loading");
    var label = state === "playing" ? "Pause" : "Play";
    $("playBtn").setAttribute("aria-label", label);
    $("miniPlay").setAttribute("aria-label", label);
    if ("mediaSession" in navigator) {
      navigator.mediaSession.playbackState = state === "playing" ? "playing" : "paused";
    }
  }

  function play() {
    if (!C.streamUrl) { status.textContent = "No stream URL set yet. Add one in config.js."; return; }
    wantPlaying = true;
    setState("loading");
    status.textContent = "";
    // Add a cache-buster so we always join the live point, not a stale buffer.
    var sep = C.streamUrl.indexOf("?") === -1 ? "?" : "&";
    audio.src = C.streamUrl + sep + "t=" + Date.now();
    var p = audio.play();
    if (p && p.catch) p.catch(onError);
  }

  function stop() {
    wantPlaying = false;
    clearTimeout(retryTimer);
    audio.pause();
    // Drop the connection completely; a live stream can't be "paused".
    audio.removeAttribute("src");
    audio.load();
    setState("stopped");
    status.textContent = "";
  }

  function toggle() { wantPlaying ? stop() : play(); }

  function onError() {
    if (!wantPlaying) return;
    if (retries < 5) {
      retries++;
      setState("loading");
      status.textContent = "Connection lost, reconnecting…";
      clearTimeout(retryTimer);
      retryTimer = setTimeout(play, 1500 * retries);
    } else {
      wantPlaying = false;
      setState("stopped");
      status.textContent = "We can't reach the stream right now. Please try again in a moment.";
    }
  }

  audio.addEventListener("playing", function () { retries = 0; setState("playing"); status.textContent = ""; });
  audio.addEventListener("waiting", function () { if (wantPlaying) setState("loading"); });
  audio.addEventListener("error", onError);
  audio.addEventListener("stalled", function () { if (wantPlaying && audio.paused) onError(); });
  audio.addEventListener("ended", onError);

  $("playBtn").addEventListener("click", toggle);
  $("miniPlay").addEventListener("click", toggle);
  document.addEventListener("keydown", function (e) {
    if (e.code === "Space" && !/INPUT|TEXTAREA|BUTTON/.test(document.activeElement.tagName)) {
      e.preventDefault(); toggle();
    }
  });

  // Volume (remembered per listener)
  var vol = $("volume");
  try { var saved = localStorage.getItem("radio-volume"); if (saved !== null) vol.value = saved; } catch (e) {}
  audio.volume = parseFloat(vol.value);
  vol.addEventListener("input", function () {
    audio.volume = parseFloat(vol.value);
    audio.muted = false; body.classList.remove("muted-on");
    try { localStorage.setItem("radio-volume", vol.value); } catch (e) {}
  });
  $("muteBtn").addEventListener("click", function () {
    audio.muted = !audio.muted;
    body.classList.toggle("muted-on", audio.muted);
  });

  // Lock-screen / headphone controls
  if ("mediaSession" in navigator) {
    navigator.mediaSession.setActionHandler("play", play);
    navigator.mediaSession.setActionHandler("pause", stop);
    try { navigator.mediaSession.setActionHandler("stop", stop); } catch (e) {}
  }
  function updateMediaSession(title, artist) {
    if (!("mediaSession" in navigator) || !window.MediaMetadata) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: title || C.stationName,
      artist: artist || C.stationName,
      album: (C.stationName || "") + " Live",
      artwork: [{ src: C.logoImage || "assets/icon.svg", sizes: "512x512" }]
    });
  }

  // Mini player shows when the hero is off screen
  var mini = $("mini");
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      mini.hidden = entries[0].isIntersecting;
    }, { threshold: 0.15 }).observe($("home"));
  }

  // ---------------------------------------------------------------
  // Now playing metadata
  // ---------------------------------------------------------------
  function setNowPlaying(title, artist) {
    var text = title ? (artist ? artist + " – " + title : title) : "";
    $("npTitle").textContent = text || (C.stationName + " Live");
    $("miniTitle").textContent = text || "Live";
    updateMediaSession(title, artist);
  }

  function splitTitle(s) {
    // Icecast/Shoutcast usually send "Artist - Title"
    if (!s) return { title: "", artist: "" };
    var i = s.indexOf(" - ");
    return i > 0 ? { artist: s.slice(0, i).trim(), title: s.slice(i + 3).trim() } : { title: s, artist: "" };
  }

  var parsers = {
    icecast: function (d) {
      var src = d.icestats && d.icestats.source;
      if (Array.isArray(src)) {
        var mount = (C.streamUrl || "").split("?")[0].split("/").pop();
        src = src.find(function (s) { return s.listenurl && s.listenurl.split("/").pop() === mount; }) || src[0];
      }
      if (!src) return null;
      return src.artist ? { title: src.title, artist: src.artist } : splitTitle(src.title || src.yp_currently_playing);
    },
    azuracast: function (d) {
      if (Array.isArray(d)) d = d[0];
      var s = d && d.now_playing && d.now_playing.song;
      return s ? { title: s.title, artist: s.artist } : null;
    },
    shoutcast: function (d) { return splitTitle(d.songtitle || (d.streams && d.streams[0] && d.streams[0].songtitle)); },
    json: function (d) { return { title: d.title || d.song || "", artist: d.artist || "" }; }
  };

  function pollNowPlaying() {
    var parse = parsers[C.nowPlayingType];
    if (!parse || !C.nowPlayingUrl) { setNowPlaying("", ""); return; }
    fetch(C.nowPlayingUrl, { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (d) { var np = parse(d) || {}; setNowPlaying(np.title, np.artist); })
      .catch(function () { /* keep the last known title */ });
  }
  pollNowPlaying();
  if (C.nowPlayingType && C.nowPlayingType !== "none") {
    setInterval(pollNowPlaying, Math.max(5, C.nowPlayingInterval || 15) * 1000);
  }

  // ---------------------------------------------------------------
  // Schedule
  // ---------------------------------------------------------------
  var shows = {};
  (C.shows || []).forEach(function (s) { shows[s.id] = s; });

  function toMin(t) { var p = t.split(":"); return parseInt(p[0], 10) * 60 + parseInt(p[1], 10); }

  // Current day + minutes in the station's timezone
  function stationNow() {
    var tz = C.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    var parts = {};
    try {
      new Intl.DateTimeFormat("en-GB", {
        timeZone: tz, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23"
      }).formatToParts(new Date()).forEach(function (p) { parts[p.type] = p.value; });
    } catch (e) {
      var d = new Date();
      return { day: d.getDay(), min: d.getHours() * 60 + d.getMinutes(), label: d.toTimeString().slice(0, 5) };
    }
    var day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.weekday);
    var h = parseInt(parts.hour, 10) % 24, m = parseInt(parts.minute, 10);
    return { day: day, min: h * 60 + m, label: parts.hour + ":" + parts.minute };
  }

  function slotsFor(day) {
    return (C.schedule || [])
      .filter(function (s) { return s.days.indexOf(day) !== -1; })
      .map(function (s) { return { show: shows[s.show] || { name: s.show }, start: s.start, end: s.end, s: toMin(s.start), e: toMin(s.end) }; })
      .sort(function (a, b) { return a.s - b.s; });
  }

  function currentAndNext() {
    var now = stationNow();
    var today = slotsFor(now.day);
    var cur = null, next = null;
    for (var i = 0; i < today.length; i++) {
      if (now.min >= today[i].s && now.min < today[i].e) cur = today[i];
      else if (today[i].s > now.min && !next && !(cur && today[i].show === cur.show)) next = today[i];
    }
    if (!next) {
      // look into following days
      for (var k = 1; k <= 7 && !next; k++) {
        next = slotsFor((now.day + k) % 7).filter(function (x) { return !(cur && x.show === cur.show); })[0] || null;
      }
    }
    return { now: now, cur: cur, next: next };
  }

  var selectedDay = stationNow().day;
  var tabs = $("dayTabs");
  DAYS.forEach(function (name, i) {
    var b = document.createElement("button");
    b.type = "button";
    b.setAttribute("role", "tab");
    b.textContent = name.slice(0, 3);
    b.title = name;
    b.addEventListener("click", function () { selectedDay = i; renderSchedule(); });
    tabs.appendChild(b);
  });

  function renderSchedule() {
    var info = currentAndNext();
    Array.prototype.forEach.call(tabs.children, function (b, i) {
      b.setAttribute("aria-selected", i === selectedDay);
      b.textContent = i === info.now.day ? "Today" : DAYS[i].slice(0, 3);
    });
    var list = $("scheduleList");
    list.innerHTML = "";
    var slots = slotsFor(selectedDay);
    if (!slots.length) {
      var li0 = document.createElement("li");
      li0.textContent = "No shows scheduled.";
      list.appendChild(li0);
    }
    slots.forEach(function (s) {
      var li = document.createElement("li");
      var isNow = selectedDay === info.now.day && info.cur && info.cur.s === s.s;
      if (isNow) li.className = "now";
      li.innerHTML =
        '<span class="time"></span><span><strong class="name"></strong><br><span class="host"></span></span>' +
        (isNow ? '<span class="badge-now">ON AIR</span>' : "<span></span>");
      li.querySelector(".time").textContent = s.start + " – " + (s.end === "24:00" ? "00:00" : s.end);
      li.querySelector(".name").textContent = s.show.name;
      li.querySelector(".host").textContent = s.show.host ? "with " + s.show.host : "";
      list.appendChild(li);
    });
  }

  function renderNow() {
    var info = currentAndNext();
    $("clock").textContent = info.now.label;
    $("onAirNow").textContent = info.cur ? info.cur.show.name + (info.cur.show.host ? " with " + info.cur.show.host : "") : "Non-stop music";
    $("upNext").textContent = info.next ? info.next.show.name + " at " + info.next.start : "—";
    $("npShow").textContent = info.cur ? "On air: " + info.cur.show.name : "";
  }

  $("tzNote").textContent = "All times are " + (C.timezone || "local time") + ".";
  renderSchedule();
  renderNow();
  setInterval(function () { renderNow(); renderSchedule(); }, 30000);

  // ---------------------------------------------------------------
  // Shows
  // ---------------------------------------------------------------
  var grid = $("showGrid");
  (C.shows || []).forEach(function (s) {
    var card = document.createElement("article");
    card.className = "show-card";
    var initials = (s.host || s.name).split(/[\s&]+/).filter(Boolean).map(function (w) { return w[0]; }).join("").slice(0, 2).toUpperCase();
    card.innerHTML = '<div class="avatar"></div><h3></h3><div class="host"></div><p></p>';
    var av = card.querySelector(".avatar");
    if (s.image) { av.style.background = "url(" + JSON.stringify(s.image) + ") center/cover"; } else { av.textContent = initials; }
    card.querySelector("h3").textContent = s.name;
    card.querySelector(".host").textContent = s.host ? "with " + s.host : "";
    card.querySelector("p").textContent = s.description || "";
    grid.appendChild(card);
  });

  // ---------------------------------------------------------------
  // Contact & social
  // ---------------------------------------------------------------
  function addBtn(parent, href, label, primary) {
    var a = document.createElement("a");
    a.className = "btn" + (primary ? " primary" : "");
    a.href = href;
    a.textContent = label;
    if (/^https?:/.test(href)) { a.target = "_blank"; a.rel = "noopener"; }
    parent.appendChild(a);
  }
  var row = $("contactRow");
  if (C.whatsapp) addBtn(row, "https://wa.me/" + C.whatsapp.replace(/\D/g, "") + "?text=" + encodeURIComponent("Hi " + C.stationName + "! Song request: "), "WhatsApp a request", true);
  if (C.email) addBtn(row, "mailto:" + C.email, C.email, !C.whatsapp);
  [].concat(C.phone || []).forEach(function (ph) {
    ph = String(ph).trim();
    if (ph) addBtn(row, "tel:" + ph.replace(/[^\d+]/g, "").replace(/^0/, "+44"), "📞 " + ph);
  });

  var social = $("social");
  var names = { facebook: "Facebook", instagram: "Instagram", youtube: "YouTube", x: "X", tiktok: "TikTok" };
  Object.keys(C.social || {}).forEach(function (k) {
    if (!C.social[k]) return;
    var a = document.createElement("a");
    a.href = C.social[k]; a.target = "_blank"; a.rel = "noopener";
    a.textContent = names[k] || k;
    social.appendChild(a);
  });

  // ---------------------------------------------------------------
  // Active nav link while scrolling
  // ---------------------------------------------------------------
  if ("IntersectionObserver" in window) {
    var links = nav.querySelectorAll("a");
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (l) { l.classList.toggle("active", l.getAttribute("href") === "#" + en.target.id); });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    document.querySelectorAll("main section[id]").forEach(function (s) { io.observe(s); });
  }

  // Offline support for the page shell (the stream itself is never cached)
  if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register("sw.js").catch(function () {});
  }

  // Install-app button: native prompt where supported, instructions elsewhere
  (function () {
    var btn = document.getElementById("appBtn");
    if (!btn) return;
    var standalone = (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone;
    if (standalone) { btn.hidden = true; return; }
    var deferred = null;
    window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); deferred = e; });
    window.addEventListener("appinstalled", function () { btn.hidden = true; closeSheet(); });
    var ua = navigator.userAgent || "";
    var ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    var android = /Android/.test(ua);
    var sheet = null;
    function closeSheet() { if (sheet) sheet.hidden = true; }
    function showSheet() {
      var steps;
      if (ios) steps = "<li>Tap the <strong>Share</strong> button (square with an arrow) in Safari.</li><li>Choose <strong>Add to Home Screen</strong>.</li><li>Tap <strong>Add</strong>. Mizhi appears on your home screen.</li>";
      else if (android) steps = "<li>Tap the <strong>⋮ menu</strong> at the top right of Chrome.</li><li>Choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li><li>Tap <strong>Install</strong>.</li>";
      else steps = "<li>In Chrome or Edge, click the <strong>install icon</strong> at the right end of the address bar, or open the browser menu and choose <strong>Install Mizhi</strong>.</li><li>In Safari on Mac, choose <strong>File → Add to Dock</strong>.</li>";
      if (!sheet) {
        sheet = document.createElement("div");
        sheet.className = "app-sheet"; sheet.setAttribute("role", "dialog"); sheet.setAttribute("aria-modal", "true");
        sheet.addEventListener("click", function (e) { if (e.target === sheet || e.target.tagName === "BUTTON") closeSheet(); });
        document.body.appendChild(sheet);
      }
      sheet.innerHTML = '<div class="app-sheet-card"><h2>Get the Mizhi app</h2><div class="ml">മിഴി ആപ്പ് ഫോണിൽ ചേർക്കാം</div><ol>' + steps + '</ol><p style="margin:0;color:#555;font-size:.9rem">Free. No app store needed. News and Mizhi FM open from your home screen.</p><button type="button">OK</button></div>';
      sheet.hidden = false;
    }
    btn.addEventListener("click", function () {
      if (deferred) {
        deferred.prompt();
        deferred.userChoice.then(function (c) { if (c && c.outcome === "accepted") btn.hidden = true; deferred = null; });
      } else showSheet();
    });
  })();
})();
