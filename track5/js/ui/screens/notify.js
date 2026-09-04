/**
 * Notification preferences, and the in-app alerting they control.
 *
 * An honest scope. Web push on iOS requires the user to Add to Home Screen and
 * is unreliable even then, so promising departure alerts that silently never
 * arrive would be worse than not offering them. What these toggles actually
 * govern is what Track 5 tells you *while it is open* — and, where the browser
 * supports it and you grant permission, a system notification as a bonus rather
 * than a promise.
 */

import { el, replace } from '../../core/dom.js';
import * as store from '../../core/state.js';
import { on, emit, EVENTS } from '../../core/bus.js';
import { sectionHead } from '../components.js';
import { stationName } from '../../transport/stations.js';
import { resolveState, isActive, STATE } from '../../domain/signals.js';
import { activeJourney, relevantSignals } from '../../domain/journeys.js';

const KEY = 'track5.notify.v1';

const DEFAULTS = {
  departures: true,
  delays: true,
  disruptions: true,
  signals: true,
};

const LABELS = {
  departures: ['Departure reminders', 'When a saved journey is about to leave'],
  delays: ['Delays', 'When a train on your route is running late'],
  disruptions: ['Disruptions', 'Cancellations and line problems'],
  signals: ['Community signals', 'New inspection signals on your route'],
};

export function loadPrefs() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
  } catch {
    return { ...DEFAULTS };
  }
}

function savePrefs(prefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    /* Blocked storage. The session still honours the setting in memory. */
  }
}

export function notifySection() {
  const host = el('div');
  render(host);
  return host;
}

function render(host) {
  const prefs = store.get().notifyPrefs ?? loadPrefs();

  replace(host, [
    sectionHead('Alerts'),

    ...Object.keys(LABELS).map((key) => {
      const [title, note] = LABELS[key];
      return el('button', {
        class: 'row',
        type: 'button',
        'aria-pressed': String(Boolean(prefs[key])),
        onclick: () => {
          const next = { ...prefs, [key]: !prefs[key] };
          savePrefs(next);
          store.set({ notifyPrefs: next });
          render(host);
        },
      }, [
        el('div', { class: 'row__main' }, [
          el('div', { class: 'row__title', text: title }),
          el('div', { class: 'micro', text: note.toUpperCase() }),
        ]),
        // A hard filled/empty square rather than a toggle switch — the design
        // system has no rounded shapes and a switch would be the only one.
        el('div', {
          class: 'row__end',
          style: `width:18px;height:18px;border:1px solid var(--fg);`
               + (prefs[key] ? 'background:var(--fg);' : ''),
          'aria-hidden': 'true',
        }),
      ]);
    }),

    el('div', { style: 'padding:12px 16px' }, [
      el('p', { class: 'empty__note', style: 'text-align:left;margin:0;max-width:none',
        text: 'These control what Track 5 tells you while it is open. System '
            + 'notifications are offered where the browser supports them, but on '
            + 'iOS they only work if you add this to your home screen, and even '
            + 'then they are not dependable — so nothing here depends on them.' }),
      'Notification' in window && Notification.permission === 'default'
        ? el('button', {
            class: 'btn btn--ghost btn--block',
            type: 'button',
            style: 'margin-top:12px',
            onclick: async () => {
              const res = await Notification.requestPermission();
              emit(EVENTS.TOAST, res === 'granted' ? 'SYSTEM ALERTS ON' : 'STAYING IN-APP');
              render(host);
            },
          }, 'Also allow system notifications')
        : null,
    ]),
  ]);
}

/* --- Alerting -------------------------------------------------------------
   Watches for signals that are new AND relevant, so the app speaks up about
   the thing you would want interrupting you and stays quiet otherwise. */

const announced = new Set();

export function startAlerts() {
  store.set({ notifyPrefs: loadPrefs() });

  store.subscribe((s) => {
    const prefs = s.notifyPrefs ?? DEFAULTS;
    if (!prefs.signals) return;

    const journey = activeJourney(s.journeys ?? []);
    if (!journey) return;

    const live = s.signals.filter((x) => isActive(resolveState(x)));
    const mine = relevantSignals(live, journey, s.position?.stationIdx ?? null);

    for (const { signal, ahead } of mine) {
      if (announced.has(signal.id)) continue;
      announced.add(signal.id);

      // Only speak up for corroborated intel. Announcing every unconfirmed
      // report would make the app cry wolf, and the confidence states exist
      // precisely so it does not have to.
      if (resolveState(signal) === STATE.UNCONFIRMED) continue;

      const where = stationName(signal.stationIdx).toUpperCase();
      const distance = ahead == null ? '' : ` · ${ahead} STOP${ahead === 1 ? '' : 'S'} AHEAD`;
      emit(EVENTS.TOAST, `INSPECTION SIGNAL — ${where}${distance}`);
      system(`Inspection signal at ${stationName(signal.stationIdx)}`,
             ahead == null ? 'On your route.' : `${ahead} stop${ahead === 1 ? '' : 's'} ahead.`);
    }
  }, ['signals', 'journeys', 'position']);
}

function system(title, body) {
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, silent: true });
    }
  } catch {
    /* Some browsers throw on construction outside a service worker. Non-fatal. */
  }
}
