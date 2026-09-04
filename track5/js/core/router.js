/**
 * Navigation.
 *
 * Two axes, deliberately kept separate:
 *   - the tab (LIVE / CHAT / CREW / PROFILE)
 *   - the sheet depth on LIVE (peek -> panel -> detail)
 *
 * Both are pushed to history so the hardware back button collapses the sheet
 * before it leaves the screen. On a phone, back is the gesture people reach for
 * first, and the brief requires getting back to the map to always be one action.
 */

import * as store from './state.js';

export const TABS = ['live', 'chat', 'crew', 'profile'];
export const DETENTS = ['peek', 'panel', 'detail'];

let suppressHistory = false;

export function go(tab) {
  if (!TABS.includes(tab)) tab = 'live';
  if (store.get().tab === tab) return;
  // Changing destination always drops the sheet back to peek — arriving on LIVE
  // should always show the map, never someone's half-open detail view.
  store.set({ tab, sheet: 'peek' });
  push();
}

/** Open the sheet to a given depth. */
export function openSheet(detent) {
  if (!DETENTS.includes(detent)) return;
  if (store.get().sheet === detent) return;
  store.set({ sheet: detent });
  push();
}

/** Collapse to the map. This is what BACK TO MAP calls. */
export function backToMap() {
  store.set({ sheet: 'peek', focusSignal: null, focusStation: null });
  push();
}

function push() {
  if (suppressHistory) return;
  const s = store.get();
  const hash = s.sheet === 'peek' ? `#${s.tab}` : `#${s.tab}/${s.sheet}`;
  if (location.hash !== hash) history.pushState({ tab: s.tab, sheet: s.sheet }, '', hash);
}

function applyFromHash() {
  const raw = location.hash.replace(/^#/, '');
  const [tab, detent] = raw.split('/');
  suppressHistory = true;
  store.set({
    tab: TABS.includes(tab) ? tab : 'live',
    sheet: DETENTS.includes(detent) ? detent : 'peek',
  });
  suppressHistory = false;
}

export function start() {
  addEventListener('popstate', applyFromHash);
  addEventListener('hashchange', applyFromHash);
  if (location.hash) applyFromHash();
  else history.replaceState({ tab: 'live', sheet: 'peek' }, '', '#live');
}
