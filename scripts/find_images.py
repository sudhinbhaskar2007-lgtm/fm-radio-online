#!/usr/bin/env python3
"""Search Wikimedia Commons for freely licensed photos (CC0, public domain,
CC BY, CC BY-SA only) and print candidates with licence and author, so a
news story can use one with a proper credit line. Usage:
  python scripts/find_images.py "snow Yorkshire" "Jobcentre Plus"
"""
import json, re, sys, urllib.parse, urllib.request

OK = re.compile(r"^(CC0|Public domain|PD|CC BY(-SA)? ?\d(\.\d)?)", re.I)


def search(q, limit=10, person=False):
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
        if not person and (ii.get("width", 0) < 1000 or ii.get("width", 0) < ii.get("height", 1)):
            continue
        if person and ii.get("width", 0) < 500:
            continue
        artist = re.sub(r"<[^>]+>", "", md.get("Artist", {}).get("value", "")).strip()
        out.append({"title": p.get("title"), "thumb": ii.get("thumburl"), "page": ii.get("descriptionurl"),
                    "license": lic, "artist": artist[:80], "w": ii.get("width"), "h": ii.get("height")})
    return out


def openverse(q, limit=10):
    """Openverse (WordPress) indexes Flickr and other Creative Commons photos."""
    params = {"q": q, "license": "cc0,pdm,by,by-sa", "aspect_ratio": "wide", "size": "large",
              "page_size": str(limit), "mature": "false"}
    url = "https://api.openverse.org/v1/images/?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": "MizhiNewsImageFinder/1.0"})
    data = json.load(urllib.request.urlopen(req, timeout=30))
    out = []
    for r in data.get("results", []):
        lic = (r.get("license") or "").upper()
        lic = {"CC0": "CC0", "PDM": "Public domain"}.get(lic, "CC " + lic + " " + (r.get("license_version") or ""))
        out.append({"title": r.get("title"), "thumb": r.get("url"), "page": r.get("foreign_landing_url"),
                    "license": lic.strip(), "artist": (r.get("creator") or "")[:80], "source": r.get("source"),
                    "w": r.get("width"), "h": r.get("height")})
    return out


if __name__ == "__main__":
    for q in sys.argv[1:]:
        if q.startswith("person:"):
            # Photos of a named public figure (portrait shape allowed), Commons only.
            q = q[len("person:"):].strip()
            print("=== commons-person: " + q)
            try:
                for r in search(q, limit=25, person=True):
                    print(json.dumps(r, ensure_ascii=False))
            except Exception as e:
                print("error:", e)
            continue
        for name, fn in (("commons", search), ("openverse", openverse)):
            print("=== " + name + ": " + q)
            try:
                for r in fn(q):
                    print(json.dumps(r, ensure_ascii=False))
            except Exception as e:
                print("error:", e)
