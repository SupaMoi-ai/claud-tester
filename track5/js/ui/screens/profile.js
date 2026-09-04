/**
 * PROFILE — reputation, not a dashboard.
 *
 * Progression exists to make participation worth doing. It is shown as a rank
 * and a bar, and then it gets out of the way: nothing here is required reading
 * to use the app for trains.
 */

import { el, replace } from '../../core/dom.js';
import * as store from '../../core/state.js';
import * as backend from '../../data/backend.js';
import { MODE } from '../../data/backend.js';
import { emit, EVENTS } from '../../core/bus.js';
import { RANKS, rankFor, nextRank, rankProgress, xpToNext, XP_REASON_LABEL } from '../../domain/xp.js';
import { sectionHead, emptyState } from '../components.js';
import { ago } from '../../core/time.js';

let root = null;

export function mountProfile(container) {
  root = el('div', { class: 'scroll' });
  replace(container, [root]);
  store.subscribe(() => render(), ['user', 'myReports']);
  render();
}

async function render() {
  if (!root) return;
  const s = store.get();
  const user = s.user;

  if (!user) {
    replace(root, [emptyState('CONNECTING', 'Setting up your session.')]);
    return;
  }

  const rank = rankFor(user.xp);
  const next = nextRank(user.xp);
  const pct = Math.round(rankProgress(user.xp) * 100);

  replace(root, [
    sectionHead('Operator'),

    el('div', { style: 'padding:16px' }, [
      el('div', { class: 'pixel', style: 'font-size:20px', text: user.handle || 'UNNAMED' }),
      el('div', { style: 'display:flex;align-items:baseline;gap:10px;margin-top:6px' }, [
        el('span', { class: 'badge', dataset: { state: 'CONFIRMED' }, text: rank }),
        el('span', { class: 'micro', text: `${user.xp} XP` }),
      ]),

      // Progress bar, built from the same segmented vocabulary as the
      // confidence meter so the interface has one visual language for "how far".
      el('div', { class: 'meter', style: 'margin-top:12px;height:10px' },
        Array.from({ length: 20 }, (_, i) =>
          el('span', { class: 'meter__seg', dataset: { on: String(i < Math.round(pct / 5)) } }),
        ),
      ),
      el('div', { class: 'micro', style: 'margin-top:6px', text:
        next ? `${xpToNext(user.xp)} XP TO ${next.name}` : 'TOP RANK REACHED' }),
    ]),

    el('button', {
      class: 'btn btn--ghost btn--block',
      type: 'button',
      style: 'margin:0 16px 16px',
      onclick: promptHandle,
    }, user.handle ? 'Change handle' : 'Choose a handle'),

    sectionHead('Ranks'),
    el('div', {}, RANKS.map((r) =>
      el('div', { class: 'row' }, [
        el('div', { class: 'row__main' }, [
          el('span', {
            class: 'pixel',
            style: r.name === rank ? '' : 'color:var(--fg-dim)',
            text: r.name,
          }),
        ]),
        el('div', { class: 'row__end micro', text: `${r.at} XP` }),
      ]),
    )),

    sectionHead('Recent XP'),
    el('div', { id: 'xp-list' }, [el('div', { class: 'empty' }, [
      el('p', { class: 'empty__note', text: 'Loading.' }),
    ])]),

    sectionHead('Session'),
    el('div', { style: 'padding:16px' }, [
      el('p', {
        class: 'empty__note',
        style: 'text-align:left;margin:0;max-width:none',
        text: MODE === 'local'
          ? 'LOCAL MODE — this device only. Nothing you report is shared with anyone, '
            + 'and the signals you can see were generated here as a demonstration. '
            + 'Add Supabase details in js/data/config.js to join the real network.'
          : 'Signed in anonymously. No email, no password, no real name — your handle '
            + 'is the only thing other people see.',
      }),
      MODE === 'local'
        ? el('button', {
            class: 'btn btn--ghost btn--block',
            type: 'button',
            style: 'margin-top:16px',
            onclick: async () => {
              await backend.reset();
              const user2 = await backend.signIn();
              store.set({ user: user2 });
              emit(EVENTS.TOAST, 'LOCAL DATA CLEARED');
            },
          }, 'Reset local data')
        : null,
    ]),

    el('div', { style: 'height:24px' }),
  ]);

  // XP history is a separate await so the page paints first.
  try {
    const events = await backend.xpHistory();
    const list = root.querySelector('#xp-list');
    if (!list) return;
    replace(list, events.length
      ? events.map((e) => el('div', { class: 'row' }, [
          el('div', { class: 'row__main' }, [
            el('div', { class: 'row__title', text: XP_REASON_LABEL[e.kind] ?? e.kind }),
            el('div', { class: 'micro', text: ago(e.at) }),
          ]),
          el('div', {
            class: `row__end data ${e.amount >= 0 ? 'is-ok' : 'is-alert'}`,
            text: `${e.amount >= 0 ? '+' : ''}${e.amount}`,
          }),
        ]))
      : [el('div', { class: 'empty' }, [
          el('p', { class: 'empty__note', text: 'Nothing yet. Confirm a signal to get started.' }),
        ])]);
  } catch {
    /* History is a nicety; failing to load it must not break the screen. */
  }
}

async function promptHandle() {
  const current = store.get().user?.handle ?? '';
  const next = prompt('Pick a handle. No real names.', current);
  if (next == null) return;
  const clean = next.trim().slice(0, 20);
  if (!clean) return;
  const user = await backend.setHandle(clean);
  store.set({ user });
  emit(EVENTS.TOAST, 'HANDLE UPDATED');
}
