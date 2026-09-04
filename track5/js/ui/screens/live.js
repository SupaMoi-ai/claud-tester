/**
 * LIVE — the default screen and the one that has to work.
 *
 * Information hierarchy, answered in this order within about two seconds:
 *   1. Where am I?              the user mark on the line, or an honest blank
 *   2. What is on my route?     signals drawn on the corridor
 *   3. Is my train delayed?     next departure in the sheet's peek row
 *   4. Any community signals?   the signal count, always visible
 *   5. Can I report/confirm?    REPORT on the map, CONFIRM one tap into a signal
 *
 * The map stays visible at every depth. The sheet grows; it never takes over.
 */

import { el, replace, setText } from '../../core/dom.js';
import * as store from '../../core/state.js';
import * as router from '../../core/router.js';
import { emit, EVENTS } from '../../core/bus.js';
import * as map from '../../map/map.js';
import * as transport from '../../transport/provider.js';
import * as backend from '../../data/backend.js';
import { createSheet } from '../sheet.js';
import {
  departureRow, departureStatus, signalCard, sectorClear, sectionHead, slotIndicator,
} from '../components.js';
import { stationName, stationFullName, STATIONS } from '../../transport/stations.js';
import {
  resolveState, isActive, MAX_UNCONFIRMED_PER_USER, slotsUsed,
} from '../../domain/signals.js';
import { stopsAhead } from '../../domain/geo.js';
import {
  activeJourney, nextDeparture, relevantSignals, journeyRouteLabel,
} from '../../domain/journeys.js';
import { clock, until, ago } from '../../core/time.js';
import { openReport } from './report.js';

let sheet = null;
let mapHost = null;
let reportBtn = null;
let screenEl = null;

export function mountLive(container) {
  screenEl = container;

  mapHost = el('div', { class: 'mapwrap', dataset: { view: 'strip' } });

  const chrome = el('div', { class: 'mapchrome' }, [
    el('div', { class: 'viewtoggle', role: 'group', 'aria-label': 'Map view' }, [
      viewBtn('strip', 'Line'),
      viewBtn('geo', 'Map'),
    ]),
  ]);

  reportBtn = el('button', {
    class: 'reportbtn',
    type: 'button',
    onclick: () => openReport(),
  }, [el('span', { text: '◆' }), el('span', { text: 'Report' })]);

  sheet = createSheet();

  replace(container, [mapHost, chrome, reportBtn, sheet.root]);

  map.mount(mapHost, {
    onSelectSignal: (id) => {
      store.set({ focusSignal: id, focusStation: null });
      router.openSheet('panel');
    },
    onSelectStation: (idx) => {
      store.set({ focusStation: idx, focusSignal: null });
      router.openSheet('panel');
    },
  });

  // The map is imperative: it is patched when data changes, never rebuilt from
  // a render pass, so the user's scroll and pan position survive updates.
  store.subscribe((s) => {
    map.renderSignals(s.signals);
    renderSheet();
    updateReportButton();
  }, ['signals', 'myReports']);

  store.subscribe((s) => {
    map.renderUser(s.position);
    if (s.position?.stationIdx) map.focusStation(s.position.stationIdx, { animate: false });
  }, ['position']);

  store.subscribe((s) => {
    screenEl.dataset.sheet = s.sheet;
    renderSheet();
  }, ['sheet', 'focusSignal', 'focusStation', 'departures', 'user', 'journeys']);

  store.subscribe(() => renderSheet(), ['feed']);

  renderSheet();
  updateReportButton();
  refreshDepartures();
}

function viewBtn(view, label) {
  const b = el('button', {
    class: 'viewtoggle__btn',
    type: 'button',
    'aria-pressed': String(store.get().mapView === view),
    onclick: () => {
      store.set({ mapView: view });
      map.setView(view);
      for (const el2 of b.parentElement.children) {
        el2.setAttribute('aria-pressed', String(el2 === b));
      }
      map.renderSignals(store.get().signals);
      map.renderUser(store.get().position);
    },
  }, label);
  return b;
}

/* --- Sheet ---------------------------------------------------------------- */

function renderSheet() {
  if (!sheet) return;
  const s = store.get();
  if (s.sheet === 'peek') sheet.setContent(peekContent(s));
  else if (s.focusSignal) sheet.setContent(signalContent(s));
  else if (s.focusStation) sheet.setContent(stationContent(s));
  else sheet.setContent(overviewContent(s));
}

/**
 * PEEK — the only thing on screen besides the map at rest.
 * Two facts: the next train, and whether anything is happening on the line.
 */
function peekContent(s) {
  const stationIdx = primaryStation(s);
  const journey = activeJourney(s.journeys ?? []);
  const calls = s.departures[stationIdx] ?? [];
  // On an active journey, lead with a train going the right way.
  const next = journey ? (nextDeparture(calls, journey) ?? calls[0]) : calls[0];
  const active = s.signals.filter((x) => isActive(resolveState(x)));

  return [
    el('button', {
      class: 'row',
      type: 'button',
      style: 'border-bottom:none',
      onclick: () => router.openSheet('panel'),
    }, [
      el('div', { class: 'row__main' }, [
        el('div', { class: 'micro', text: journey
          ? `${journey.label} · ${stationName(stationIdx).toUpperCase()}`
          : `NEXT FROM ${stationName(stationIdx).toUpperCase()}` }),
        next
          ? el('div', { style: 'display:flex;align-items:baseline;gap:10px;margin-top:2px' }, [
              el('span', { class: 'dep__time data', text: clock(next.expectedMs) }),
              el('span', {
                class: `dep__status ${departureStatus(next).tone}`,
                text: departureStatus(next).text,
              }),
              el('span', { class: 'micro', text: until(next.expectedMs) }),
            ])
          : el('div', { class: 'dim', style: 'margin-top:2px', text: 'No departures found' }),
      ]),
      el('div', { class: 'row__end' }, [
        // Plain white: the count includes unconfirmed reports, and the alert
        // tone is reserved for adverse certainties (cancellations, and signals
        // the community has actually corroborated).
        el('div', {
          class: active.length ? 'empty__mark' : 'micro',
          style: active.length ? 'font-size:20px;color:var(--fg)' : '',
          text: active.length ? String(active.length) : '0',
        }),
        el('div', { class: 'micro', text: active.length === 1 ? 'SIGNAL' : 'SIGNALS' }),
      ]),
    ]),
  ];
}

/** PANEL/DETAIL for a selected signal, with one-tap responses. */
function signalContent(s) {
  const signal = s.signals.find((x) => x.id === s.focusSignal);
  if (!signal) return overviewContent(s);

  const ahead = s.position
    ? stopsAhead(s.position.stationIdx, s.heading, signal.stationIdx)
    : null;

  const nodes = [
    sectionHead('Signal detail'),
    el('div', { style: 'padding:12px' }, [
      signalCard(signal, {
        onConfirm: (id) => vote(id, 1),
        onReject: (id) => vote(id, -1),
      }),
      ahead != null
        ? el('div', { class: 'micro', style: 'margin-top:10px', text:
            ahead === 0 ? 'AT YOUR STATION' : `${ahead} ${ahead === 1 ? 'STOP' : 'STOPS'} AHEAD` })
        : null,
      el('p', {
        class: 'empty__note',
        style: 'margin:12px 0 0;text-align:left;max-width:none',
        text:
          'Community reported, not verified. Confirm only if you can see it yourself — '
          + 'a guess costs everyone else the signal.',
      }),
    ]),
  ];

  if (s.sheet === 'detail') {
    nodes.push(
      sectionHead('Departures', stationFullName(signal.stationIdx).toUpperCase()),
      ...departureList(s, signal.stationIdx),
    );
  } else {
    nodes.push(
      el('button', {
        class: 'btn btn--ghost btn--block',
        type: 'button',
        style: 'margin:0 12px 12px',
        onclick: () => router.openSheet('detail'),
      }, 'More detail'),
    );
  }
  return nodes;
}

/** PANEL/DETAIL for a selected station. */
function stationContent(s) {
  const idx = s.focusStation;
  const here = s.signals.filter(
    (x) => x.stationIdx === idx && isActive(resolveState(x)),
  );

  return [
    sectionHead(stationFullName(idx), `STOP ${idx} OF ${STATIONS.length}`),
    ...(here.length
      ? here.map((sig) =>
          el('div', { style: 'padding:12px 12px 0' }, [
            signalCard(sig, {
              onConfirm: (id) => vote(id, 1),
              onReject: (id) => vote(id, -1),
              onOpen: (id) => {
                store.set({ focusSignal: id });
                router.openSheet('detail');
              },
            }),
          ]),
        )
      : [sectorClear(`Nothing reported at ${stationName(idx)} in the last hour.`)]),
    sectionHead('Departures'),
    ...departureList(s, idx),
  ];
}

/** The whole-line view when nothing specific is selected. */
function overviewContent(s) {
  const active = s.signals
    .filter((x) => isActive(resolveState(x)))
    .sort((a, b) => b.createdAtMs - a.createdAtMs);

  const journey = activeJourney(s.journeys ?? []);
  const onRoute = journey
    ? relevantSignals(active, journey, s.position?.stationIdx ?? null)
    : [];

  // "Rest of the line" means the rest. Listing an on-route signal in both
  // sections makes two signals look like four.
  const onRouteIds = new Set(onRoute.map((r) => r.signal.id));
  const elsewhere = active.filter((sig) => !onRouteIds.has(sig.id));

  return [
    // When a journey is running, what matters on your route comes first, and
    // the rest of the line is still below it rather than hidden.
    ...(journey
      ? [
          sectionHead(journey.label || 'Your journey',
            journeyRouteLabel(journey, stationName)),
          onRoute.length
            ? el('div', {}, onRoute.map(({ signal, ahead }) =>
                el('div', { style: 'padding:12px 12px 0' }, [
                  signalCard(signal, {
                    onConfirm: (id) => vote(id, 1),
                    onReject: (id) => vote(id, -1),
                    onOpen: (id) => {
                      store.set({ focusSignal: id, focusStation: null });
                      router.openSheet('detail');
                    },
                  }),
                  ahead != null
                    ? el('div', { class: 'micro', style: 'margin-top:6px', text:
                        ahead === 0 ? 'AT YOUR STATION'
                                    : `${ahead} ${ahead === 1 ? 'STOP' : 'STOPS'} AHEAD` })
                    : null,
                ]),
              ))
            : sectorClear('Nothing reported on your route.'),
        ]
      : []),

    sectionHead(journey ? 'Rest of the line' : 'Line status',
      s.feed === 'live' ? 'LIVE' : 'SCHEDULE ONLY'),
    ...(elsewhere.length
      ? elsewhere.map((sig) =>
          el('div', { style: 'padding:12px 12px 0' }, [
            signalCard(sig, {
              onConfirm: (id) => vote(id, 1),
              onReject: (id) => vote(id, -1),
              onOpen: (id) => {
                store.set({ focusSignal: id, focusStation: null });
                router.openSheet('detail');
              },
            }),
          ]),
        )
      : [sectorClear(journey
          ? 'Nothing reported anywhere else on the line.'
          : undefined)]),
    el('div', { style: 'height:12px' }),
  ];
}

function departureList(s, stationIdx) {
  const calls = s.departures[stationIdx] ?? [];
  if (!calls.length) {
    return [el('div', { class: 'empty' }, [
      el('p', { class: 'empty__note', text: 'No departures in the next few hours.' }),
    ])];
  }
  return calls.map((c) => departureRow(c));
}

/* --- Actions -------------------------------------------------------------- */

async function vote(reportId, value) {
  const res = await backend.voteReport(reportId, value);
  if (!res.ok) {
    emit(EVENTS.TOAST, res.reason ?? 'COULD NOT REGISTER');
    return;
  }
  emit(EVENTS.TOAST, value > 0 ? 'CONFIRMATION LOGGED' : 'MARKED NOT THERE');
  await refreshSignals();
}

export async function refreshSignals() {
  const [signals, mine] = await Promise.all([backend.listSignals(), backend.myReports()]);
  store.set({ signals, myReports: mine });
}

/**
 * The station the peek row speaks for.
 *
 * Whatever this resolves to MUST be fetched, or the first thing a user sees is
 * "No departures found" — which is exactly what happens on desktop or when
 * location permission is refused, since neither position nor focus is set.
 * One definition, used by both the render and the fetch, so they cannot drift.
 */
function primaryStation(s) {
  // An active saved journey outranks a guess: if someone told us they catch
  // the 07:42 from Stavanger, that is the board they want at 07:20, whether or
  // not location permission was granted.
  const j = activeJourney(s.journeys ?? []);
  if (j && !s.focusStation) return j.fromIdx;
  return s.focusStation ?? s.position?.stationIdx ?? 1;
}

/** Fetch departures for the stations that matter: the user's, and any with signals. */
export async function refreshDepartures() {
  const s = store.get();
  const wanted = new Set();
  wanted.add(primaryStation(s));         // always — this is what PEEK shows
  if (s.position?.stationIdx) wanted.add(s.position.stationIdx);
  if (s.focusStation) wanted.add(s.focusStation);
  for (const sig of s.signals) wanted.add(sig.stationIdx);
  for (const j of s.journeys) wanted.add(j.fromIdx);

  const next = { ...s.departures };
  await Promise.all(
    [...wanted].map(async (idx) => {
      next[idx] = await transport.departuresFor(idx);
    }),
  );
  store.set({ departures: next });
}

function updateReportButton() {
  if (!reportBtn) return;
  const s = store.get();
  const used = slotsUsed(s.myReports ?? []);
  reportBtn.disabled = used >= MAX_UNCONFIRMED_PER_USER;
  reportBtn.title = reportBtn.disabled
    ? 'Both signal slots in use — wait for confirmation or expiry'
    : 'Report inspection activity';
}
