// Cloudflare Pages Function: GET /api/headlines
// Live headline list for the breaking ticker and the headlines box.
// Only each feed's headline, link, source and time are passed on (no article
// text or pictures); readers click through to the original website.
// Cached at Cloudflare's edge for 15 minutes, so the ticker stays fresh
// without new commits or site rebuilds.

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

async function build() {
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
  return { updated: new Date().toISOString().replace(/\.\d+Z$/, "Z"), items };
}

export async function onRequestGet(context) {
  const cache = caches.default;
  const key = new Request(new URL("/api/headlines?v=1", context.request.url).toString());
  let res = await cache.match(key);
  if (res) return res;
  const data = await build();
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
