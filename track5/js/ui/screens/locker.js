/**
 * The locker — avatar and cosmetics, mounted inside PROFILE.
 *
 * Cosmetics are unlocks rather than purchases: reaching the XP threshold gives
 * you the item and nothing is deducted. Spending reputation on a hat would
 * demote someone for participating, and rank is meant to represent standing,
 * not a balance.
 *
 * Nothing here affects the map, the confidence maths, or what anyone else
 * sees. It exists to give participation a visible result.
 */

import { el, replace } from '../../core/dom.js';
import * as store from '../../core/state.js';
import * as backend from '../../data/backend.js';
import { emit, EVENTS } from '../../core/bus.js';
import { sectionHead } from '../components.js';
import { renderAvatar, renderItemPreview, SLOTS } from '../avatar.js';

const SLOT_LABEL = {
  jacket: 'JACKET',
  hat: 'HEAD',
  face: 'FACE',
  patch: 'PATCH',
};

let host = null;
let catalogue = [];
let owned = new Set();

export function lockerSection() {
  host = el('div');
  render();
  store.subscribe(() => render(), ['user']);
  load();
  return host;
}

async function load() {
  try {
    catalogue = await backend.listCosmetics();
    owned = new Set(await backend.ownedCosmetics());
  } catch (err) {
    console.error('[locker] could not load cosmetics', err);
  }
  render();
}

function render() {
  if (!host) return;
  const user = store.get().user;
  if (!user) {
    replace(host, []);
    return;
  }
  const avatar = user.avatar ?? {};

  replace(host, [
    sectionHead('Locker', `${owned.size}/${catalogue.length} UNLOCKED`),

    el('div', { style: 'display:flex;gap:20px;align-items:center;padding:16px' }, [
      el('div', {
        style: 'border:1px solid var(--fg-faint);padding:12px;background:var(--bg)',
      }, [renderAvatar(avatar, 96)]),
      el('div', { style: 'flex:1' }, [
        el('div', { class: 'pixel', text: user.handle ?? '' }),
        el('p', { class: 'empty__note', style: 'text-align:left;margin:8px 0 0;max-width:none',
          text: 'Appearance only. Nothing you wear changes what you see, what you '
              + 'can report, or what your confirmations are worth.' }),
      ]),
    ]),

    // Grouped by slot so it reads as a wardrobe rather than a shop shelf.
    ...SLOTS.flatMap((slot) => {
      const items = catalogue.filter((c) => c.slot === slot);
      if (!items.length) return [];
      return [
        el('div', { class: 'micro', style: 'padding:12px 16px 4px', text: SLOT_LABEL[slot] ?? slot }),
        el('div', {
          style: 'display:grid;grid-template-columns:repeat(auto-fill,minmax(88px,1fr));'
               + 'gap:8px;padding:0 16px 8px',
        }, [
          // "None" is a real choice, not the absence of one.
          slotTile({ id: null, name: 'None', slot, costXp: 0 }, avatar, user),
          ...items.map((item) => slotTile(item, avatar, user)),
        ]),
      ];
    }),

    el('div', { style: 'height:8px' }),
  ]);
}

function slotTile(item, avatar, user) {
  const isNone = item.id == null;
  const isOwned = isNone || owned.has(item.id);
  const equipped = (avatar[item.slot] ?? null) === item.id;
  const affordable = user.xp >= item.costXp;

  // An equipped item inverts, because it is a positive choice worth seeing at a
  // glance. An equipped "None" only gets a strong border: three solid white
  // blocks for the slots you have left empty would be the loudest thing on the
  // screen, and empty is not an announcement.
  const emphasis = equipped
    ? (isNone ? 'border-color:var(--fg);' : 'background:var(--fg);color:var(--bg);border-color:var(--fg);')
    : 'border-color:var(--fg-faint);';

  const tile = el('button', {
    class: 'panel',
    type: 'button',
    'aria-pressed': String(equipped),
    style: 'display:flex;flex-direction:column;align-items:center;gap:6px;'
         + `padding:8px;min-height:96px;${emphasis}`,
    onclick: () => onPick(item, isOwned, affordable),
  }, [
    isNone
      ? el('div', { style: 'height:40px;display:flex;align-items:center', class: 'micro', text: '—' })
      : renderItemPreview(item, 40),
    el('span', {
      class: 'micro',
      style: equipped && !isNone ? 'color:var(--bg)' : '',
      text: item.name.toUpperCase(),
    }),
    !isOwned
      ? el('span', {
          class: 'micro',
          style: affordable ? 'color:var(--ok)' : 'color:var(--fg-faint)',
          text: affordable ? 'UNLOCK' : `${item.costXp} XP`,
        })
      : null,
  ]);

  if (!isOwned) tile.style.opacity = affordable ? '1' : '0.55';
  return tile;
}

async function onPick(item, isOwned, affordable) {
  const user = store.get().user;

  if (!isOwned) {
    if (!affordable) {
      emit(EVENTS.TOAST, `NEEDS ${item.costXp} XP`);
      return;
    }
    const res = await backend.buyCosmetic(item.id);
    if (!res?.ok) {
      emit(EVENTS.TOAST, res?.reason ?? 'COULD NOT UNLOCK');
      return;
    }
    owned.add(item.id);
    emit(EVENTS.TOAST, `UNLOCKED — ${item.name.toUpperCase()}`);
  }

  // Tapping an equipped item takes it off, which is what people expect.
  const current = user.avatar ?? {};
  const next = {
    ...current,
    [item.slot]: current[item.slot] === item.id ? null : item.id,
  };

  try {
    const updated = await backend.setAvatar(next);
    store.set({ user: updated });
  } catch (err) {
    emit(EVENTS.TOAST, String(err.message ?? err).toUpperCase().slice(0, 60));
  }
  render();
}
