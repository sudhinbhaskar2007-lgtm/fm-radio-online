#!/usr/bin/env python3
"""Fetch the latest UK headlines from BBC and Sky News RSS feeds.

Writes data/headlines.json with only the headline, link, source and time.
No article text or images are copied: visitors click through to read the
story on the original website. Run by .github/workflows/headlines.yml.
"""
import json
import sys
import urllib.request
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
from datetime import datetime, timezone

# Fallback copy of the live list in functions/api/headlines.js.
FEEDS = [
    ("BBC News", "https://feeds.bbci.co.uk/news/uk/rss.xml", "uk"),
    ("Sky News", "https://feeds.skynews.com/feeds/rss/uk.xml", "uk"),
    ("Mathrubhumi", "https://www.mathrubhumi.com/rss", "kerala"),
    ("Onmanorama", "https://www.onmanorama.com/news/kerala.feeds.onmrss.xml", "kerala"),
    ("The Hindu", "https://www.thehindu.com/news/national/kerala/feeder/default.rss", "kerala"),
    ("NDTV", "https://feeds.feedburner.com/ndtvnews-india-news", "india"),
    ("The Hindu", "https://www.thehindu.com/news/national/feeder/default.rss", "india"),
]
PER_SOURCE = 8
OUT = "data/headlines.json"


def parse(source, xml_bytes, region="uk"):
    items = []
    root = ET.fromstring(xml_bytes)
    for it in root.iter("item"):
        title = (it.findtext("title") or "").strip()
        link = (it.findtext("link") or "").strip()
        if not title or not link.startswith("https://"):
            continue
        when = ""
        pub = it.findtext("pubDate")
        if pub:
            try:
                when = parsedate_to_datetime(pub).astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            except (TypeError, ValueError):
                pass
        items.append({"title": title, "link": link, "source": source, "region": region,
                      "ml": source == "Mathrubhumi", "time": when})
        if len(items) >= PER_SOURCE:
            break
    return items


def main(paths=None):
    all_items, ok = [], 0
    for i, (source, url, region) in enumerate(FEEDS):
        try:
            if paths:
                data = open(paths[i], "rb").read()
            else:
                req = urllib.request.Request(url, headers={"User-Agent": "MizhiNewsHeadlines/1.0"})
                data = urllib.request.urlopen(req, timeout=30).read()
            all_items += parse(source, data, region)
            ok += 1
        except Exception as e:  # keep the other feed if one fails
            print(f"warning: {source}: {e}", file=sys.stderr)
    if not ok:
        print("no feeds loaded; keeping the old file", file=sys.stderr)
        return
    all_items.sort(key=lambda x: x["time"], reverse=True)
    out = {"updated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), "items": all_items}
    old = None
    try:
        old = json.load(open(OUT, encoding="utf-8"))
    except Exception:
        pass
    if old and old.get("items") == out["items"]:
        print("no change")
        return
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
        f.write("\n")
    print(f"wrote {len(all_items)} headlines")


if __name__ == "__main__":
    main(sys.argv[1:] or None)
