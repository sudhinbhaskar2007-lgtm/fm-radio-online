// The home page. When the address has ?s=<story-id> (the site adds it while a
// story is open), give link previews that story's title and photo, so a link
// copied from the address bar shows the right picture in WhatsApp/Facebook.
function slug(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60); }

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const id = slug(url.searchParams.get("s"));
  const page = await env.ASSETS.fetch(new Request(url.origin + "/", { headers: request.headers }));
  if (!id || !page.ok) return page;
  let story = null;
  try {
    const res = await env.ASSETS.fetch(new Request(url.origin + "/data/news.json"));
    const list = await res.json();
    story = (Array.isArray(list) ? list : []).find(function (n) {
      return n && n.title && (slug(n.id) || slug(String(n.date || "").slice(0, 10) + "-" + n.title)) === id;
    }) || null;
  } catch (e) {}
  if (!story) return page;
  const title = story.titleMl ? story.titleMl + " | " + story.title : story.title;
  const desc = story.summaryMl || story.summary || "";
  let img = "";
  // Prefer the small preview copy (assets/share/<id>.jpg); WhatsApp skips big images.
  try {
    const t = await env.ASSETS.fetch(new Request(url.origin + "/assets/share/" + id + ".jpg", { method: "HEAD" }));
    if (t.ok && /image/.test(t.headers.get("content-type") || "")) img = url.origin + "/assets/share/" + id + ".jpg";
  } catch (e) {}
  const src = String(story.image || "").trim().replace(/^\//, "");
  if (img) {}
  else if (/^https:\/\//.test(src)) img = src;
  else if (src && /^[\w\-./%]+$/.test(src) && !/\.\./.test(src)) img = url.origin + "/" + src;
  const set = function (value) { return { element: function (el) { if (value) el.setAttribute("content", value); } }; };
  const out = new HTMLRewriter()
    .on('meta[property="og:title"]', set(title))
    .on('meta[property="og:description"]', set(desc))
    .on('meta[property="og:image"]', set(img))
    .on('meta[property="og:url"]', set(url.origin + "/?s=" + id))
    .on('meta[property="og:type"]', set("article"))
    .transform(page);
  const headers = new Headers(out.headers);
  headers.set("cache-control", "public, max-age=300");
  return new Response(out.body, { status: out.status, headers: headers });
}
