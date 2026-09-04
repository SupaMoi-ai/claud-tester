/**
 * The bottom sheet.
 *
 * Progressive disclosure, per the brief:
 *   MAP -> tap a signal -> small contextual panel -> tap again for detail
 *
 * The map is never covered by a large card. PEEK shows only the next departure
 * and the signal count; PANEL is under half the screen; even DETAIL leaves the
 * map visible above it. BACK TO MAP is pinned at the top of the sheet at panel
 * and detail depth, so returning is always one tap in a fixed place.
 */

import { el, replace } from '../core/dom.js';
import * as store from '../core/state.js';
import * as router from '../core/router.js';

export function createSheet() {
  const body = el('div', { class: 'sheet__body' });

  const back = el(
    'button',
    {
      class: 'sheet__back',
      type: 'button',
      hidden: true,
      onclick: () => router.backToMap(),
    },
    [el('span', { text: '◀' }), el('span', { text: 'Back to map' })],
  );

  const grip = el('button', {
    class: 'sheet__grip',
    type: 'button',
    'aria-label': 'Toggle panel',
    onclick: () => {
      const cur = store.get().sheet;
      router.openSheet(cur === 'peek' ? 'panel' : 'peek');
    },
  });

  const root = el('section', {
    class: 'sheet',
    dataset: { detent: 'peek' },
    'aria-label': 'Line detail',
  }, [grip, back, body]);

  // Drag the grip to change depth. Cheap, and it matches what thumbs expect.
  let startY = null;
  grip.addEventListener('pointerdown', (e) => {
    startY = e.clientY;
    grip.setPointerCapture(e.pointerId);
  });
  grip.addEventListener('pointerup', (e) => {
    if (startY == null) return;
    const dy = e.clientY - startY;
    startY = null;
    try { grip.releasePointerCapture(e.pointerId); } catch { /* fine */ }
    if (Math.abs(dy) < 12) return; // a tap, already handled by click
    const order = ['peek', 'panel', 'detail'];
    const i = order.indexOf(store.get().sheet);
    const next = dy < 0 ? Math.min(i + 1, 2) : Math.max(i - 1, 0);
    router.openSheet(order[next]);
  });

  store.subscribe((s) => {
    root.dataset.detent = s.sheet;
    back.hidden = s.sheet === 'peek';
  }, ['sheet']);

  return {
    root,
    /** Replace the sheet's contents. */
    setContent(nodes) {
      replace(body, nodes);
    },
    body,
  };
}
