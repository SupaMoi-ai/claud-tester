/**
 * Saved journeys — the editor, mounted inside PROFILE.
 *
 * Kept deliberately small. A journey is four facts: where from, where to,
 * which days, and roughly when. Anything more and people will not bother
 * setting one up, and a journey nobody saves cannot make the app more useful.
 */

import { el, replace } from '../../core/dom.js';
import * as store from '../../core/state.js';
import * as backend from '../../data/backend.js';
import { emit, EVENTS } from '../../core/bus.js';
import { STATIONS, stationName } from '../../transport/stations.js';
import { sectionHead } from '../components.js';
import {
  daysLabel, journeyRouteLabel, isJourneyActive, journeyDirection,
} from '../../domain/journeys.js';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export function journeysSection() {
  const host = el('div');
  render(host);
  store.subscribe(() => render(host), ['journeys']);
  return host;
}

function render(host) {
  const journeys = store.get().journeys ?? [];

  replace(host, [
    sectionHead('Your journeys', journeys.length ? `${journeys.length} SAVED` : null),

    ...(journeys.length
      ? journeys.map((j) => journeyRow(j))
      : [el('div', { class: 'empty' }, [
          el('p', { class: 'empty__note', text:
            'Save the trip you actually make and Track 5 will lead with that '
            + 'train, and only tell you about signals on your route.' }),
        ])]),

    el('button', {
      class: 'btn btn--block',
      type: 'button',
      style: 'margin:12px 16px',
      onclick: () => openEditor(host, null),
    }, 'Add a journey'),
  ]);
}

function journeyRow(j) {
  const active = isJourneyActive(j);
  return el('div', { class: 'row' }, [
    el('div', { class: 'row__main' }, [
      el('div', { style: 'display:flex;gap:8px;align-items:baseline' }, [
        el('span', { class: 'pixel', text: j.label || 'JOURNEY' }),
        active ? el('span', { class: 'micro is-ok', text: 'ACTIVE NOW' }) : null,
      ]),
      el('div', { class: 'row__title dim', style: 'margin-top:2px',
        text: journeyRouteLabel(j, stationName) }),
      el('div', { class: 'micro', style: 'margin-top:2px',
        text: `${daysLabel(j.days)} · ${j.windowStart}–${j.windowEnd} · ${journeyDirection(j).toUpperCase()}` }),
    ]),
    el('button', {
      class: 'btn btn--ghost',
      type: 'button',
      style: 'min-height:36px;padding:0 10px',
      'aria-label': `Delete ${j.label}`,
      onclick: async () => {
        await backend.deleteJourney(j.id);
        store.set({ journeys: await backend.listJourneys() });
        emit(EVENTS.TOAST, 'JOURNEY REMOVED');
      },
    }, 'Delete'),
  ]);
}

/* --- Editor ---------------------------------------------------------------
   A full-screen overlay rather than an inline form, so the station pickers
   have room and nothing is cramped on a phone. */

function openEditor(host, existing) {
  const draft = existing ?? {
    label: 'HOME → WORK',
    fromIdx: 1,
    toIdx: 6,
    days: [0, 1, 2, 3, 4],
    windowStart: '07:30',
    windowEnd: '08:30',
  };

  const overlay = el('section', {
    class: 'overlay',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-label': 'Edit journey',
  });

  const close = () => overlay.remove();

  const labelInput = input('text', draft.label, { maxlength: '24' });
  const startInput = input('time', draft.windowStart);
  const endInput = input('time', draft.windowEnd);
  const fromSel = stationSelect(draft.fromIdx);
  const toSel = stationSelect(draft.toIdx);
  const dayBtns = DAYS.map((name, i) => {
    const b = el('button', {
      class: 'btn',
      type: 'button',
      style: 'min-height:40px;padding:0;flex:1',
      'aria-pressed': String(draft.days.includes(i)),
      onclick: () => {
        const on = b.getAttribute('aria-pressed') === 'true';
        b.setAttribute('aria-pressed', String(!on));
        b.classList.toggle('btn--primary', !on);
      },
    }, name.slice(0, 1));
    if (draft.days.includes(i)) b.classList.add('btn--primary');
    return b;
  });

  replace(overlay, [
    el('header', { class: 'overlay__head' }, [
      el('span', { class: 'pixel', text: existing ? 'Edit journey' : 'New journey' }),
      el('button', { class: 'btn btn--ghost', type: 'button',
        style: 'min-height:36px', onclick: close }, 'Cancel'),
    ]),

    el('div', { class: 'overlay__body' }, [
      field('Name', labelInput),
      field('From', fromSel),
      field('To', toSel),
      field('Days', el('div', { style: 'display:flex;gap:4px' }, dayBtns)),
      field('Between', el('div', { style: 'display:flex;gap:8px;align-items:center' }, [
        startInput, el('span', { class: 'micro', text: 'AND' }), endInput,
      ])),
      el('p', { class: 'empty__note', style: 'text-align:left;margin-top:16px;max-width:none',
        text: 'Track 5 starts paying attention about 25 minutes before the window '
            + 'opens, so a delay reaches you while you can still do something about it.' }),
    ]),

    el('div', { class: 'overlay__foot' }, [
      el('button', {
        class: 'btn btn--primary btn--block btn--lg',
        type: 'button',
        onclick: async () => {
          const days = dayBtns
            .map((b, i) => (b.getAttribute('aria-pressed') === 'true' ? i : null))
            .filter((i) => i != null);

          if (!days.length) {
            emit(EVENTS.TOAST, 'PICK AT LEAST ONE DAY');
            return;
          }
          if (Number(fromSel.value) === Number(toSel.value)) {
            emit(EVENTS.TOAST, 'FROM AND TO MUST DIFFER');
            return;
          }

          await backend.saveJourney({
            id: existing?.id,
            label: labelInput.value.trim() || 'JOURNEY',
            fromIdx: Number(fromSel.value),
            toIdx: Number(toSel.value),
            days,
            windowStart: startInput.value || '07:30',
            windowEnd: endInput.value || '08:30',
          });
          store.set({ journeys: await backend.listJourneys() });
          close();
          emit(EVENTS.TOAST, 'JOURNEY SAVED');
        },
      }, existing ? 'Save changes' : 'Save journey'),
    ]),
  ]);

  document.querySelector('#screen-profile').append(overlay);
}

function field(label, control) {
  return el('div', { style: 'margin-bottom:18px' }, [
    el('div', { class: 'micro', style: 'margin-bottom:6px', text: label.toUpperCase() }),
    control,
  ]);
}

function input(type, value, attrs = {}) {
  return el('input', {
    type,
    value,
    ...attrs,
    style: 'width:100%;height:44px;padding:0 12px;background:var(--bg);'
      + 'color:var(--fg);border:1px solid var(--fg);font-family:var(--font-mono);'
      + 'font-size:14px',
  });
}

function stationSelect(selected) {
  const sel = el('select', {
    style: 'width:100%;height:44px;padding:0 12px;background:var(--bg);'
      + 'color:var(--fg);border:1px solid var(--fg);font-family:var(--font-mono);'
      + 'font-size:14px',
  });
  for (const s of STATIONS) {
    sel.append(el('option', { value: String(s.idx), selected: s.idx === selected }, s.name));
  }
  return sel;
}
