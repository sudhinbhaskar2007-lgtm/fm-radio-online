#!/usr/bin/env python3
"""Search Wikimedia Commons for freely licensed photos (CC0, public domain,
CC BY, CC BY-SA only) and print candidates with licence and author, so a
news story can use one with a proper credit line. Usage:
  python scripts/find_images.py "snow Yorkshire" "Jobcentre Plus"
"""
import json, re, sys, urllib.parse, urllib.request

OK = re.compile(r"^(CC0|Public domain|PD|CC BY(-SA)? ?\d(\.\d)?)", re.I)


def search(q, limit=10):
    params = {
        "action": "query", "format": "json", "generator": "search", "gsrnamespace": "6",
        "gsrlimit": str(limit), "gsrsearch": q + " filetype:bitmap", "prop": "imageinfo",
        "iiprop": "url|extmetadata|size|mime", "iiurlwidth": "1280",
    }
    url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": "MizhiNewsImageFinder/1.0 (news site; contact via site)"})
    data = json.load(urllib.request.urlopen(req, timeout=30))
    out = []
    for p in (data.get("query", {}).get("pages", {}) or {}).values():
        ii = (p.get("imageinfo") or [{}])[0]
        md = ii.get("extmetadata", {})
        lic = md.get("LicenseShortName", {}).get("value", "")
        if not OK.match(lic) or ii.get("mime") not in ("image/jpeg", "image/png"):
            continue
        if ii.get("width", 0) < 1000 or ii.get("width", 0) < ii.get("height", 1):
            continue
        artist = re.sub(r"<[^>]+>", "", md.get("Artist", {}).get("value", "")).strip()
        out.append({"title": p.get("title"), "thumb": ii.get("thumburl"), "page": ii.get("descriptionurl"),
                    "license": lic, "artist": artist[:80], "w": ii.get("width"), "h": ii.get("height")})
    return out


if __name__ == "__main__":
    for q in sys.argv[1:]:
        print("=== " + q)
        try:
            for r in search(q):
                print(json.dumps(r, ensure_ascii=False))
        except Exception as e:
            print("error:", e)
