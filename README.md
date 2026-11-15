# Mizhi FM — online radio website

A fast, mobile-friendly website for an online radio station. Listeners press
play and hear your live stream; the page shows the song that's playing, the
show that's on air now, a weekly schedule, your presenters and how to get in
touch. The blinking-eye animation plays behind the whole page.

It is a plain static site (HTML, CSS and JavaScript, no build step), so it can
be hosted free on GitHub Pages, Netlify, Cloudflare Pages or any web host.

## Features

- **Live player** with play/stop, volume (remembered per listener), mute, and
  automatic reconnect if the stream drops.
- **Lock-screen and headphone controls** on phones (Media Session API), showing
  the station name and current song.
- **Now playing** song title from Icecast, Shoutcast, AzuraCast or any JSON URL.
- **On air now / up next** and a **weekly schedule** that highlights the live
  show, worked out in your station's timezone wherever the listener is.
- **Shows & presenters** cards, **About**, and **Contact** with email, phone and
  a one-tap WhatsApp song request button.
- **Mini player** that stays at the bottom of the screen while scrolling.
- **Installable** on phones ("Add to Home Screen") and opens offline.
- Looping **background video** with a still image fallback, switched off for
  visitors who ask their device for reduced motion.

## 1. Make it yours: edit `config.js`

Everything you'll want to change is in [`config.js`](config.js): station name,
tagline, colours, stream URL, now-playing source, contact details, social
links, about text, shows and the weekly schedule. Each setting has a comment
explaining it. You don't need to touch any other file.

To use your own logo, add the image to `assets/` and set
`logoImage: "assets/your-logo.png"`.

### Add news and photos (team admin)

News stories live in [`data/news.json`](data/news.json) and photo albums in
[`data/gallery.json`](data/gallery.json). The team edits them in
[Pages CMS](https://app.pagescms.org) (free, open source): the fields are set up
in [`.pages.yml`](.pages.yml), and [`admin.html`](admin.html) on the site has the
button and step-by-step help. Each save commits to `main`, and the site
redeploys by itself. Uploaded photos go in `assets/uploads/`.

One-time setup by the repository owner: open https://app.pagescms.org, sign in
with GitHub, install the Pages CMS GitHub App on this repository only, then
invite team members (Collaborators) by email.

Write news in your own words, and use your own photos or ones you have permission
to use. Link to other sites with `link` rather than copying.

## 2. Plug in your stream

The site plays whatever audio stream URL you put in `streamUrl`. The demo URL
is a public test stream; **replace it with your own before launching**.

> **Your stream must use `https://`.** Browsers block `http://` audio on an
> `https://` website (which GitHub Pages always is). Every provider below
> offers an https link.

| Where your stream comes from | `streamUrl` looks like | For the song title use |
|---|---|---|
| **Zeno.fm** (free, easiest) | `https://stream.zeno.fm/abc123xyz` | `nowPlayingType: "json"` with Zeno's metadata URL if you have one, otherwise `"none"` |
| **AzuraCast** (self-hosted or hosted) | `https://radio.example.com/listen/mizhi/radio.mp3` | `"azuracast"`, `nowPlayingUrl: "https://radio.example.com/api/nowplaying/mizhi"` |
| **Icecast** | `https://radio.example.com:8000/live` | `"icecast"`, `nowPlayingUrl: "https://radio.example.com:8000/status-json.xsl"` |
| **Shoutcast v2** | `https://radio.example.com:8000/;` | `"shoutcast"`, `nowPlayingUrl: "https://radio.example.com:8000/stats?sid=1&json=1"` |
| **Radio.co, Live365, Caster.fm, etc.** | the "direct stream URL" from your dashboard | `"none"`, or `"json"` if they give you a JSON now-playing link |

How to find the link:

- **Zeno.fm:** in Zeno Studio, open your station and copy the *Stream URL*.
- **AzuraCast:** *Station → Profile*. The listen URL is under *Streams*; the
  now-playing API is `/api/nowplaying/<station-short-name>`.
- **Icecast / Shoutcast:** the address of your server plus your mount point.
  Your host can tell you if HTTPS is enabled.

**Now playing needs CORS.** The listener's browser asks your server for the
song title, so the server has to allow it. AzuraCast and Icecast 2.4+ allow it
by default. If the title never appears, check the browser console for a CORS
error and ask your host to add the header `Access-Control-Allow-Origin: *`.
The audio itself plays without this.

### How do I broadcast?

The website is the "radio" your listeners open. To send audio *to* the stream
you use broadcasting software such as **BUTT** (free, for live shows from a
laptop and microphone), **Mixxx** (free DJ software) or your provider's
**AutoDJ** (plays a playlist 24/7 when nobody is live). Your provider gives you
the server address, port and password to enter in that software.

## 3. Put it online with GitHub Pages (free)

1. Push this repository to GitHub (it already is, if you're reading this there).
2. On GitHub open **Settings → Pages**.
3. Under **Build and deployment → Source**, choose **GitHub Actions**.
4. That's it. Every push to `main` deploys automatically (see the *Actions*
   tab). Your site will be at
   `https://<your-username>.github.io/fm-radio-online/`.

### Use your own domain (e.g. mizhifm.com)

1. In **Settings → Pages → Custom domain**, enter your domain and save.
2. At your domain registrar, add a `CNAME` record for `www` pointing to
   `<your-username>.github.io`, and for the bare domain add the four GitHub
   `A` records listed in
   [GitHub's docs](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).
3. Tick **Enforce HTTPS** once it becomes available.

### Other hosts

Drag the whole folder onto [Netlify Drop](https://app.netlify.com/drop), or
connect the repository to Cloudflare Pages with no build command and `/` as
the output folder.

## Try it on your computer

Any static file server works, for example:

```sh
python3 -m http.server 8080
```

then open http://localhost:8080.

## Files

```
index.html               page structure
config.js                ← all station settings
news.html                old link; forwards to index.html#news
news-data.js             news page title and category menu
data/news.json           ← news stories (edited on the admin page)
data/gallery.json        ← photo albums (edited on the admin page)
.pages.yml               admin page (Pages CMS) setup
admin.html               team admin help page
assets/news.js           news view (inside index.html, so the radio keeps playing)
assets/style.css         look and feel
assets/app.js            player, now playing, schedule logic
assets/eye-bg.mp4        background animation (desktop, 1080p)
assets/eye-bg-mobile.mp4 background animation (phones, 720p)
assets/eye-poster.jpg    still frame shown while the video loads
assets/icon.svg          browser tab / home-screen icon
manifest.webmanifest     "Add to Home Screen" settings
sw.js                    offline support for the page shell
.github/workflows/pages.yml  automatic GitHub Pages deploy
```

To change the background animation, replace the two `.mp4` files (keep them
under ~3 MB each so the page loads quickly on mobile data) and the poster
image, or point `backgroundVideo` in `config.js` at new files.

Background artwork: miya photograph.
