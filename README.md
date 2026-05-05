# BRO CODE

A web app for partners who want to learn, track, and show up. Cycle-aware, profile-driven, fully client-side.

## Quick start

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static bundle in dist/
npm run preview  # serve dist/ locally
```

All data lives in `localStorage` — no backend, no signup.

## Structure

```
src/
  App.jsx              # tab shell + state
  components/          # Dashboard, Calendar, Profile, Guide, TheCode, etc.
  lib/                 # cycle math, storage, content, personalization, notifications
```

## Tech

- Vite 5 · React 18 · Tailwind 3
- Google Fonts: Anton (display), DM Sans (body)
- No router, no backend, no analytics
