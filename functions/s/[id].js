// Share link for one story: https://mizhinews.co.uk/s/<story-id>
// WhatsApp / Facebook read the preview tags (title + the story's own photo);
// people are sent straight on to the story on the site.
function slug(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60); }
function esc(s) { return String(s || "").replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

export async function onRequestGet(context) {
  const { params, request, env } = context;
  const origin = new URL(request.url).origin;
  const id = slug(params.id);
  let story = null;
  try {
    const res = await env.ASSETS.fetch(new Request(origin + "/data/news.json"));
    const list = await res.json();
    story = (Array.isArray(list) ? list : []).find(function (n) {
      return n && n.title && (slug(n.id) || slug(String(n.date || "").slice(0, 10) + "-" + n.title)) === id;
    }) || null;
  } catch (e) {}

  const target = origin + "/#story=" + id;
  let title = "Mizhi UK Malayalam News", desc = "Malayalam news for the UK.", img = origin + "/assets/eye-poster.jpg";
  if (story) {
    title = story.titleMl ? story.titleMl + " | " + story.title : story.title;
    desc = story.summaryMl || story.summary || desc;
    let src = String(story.image || "").trim().replace(/^\//, "");
    if (/^https:\/\//.test(src)) img = src;
    else if (src && /^[\w\-./%]+$/.test(src) && !/\.\./.test(src)) img = origin + "/" + src;
  }
  const html = `<!doctype html><html lang="ml"><head><meta charset="utf-8">
<title>${esc(title)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="${esc(desc)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Mizhi UK Malayalam News">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(img)}">
<meta property="og:url" content="${esc(origin + "/s/" + id)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${esc(img)}">
<link rel="canonical" href="${esc(target)}">
<meta http-equiv="refresh" content="0; url=${esc(target)}">
</head><body><p><a href="${esc(target)}">${esc(title)}</a></p>
<script>location.replace(${JSON.stringify(target)});</script></body></html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=300" } });
}
