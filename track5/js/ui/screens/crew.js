/**
 * CREW — private invite-only groups.
 *
 * A crew is a handful of people who ride the same line and want a room of
 * their own. Deliberately thin: a roster with everyone's rank, a private chat,
 * and a code you read out to a friend on a platform. No leaderboards beyond
 * the roster, because the point is a small group, not a ranking table.
 *
 * In LOCAL MODE a crew is real but can only ever contain you, since an invite
 * code has nowhere to travel. The screen says that plainly instead of
 * pretending otherwise.
 */

import { el, replace } from '../../core/dom.js';
import * as store from '../../core/state.js';
import * as backend from '../../data/backend.js';
import { MODE } from '../../data/backend.js';
import { emit, EVENTS } from '../../core/bus.js';
import { sectionHead, emptyState } from '../components.js';
import { rankFor } from '../../domain/xp.js';
import { clock } from '../../core/time.js';

let root = null;

export function mountCrew(container) {
  root = el('div', { class: 'scroll' });
  replace(container, [root]);
  store.subscribe(() => render(), ['crews', 'activeCrew', 'user']);
  refresh();
}

export async function refresh() {
  try {
    store.set({ crews: await backend.listCrews() });
  } catch (err) {
    console.error('[crew] could not load', err);
  }
  render();
}

function render() {
  if (!root) return;
  const s = store.get();
  const crews = s.crews ?? [];
  const active = crews.find((c) => c.id === s.activeCrew) ?? crews[0] ?? null;

  if (!crews.length) {
    replace(root, [sectionHead('Crew'), ...emptyCrew()]);
    return;
  }

  replace(root, [
    sectionHead(active.name, `CODE ${active.code}`),

    // Roster. Rank is shown because it is the thing people compare, and it is
    // earned rather than bought.
    el('div', {}, (active.members ?? []).map((m) =>
      el('div', { class: 'row' }, [
        el('div', { class: 'row__main', style: 'display:flex;align-items:baseline;gap:8px' }, [
          el('span', { class: 'pixel', text: m.handle || 'ANON' }),
          m.userId === s.user?.id ? el('span', { class: 'micro', text: 'YOU' }) : null,
        ]),
        el('div', { class: 'row__end' }, [
          el('span', { class: 'badge', dataset: { state: 'CONFIRMED' },
            text: rankFor(m.xp ?? 0) }),
          el('div', { class: 'micro', style: 'margin-top:2px', text: `${m.xp ?? 0} XP` }),
        ]),
      ]),
    )),

    el('div', { style: 'padding:12px 16px' }, [
      el('p', { class: 'empty__note', style: 'text-align:left;margin:0;max-width:none',
        text: MODE === 'local'
          ? 'This crew lives on this device only — the code has nowhere to travel. '
            + 'Connect a backend in js/data/config.js and it becomes shareable.'
          : `Read the code ${active.code} out to a friend and they can join from `
            + 'the button below.' }),
    ]),

    sectionHead('Crew chat'),
    el('div', { id: 'crew-log' }),
    crewComposer(active),

    el('div', { style: 'padding:16px' }, [
      el('button', {
        class: 'btn btn--ghost btn--block',
        type: 'button',
        onclick: async () => {
          await backend.leaveCrew(active.id);
          store.set({ activeCrew: null });
          await refresh();
          emit(EVENTS.TOAST, 'LEFT CREW');
        },
      }, 'Leave crew'),
    ]),

    ...(crews.length > 1
      ? [sectionHead('Your other crews'),
         ...crews.filter((c) => c.id !== active.id).map((c) =>
           el('button', { class: 'row', type: 'button',
             onclick: () => store.set({ activeCrew: c.id }) }, [
             el('div', { class: 'row__main' }, [
               el('span', { class: 'pixel', text: c.name }),
             ]),
             el('div', { class: 'row__end micro', text: `${c.members?.length ?? 0} MEMBERS` }),
           ]))]
      : []),

    el('div', { style: 'height:24px' }),
  ]);

  loadMessages(active.id);
}

function emptyCrew() {
  return [
    el('div', { class: 'empty' }, [
      el('div', { class: 'empty__mark dim', text: 'NO CREW' }),
      el('p', { class: 'empty__note', text:
        'A crew is a private room for people who ride the same line. Nothing you '
        + 'say in one is public, and nothing about it changes what you see on the map.' }),
    ]),
    el('div', { style: 'padding:0 16px' }, [
      el('button', {
        class: 'btn btn--primary btn--block',
        type: 'button',
        onclick: async () => {
          const name = prompt('Name your crew.', 'Night Shift');
          if (!name?.trim()) return;
          try {
            await backend.createCrew(name.trim());
            await refresh();
            emit(EVENTS.TOAST, 'CREW CREATED');
          } catch (err) {
            emit(EVENTS.TOAST, String(err.message ?? err).toUpperCase().slice(0, 60));
          }
        },
      }, 'Create a crew'),
      el('div', { style: 'height:8px' }),
      el('button', {
        class: 'btn btn--ghost btn--block',
        type: 'button',
        onclick: async () => {
          const code = prompt('Enter the invite code.');
          if (!code?.trim()) return;
          const res = await backend.joinCrew(code.trim().toUpperCase());
          if (!res?.ok) {
            emit(EVENTS.TOAST, res?.reason ?? 'COULD NOT JOIN');
            return;
          }
          await refresh();
          emit(EVENTS.TOAST, 'JOINED');
        },
      }, 'Enter an invite code'),
    ]),
  ];
}

function crewComposer(crew) {
  const input = el('input', {
    type: 'text',
    maxlength: '300',
    placeholder: 'Message your crew',
    'aria-label': 'Crew message',
    style: 'flex:1;min-width:0;padding:0 12px;height:44px;border:1px solid var(--fg-faint);'
      + 'background:var(--bg);color:var(--fg);font-family:var(--font-mono);font-size:14px',
  });

  return el('form', {
    style: 'display:flex;gap:8px;padding:12px',
    onsubmit: async (e) => {
      e.preventDefault();
      const body = input.value.trim();
      if (!body) return;
      input.value = '';
      try {
        await backend.sendCrewMessage(crew.id, body);
        await loadMessages(crew.id);
      } catch (err) {
        emit(EVENTS.TOAST, String(err.message ?? err).toUpperCase().slice(0, 60));
      }
    },
  }, [input, el('button', { class: 'btn', type: 'submit' }, 'Send')]);
}

async function loadMessages(crewId) {
  const log = root?.querySelector('#crew-log');
  if (!log) return;
  let messages = [];
  try {
    messages = await backend.listCrewMessages(crewId);
  } catch {
    /* A chat that fails to load must not take the roster down with it. */
  }
  replace(log, messages.length
    ? messages.map((m) =>
        el('div', { class: 'row', style: 'align-items:flex-start' }, [
          el('div', { class: 'row__main' }, [
            el('div', { style: 'display:flex;gap:8px;align-items:baseline' }, [
              el('span', { class: 'pixel', style: 'font-size:11px', text: m.handle }),
              el('span', { class: 'micro', text: clock(m.at) }),
            ]),
            // textContent, never innerHTML — this is other people's writing.
            el('div', { style: 'margin-top:2px', text: m.body }),
          ]),
        ]))
    : [el('div', { class: 'empty' }, [
        el('p', { class: 'empty__note', text: 'Nothing said yet.' }),
      ])]);
}
