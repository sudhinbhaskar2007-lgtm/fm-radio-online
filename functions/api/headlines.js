// Cloudflare Pages Function: GET /api/headlines
// Live headline list for the breaking ticker and the headlines box.
// Only each feed's headline, link, source and time are passed on (no article
// text or pictures); readers click through to the original website.
// Cached at Cloudflare's edge for 15 minutes, so the ticker stays fresh
// without new commits or site rebuilds.
// The newest English headlines picked for the ticker also get a Malayalam
// version (titleMl), made by Cloudflare Workers AI (binding "AI" in
// wrangler.toml). Each translation is cached for a week, so a headline is
// only translated once.

const FEEDS = [
  { source: "BBC News", region: "uk", url: "https://feeds.bbci.co.uk/news/uk/rss.xml" },
  { source: "Sky News", region: "uk", url: "https://feeds.skynews.com/feeds/rss/uk.xml" },
  { source: "Mathrubhumi", region: "kerala", url: "https://www.mathrubhumi.com/rss", ml: true },
  { source: "Onmanorama", region: "kerala", url: "https://www.onmanorama.com/news/kerala.feeds.onmrss.xml" },
  { source: "The Hindu", region: "kerala", url: "https://www.thehindu.com/news/national/kerala/feeder/default.rss" },
  { source: "NDTV", region: "india", url: "https://feeds.feedburner.com/ndtvnews-india-news" },
  { source: "The Hindu", region: "india", url: "https://www.thehindu.com/news/national/feeder/default.rss" },
];
const PER_FEED = 8;
const TTL = 900;

function decode(s) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&apos;|&#39;|&#039;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/\s+/g, " ").trim();
}

function parse(xml, feed) {
  const out = [];
  const items = xml.match(/<item[\s>][\s\S]*?<\/item>/g) || [];
  for (const it of items) {
    const t = (it.match(/<title[^>]*>([\s\S]*?)<\/title>/) || [])[1];
    let link = (it.match(/<link[^>]*>([\s\S]*?)<\/link>/) || [])[1];
    const pub = (it.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/) || [])[1];
    if (!t || !link) continue;
    link = decode(link);
    if (!/^https:\/\//.test(link)) continue;
    const d = pub ? new Date(decode(pub)) : null;
    out.push({
      title: decode(t).slice(0, 220),
      link,
      source: feed.source,
      region: feed.region,
      ml: !!feed.ml,
      time: d && !isNaN(d) ? d.toISOString().replace(/\.\d+Z$/, "Z") : "",
    });
    if (out.length >= PER_FEED) break;
  }
  return out;
}

// Tried in order until one works for this account.
const AI_MODELS = [
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  "@cf/meta/llama-4-scout-17b-16e-instruct",
  "@cf/mistralai/mistral-small-3.1-24b-instruct",
  "@cf/meta/llama-3.1-8b-instruct",
];
const M2M = "@cf/meta/m2m100-1.2b";
const SYS = "You translate English news headlines into natural, short Malayalam headlines for a Malayalam newspaper. Write people's names and place names in Malayalam script. Keep numbers as digits. Reply with only the numbered Malayalam lines, one per headline, in the same order.";
const TAKE = { kerala: 6, india: 4, uk: 4 };
const ML_TTL = 7 * 24 * 3600;

async function hash(t) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t));
  return [...new Uint8Array(b)].slice(0, 12).map((x) => x.toString(16).padStart(2, "0")).join("");
}

// Malayalam versions for the headlines the ticker shows.
// Cached translations are added straight away. Missing ones are translated
// in the background (one headline per AI call, all at once), so the reply
// is never slow; they show up on the next refresh.
async function translateOne(env, title) {
  const errs = [];
  for (const model of AI_MODELS) {
    try {
      const r = await env.AI.run(model, {
        messages: [{ role: "system", content: SYS }, { role: "user", content: "1. " + title }],
        max_tokens: 256,
        temperature: 0.2,
      });
      const text = ((r && (r.response || r.result || "")) + "").trim();
      const line = text.split(/\n+/).find((l) => /[\u0D00-\u0D7F]/.test(l)) || "";
      const ml = line.replace(/^\s*\d+[.)]\s*/, "").replace(/\*\*/g, "").trim();
      if (ml) return { ml: ml.slice(0, 240), model };
      errs.push(model.split("/").pop() + ":empty");
    } catch (e) {
      errs.push(model.split("/").pop() + ":" + String(e && e.message || e).slice(0, 60));
    }
  }
  try {
    const r = await env.AI.run(M2M, { text: title, source_lang: "en", target_lang: "ml" });
    const ml = ((r && r.translated_text) || "").trim();
    if (/[\u0D00-\u0D7F]/.test(ml)) return { ml: ml.slice(0, 240), model: M2M };
  } catch (e) {
    errs.push("m2m:" + String(e && e.message || e).slice(0, 60));
  }
  return { err: errs.join(" | ") };
}

async function addMalayalam(items, env, base, waitUntil) {
  if (!env || !env.AI) return { status: "no-ai-binding", pending: 0 };
  const want = [];
  const count = {};
  for (const it of items) {
    count[it.region] = (count[it.region] || 0) + 1;
    if (count[it.region] <= (TAKE[it.region] || 0) && !it.ml) want.push(it);
  }
  const cache = caches.default;
  const miss = [];
  await Promise.all(want.map(async (it) => {
    const key = new Request(base + "/api/ml/" + (await hash(it.title)));
    const hit = await cache.match(key);
    if (hit) it.titleMl = await hit.text();
    else miss.push({ title: it.title, key });
  }));
  if (miss.length) {
    const statusKey = new Request(base + "/api/ml-status");
    waitUntil(Promise.all(miss.map(async (m) => {
      const r = await translateOne(env, m.title);
      if (r.ml) await cache.put(m.key, new Response(r.ml, { headers: { "cache-control": "public, max-age=" + ML_TTL } }));
      return r.ml ? "ok:" + r.model : r.err;
    })).then((res) => cache.put(statusKey, new Response(res.join("\n"), { headers: { "cache-control": "public, max-age=3600" } }))));
  }
  const last = await cache.match(new Request(base + "/api/ml-status"));
  const lastText = last ? (await last.text()).split("\n")[0] : "";
  return { status: "have " + (want.length - miss.length) + "/" + want.length + (lastText ? "; last: " + lastText : ""), pending: miss.length };
}

async function build(env, base, waitUntil) {
  const results = await Promise.all(FEEDS.map(async (f) => {
    try {
      const r = await fetch(f.url, {
        headers: { "User-Agent": "MizhiNewsHeadlines/1.0 (+https://mizhinews.co.uk)" },
        cf: { cacheTtl: TTL, cacheEverything: true },
      });
      if (!r.ok) return [];
      return parse(await r.text(), f);
    } catch (e) {
      return [];
    }
  }));
  const seen = new Set();
  const items = [];
  for (const it of results.flat()) {
    if (seen.has(it.link)) continue;
    seen.add(it.link);
    items.push(it);
  }
  items.sort((a, b) => (b.time || "").localeCompare(a.time || ""));
  const ai = await addMalayalam(items, env, base, waitUntil);
  return { updated: new Date().toISOString().replace(/\.\d+Z$/, "Z"), ai: ai.status, pending: ai.pending, items };
}

export async function onRequestGet(context) {
  const cache = caches.default;
  const url = new URL(context.request.url);
  const base = url.origin;
  if (url.searchParams.get("test") === "ml") {
    // Quick check of the translation set-up with one fixed headline.
    const t0 = Date.now();
    const r = context.env && context.env.AI
      ? await translateOne(context.env, "Snow warning for northern England as temperatures drop")
      : { err: "no-ai-binding" };
    return new Response(JSON.stringify({ ...r, ms: Date.now() - t0 }), {
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
    });
  }
  const key = new Request(base + "/api/headlines?v=5");
  let res = await cache.match(key);
  if (res) return res;
  const data = await build(context.env, base, (p) => context.waitUntil(p));
  res = new Response(JSON.stringify(data), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=" + (data.pending ? 60 : TTL),
      "access-control-allow-origin": "*",
    },
  });
  if (data.items.length) context.waitUntil(cache.put(key, res.clone()));
  return res;
}
