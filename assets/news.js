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

  // News items, newest first, each with an id
  var NEWS = (window.MIZHI_NEWS || []).filter(function (n) { return n && n.title; }).map(function (n, i) {
    n = Object.assign({}, n);
    n.id = n.id || slug(n.date + "-" + n.title) || "story-" + i;
    return n;
  }).sort(function (a, b) { return (b.date || "").localeCompare(a.date || ""); });

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
  if (!wa && !mail) { var cl = el("a", "btn primary", "Contact us"); cl.href = "index.html#contact"; send.appendChild(cl); }
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

  function getJSON(url) { return fetch(url).then(function (r) { if (!r.ok) throw r; return r.json(); }); }

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
  CATS.forEach(function (c) {
    cats.appendChild(catLink(c, "np-cat"));
    var count = NEWS.filter(function (n) { return n.category === c.id; }).length;
    var s = catLink(c, "np-side-cat");
    s.appendChild(el("b", "", String(count)));
    sideCats.appendChild(s);
  });

  // ---------------------------------------------------------------
  // Breaking ticker
  // ---------------------------------------------------------------
  var breaking = NEWS.filter(function (n) { return n.breaking; });
  if (breaking.length) {
    var track = $("npTicker");
    for (var rep = 0; rep < 2; rep++) {
      breaking.forEach(function (n) {
        var a = el("a", "", n.titleMl || n.title);
        if (n.titleMl) a.classList.add("ml");
        a.href = "#story=" + n.id;
        track.appendChild(a);
      });
    }
    track.style.animationDuration = Math.max(18, breaking.length * 14) + "s";
    $("npBreaking").hidden = false;
  }

  // ---------------------------------------------------------------
  // Cards
  // ---------------------------------------------------------------
  function fmtDate(s) {
    var d = new Date((s || "") + "T12:00:00");
    if (isNaN(d)) return s || "";
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }
  function safeImg(src) { return src && (/^https:\/\//.test(src) || /^[\w\-./]+$/.test(src)) ? src : ""; }
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
      lead.appendChild(el("p", "np-empty", "No news in this section yet. Check back soon."));
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
  // Story reader
  // ---------------------------------------------------------------
  var reader = $("npReader"), lastFocus = null, readerLang = "en", current = null;
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
    var m = $("rdMeta"); m.replaceWith(meta(n)); reader.querySelector(".np-meta").id = "rdMeta";
    $("rdTitle").textContent = n.title;
    $("rdTitleMl").textContent = n.titleMl || "";
    var hasEn = !!(n.body || n.summary), hasMl = !!(n.bodyMl || n.summaryMl);
    $("rdLang").hidden = !(hasEn && hasMl);
    showLang(hasMl && !hasEn ? "ml" : (readerLang === "ml" && hasMl ? "ml" : "en"));

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
    reader.hidden = false;
    document.body.classList.add("reader-open");
    document.title = n.title + " | " + (P.title || "Mizhi News");
    reader.querySelector(".np-reader-close").focus();
  }
  function closeStory() {
    if (reader.hidden) return;
    reader.hidden = true;
    document.body.classList.remove("reader-open");
    if (/^#story=/.test(location.hash)) {
      document.title = (P.title || "Mizhi News") + (P.titleMl ? " | " + P.titleMl : "");
      history.replaceState(null, "", location.pathname + location.search + (lastCat ? "#cat=" + lastCat : "#news"));
    }
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  reader.addEventListener("click", function (e) { if (e.target.hasAttribute("data-close")) closeStory(); });
  $("rdLang").addEventListener("click", function (e) { var l = e.target.closest("button"); if (l) showLang(l.dataset.lang); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && consentBox.hidden) closeStory(); });

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
    var isNews = /^#(news|cat=|story=)/.test(h);
    var changed = setView(isNews ? "news" : "radio");
    if (!isNews) {
      closeStory();
      if (changed) {
        var target = h && h.length > 1 && document.getElementById(h.slice(1));
        if (target) target.scrollIntoView(); else window.scrollTo(0, 0);
      }
      return;
    }
    if (changed && !/^#story=/.test(h)) window.scrollTo(0, 0);
    var mCat = h.match(/^#cat=([\w-]+)/), mStory = h.match(/^#story=([\w-]+)/);
    if (mStory) { if (!lastRendered) render(""); openStory(mStory[1]); return; }
    closeStory();
    lastCat = mCat && catById[mCat[1]] ? mCat[1] : "";
    render(lastCat); lastRendered = true;
    if (mCat) window.scrollTo({ top: document.querySelector(".np-cats").offsetTop - 64, behavior: "smooth" });
  }
  var lastRendered = false;
  window.addEventListener("hashchange", route);
  render(""); lastRendered = true;
  route();

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
