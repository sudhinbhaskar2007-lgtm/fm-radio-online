(function () {
  "use strict";

  var C = window.RADIO_CONFIG || {};
  var P = window.MIZHI_NEWS_PAGE || {};
  var CATS = P.categories || [];
  var $ = function (id) { return document.getElementById(id); };
  var TZ = C.timezone || "Europe/London";

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null && text !== "") e.textContent = text;
    return e;
  }
  function slug(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60); }
  var catById = {};
  CATS.forEach(function (c) { catById[c.id] = c; });

  // News stories and photo albums live in data/news.json and data/gallery.json
  // (edited by the team on the admin page). Newest first, each with an id.
  function prep(list, prefix) {
    var seen = {};
    return (Array.isArray(list) ? list : []).filter(function (n) { return n && n.title; }).map(function (n, i) {
      n = Object.assign({}, n);
      n.date = String(n.date || "").slice(0, 10);
      var id = slug(n.id) || slug(n.date + "-" + n.title) || prefix + i;
      while (seen[id]) id += "-" + i;
      seen[id] = true;
      n.id = id;
      return n;
    }).sort(function (a, b) { return (b.date || "").localeCompare(a.date || ""); });
  }
  var NEWS = [], ALBUMS = [], dataReady = false;

  // (Branding, background video, menu and footer are handled by app.js;
  //  the news view lives inside index.html so the radio keeps playing.)
  if (P.title) $("newsTitle").textContent = P.title;
  if (P.titleMl) $("newsTitleMl").textContent = P.titleMl;
  $("newsTagline").textContent = P.tagline || "";
  $("newsTaglineMl").textContent = P.taglineMl || "";

  // Contact links (send news / advertise)
  var mail = C.email ? "mailto:" + C.email : "";
  var wa = C.whatsapp ? "https://wa.me/" + String(C.whatsapp).replace(/\D/g, "") : "";
  function contactHref(subject) {
    if (wa) return wa + "?text=" + encodeURIComponent(subject);
    if (mail) return mail + "?subject=" + encodeURIComponent(subject);
    return "index.html#contact";
  }
  var send = $("npSend");
  if (wa) { var w = el("a", "btn primary", "WhatsApp"); w.href = contactHref("News for Mizhi: "); w.target = "_blank"; w.rel = "noopener"; send.appendChild(w); }
  if (mail) { var m = el("a", "btn", "Email"); m.href = mail + "?subject=" + encodeURIComponent("News for Mizhi UK Malayalam News"); send.appendChild(m); }
  var phones = [].concat(C.phone || []).map(function (p) { return String(p).trim(); }).filter(Boolean);
  phones.forEach(function (ph) { var t = el("a", "btn", "📞 " + ph); t.href = "tel:" + ph.replace(/[^\d+]/g, "").replace(/^0/, "+44"); send.appendChild(t); });
  if (!wa && !mail && !phones.length) { var cl = el("a", "btn primary", "Contact us"); cl.href = "index.html#contact"; send.appendChild(cl); }
  $("adBtn").href = contactHref("Advertising on Mizhi FM / Mizhi News");
  $("mastAd").href = contactHref("Advertising on Mizhi FM / Mizhi News");

  // ---------------------------------------------------------------
  // Info bar: date, UK time, London weather, £ to ₹
  // ---------------------------------------------------------------
  function tick() {
    var now = new Date();
    $("npDate").textContent = now.toLocaleDateString("en-GB", { timeZone: TZ, weekday: "long", day: "numeric", month: "long", year: "numeric" });
    $("npTime").textContent = now.toLocaleTimeString("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
  }
  tick(); setInterval(tick, 20000);

  function getJSON(url, opts) { return fetch(url, opts).then(function (r) { if (!r.ok) throw r; return r.json(); }); }

  // Weather and exchange rate come from outside services, so only after consent.
  var extrasLoaded = false;
  function loadExtras() {
    if (extrasLoaded) return;
    extrasLoaded = true;
    var WX = { 0: "☀️", 1: "🌤️", 2: "⛅", 3: "☁️", 45: "🌫️", 48: "🌫️", 51: "🌦️", 53: "🌦️", 55: "🌧️", 61: "🌧️", 63: "🌧️", 65: "🌧️", 71: "🌨️", 73: "🌨️", 75: "❄️", 80: "🌦️", 81: "🌧️", 82: "⛈️", 95: "⛈️" };
    getJSON("https://api.open-meteo.com/v1/forecast?latitude=51.51&longitude=-0.13&current=temperature_2m,weather_code&timezone=Europe%2FLondon")
      .then(function (d) {
        var c = d.current; if (!c) return;
        $("npWeather").textContent = (WX[c.weather_code] || "🌡️") + " London " + Math.round(c.temperature_2m) + "°C";
        $("npWeather").hidden = false;
      }).catch(function () {});
    getJSON("https://open.er-api.com/v6/latest/GBP")
      .then(function (d) {
        var r = d && d.rates && d.rates.INR; if (!r) return;
        $("npFx").textContent = "£1 = ₹" + r.toFixed(2);
        $("npFx").hidden = false;
      }).catch(function () {});
  }

  // ---------------------------------------------------------------
  // Consent pop-up
  // ---------------------------------------------------------------
  var CKEY = "mizhi-consent-v1";
  function getConsent() { try { return localStorage.getItem(CKEY); } catch (e) { return null; } }
  function setConsent(v) { try { localStorage.setItem(CKEY, v); } catch (e) {} }
  var consentBox = $("npConsent");
  function showConsent() {
    consentBox.hidden = false;
    document.body.classList.add("consent-open");
    $("csAccept").focus();
  }
  function decide(v) {
    setConsent(v);
    consentBox.hidden = true;
    document.body.classList.remove("consent-open");
    if (v === "all") loadExtras();
  }
  $("csAccept").addEventListener("click", function () { decide("all"); });
  $("csEssential").addEventListener("click", function () { decide("essential"); });
  $("csOpen").addEventListener("click", showConsent);
  var saved = getConsent();
  if (saved === "all") loadExtras();

  // ---------------------------------------------------------------
  // Category menu
  // ---------------------------------------------------------------
  var cats = $("npCats"), sideCats = $("npSideCats");
  function catLink(c, cls) {
    var a = el("a", cls);
    a.href = c ? "#cat=" + c.id : "#news";
    a.dataset.cat = c ? c.id : "";
    if (c) a.style.setProperty("--c", c.color || "var(--accent)");
    a.appendChild(el("span", "ml", c ? c.ml : "ഹോം"));
    a.appendChild(el("small", "", c ? c.en : "Home"));
    return a;
  }
  cats.appendChild(catLink(null, "np-cat"));
  CATS.forEach(function (c) { cats.appendChild(catLink(c, "np-cat")); });
  var galLink = el("a", "np-cat np-cat-gallery");
  galLink.href = "#gallery"; galLink.dataset.cat = "@gallery";
  galLink.appendChild(el("span", "ml", "ചിത്രങ്ങൾ"));
  galLink.appendChild(el("small", "", "Photo gallery"));
  cats.appendChild(galLink);

  function sideCounts() {
    sideCats.textContent = "";
    CATS.forEach(function (c) {
      var count = NEWS.filter(function (n) { return n.category === c.id; }).length;
      var s = catLink(c, "np-side-cat");
      s.appendChild(el("b", "", String(count)));
      sideCats.appendChild(s);
    });
  }

  // ---------------------------------------------------------------
  // Breaking ticker
  // ---------------------------------------------------------------
  function buildTicker() {
    var breaking = NEWS.filter(function (n) { return n.breaking; });
    var track = $("npTicker");
    track.textContent = "";
    $("npBreaking").hidden = !breaking.length;
    if (!breaking.length) return;
    for (var r = 0; r < 2; r++) {
      breaking.forEach(function (n) {
        var a = el("a", "", n.titleMl || n.title);
        if (n.titleMl) a.classList.add("ml");
        a.href = "#story=" + n.id;
        track.appendChild(a);
      });
    }
    track.style.animationDuration = Math.max(18, breaking.length * 14) + "s";
  }

  // ---------------------------------------------------------------
  // Cards
  // ---------------------------------------------------------------
  function fmtDate(s) {
    var d = new Date((s || "") + "T12:00:00");
    if (isNaN(d)) return s || "";
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }
  function safeImg(src) {
    src = String(src || "").trim();
    if (/^\/assets\//.test(src)) src = src.slice(1); // admin uploads may start with "/"
    return src && (/^https:\/\//.test(src) || /^[\w\-./%]+$/.test(src)) && !/\.\./.test(src) ? src : "";
  }
  function thumb(n, cls) {
    var c = catById[n.category] || {};
    var t = el("div", "np-thumb " + (cls || ""));
    t.style.setProperty("--c", c.color || "var(--accent)");
    var src = safeImg(n.image);
    if (src) {
      var i = new Image(); i.src = src; i.alt = ""; i.loading = "lazy";
      t.appendChild(i);
    } else {
      t.classList.add("np-thumb-empty");
      t.appendChild(el("span", "ml", c.ml || "മിഴി"));
    }
    return t;
  }
  function meta(n) {
    var c = catById[n.category];
    var m = el("div", "np-meta");
    if (c) {
      var b = el("span", "np-badge", c.en + " · ");
      b.style.setProperty("--c", c.color);
      b.appendChild(el("span", "ml", c.ml));
      m.appendChild(b);
    }
    var t = el("time", "", fmtDate(n.date)); t.dateTime = n.date || "";
    m.appendChild(t);
    return m;
  }
  function card(n, kind) {
    var a = el("a", "np-card np-card-" + kind);
    a.href = "#story=" + n.id;
    a.appendChild(thumb(n));
    var b = el("div", "np-card-body");
    b.appendChild(meta(n));
    if (n.titleMl) b.appendChild(el("h3", "np-h-ml ml", n.titleMl));
    b.appendChild(el(n.titleMl ? "p" : "h3", n.titleMl ? "np-h-en" : "np-h-ml", n.title));
    if (kind !== "small" && (n.summaryMl || n.summary)) {
      var sm = el("p", "np-sum" + (n.summaryMl ? " ml" : ""), n.summaryMl || n.summary);
      b.appendChild(sm);
    }
    a.appendChild(b);
    return a;
  }

  function render(cat) {
    showGalleryView(false);
    var list = cat ? NEWS.filter(function (n) { return n.category === cat; }) : NEWS;
    var lead = $("npLead"), grid = $("npGrid");
    lead.textContent = ""; grid.textContent = "";
    var c = catById[cat];
    var h = $("npHeading"); h.textContent = "";
    h.appendChild(document.createTextNode(c ? c.en + " " : "Top stories "));
    h.appendChild(el("span", "ml", c ? c.ml : "പ്രധാന വാർത്തകൾ"));

    document.querySelectorAll(".np-cat, .np-side-cat").forEach(function (a) {
      a.classList.toggle("active", (a.dataset.cat || "") === (cat || ""));
    });

    if (!list.length) {
      lead.appendChild(el("p", "np-empty", dataReady ? "No news in this section yet. Check back soon." : "Loading news…"));
      return;
    }
    var top = list.filter(function (n) { return n.featured; })[0] || list[0];
    var rest = list.filter(function (n) { return n !== top; });
    lead.appendChild(card(top, "lead"));
    var side = el("div", "np-lead-side");
    rest.slice(0, 2).forEach(function (n) { side.appendChild(card(n, "small")); });
    if (side.children.length) lead.appendChild(side);
    rest.slice(2).forEach(function (n) { grid.appendChild(card(n, "grid")); });
    if (!rest.slice(2).length) grid.appendChild(el("p", "np-empty", rest.length ? "More news coming soon." : "More news coming soon. Send us yours!"));
  }

  // ---------------------------------------------------------------
  // Photo gallery: #gallery (all albums) and #album=id (one album)
  // ---------------------------------------------------------------
  function photosOf(a) {
    var p = Array.isArray(a.photos) ? a.photos : (a.photos ? [a.photos] : []);
    return p.map(function (x) { return safeImg(typeof x === "string" ? x : x && (x.image || x.src)); }).filter(Boolean);
  }
  function showGalleryView(on) {
    $("npNewsMain").hidden = on;
    $("npGalleryView").hidden = !on;
  }
  function galHeading(en, ml) {
    var h = $("glHeading"); h.textContent = "";
    h.appendChild(document.createTextNode(en + " "));
    h.appendChild(el("span", "ml", ml));
  }
  function setActiveCat(id) {
    document.querySelectorAll(".np-cat, .np-side-cat").forEach(function (a) {
      a.classList.toggle("active", (a.dataset.cat || "") === id);
    });
  }
  function photoTile(src, label, href, onClick) {
    var a = el(href ? "a" : "button", "np-gl-tile");
    if (href) a.href = href; else a.type = "button";
    var i = new Image(); i.src = src; i.alt = label || ""; i.loading = "lazy";
    a.appendChild(i);
    if (onClick) a.addEventListener("click", onClick);
    return a;
  }
  function renderGallery() {
    showGalleryView(true);
    setActiveCat("@gallery");
    galHeading("Photo gallery", "ചിത്രങ്ങൾ");
    $("glBack").hidden = true;
    var d = $("glDesc"); d.textContent = ""; d.hidden = true;
    var grid = $("glGrid"); grid.textContent = ""; grid.className = "np-gl-albums";
    var albums = ALBUMS.filter(function (a) { return photosOf(a).length; });
    if (!albums.length) {
      grid.appendChild(el("p", "np-empty", dataReady ? "No photos yet. Check back soon." : "Loading photos…"));
      return;
    }
    albums.forEach(function (a) {
      var ph = photosOf(a);
      var c = el("a", "np-card np-gl-album");
      c.href = "#album=" + a.id;
      var t = el("div", "np-thumb");
      var i = new Image(); i.src = ph[0]; i.alt = ""; i.loading = "lazy"; t.appendChild(i);
      t.appendChild(el("span", "np-gl-count", ph.length + (ph.length === 1 ? " photo" : " photos")));
      c.appendChild(t);
      var b = el("div", "np-card-body");
      var m = el("div", "np-meta"); var tm = el("time", "", fmtDate(a.date)); tm.dateTime = a.date; m.appendChild(tm); b.appendChild(m);
      if (a.titleMl) b.appendChild(el("h3", "np-h-ml ml", a.titleMl));
      b.appendChild(el(a.titleMl ? "p" : "h3", a.titleMl ? "np-h-en" : "np-h-ml", a.title));
      c.appendChild(b);
      grid.appendChild(c);
    });
  }
  function renderAlbum(id) {
    var a = ALBUMS.filter(function (x) { return x.id === id; })[0];
    if (!a) { renderGallery(); return; }
    showGalleryView(true);
    setActiveCat("@gallery");
    galHeading(a.title, a.titleMl || "");
    $("glBack").hidden = false;
    var d = $("glDesc"); d.textContent = "";
    var desc = [a.descriptionMl, a.description].filter(Boolean);
    desc.forEach(function (t, k) { d.appendChild(el("p", k === 0 && a.descriptionMl ? "ml" : "", t)); });
    var dt = el("p", "muted small", fmtDate(a.date)); d.insertBefore(dt, d.firstChild);
    d.hidden = false;
    var grid = $("glGrid"); grid.textContent = ""; grid.className = "np-gl-photos";
    var ph = photosOf(a);
    ph.forEach(function (src, k) {
      grid.appendChild(photoTile(src, a.title + " " + (k + 1), null, function () { openLightbox(ph, k, a.title); }));
    });
    document.title = a.title + " | " + (P.title || "Mizhi News");
  }
  function sideGallery() {
    var box = $("npSideGallery"), grid = $("npSideGalleryGrid");
    grid.textContent = "";
    var tiles = [];
    ALBUMS.forEach(function (a) { photosOf(a).slice(0, 3).forEach(function (src) { if (tiles.length < 6) tiles.push([src, a]); }); });
    box.hidden = !tiles.length;
    tiles.forEach(function (t) { grid.appendChild(photoTile(t[0], t[1].title, "#album=" + t[1].id)); });
  }

  // Lightbox (full-screen photo with previous / next)
  var lb = $("npLightbox"), lbList = [], lbIdx = 0, lbFocus = null;
  function lbShow() {
    $("lbImg").src = lbList[lbIdx];
    $("lbCap").textContent = (lbIdx + 1) + " / " + lbList.length;
    lb.querySelector("[data-lb=prev]").hidden = lb.querySelector("[data-lb=next]").hidden = lbList.length < 2;
  }
  function openLightbox(list, i, title) {
    lbList = list; lbIdx = i; lbFocus = document.activeElement;
    $("lbImg").alt = title || "";
    lbShow();
    lb.hidden = false;
    document.body.classList.add("reader-open");
    lb.querySelector("[data-lb=close]").focus();
  }
  function closeLightbox() {
    if (lb.hidden) return false;
    lb.hidden = true;
    document.body.classList.remove("reader-open");
    if (lbFocus && lbFocus.focus) lbFocus.focus();
    return true;
  }
  function lbStep(d) { lbIdx = (lbIdx + d + lbList.length) % lbList.length; lbShow(); }
  lb.addEventListener("click", function (e) {
    var b = e.target.closest("[data-lb]");
    if (b) { var k = b.dataset.lb; if (k === "close") closeLightbox(); else lbStep(k === "next" ? 1 : -1); }
    else if (e.target === lb) closeLightbox();
  });
  document.addEventListener("keydown", function (e) {
    if (lb.hidden) return;
    if (e.key === "ArrowRight") lbStep(1);
    else if (e.key === "ArrowLeft") lbStep(-1);
  });
  var tx = null;
  lb.addEventListener("touchstart", function (e) { tx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener("touchend", function (e) {
    if (tx == null) return;
    var dx = e.changedTouches[0].clientX - tx; tx = null;
    if (Math.abs(dx) > 50 && lbList.length > 1) lbStep(dx < 0 ? 1 : -1);
  });

  // ---------------------------------------------------------------
  // Story reader
  // ---------------------------------------------------------------
  var reader = $("npReader"), lastFocus = null, readerLang = "ml", current = null;
  // Stories open as a full article page inside the news column (own link: #story=id).
  document.querySelector(".np-main").appendChild(reader);
  reader.classList.add("np-article");
  reader.querySelector(".np-reader-card").removeAttribute("aria-modal");
  reader.querySelector(".np-reader-card").removeAttribute("role");
  var backBtn = reader.querySelector(".np-reader-close");
  backBtn.textContent = "← Back to news";
  backBtn.setAttribute("aria-label", "Back to news");
  var moreBox = el("section", "np-article-more");
  reader.appendChild(moreBox);
  function paragraphs(text, ml) {
    var box = $("rdText"); box.textContent = "";
    String(text || "").split(/\n\s*\n/).forEach(function (p) {
      if (p.trim()) box.appendChild(el("p", ml ? "ml" : "", p.trim()));
    });
  }
  function showLang(lang) {
    readerLang = lang;
    var n = current;
    var ml = lang === "ml";
    var text = ml ? (n.bodyMl || n.summaryMl) : (n.body || n.summary);
    paragraphs(text, ml);
    if (n.link && /^https?:\/\//.test(n.link)) {
      var a = el("a", "np-more", "Read more →"); a.href = n.link; a.target = "_blank"; a.rel = "noopener";
      $("rdText").appendChild(a);
    }
    document.querySelectorAll("#rdLang button").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.lang === lang); });
  }
  function openStory(id) {
    var n = NEWS.filter(function (x) { return x.id === id; })[0];
    if (!n) return;
    current = n;
    lastFocus = document.activeElement;
    var im = $("rdImg"); im.textContent = ""; im.appendChild(thumb(n, "np-thumb-big"));
    if (n.imageCredit && safeImg(n.image)) {
      var cr = el(/^https:\/\//.test(n.imageCreditLink || "") ? "a" : "p", "np-credit", n.imageCredit);
      if (cr.tagName === "A") { cr.href = n.imageCreditLink; cr.target = "_blank"; cr.rel = "noopener"; }
      im.appendChild(cr);
    }
    var m = $("rdMeta"); m.replaceWith(meta(n)); reader.querySelector(".np-meta").id = "rdMeta";
    // Malayalam headline is the main (big) heading; English goes underneath, smaller.
    var mainMl = !!n.titleMl;
    $("rdTitle").textContent = mainMl ? n.titleMl : n.title;
    $("rdTitle").classList.toggle("ml", mainMl);
    $("rdTitleMl").textContent = mainMl ? n.title : "";
    $("rdTitleMl").classList.toggle("ml", false);
    var hasEn = !!(n.body || n.summary), hasMl = !!(n.bodyMl || n.summaryMl);
    $("rdLang").hidden = !(hasEn && hasMl);
    showLang(hasMl && readerLang === "ml" ? "ml" : (hasEn ? "en" : "ml"));

    var share = $("rdShare"); share.textContent = "";
    var url = location.href.split("#")[0] + "#story=" + n.id;
    var msg = (n.titleMl ? n.titleMl + "\n" : "") + n.title + "\n" + url;
    var w = el("a", "btn primary", "Share on WhatsApp"); w.href = "https://wa.me/?text=" + encodeURIComponent(msg); w.target = "_blank"; w.rel = "noopener";
    share.appendChild(w);
    var f = el("a", "btn", "Facebook"); f.href = "https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(url); f.target = "_blank"; f.rel = "noopener";
    share.appendChild(f);
    if (navigator.clipboard) {
      var cp = el("button", "btn", "Copy link");
      cp.addEventListener("click", function () { navigator.clipboard.writeText(url).then(function () { cp.textContent = "Copied ✓"; }); });
      share.appendChild(cp);
    }
    // More stories under the article
    moreBox.textContent = "";
    var others = NEWS.filter(function (x) { return x !== n; });
    var same = others.filter(function (x) { return x.category === n.category; });
    var pick = same.concat(others.filter(function (x) { return same.indexOf(x) < 0; })).slice(0, 4);
    if (pick.length) {
      var hh = el("h2", "np-section-title", "More news ");
      hh.appendChild(el("span", "ml", "കൂടുതൽ വാർത്തകൾ"));
      moreBox.appendChild(hh);
      var g = el("div", "np-grid");
      pick.forEach(function (x) { g.appendChild(card(x, "grid")); });
      moreBox.appendChild(g);
    }
    $("npNewsMain").hidden = true;
    $("npGalleryView").hidden = true;
    reader.hidden = false;
    document.title = n.title + " | " + (P.title || "Mizhi News");
    var bars = (document.querySelector(".topbar") || {}).offsetHeight || 64;
    bars += (document.querySelector(".np-cats") || {}).offsetHeight || 0;
    window.scrollTo(0, Math.max(0, reader.getBoundingClientRect().top + window.scrollY - bars - 12));
    $("rdTitle").setAttribute("tabindex", "-1");
    $("rdTitle").focus({ preventScroll: true });
  }
  function closeStory() {
    if (reader.hidden) return;
    reader.hidden = true;
    $("npNewsMain").hidden = false;
    if (/^#story=/.test(location.hash)) {
      document.title = (P.title || "Mizhi News") + (P.titleMl ? " | " + P.titleMl : "");
      history.replaceState(null, "", location.pathname + location.search + (lastCat ? "#cat=" + lastCat : "#news"));
    }
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  reader.addEventListener("click", function (e) { if (e.target.hasAttribute("data-close")) closeStory(); });
  $("rdLang").addEventListener("click", function (e) { var l = e.target.closest("button"); if (l) showLang(l.dataset.lang); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && consentBox.hidden && !closeLightbox()) closeStory(); });

  // ---------------------------------------------------------------
  // Routing: #cat=uk  /  #story=id
  // ---------------------------------------------------------------
  var lastCat = "";
  var newsView = $("newsView"), radioView = $("radioView"), siteTitle = document.title;
  function setView(v) {
    var isNews = v === "news";
    var changed = newsView.hidden === isNews;
    newsView.hidden = !isNews;
    radioView.hidden = isNews;
    document.body.classList.toggle("news-view", isNews);
    $("tabNews").classList.toggle("active", isNews);
    $("tabFm").classList.toggle("active", !isNews);
    if (isNews) { $("tabNews").setAttribute("aria-current", "page"); $("tabFm").removeAttribute("aria-current"); }
    else { $("tabFm").setAttribute("aria-current", "page"); $("tabNews").removeAttribute("aria-current"); }
    document.title = isNews ? (P.title || "Mizhi News") + (P.titleMl ? " | " + P.titleMl : "") : siteTitle;
    if (isNews && !getConsent()) showConsent();
    return changed;
  }
  function route() {
    var h = location.hash;
    // News is the first page: an empty address opens the news.
    var isNews = !h || h === "#" || /^#(news|cat=|story=|gallery|album=)/.test(h);
    var changed = setView(isNews ? "news" : "radio");
    if (!isNews) {
      closeStory(); closeLightbox();
      if (changed) {
        var target = h && h.length > 1 && document.getElementById(h.slice(1));
        if (target) target.scrollIntoView(); else window.scrollTo(0, 0);
      }
      return;
    }
    if (changed && !/^#story=/.test(h)) window.scrollTo(0, 0);
    var mCat = h.match(/^#cat=([\w-]+)/), mStory = h.match(/^#story=([\w-]+)/), mAlbum = h.match(/^#album=([\w-]+)/);
    if (mStory) { if (!lastRendered) render(""); lastRendered = true; openStory(mStory[1]); return; }
    closeStory(); closeLightbox();
    if (mAlbum) { renderAlbum(mAlbum[1]); lastRendered = true; window.scrollTo(0, 0); return; }
    if (/^#gallery/.test(h)) { renderGallery(); lastRendered = true; if (!changed) window.scrollTo({ top: document.querySelector(".np-cats").offsetTop - 64, behavior: "smooth" }); return; }
    lastCat = mCat && catById[mCat[1]] ? mCat[1] : "";
    render(lastCat); lastRendered = true;
    if (mCat) window.scrollTo({ top: document.querySelector(".np-cats").offsetTop - 64, behavior: "smooth" });
  }
  var lastRendered = false;
  window.addEventListener("hashchange", route);
  route();

  // Load the team's latest news and photos, then draw the page again.
  // (Falls back to news-data.js if the files can't be read, e.g. opened from disk.)
  function loadData(url, fallback) {
    return getJSON(url, { cache: "no-store" }).catch(function () { return fallback || []; });
  }
  Promise.all([loadData("data/news.json", window.MIZHI_NEWS), loadData("data/gallery.json", window.MIZHI_GALLERY)]).then(function (d) {
    NEWS = prep(d[0], "story-");
    ALBUMS = prep(d[1], "album-");
    dataReady = true;
    sideCounts();
    buildTicker();
    sideGallery();
    route();
  });

  // UK headlines from BBC / Sky (headline + link only, refreshed by a scheduled job)
  function ago(t) {
    var m = Math.round((Date.now() - new Date(t)) / 60000);
    if (!(m >= 0)) return "";
    if (m < 60) return m + " min ago";
    if (m < 1440) return Math.round(m / 60) + " h ago";
    return Math.round(m / 1440) + " d ago";
  }
  getJSON("data/headlines.json", { cache: "no-store" }).then(function (d) {
    var items = (d && d.items || []).filter(function (h) { return h.title && /^https:\/\//.test(h.link); }).slice(0, 10);
    if (!items.length) return;
    var ol = $("npHlList");
    items.forEach(function (h) {
      var li = el("li");
      var a = el("a", "", h.title); a.href = h.link; a.target = "_blank"; a.rel = "noopener";
      li.appendChild(a);
      var m = el("span", "np-hl-meta");
      var src = el("b", h.source === "BBC News" ? "src-bbc" : "src-sky", h.source);
      m.appendChild(src);
      if (h.time) m.appendChild(document.createTextNode(" · " + ago(h.time)));
      li.appendChild(m);
      ol.appendChild(li);
    });
    if (d.updated) $("npHlUpdated").textContent = "Updated " + ago(d.updated);
    $("npHeadlines").hidden = false;
  }).catch(function () {});

  // ---------------------------------------------------------------
  // Sidebar radio button: controls the same player as the radio page,
  // so music keeps playing when you switch between News and FM.
  // ---------------------------------------------------------------
  var mainPlay = $("playBtn"), npNow = $("npNow"), mainTitle = $("npTitle");
  $("npPlay").addEventListener("click", function () { mainPlay.click(); });
  function syncNow() {
    var on = document.body.classList.contains("playing") || document.body.classList.contains("loading");
    $("npPlay").setAttribute("aria-label", on ? "Stop Mizhi FM" : "Play Mizhi FM");
    npNow.textContent = on ? "♪ " + (mainTitle.textContent || "Live") : "Press play to listen live";
  }
  new MutationObserver(syncNow).observe(document.body, { attributes: true, attributeFilter: ["class"] });
  new MutationObserver(syncNow).observe(mainTitle, { childList: true, characterData: true, subtree: true });
  syncNow();
})();
