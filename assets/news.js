(function () {
  "use strict";

  var C = window.RADIO_CONFIG || {};
  var P = window.MIZHI_NEWS_PAGE || {};
  var NEWS = window.MIZHI_NEWS || [];
  var $ = function (id) { return document.getElementById(id); };

  // Branding (same as the home page)
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
  $("year").textContent = new Date().getFullYear();

  // Music credits (footer)
  var mc = document.getElementById("musicCredits");
  if (mc) (C.musicCredits || []).forEach(function (line) {
    var p = document.createElement("p");
    p.textContent = line;
    mc.appendChild(p);
  });

  // Page title
  if (P.title) $("newsTitle").textContent = P.title;
  if (P.titleMl) $("newsTitleMl").textContent = P.titleMl;
  $("newsIntro").textContent = P.intro || "";
  $("newsIntroMl").textContent = P.introMl || "";
  if (P.title) document.title = P.title + (P.titleMl ? " | " + P.titleMl : "");

  // Background video
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
  }
  // The news page is mostly text, so keep the background darker for reading.
  document.body.classList.add("scrolled");

  // Mobile menu
  var nav = $("nav"), menuBtn = $("menuBtn");
  menuBtn.addEventListener("click", function () {
    var open = nav.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", open);
  });

  // News list
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }
  function fmtDate(s) {
    var d = new Date(s + "T12:00:00");
    if (isNaN(d)) return s;
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  }

  var list = $("newsList");
  var items = NEWS.slice().sort(function (a, b) { return (b.date || "").localeCompare(a.date || ""); });
  if (!items.length) {
    list.appendChild(el("p", "news-empty", "No news yet. Check back soon."));
    return;
  }
  items.forEach(function (n) {
    var card = el("article", "news-card");
    var t = el("time", "", fmtDate(n.date));
    t.setAttribute("datetime", n.date || "");
    card.appendChild(t);
    if (n.title) card.appendChild(el("h2", "", n.title));
    if (n.titleMl) card.appendChild(el("p", "h-ml ml", n.titleMl));
    if (n.summary) card.appendChild(el("p", "", n.summary));
    if (n.summaryMl) card.appendChild(el("p", "ml", n.summaryMl));
    if (n.link && /^https?:\/\//.test(n.link)) {
      var a = el("a", "more", "Read more →");
      a.href = n.link;
      a.target = "_blank";
      a.rel = "noopener";
      card.appendChild(a);
    }
    if (n.tag) card.appendChild(el("span", "tag", n.tag));
    list.appendChild(card);
  });
})();
