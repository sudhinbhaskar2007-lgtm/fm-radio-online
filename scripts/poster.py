"""Make a Mizhi poster card for the main story.
python3 scripts/poster.py <out.jpg> <photo path> <theme> <badge> <line1> <line2> <strip line> <english line>
theme: uk | kerala | sports | cinema | india"""
import sys, subprocess, os, tempfile
THEMES = {
 # Union flag on the left, blue sky + stars on the right
 "uk": '''<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0d2a7a"/><stop offset="1" stop-color="#1e56c8"/></linearGradient></defs>
<rect width="1280" height="720" fill="url(#g)"/>
<g transform="translate(0,0) scale(2.3,1)" opacity=".9"><rect width="560" height="720" fill="#012169"/>
<path d="M0 0L560 720M560 0L0 720" stroke="#fff" stroke-width="120"/><path d="M0 0L560 720M560 0L0 720" stroke="#c8102e" stroke-width="40"/>
<path d="M280 0V720M0 360H560" stroke="#fff" stroke-width="180"/><path d="M280 0V720M0 360H560" stroke="#c8102e" stroke-width="100"/></g>
<rect width="1280" height="720" fill="#0a1f5c" opacity=".45"/>
<g fill="#ffd23f">''' + ''.join(f'<path transform="translate({x},{y}) scale(1.6)" d="M0 -14 L4 -4 L14 -4 L6 2 L9 12 L0 6 L-9 12 L-6 2 L-14 -4 L-4 -4Z"/>' for x,y in [(640,60),(740,40),(840,70),(940,50)]) + '''</g>
<path d="M0 640 Q640 560 1280 660 V720 H0Z" fill="#c8102e"/><path d="M0 655 Q640 585 1280 680" stroke="#fff" stroke-width="16" fill="none"/>''',
 "kerala": '''<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#05391f"/><stop offset="1" stop-color="#0f7a3d"/></linearGradient></defs>
<rect width="1280" height="720" fill="url(#g)"/>
<g fill="#0a5a2c" opacity=".9"><path d="M1040 720 Q1050 420 1000 260" stroke="#3b2a14" stroke-width="16" fill="none"/>
<path d="M1000 260 q-120 -10 -200 60 q100 -20 200 -60z M1000 260 q-40 -120 -160 -160 q80 90 160 160z M1000 260 q60 -130 190 -150 q-110 60 -190 150z M1000 260 q130 0 220 80 q-120 -40 -220 -80z"/></g>
<path d="M0 640 Q640 560 1280 660 V720 H0Z" fill="#f4c430"/><path d="M0 655 Q640 585 1280 680" stroke="#fff" stroke-width="12" fill="none"/>''',
 "sports": '''<defs><radialGradient id="g" cx=".7" cy=".3" r=".9"><stop offset="0" stop-color="#2a7a3a"/><stop offset="1" stop-color="#062012"/></radialGradient></defs>
<rect width="1280" height="720" fill="url(#g)"/><g stroke="#fff" stroke-opacity=".12" stroke-width="40">''' + ''.join(f'<line x1="{x}" y1="0" x2="{x-300}" y2="720"/>' for x in range(500,1700,160)) + '''</g>
<g fill="#fff" opacity=".9"><circle cx="1150" cy="90" r="40" fill="#c4100c"/><path d="M1120 70 q30 20 60 40" stroke="#fff" stroke-width="4" fill="none"/></g>
<path d="M0 640 Q640 560 1280 660 V720 H0Z" fill="#c4100c"/>''',
 "cinema": '''<defs><radialGradient id="g" cx=".75" cy=".25" r=".9"><stop offset="0" stop-color="#7a1a5a"/><stop offset="1" stop-color="#14051a"/></radialGradient></defs>
<rect width="1280" height="720" fill="url(#g)"/><g fill="#ffd23f" opacity=".25"><path d="M1280 0 L900 720 L1100 720Z"/><path d="M980 0 L700 720 L820 720Z"/></g>
<path d="M0 640 Q640 560 1280 660 V720 H0Z" fill="#e0359f"/>''',
 "india": '''<rect width="1280" height="240" fill="#ff9933"/><rect y="240" width="1280" height="240" fill="#fff"/><rect y="480" width="1280" height="240" fill="#138808"/>
<rect width="1280" height="720" fill="#0b1440" opacity=".55"/><circle cx="1060" cy="360" r="90" fill="none" stroke="#000080" stroke-width="10" opacity=".6"/>''',
}
def main(out, photo, theme, badge, l1, l2, l3, en):
    root = os.path.dirname(os.path.abspath(__file__))
    h = open(os.path.join(root, "card-template-poster.html"), encoding="utf-8").read()
    for k, v in (("THEME", THEMES[theme]), ("PHOTO", "file://" + os.path.abspath(photo)), ("BADGE", badge),
                 ("L1", l1), ("L2", l2), ("L3", l3), ("EN", en)):
        h = h.replace("{{" + k + "}}", v)
    f = tempfile.NamedTemporaryFile("w", suffix=".html", delete=False, encoding="utf-8"); f.write(h); f.close()
    subprocess.run(["node", os.path.join(root, "render_card.js"), f.name, os.path.abspath(out)], check=True)
    os.unlink(f.name)
if __name__ == "__main__":
    main(*sys.argv[1:9])
