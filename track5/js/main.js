/**
 * Boot.
 *
 * Order matters here. The brief's two-second rule is a startup requirement, so
 * the sequence is: paint the shell, paint whatever is cached, then reach for
 * the network. Nothing on screen ever waits on a request that might not answer.
 */

import { $, $$, setText } from './core/dom.js';
import * as store from './core/state.js';
import * as router from './core/router.js';
import { on, EVENTS } from './core/bus.js';
import * as transport from './transport/provider.js';
import * as backend from './data/backend.js';
import { MODE } from './data/backend.js';
import { STATIONS } from './transport/stations.js';
import { nearestStation } from './domain/geo.js';
import { mountLive, refreshSignals, refreshDepartures } from './ui/screens/live.js';
import { mountReport } from './ui/screens/report.js';
import { mountChat } from './ui/screens/chat.js';
import { mountCrew } from './ui/screens/crew.js';
import { mountProfile } from './ui/screens/profile.js';

const SCREENS = {
  live: '#screen-live',
  chat: '#screen-chat',
  crew: '#screen-crew',
  profile: '#screen-profile',
};

const mounted = new Set();

/* --- Navigation ----------------------------------------------------------- */

function wireNav() {
  for (const btn of $$('#nav .nav__item')) {
    btn.addEventListener('click', () => router.go(btn.dataset.tab));
  }

  store.subscribe((s) => {
    for (const [tab, sel] of Object.entries(SCREENS)) {
      const node = $(sel);
      node.hidden = tab !== s.tab;
    }
    for (const btn of $$('#nav .nav__item')) {
      if (btn.dataset.tab === s.tab) btn.setAttribute('aria-current', 'page');
      else btn.removeAttribute('aria-current');
    }
    mountTab(s.tab);
  }, ['tab']);
}

/** Screens are mounted on first visit, so startup only pays for LIVE. */
function mountTab(tab) {
  if (mounted.has(tab)) return;
  mounted.add(tab);
  const node = $(SCREENS[tab]);
  if (tab === 'chat') mountChat(node);
  else if (tab === 'crew') mountCrew(node);
  else if (tab === 'profile') mountProfile(node);
}

/* --- Feed indicator -------------------------------------------------------
   Says where the numbers came from. LOCAL MODE is labelled as such, because
   presenting a demo community as a real one would be a lie the interface
   tells on every screen. */

function wireFeed() {
  const feed = $('#feed');
  const label = $('#feed-label');

  const paint = () => {
    const s = store.get().feed;
    feed.dataset.state = s;
    if (MODE === 'local') {
      setText(label, 'LOCAL');
      feed.title = 'Local mode — this device only. See PROFILE.';
      return;
    }
    setText(label, s === 'live' ? 'LIVE' : s === 'offline' ? 'SCHEDULE' : 'CONNECTING');
    feed.title = s === 'live'
      ? 'Live departures from Entur'
      : s === 'offline'
        ? 'Entur unreachable — showing the planned timetable only'
        : 'Connecting to Entur';
  };

  store.subscribe(paint, ['feed']);
  paint();
}

/* --- Toast ---------------------------------------------------------------- */

function wireToast() {
  const node = $('#toast');
  let timer = null;
  on(EVENTS.TOAST, (message) => {
    setText(node, String(message));
    node.hidden = false;
    clearTimeout(timer);
    timer = setTimeout(() => { node.hidden = true; }, 2600);
  });
}

/* --- Position -------------------------------------------------------------
   Location is requested, never demanded. If it is refused or unavailable the
   app still works — it just does not claim to know where you are, which is
   better than guessing and drawing it confidently. */

function requestPosition() {
  if (!('geolocation' in navigator)) return;
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const near = nearestStation(pos.coords.latitude, pos.coords.longitude, STATIONS);
      if (!near) return; // Not on the Jæren line. Make no claims.
      store.set({
        position: {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          stationIdx: near.station.idx,
          km: near.km,
        },
      });
      refreshDepartures();
    },
    () => { /* Refused or unavailable. Nothing to do — the app is still useful. */ },
    { enableHighAccuracy: false, timeout: 8000, maximumAge: 120_000 },
  );
}

/* --- Polling --------------------------------------------------------------
   Paused when the tab is hidden. A transport app that keeps hammering an API
   in a backgrounded tab is a bad citizen on a free public endpoint. */

function startPolling() {
  let timer = null;

  const tick = async () => {
    if (document.hidden) return;
    await Promise.all([refreshDepartures(), refreshSignals()]);
  };

  const start = () => {
    clearInterval(timer);
    timer = setInterval(tick, 60_000);
  };

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clearInterval(timer);
    else { tick(); start(); }
  });

  start();

  // Signals age continuously, so the map re-evaluates expiry on a short cycle
  // even when no new data has arrived.
  setInterval(() => {
    if (!document.hidden) store.set({ signals: [...store.get().signals] });
  }, 30_000);
}

/* --- Boot ----------------------------------------------------------------- */

async function boot() {
  wireNav();
  wireFeed();
  wireToast();

  transport.init();
  router.start();

  const live = $('#screen-live');
  mountLive(live);
  mountReport(live);
  mounted.add('live');

  // Everything above is synchronous, so the shell and the line are on screen
  // before any of the following resolves.

  try {
    const user = await backend.signIn();
    store.set({ user, authReady: true });
  } catch (err) {
    console.error('[boot] sign-in failed', err);
    store.set({ authReady: true });
  }

  await refreshSignals();
  await refreshDepartures();

  backend.subscribeSignals(() => refreshSignals());

  requestPosition();
  startPolling();
}

boot();
