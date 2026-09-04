/**
 * Reusable interface pieces.
 *
 * Everything transport-related renders in mono at data size; everything that is
 * chrome renders in the pixel face. That split is the whole readability
 * strategy — the theme lives in the labels, never in the numbers people need
 * to read quickly.
 */

import { el } from '../core/dom.js';
import { ago, clock, delta } from '../core/time.js';
import {
  STATE, STATE_LABEL, THRESHOLD,
  resolveState, isDecaying, confidenceFraction, confirmCount, rejectCount,
} from '../domain/signals.js';
import { stationName } from '../transport/stations.js';

/* --- Departures ----------------------------------------------------------- */

/**
 * One departure.
 *
 * Status is the only place colour appears, and it carries exactly one of the
 * three meanings. A scheduled-only time is marked SCHED rather than being
 * passed off as live.
 */
export function departureRow(call, nowMs = Date.now()) {
  const status = departureStatus(call);
  return el('div', { class: 'dep', dataset: { service: call.serviceId } }, [
    el('span', { class: 'dep__time data', text: clock(call.expectedMs) }),
    el('span', { class: 'dep__dest', text: call.destination || '—' }, []),
    el('span', {
      class: `dep__status ${status.tone}`,
      text: status.text,
    }),
    call.delayMin > 1 && !call.cancelled
      ? el('span', { class: 'dep__aimed data', text: clock(call.aimedMs) })
      : null,
  ]);
}

/** Map a call onto the three meanings. Nothing else uses colour. */
export function departureStatus(call) {
  if (call.cancelled) return { text: 'CANCELLED', tone: 'is-alert' };
  if (call.delayMin > 1) return { text: delta(call.delayMin), tone: 'is-warn' };
  if (!call.realtime) return { text: 'SCHED', tone: 'dim' };
  return { text: 'ON TIME', tone: 'is-ok' };
}

/* --- Signals -------------------------------------------------------------- */

/**
 * A community signal, with its one-tap responses.
 *
 * Confirm and reject are given equal visual weight on purpose: the interface
 * must not nudge anyone toward confirming something they did not actually see,
 * or the confidence score stops meaning anything.
 */
export function signalCard(signal, { nowMs = Date.now(), onConfirm, onReject, onOpen, canVote = true } = {}) {
  const state = resolveState(signal, nowMs);
  const decaying = isDecaying(signal, nowMs);
  const confirms = confirmCount(signal);

  const card = el('div', {
    class: 'signal',
    dataset: { state, decaying: String(decaying), id: signal.id },
  }, [
    el('div', { class: 'signal__head' }, [
      el('span', { class: 'signal__station', text: stationName(signal.stationIdx).toUpperCase() }),
      el('span', { class: 'signal__age', text: ago(signal.createdAtMs, nowMs) }),
    ]),
    el('div', { class: 'micro', style: 'margin-top:2px' }, [
      `INSPECTION ${String(signal.direction ?? '').toUpperCase() || 'REPORTED'}`,
    ]),
    el('div', { style: 'margin-top:8px;display:flex;align-items:center;gap:8px' }, [
      el('span', { class: 'badge', dataset: { state }, text: STATE_LABEL[state] }),
      confirms
        ? el('span', { class: 'micro', text: `CONFIRMED BY ${confirms}` })
        : el('span', { class: 'micro', text: 'AWAITING CONFIRMATION' }),
    ]),
    confidenceMeter(signal),
  ]);

  const votable = state === STATE.UNCONFIRMED
    || state === STATE.CONFIRMED
    || state === STATE.HIGH_CONFIDENCE;

  if (canVote && votable) {
    card.append(
      el('div', { class: 'signal__actions' }, [
        el('button', {
          class: 'btn btn--confirm',
          type: 'button',
          onclick: (e) => { e.stopPropagation(); onConfirm?.(signal.id); },
        }, 'Confirm'),
        el('button', {
          class: 'btn btn--reject',
          type: 'button',
          onclick: (e) => { e.stopPropagation(); onReject?.(signal.id); },
        }, 'Not there'),
      ]),
    );
  } else if (!canVote && votable) {
    // Your own signal. The database refuses a self-vote anyway, so offering
    // the button and then erroring would be the interface setting a trap.
    card.append(
      el('div', { class: 'micro', style: 'margin-top:12px',
        text: 'YOUR SIGNAL — WAITING FOR SOMEONE ELSE TO CONFIRM' }),
    );
  }

  if (onOpen) {
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => onOpen(signal.id));
  }
  return card;
}

/**
 * Segmented confidence meter.
 *
 * Discrete blocks rather than a smooth bar, because the underlying quantity is
 * a count of people. It saturates at HIGH CONFIDENCE and never reads as
 * certainty — crowdsourced information never is.
 */
export function confidenceMeter(signal) {
  const segments = THRESHOLD.HIGH_CONFIDENCE;
  const filled = Math.round(confidenceFraction(signal) * segments);
  return el(
    'div',
    { class: 'meter', role: 'img', 'aria-label': `Confidence ${filled} of ${segments}` },
    Array.from({ length: segments }, (_, i) =>
      el('span', { class: 'meter__seg', dataset: { on: String(i < filled) } }),
    ),
  );
}

/* --- States --------------------------------------------------------------- */

/**
 * SECTOR CLEAR.
 *
 * The brief requires the app to stay interesting when nothing is happening, so
 * an empty line is reported as a finding rather than rendered as a blank.
 */
export function sectorClear(note = 'No inspection signals on the line right now.') {
  return el('div', { class: 'empty' }, [
    el('div', { class: 'empty__mark', text: 'SECTOR CLEAR' }),
    el('p', { class: 'empty__note', text: note }),
  ]);
}

export function emptyState(mark, note) {
  return el('div', { class: 'empty' }, [
    el('div', { class: 'empty__mark dim', text: mark }),
    el('p', { class: 'empty__note', text: note }),
  ]);
}

export function sectionHead(title, right = null) {
  return el('div', { class: 'section' }, [
    el('span', { class: 'section__title', text: title }),
    right ? el('span', { class: 'micro', text: right }) : null,
  ]);
}

/** Two boxes showing how many of the user's report slots are in use. */
export function slotIndicator(used, max) {
  return el('span', { class: 'slots', 'aria-label': `${used} of ${max} signal slots used` }, [
    ...Array.from({ length: max }, (_, i) =>
      el('span', { class: 'slots__box', dataset: { used: String(i < used) } }),
    ),
  ]);
}
