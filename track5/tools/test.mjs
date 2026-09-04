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
  isPlausibleVoter,
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

eq('rookie vote weighs 1', voteWeight('ROOKIE', true), 1);
near('legend vote weighs 2', voteWeight('LEGEND', true), 2);
near('implausible rookie vote weighs 0.25', voteWeight('ROOKIE', false), 0.25);
near('implausible legend vote is still discounted', voteWeight('LEGEND', false), 0.5);
eq('unknown rank falls back to base', voteWeight('NOT_A_RANK', true), 1);

ok('voter at the same station is plausible', isPlausibleVoter(11, 11));
ok('voter 3 stops away is plausible', isPlausibleVoter(8, 11));
ok('voter 4 stops away is not', !isPlausibleVoter(7, 11));
ok('voter with no position is not plausible', !isPlausibleVoter(null, 11));
ok(
  'voter on a covering journey is plausible despite distance',
  isPlausibleVoter(1, 15, [{ fromIdx: 11, toIdx: 19 }]),
);
ok(
  'voter on a non-covering journey is not',
  !isPlausibleVoter(1, 15, [{ fromIdx: 1, toIdx: 6 }]),
);

// A troll ring far from the line cannot promote a signal on its own:
// four implausible rookie confirmations score 1.0, below the CONFIRMED bar.
const trollRing = report({ votes: confirms(4, voteWeight('ROOKIE', false)) });
eq('4 remote votes cannot confirm', resolveState(trollRing, T0 + MIN), STATE.UNCONFIRMED);
near('4 remote votes score only 1.0', score(trollRing.votes), 1);

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
eq(
  'a reputable pair can confirm faster than rookies',
  resolveState(report({ votes: confirms(2, voteWeight('VETERAN', true)) }), T0 + MIN),
  STATE.CONFIRMED,
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

const total = passed + failures.length;
if (failures.length) {
  console.error(`\n  FAILED  ${failures.length} of ${total}\n`);
  for (const f of failures) console.error(`   ✗ ${f}`);
  console.error('');
  process.exit(1);
}
console.log(`\n  PASS  ${passed}/${total} domain assertions\n`);
