# Mizhi FM Android app

Radio-only app for Mizhi FM (മിഴി എഫ്എം). Plays
`https://mizhifm.duckdns.org/listen/mizhi_fm/radio.mp3`.

## What it does
- Big play / stop button, station logo, current song name.
- Keeps playing in the background, on the lock screen and in the notification.
- **Android Auto**: Mizhi FM appears in the car's media apps with logo and play/stop.
- **Auto-play when the car starts**: when the phone connects to the car's Bluetooth,
  Mizhi FM starts by itself (switch in the app, on by default). You can pick your
  exact car from the paired Bluetooth list, or leave it on "Any car Bluetooth".
- The car's own play button (and Android Auto's "Start music automatically")
  starts Mizhi FM even if the app is closed.
- Reconnects by itself when mobile signal drops.

## Builds
Every push that changes `android-app/` runs `.github/workflows/android-app.yml`:
- `mizhi-fm.apk` test app on the release page tagged `mizhi-fm-app-test`
  (signed with the public test key in `test-signing/`, so new test builds install over old ones).
- `mizhi-fm-play-store.aab` in the workflow run's artifacts, for Google Play later.

## Play Store (later)
1. Create a Google Play developer account ($25 once).
2. Make an upload key (one time) and add 4 GitHub secrets:
   `MIZHI_KEYSTORE_BASE64`, `MIZHI_KEYSTORE_PASSWORD`, `MIZHI_KEY_ALIAS`, `MIZHI_KEY_PASSWORD`.
3. Run the workflow, download `mizhi-fm-play-store.aab`, upload it in Play Console.
4. Android Auto apps are checked by Google; choose "Android Auto" under
   Advanced settings → Form factors.
