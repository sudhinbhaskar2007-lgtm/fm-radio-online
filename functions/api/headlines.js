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

const AI_MODEL = "@cf/google/gemma-3-12b-it";
const TAKE = { kerala: 6, india: 4, uk: 4 };
const ML_TTL = 7 * 24 * 3600;

async function hash(t) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t));
  return [...new Uint8Array(b)].slice(0, 12).map((x) => x.toString(16).padStart(2, "0")).join("");
}

// Malayalam versions for the headlines the ticker shows.
async function addMalayalam(items, env, base) {
  if (!env || !env.AI) return;
  const want = [];
  const count = {};
  for (const it of items) {
    count[it.region] = (count[it.region] || 0) + 1;
    if (count[it.region] <= (TAKE[it.region] || 0) && !it.ml) want.push(it);
  }
  const cache = caches.default;
  const miss = [];
  await Promise.all(want.map(async (it) => {
    it._key = new Request(base + "/api/ml/" + (await hash(it.title)));
    const hit = await cache.match(it._key);
    if (hit) it.titleMl = await hit.text();
    else miss.push(it);
  }));
  if (miss.length) {
    try {
      const list = miss.map((it, i) => (i + 1) + ". " + it.title).join("\n");
      const r = await env.AI.run(AI_MODEL, {
        messages: [
          { role: "system", content: "You translate English news headlines into natural, short Malayalam headlines for a Malayalam newspaper. Write people's names and place names in Malayalam script. Keep numbers as digits. Reply with only the numbered Malayalam lines, one per headline, in the same order." },
          { role: "user", content: list },
        ],
        max_tokens: 2048,
        temperature: 0.2,
      });
      const text = (r && (r.response || r.result || "")) + "";
      for (const line of text.split(/\n+/)) {
        const m = line.match(/^\s*(\d+)[.)]\s*(.+?)\s*$/);
        if (!m) continue;
        const it = miss[+m[1] - 1];
        const ml = m[2].replace(/\*\*/g, "").trim();
        if (!it || !/[\u0D00-\u0D7F]/.test(ml)) continue;
        it.titleMl = ml.slice(0, 240);
        await cache.put(it._key, new Response(it.titleMl, { headers: { "cache-control": "public, max-age=" + ML_TTL } }));
      }
    } catch (e) {
      // No translation this time: the ticker shows the English headline.
    }
  }
  for (const it of want) delete it._key;
}

async function build(env, base) {
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
  await addMalayalam(items, env, base);
  return { updated: new Date().toISOString().replace(/\.\d+Z$/, "Z"), items };
}

export async function onRequestGet(context) {
  const cache = caches.default;
  const base = new URL(context.request.url).origin;
  const key = new Request(base + "/api/headlines?v=2");
  let res = await cache.match(key);
  if (res) return res;
  const data = await build(context.env, base);
  res = new Response(JSON.stringify(data), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=" + TTL,
      "access-control-allow-origin": "*",
    },
  });
  if (data.items.length) context.waitUntil(cache.put(key, res.clone()));
  return res;
}
