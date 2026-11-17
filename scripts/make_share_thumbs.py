"""Make small 1200x630 preview images (assets/share/<id>.jpg) for every story,
so WhatsApp/Facebook show the story's own photo when a link is shared
(WhatsApp ignores images bigger than about 300 KB).
Run: python scripts/make_share_thumbs.py   (needs Pillow)"""
import io, json, os, re, sys, time, urllib.error, urllib.request
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "share")
W, H = 1200, 630

def slug(s):
    return re.sub(r"^-|-$", "", re.sub(r"[^a-z0-9]+", "-", str(s or "").lower()))[:60]

def load(src):
    if re.match(r"^https://", src):
        ua = "MizhiNewsShareThumbs/1.0 (https://mizhinews.co.uk; mizhinews@gmail.com)"
        for wait in (3, 10, 30, 60):
            time.sleep(wait)  # be gentle with Wikimedia (429 = too fast)
            try:
                req = urllib.request.Request(src, headers={"User-Agent": ua})
                return Image.open(io.BytesIO(urllib.request.urlopen(req, timeout=30).read()))
            except urllib.error.HTTPError as e:
                if e.code != 429:
                    raise
        raise RuntimeError("still rate-limited")
    path = os.path.join(ROOT, src.lstrip("/"))
    if ".." in src or not os.path.isfile(path):
        return None
    return Image.open(path)

def thumb(im):
    im = im.convert("RGB")
    bg = im.copy()
    s = max(W / bg.width, H / bg.height)
    bg = bg.resize((int(bg.width * s) + 1, int(bg.height * s) + 1))
    l, t = (bg.width - W) // 2, (bg.height - H) // 2
    bg = bg.crop((l, t, l + W, t + H)).filter(ImageFilter.GaussianBlur(24))
    s = min(W / im.width, H / im.height)
    fg = im.resize((max(1, int(im.width * s)), max(1, int(im.height * s))), Image.LANCZOS)
    bg.paste(fg, ((W - fg.width) // 2, (H - fg.height) // 2))
    return bg

def main():
    os.makedirs(OUT, exist_ok=True)
    news = json.load(open(os.path.join(ROOT, "data", "news.json"), encoding="utf-8"))
    made = 0
    for n in news:
        if not n or not n.get("title") or not n.get("image"):
            continue
        sid = slug(n.get("id")) or slug(str(n.get("date", ""))[:10] + "-" + n["title"])
        dest = os.path.join(OUT, sid + ".jpg")
        if os.path.exists(dest) and "--force" not in sys.argv:
            continue
        try:
            im = load(str(n["image"]).strip())
            if im is None:
                continue
            t = thumb(im)
            for q in (82, 72, 62):
                t.save(dest, "JPEG", quality=q, optimize=True, progressive=False)
                if os.path.getsize(dest) < 200000:
                    break
            made += 1
            print("made", sid, os.path.getsize(dest))
        except Exception as e:
            print("skip", sid, e)
    print("done,", made, "new")

if __name__ == "__main__":
    main()
