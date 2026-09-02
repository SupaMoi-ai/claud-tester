# Shipping BRO CODE to the stores

Everything in this folder is generated from the real app by `npm run store-assets` — icons,
screenshots at store sizes, feature graphics. Re-run it after any visual change and the
assets stay honest.

Straight answer on what can and can't be automated: **the packaging and the metadata are done
here; the signing and the submission need your accounts and (for iOS) a Mac.** Below is the
exact sequence for each store, and what to paste where.

---

## 0. Before either store

1. **Get the site live on `main`.** Both the Android TWA and the Apple review team fetch the
   hosted app: `https://supamoi-ai.github.io/claud-tester/`. Merge this branch (or point
   GitHub Pages at it).
2. **Privacy policy URL** (both stores ask): `https://supamoi-ai.github.io/claud-tester/privacy.html`
   — Norwegian: `.../personvern.html`.
3. **Support URL / marketing URL:** the site root. Support email: `feedback@brocode.app`.

---

## 1. Google Play (Android) — Trusted Web Activity

Chrome installs PWAs directly ("Install app" in the ⋮ menu — that's the "Chrome store" path;
the Chrome Web Store stopped listing web apps in 2022). For a real **Google Play** listing the
route is a Trusted Web Activity: a tiny Android app that opens the hosted PWA full-screen.

Needs: a Google Play Console account (one-off fee), Java 17, Android SDK — Bubblewrap installs
the SDK for you.

```bash
npm i -g @bubblewrap/cli
bubblewrap init --manifest https://supamoi-ai.github.io/claud-tester/manifest.json
#   → answer with the values already in twa-manifest.json (package app.brocode.twa).
#   → it creates android.keystore; KEEP IT SAFE, it's your upload key forever.
bubblewrap build
#   → app-release-bundle.aab (upload this) and app-release-signed.apk (for testing)
bubblewrap fingerprint    # prints the SHA-256 of your key
```

Then:
- Put that SHA-256 into `.well-known/assetlinks.json` (replace the placeholder), commit, and
  make sure `https://supamoi-ai.github.io/claud-tester/.well-known/assetlinks.json` serves it.
  Without this, the app opens with a browser bar instead of full-screen.
- Play Console → Create app → upload the `.aab` under **Production** (or **Internal testing**
  first — recommended).
- Store listing: paste from `listing.en.md`; add Norwegian under *Manage translations* from
  `listing.no.md`.
- Graphics: `android/icon-512.png`, `android/feature-graphic.png` (`-no.png` for the
  Norwegian listing), and `android/screenshots/*.png` (1080×1920).
- Data safety form: **No data collected, no data shared** — the app has no network calls of
  its own and no analytics. Notifications are local. Say so in the form; it's true and
  verifiable.
- Content rating questionnaire: no violence, no sexual content, no user-generated public
  content. Expect **Everyone / PEGI 3** — but mark "references to sexual health topics" if
  asked, since the app talks about fertility windows.

---

## 2. Apple App Store (iOS) — Capacitor wrapper

Needs: an Apple Developer Program membership ($99/yr), a Mac with Xcode, and this repo.

```bash
npm i @capacitor/core @capacitor/cli @capacitor/ios
npm run native:prep          # builds dist-native/ (app.html → index.html + assets)
npx cap add ios              # one-time; uses capacitor.config.json (appId app.brocode.ios)
npx cap sync ios
npx cap open ios             # opens Xcode
```

In Xcode:
- **Signing & Capabilities** → your team.
- **App Icons** → drag `ios/AppIcon-1024.png` into the 1024 slot (Xcode 14+ generates the rest).
- **Deployment Info** → iPhone only (that avoids needing iPad screenshots). Portrait only.
- Optional but recommended: `npm i @capacitor/local-notifications` and wire the three reminder
  slots through it — the browser `Notification` API is not available inside WKWebView. The app
  degrades gracefully (reminders simply stay "off") without it.
- **Product → Archive → Distribute → App Store Connect**.

In App Store Connect:
- New app → bundle ID `app.brocode.ios`, name **BRO CODE**, primary language English (U.K. or
  U.S.), add **Norwegian Bokmål** as a second localisation.
- Paste metadata from `listing.en.md` / `listing.no.md` (name, subtitle, promotional text,
  description, keywords, what's new).
- Screenshots: `ios/screenshots/6.7/*.png` (1290×2796). Apple scales these for the other
  iPhone sizes.
- **App Privacy** → "Data Not Collected". Every question: no. (There is genuinely nothing.)
- Age rating: answer the questionnaire honestly — "Medical/Treatment Information: infrequent",
  "Sexual Content or Nudity: none". Expect **12+** at most because of the fertility content.
- **App Review notes** — paste this:

  > BRO CODE is a fully offline, single-user coaching app. No account is needed. To see a
  > populated app immediately, tap "TRY THE DEMO" on the first screen, or open with the demo
  > profile: everything is seeded locally on the device. No data leaves the phone; there is
  > no backend. The app provides relationship coaching content and cycle-phase education for
  > the partner; it does not provide medical advice and says so in-app.

- Watch for **guideline 4.2 (minimum functionality)**: the app is bundled, works offline, has
  local notifications, deep-link shortcuts and a 495-entry searchable archive — that is
  comfortably beyond a "repackaged website". If a reviewer pushes back, point to the demo.

---

## 3. What's in this folder

```
store/
  README.md                       this file
  listing.en.md                   all store copy, English
  listing.no.md                   all store copy, Norwegian (Bokmål)
  ios/AppIcon-1024.png            App Store icon, opaque
  ios/screenshots/6.7/*.png       1290×2796, five screens
  android/icon-512.png            Play icon
  android/feature-graphic.png     1024×500 (EN)  + feature-graphic-no.png (NO)
  android/screenshots/*.png       1080×1920, five screens
```

Repo root: `capacitor.config.json` (iOS/Android wrapper), `twa-manifest.json` (Bubblewrap),
`.well-known/assetlinks.json` (Play ↔ site trust), `manifest.json` (PWA — ids, screenshots,
maskable icons, shortcuts, categories).
