/**
 * REPORT — the fast path.
 *
 * The brief is strict: reporting must be extremely fast, with no long forms.
 *
 *   REPORT -> pick where -> INSPECTION NORTH or INSPECTION SOUTH -> sent
 *
 * Direction is the last tap and it submits immediately, so the whole flow is
 * two taps when we already know which station you are at. There is no free
 * text field, no photo, no severity picker: every extra control here is a
 * report that never gets filed because the train arrived.
 */

import { el, replace } from '../../core/dom.js';
import * as store from '../../core/state.js';
import { emit, EVENTS } from '../../core/bus.js';
import * as backend from '../../data/backend.js';
import { STATIONS, stationName } from '../../transport/stations.js';
import { CONTEXT, MAX_UNCONFIRMED_PER_USER, slotsUsed } from '../../domain/signals.js';
import { slotIndicator } from '../components.js';
import { refreshSignals } from './live.js';

let overlay = null;
let chosenStation = null;

export function mountReport(container) {
  overlay = el('section', {
    class: 'overlay',
    hidden: true,
    role: 'dialog',
    'aria-modal': 'true',
    'aria-label': 'Report inspection',
  });
  container.append(overlay);
}

export function openReport() {
  const s = store.get();
  // Default to where we think the user is, so the common case is one fewer tap.
  chosenStation = s.position?.stationIdx ?? s.focusStation ?? null;
  render();
  overlay.hidden = false;
}

export function closeReport() {
  if (overlay) overlay.hidden = true;
}

function render() {
  const s = store.get();
  const used = slotsUsed(s.myReports ?? []);

  replace(overlay, [
    el('header', { class: 'overlay__head' }, [
      el('span', { class: 'pixel', text: 'Report inspection' }),
      el('button', {
        class: 'btn btn--ghost',
        type: 'button',
        style: 'min-height:36px',
        onclick: closeReport,
      }, 'Cancel'),
    ]),

    el('div', { class: 'overlay__body' }, [
      // Slot state is shown as a fact up front, not sprung as an error later.
      el('div', {
        style: 'display:flex;align-items:center;justify-content:space-between;gap:12px',
      }, [
        el('span', { class: 'micro', text: 'YOUR ACTIVE SIGNAL SLOTS' }),
        slotIndicator(used, MAX_UNCONFIRMED_PER_USER),
      ]),
      el('p', {
        class: 'empty__note',
        style: 'text-align:left;margin:8px 0 0;max-width:none',
        text:
          'Two unconfirmed signals at a time. A slot frees as soon as the community '
          + 'confirms one, or it expires.',
      }),

      el('div', { style: 'height:20px' }),
      el('div', { class: 'micro', text: 'WHERE' }),
      stationPicker(),

      el('div', { style: 'height:20px' }),
      el('div', { class: 'micro', text: 'WHICH WAY ARE THEY HEADING' }),
      el('div', { class: 'choices' }, [
        directionBtn('north', `Toward ${STATIONS[0].name}`),
        directionBtn('south', `Toward ${STATIONS[STATIONS.length - 1].name}`),
        el('button', {
          class: 'choice',
          type: 'button',
          onclick: () => submit(null),
          disabled: chosenStation == null,
        }, [
          el('span', { class: 'pixel', text: 'At the station' }),
          el('span', { class: 'choice__hint', text: 'Not on a train' }),
        ]),
      ]),
    ]),

    el('div', { class: 'overlay__foot' }, [
      el('p', {
        class: 'micro',
        style: 'text-align:center',
        text: 'ONE TAP SENDS IT — NO FORM',
      }),
    ]),
  ]);
}

/**
 * Station picker.
 *
 * A scrolling list of all 19 rather than a dropdown: the list is short enough
 * to scan, and a native select on mobile is a modal inside a modal.
 */
function stationPicker() {
  const list = el('div', {
    class: 'choices',
    style: 'max-height:34vh;overflow-y:auto;border:1px solid var(--fg-faint)',
  });

  replace(
    list,
    STATIONS.map((s) =>
      el('button', {
        class: 'choice',
        type: 'button',
        style: 'border:none;border-bottom:1px solid var(--fg-faint);min-height:48px',
        'aria-pressed': String(chosenStation === s.idx),
        onclick: () => {
          chosenStation = s.idx;
          render();
        },
      }, [
        el('span', { class: 'pixel', text: s.name }),
        el('span', { class: 'choice__hint', text: `${s.idx}` }),
      ]),
    ),
  );
  return list;
}

function directionBtn(dir, hint) {
  return el('button', {
    class: 'choice',
    type: 'button',
    disabled: chosenStation == null,
    onclick: () => submit(dir),
  }, [
    el('span', { class: 'pixel', text: `Inspection ${dir}` }),
    el('span', { class: 'choice__hint', text: hint }),
  ]);
}

/** Submit and get out of the way. */
async function submit(direction) {
  if (chosenStation == null) return;

  const res = await backend.createReport({
    stationIdx: chosenStation,
    direction,
    context: direction ? CONTEXT.TRAIN : CONTEXT.STATION,
  });

  if (!res.ok) {
    emit(EVENTS.TOAST, res.reason ?? 'COULD NOT SEND');
    return;
  }

  closeReport();
  emit(EVENTS.TOAST, `SIGNAL SENT — ${stationName(chosenStation).toUpperCase()}`);
  emit(EVENTS.SIGNAL_SENT, res.report);
  await refreshSignals();
}
