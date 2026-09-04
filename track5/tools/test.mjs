/**
 * Track 5 domain tests.
 *
 *   node tools/test.mjs          (from track5/)
 *
 * These cover the rules the product brief is strict about: the confidence
 * state machine, signal expiry, the two-slot flood limit, and the requirement
 * that accuracy out-earns volume. They run without a browser, a network, or a
 * database, because every module under js/domain/ is pure by design.
 */

import {
  STATE,
  CONTEXT,
  THRESHOLD,
  MAX_UNCONFIRMED_PER_USER,
  REPORT_COOLDOWN_SEC,
  TTL_BASE_MIN,
  TTL_PER_CONFIRM_MIN,
  TTL_MAX_BONUS_MIN,
  voteWeight,
  isOnVoterRoute,
  score,
  expiresAt,
  resolveState,
  isActive,
  decayFraction,
  isDecaying,
  slotsUsed,
  slotsFree,
  canReport,
  confidenceFraction,
  confirmCount,
} from '../js/domain/signals.js';

import {
  XP,
  RANKS,
  rankFor,
  nextRank,
  rankProgress,
  xpToNext,
  xpForStateChange,
} from '../js/domain/xp.js';

import {
  project,
  fitToBox,
  distanceKm,
  nearestStation,
  stopsAhead,
  signalOnJourney,
} from '../js/domain/geo.js';

import { ago, until, delta } from '../js/core/time.js';

import {
  journeyDirection,
  journeyStations,
  isJourneyActive,
  activeJourney,
  relevantSignals,
  nextDeparture,
  daysLabel,
} from '../js/domain/journeys.js';

import {
  STATIONS,
  stationByIdx,
  stationName,
  minutesFromNorth,
  minutesBetween,
  stopsBetween,
  directionBetween,
  TOTAL_MINUTES,
} from '../js/transport/stations.js';

// ---------------------------------------------------------------------------

let passed = 0;
const failures = [];

function ok(name, cond, detail = '') {
  if (cond) {
    passed++;
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function eq(name, actual, expected) {
  ok(name, Object.is(actual, expected), `expected ${expected}, got ${actual}`);
}

function near(name, actual, expected, tol = 1e-6) {
  ok(
    name,
    Math.abs(actual - expected) <= tol,
    `expected ~${expected}, got ${actual}`,
  );
}

const MIN = 60_000;
const T0 = 1_700_000_000_000; // fixed epoch so tests never depend on the clock

/** Build a report fixture. */
function report({ createdAtMs = T0, context = CONTEXT.STATION, votes = [] } = {}) {
  return { createdAtMs, context, votes };
}

/** n confirming votes of a given weight. */
function confirms(n, weight = 1) {
  return Array.from({ length: n }, () => ({ vote: 1, weight }));
}
function rejects(n, weight = 1) {
  return Array.from({ length: n }, () => ({ vote: -1, weight }));
}

// ---------------------------------------------------------------------------
// Station table
// ---------------------------------------------------------------------------

eq('19 stations', STATIONS.length, 19);
eq('first is Stavanger', STATIONS[0].name, 'Stavanger');
eq('last is Egersund', STATIONS[18].name, 'Egersund');
ok(
  'indices are 1..19 in order',
  STATIONS.every((s, i) => s.idx === i + 1),
);
ok(
  'exact brief order preserved',
  STATIONS.map((s) => s.name).join('|') ===
    [
      'Stavanger', 'Paradis', 'Mariero', 'Jåttåvågen', 'Gausel',
      'Sandnes sentrum', 'Skeiane', 'Ganddal', 'Øksnavadporten', 'Klepp',
      'Bryne', 'Nærbø', 'Varhaug', 'Vigrestad', 'Brusand', 'Ogna',
      'Sirevåg', 'Hellvik', 'Egersund',
    ].join('|'),
);
ok('every station has coordinates', STATIONS.every((s) => s.lat && s.lon));
ok(
  'latitude decreases going south',
  STATIONS.every((s, i) => i === 0 || s.lat < STATIONS[i - 1].lat),
);
eq('stationName resolves', stationName(4), 'Jåttåvågen');
eq('stationByIdx out of range is null', stationByIdx(99), null);
eq('minutesFromNorth at origin', minutesFromNorth(1), 0);
ok('end-to-end run time is plausible', TOTAL_MINUTES > 55 && TOTAL_MINUTES < 90,
   `got ${TOTAL_MINUTES}`);
eq('minutesBetween is symmetric', minutesBetween(3, 11), minutesBetween(11, 3));
eq('stopsBetween counts stops', stopsBetween(4, 11), 7);
eq('direction north', directionBetween(11, 4), 'north');
eq('direction south', directionBetween(4, 11), 'south');
eq('direction same station', directionBetween(4, 4), null);

// ---------------------------------------------------------------------------
// Vote weighting and plausibility
// ---------------------------------------------------------------------------

// An ordinary vote is worth exactly 1, which is what makes "two people agree"
// the CONFIRMED threshold. This must match public.vote_weight_for() in
// schema.sql, or the interface will predict a confidence the database
// disagrees with and the number will jump on the next refresh.
eq('an ordinary vote weighs 1', voteWeight('ROOKIE', false), 1);
near('being on the route is an uplift, not a requirement', voteWeight('ROOKIE', true), 1.25);
near('legend vote weighs 2', voteWeight('LEGEND', false), 2);
near('legend on route weighs 2.5', voteWeight('LEGEND', true), 2.5);
eq('unknown rank falls back to base', voteWeight('NOT_A_RANK', false), 1);
ok('no vote is ever worth less than an ordinary one', voteWeight('ROOKIE', false) >= 1);

ok('report at your station is on your route', isOnVoterRoute(11, 11));
ok('3 stops away is on your route', isOnVoterRoute(8, 11));
ok('4 stops away is not', !isOnVoterRoute(7, 11));
ok('unknown position is not', !isOnVoterRoute(null, 11));
ok(
  'a covering saved journey counts regardless of distance',
  isOnVoterRoute(1, 15, [{ fromIdx: 11, toIdx: 19 }]),
);
ok(
  'a non-covering journey does not',
  !isOnVoterRoute(1, 15, [{ fromIdx: 1, toIdx: 6 }]),
);

// Two ordinary people agreeing is the bar. Verified against the database in
// supabase/test/01-security.sql, which reaches CONFIRMED on the second vote.
const twoStrangers = report({ votes: confirms(2, voteWeight('ROOKIE', false)) });
eq('two ordinary confirmations reach CONFIRMED',
   resolveState(twoStrangers, T0 + MIN), STATE.CONFIRMED);
const oneStranger = report({ votes: confirms(1, voteWeight('ROOKIE', false)) });
eq('one does not', resolveState(oneStranger, T0 + MIN), STATE.UNCONFIRMED);

// ---------------------------------------------------------------------------
// Confidence state machine
// ---------------------------------------------------------------------------

eq('fresh report is unconfirmed', resolveState(report(), T0 + MIN), STATE.UNCONFIRMED);
eq(
  'one confirmation is not enough',
  resolveState(report({ votes: confirms(1) }), T0 + MIN),
  STATE.UNCONFIRMED,
);
eq(
  'two confirmations reach CONFIRMED',
  resolveState(report({ votes: confirms(2) }), T0 + MIN),
  STATE.CONFIRMED,
);
eq(
  'four confirmations reach HIGH CONFIDENCE',
  resolveState(report({ votes: confirms(4) }), T0 + MIN),
  STATE.HIGH_CONFIDENCE,
);
eq(
  'two rejections dismiss a report',
  resolveState(report({ votes: rejects(2) }), T0 + MIN),
  STATE.DISMISSED,
);
eq(
  'rejections cancel confirmations',
  resolveState(report({ votes: [...confirms(3), ...rejects(2)] }), T0 + MIN),
  STATE.UNCONFIRMED,
);
// Reputation genuinely buys influence, and that is the point of having ranks.
// Two veterans who both travel the route carry 2.125 each, so their agreement
// is treated as strong evidence rather than merely adequate.
eq(
  'two on-route veterans agreeing reaches HIGH CONFIDENCE',
  resolveState(report({ votes: confirms(2, voteWeight('VETERAN', true)) }), T0 + MIN),
  STATE.HIGH_CONFIDENCE,
);
// The ceiling that matters: a single account, however senior, can move a
// report to CONFIRMED but never straight to HIGH CONFIDENCE. Corroboration by
// a second person is always required for the strongest state.
eq(
  'one legend can confirm but not certify',
  resolveState(report({ votes: confirms(1, voteWeight('LEGEND', true)) }), T0 + MIN),
  STATE.CONFIRMED,
);
ok(
  'no single vote can reach HIGH CONFIDENCE',
  voteWeight('LEGEND', true) < THRESHOLD.HIGH_CONFIDENCE,
  `max single vote is ${voteWeight('LEGEND', true)}`,
);
eq('DISMISSED beats a live TTL', resolveState(report({ votes: rejects(3) }), T0), STATE.DISMISSED);

ok('active states are drawable', isActive(STATE.UNCONFIRMED) && isActive(STATE.CONFIRMED) &&
  isActive(STATE.HIGH_CONFIDENCE));
ok('dead states are not', !isActive(STATE.EXPIRED) && !isActive(STATE.DISMISSED));

// ---------------------------------------------------------------------------
// Expiry
// ---------------------------------------------------------------------------

eq(
  'station TTL base is 40 min',
  expiresAt(T0, CONTEXT.STATION, 0),
  T0 + TTL_BASE_MIN.station * MIN,
);
eq(
  'train TTL is shorter — a train moves away from you',
  expiresAt(T0, CONTEXT.TRAIN, 0),
  T0 + TTL_BASE_MIN.train * MIN,
);
eq(
  'each confirmation extends life by 8 min',
  expiresAt(T0, CONTEXT.STATION, 2),
  T0 + (TTL_BASE_MIN.station + 2 * TTL_PER_CONFIRM_MIN) * MIN,
);
eq(
  'TTL extension is capped',
  expiresAt(T0, CONTEXT.STATION, 99),
  T0 + (TTL_BASE_MIN.station + TTL_MAX_BONUS_MIN) * MIN,
);

eq(
  'a report expires after its TTL',
  resolveState(report(), T0 + 41 * MIN),
  STATE.EXPIRED,
);
eq(
  'expiry overrides HIGH CONFIDENCE — the question is "is this true now"',
  resolveState(report({ votes: confirms(4) }), T0 + 200 * MIN),
  STATE.EXPIRED,
);
eq(
  'confirmations keep a signal alive past the base TTL',
  resolveState(report({ votes: confirms(4) }), T0 + 50 * MIN),
  STATE.HIGH_CONFIDENCE,
);

near('decay is 0 at birth', decayFraction(report(), T0), 0);
near('decay is 0.5 at half life', decayFraction(report(), T0 + 20 * MIN), 0.5, 1e-9);
ok('not decaying early', !isDecaying(report(), T0 + 10 * MIN));
ok('decaying past 60% of life', isDecaying(report(), T0 + 25 * MIN));

// ---------------------------------------------------------------------------
// Flood limit — the two-slot rule
// ---------------------------------------------------------------------------

eq('limit is 2', MAX_UNCONFIRMED_PER_USER, 2);

const twoOpen = [report(), report()];
eq('two unconfirmed reports use both slots', slotsUsed(twoOpen, T0 + MIN), 2);
eq('no slots left', slotsFree(twoOpen, T0 + MIN), 0);
ok('a third report is blocked', !canReport(twoOpen, null, T0 + MIN).allowed);
ok(
  'the block explains itself',
  /SLOT/.test(canReport(twoOpen, null, T0 + MIN).reason ?? ''),
);

const oneConfirmed = [report({ votes: confirms(2) }), report()];
eq(
  'a confirmed report stops consuming a slot',
  slotsUsed(oneConfirmed, T0 + MIN),
  1,
);
ok('so the user may report again', canReport(oneConfirmed, null, T0 + MIN).allowed);

eq(
  'an expired report frees its slot',
  slotsUsed(twoOpen, T0 + 41 * MIN),
  0,
);
eq(
  'a dismissed report frees its slot immediately',
  slotsUsed([report({ votes: rejects(2) }), report()], T0 + MIN),
  1,
);

// Cooldown
ok(
  'cooldown blocks a rapid second report',
  !canReport([], T0, T0 + 10_000).allowed,
);
ok(
  'cooldown reason counts down',
  /COOLDOWN/.test(canReport([], T0, T0 + 10_000).reason ?? ''),
);
ok(
  'cooldown clears',
  canReport([], T0, T0 + (REPORT_COOLDOWN_SEC + 1) * 1000).allowed,
);

// ---------------------------------------------------------------------------
// Presentation
// ---------------------------------------------------------------------------

ok(
  'an unconfirmed signal still reads as a signal, not as nothing',
  confidenceFraction(report()) > 0,
);
near('confidence saturates at HIGH CONFIDENCE', confidenceFraction(report({ votes: confirms(4) })), 1);
ok(
  'confidence never exceeds full — crowdsourced data is never certain',
  confidenceFraction(report({ votes: confirms(50) })) === 1,
);
eq('confirm count ignores rejections', confirmCount(report({ votes: [...confirms(3), ...rejects(2)] })), 3);

// ---------------------------------------------------------------------------
// XP — the anti-spam property
// ---------------------------------------------------------------------------

eq('ranks ascend', RANKS.map((r) => r.at).join(), '0,100,300,750,1500,3000,6000');
eq('7 ranks', RANKS.length, 7);
eq('zero XP is ROOKIE', rankFor(0), 'ROOKIE');
eq('99 XP is still ROOKIE', rankFor(99), 'ROOKIE');
eq('100 XP is SPOTTER', rankFor(100), 'SPOTTER');
eq('6000 XP is LEGEND', rankFor(6000), 'LEGEND');
eq('beyond the top stays LEGEND', rankFor(99999), 'LEGEND');
eq('next rank from 0', nextRank(0).name, 'SPOTTER');
eq('no rank beyond LEGEND', nextRank(6000), null);
near('progress halfway to SPOTTER', rankProgress(50), 0.5);
eq('progress is complete at LEGEND', rankProgress(9999), 1);
eq('xpToNext from 0', xpToNext(0), 100);
eq('xpToNext at LEGEND', xpToNext(6000), 0);

eq('confirmation pays', xpForStateChange('UNCONFIRMED', 'CONFIRMED'), XP.REPORT_CONFIRMED);
eq(
  'a jump to HIGH CONFIDENCE pays both steps',
  xpForStateChange('UNCONFIRMED', 'HIGH_CONFIDENCE'),
  XP.REPORT_CONFIRMED + XP.REPORT_HIGH_CONFIDENCE,
);
eq(
  'promotion from CONFIRMED pays only the remaining step',
  xpForStateChange('CONFIRMED', 'HIGH_CONFIDENCE'),
  XP.REPORT_HIGH_CONFIDENCE,
);
eq('no double payment', xpForStateChange('CONFIRMED', 'CONFIRMED'), 0);
eq('no payment for decay', xpForStateChange('CONFIRMED', 'UNCONFIRMED'), 0);
eq('being wrong costs', xpForStateChange('UNCONFIRMED', 'DISMISSED'), XP.REPORT_DISMISSED);
ok('and it costs more than filing paid', XP.REPORT_DISMISSED + XP.REPORT_SUBMITTED < 0);

// The core anti-spam claim, as arithmetic.
const spamYield = 2 * XP.REPORT_SUBMITTED;                              // 2 ignored reports
const accurateYield = XP.REPORT_SUBMITTED + XP.REPORT_CONFIRMED +
                      XP.REPORT_HIGH_CONFIDENCE;                        // 1 report that lands
ok(
  'accuracy out-earns volume by a wide margin',
  accurateYield >= spamYield * 5,
  `spam ${spamYield} vs accurate ${accurateYield}`,
);
ok(
  'confirming others out-earns filing an ignored report',
  XP.VOTE_CAST > XP.REPORT_SUBMITTED,
);
const worstCaseSpam = 2 * (XP.REPORT_SUBMITTED + XP.REPORT_DISMISSED);
ok('a spammer whose reports get rejected loses XP', worstCaseSpam < 0, `${worstCaseSpam}`);

// ---------------------------------------------------------------------------
// Geo
// ---------------------------------------------------------------------------

const p1 = project(58.97, 5.7331);
const p2 = project(58.452, 6.0007);
ok('projection moves south as y grows', p2.y > p1.y);
ok('projection moves east as x grows', p2.x > p1.x);

const fit = fitToBox(STATIONS.map((s) => project(s.lat, s.lon)), {
  width: 360, height: 640, pad: 20,
});
const fitted = STATIONS.map((s) => fit.apply(project(s.lat, s.lon)));
ok('all stations land inside the box', fitted.every((p) =>
  p.x >= 0 && p.x <= 360 && p.y >= 0 && p.y <= 640));
ok('Stavanger is drawn above Egersund', fitted[0].y < fitted[18].y);

// The corridor's true bounding box is about 21 km east-west by 58 km
// north-south — the line bends east after Sirevåg, so it is not the hairline
// strip it looks like on a schematic. Preserving that aspect is what keeps the
// GEO view geographically honest; the reason GEO still cannot be the default is
// density, not shape: 19 stations over 58 km on a phone puts markers ~30px
// apart with colliding labels, which is why GEO auto-zooms to a neighbourhood
// and STRIP carries the whole-line view.
const fw = Math.max(...fitted.map((p) => p.x)) - Math.min(...fitted.map((p) => p.x));
const fh = Math.max(...fitted.map((p) => p.y)) - Math.min(...fitted.map((p) => p.y));
ok('corridor is markedly taller than wide', fh / fw > 2.5, `aspect 1:${(fh / fw).toFixed(2)}`);
ok('aspect is not distorted to fill the box', fh / fw < 3.2, `aspect 1:${(fh / fw).toFixed(2)}`);
ok(
  'whole-line GEO view would be too dense to tap — hence STRIP as default',
  fh / (STATIONS.length - 1) < 44,
  `${(fh / (STATIONS.length - 1)).toFixed(1)}px between stations`,
);

const stvToEgr = distanceKm(58.97, 5.7331, 58.452, 6.0007);
ok('Stavanger to Egersund is roughly 60-75 km as the crow flies',
   stvToEgr > 55 && stvToEgr < 80, `got ${stvToEgr.toFixed(1)} km`);

const atBryne = nearestStation(58.7357, 5.6462, STATIONS);
eq('nearest station resolves', atBryne.station.name, 'Bryne');
near('and reports ~0 km', atBryne.km, 0, 0.5);
eq('someone in Oslo is not on the line', nearestStation(59.91, 10.75, STATIONS), null);

eq('signal 2 stops south is 2 ahead', stopsAhead(4, 'south', 6), 2);
eq('signal 2 stops north is 2 ahead when heading north', stopsAhead(6, 'north', 4), 2);
eq('a signal behind you is not ahead', stopsAhead(6, 'south', 4), null);
eq('a signal at your station is 0 ahead', stopsAhead(6, 'south', 6), 0);
eq('unknown position gives no claim', stopsAhead(null, 'south', 6), null);

ok('signal inside a journey is relevant', signalOnJourney(4, { fromIdx: 1, toIdx: 6 }));
ok('signal outside is not', !signalOnJourney(9, { fromIdx: 1, toIdx: 6 }));
ok('journey direction does not matter', signalOnJourney(4, { fromIdx: 6, toIdx: 1 }));

// ---------------------------------------------------------------------------
// Saved journeys
// ---------------------------------------------------------------------------

const commute = {
  id: 'j1', label: 'HOME → WORK',
  fromIdx: 1, toIdx: 6,               // Stavanger -> Sandnes sentrum
  days: [0, 1, 2, 3, 4], windowStart: '07:30', windowEnd: '08:30',
};

eq('a southbound commute heads south', journeyDirection(commute), 'south');
eq('a return commute heads north',
   journeyDirection({ ...commute, fromIdx: 6, toIdx: 1 }), 'north');
eq('journey covers every stop in order',
   journeyStations(commute).join(), '1,2,3,4,5,6');
eq('and reverses cleanly',
   journeyStations({ ...commute, fromIdx: 6, toIdx: 1 }).join(), '6,5,4,3,2,1');

// A Tuesday. Window is 07:30-08:30 with 25 minutes of lead time.
const tue = (h, m) => new Date(2026, 8, 8, h, m); // 8 Sep 2026 is a Tuesday
const sat = (h, m) => new Date(2026, 8, 12, h, m);

ok('inside the window', isJourneyActive(commute, tue(7, 45)));
ok('lead time covers the walk to the platform', isJourneyActive(commute, tue(7, 10)));
ok('too early is not active', !isJourneyActive(commute, tue(6, 30)));
ok('after the window is not active', !isJourneyActive(commute, tue(9, 15)));
ok('a weekday commute is quiet on Saturday', !isJourneyActive(commute, sat(7, 45)));
eq('no active journey out of hours', activeJourney([commute], tue(15, 0)), null);
eq('the active one is found', activeJourney([commute], tue(7, 45))?.id, 'j1');

const onRoute = { id: 's1', stationIdx: 4, createdAtMs: T0, context: CONTEXT.STATION, votes: [] };
const offRoute = { id: 's2', stationIdx: 15, createdAtMs: T0, context: CONTEXT.STATION, votes: [] };

eq('only on-route signals are relevant',
   relevantSignals([onRoute, offRoute], commute).map((r) => r.signal.id).join(), 's1');
eq('stops-ahead is computed from the user position',
   relevantSignals([onRoute], commute, 2)[0].ahead, 2);
eq('and stays null when position is unknown',
   relevantSignals([onRoute], commute, null)[0].ahead, null);
eq('a signal behind you reports no distance',
   relevantSignals([onRoute], commute, 5)[0].ahead, null);

// Direction filtering: the northbound platform is no use to a southbound commuter.
const calls = [
  { expectedMs: T0 + 5 * MIN, direction: 'north' },
  { expectedMs: T0 + 9 * MIN, direction: 'south' },
  { expectedMs: T0 + 2 * MIN, direction: 'north' },
];
eq('next departure matches the direction of travel',
   nextDeparture(calls, commute, T0)?.expectedMs, T0 + 9 * MIN);
eq('no journey means no answer', nextDeparture(calls, null, T0), null);
eq('departures already gone are skipped',
   nextDeparture([{ expectedMs: T0 - 10 * MIN, direction: 'south' }], commute, T0), null);

eq('weekday set is named', daysLabel([0, 1, 2, 3, 4]), 'WEEKDAYS');
eq('weekend set is named', daysLabel([5, 6]), 'WEEKENDS');
eq('full week is named', daysLabel([0, 1, 2, 3, 4, 5, 6]), 'EVERY DAY');
eq('an odd set is spelled out', daysLabel([0, 2, 4]), 'MON WED FRI');
eq('an empty set says so', daysLabel([]), 'NEVER');

// ---------------------------------------------------------------------------
// Time formatting — user-facing, and signal age is load-bearing in this product
// ---------------------------------------------------------------------------

eq('fresh is JUST NOW', ago(T0, T0), 'JUST NOW');
eq('30s is still JUST NOW', ago(T0, T0 + 30_000), 'JUST NOW');
eq('3 minutes reads as the brief specifies', ago(T0, T0 + 3 * MIN), '3 MIN AGO');
eq('59 minutes stays in minutes', ago(T0, T0 + 59 * MIN), '59 MIN AGO');
eq('an exact hour', ago(T0, T0 + 60 * MIN), '1 H AGO');
eq('an hour and change', ago(T0, T0 + 80 * MIN), '1 H 20 AGO');
eq('a future timestamp never reads as negative', ago(T0 + MIN, T0), 'JUST NOW');

eq('departed is NOW', until(T0, T0), 'NOW');
eq('imminent is NOW', until(T0 + 20_000, T0), 'NOW');
eq('4 minutes out', until(T0 + 4 * MIN, T0), 'IN 4 MIN');
// Regression: this used to fall back to a clock time past 20 minutes, which
// rendered the departure time twice ("06:43 SCHED 06:43") and read as a delay.
eq('45 minutes stays relative', until(T0 + 45 * MIN, T0), 'IN 45 MIN');
eq('over an hour', until(T0 + 65 * MIN, T0), 'IN 1 H 05');
eq('exact hours drop the minutes', until(T0 + 120 * MIN, T0), 'IN 2 H');
ok('a countdown never contains a colon', !until(T0 + 90 * MIN, T0).includes(':'));

eq('no delta for an on-time train', delta(0), null);
eq('a delay is signed', delta(8), '+8 MIN');
ok('an early train is marked too', delta(-2).includes('2 MIN'));

// ---------------------------------------------------------------------------

const total = passed + failures.length;
if (failures.length) {
  console.error(`\n  FAILED  ${failures.length} of ${total}\n`);
  for (const f of failures) console.error(`   ✗ ${f}`);
  console.error('');
  process.exit(1);
}
console.log(`\n  PASS  ${passed}/${total} domain assertions\n`);
