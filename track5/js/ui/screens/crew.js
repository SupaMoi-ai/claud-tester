/**
 * CREW — private invite-only groups.
 *
 * Not yet implemented. Crews are inherently multi-device: an invite code that
 * only works in one browser is not a crew, so building this against LOCAL MODE
 * would produce a convincing-looking screen that does nothing real. It is wired
 * once the Supabase tables and the join RPC exist.
 *
 * The screen states that plainly rather than showing a fake roster.
 */

import { el, replace } from '../../core/dom.js';
import { MODE } from '../../data/backend.js';
import { sectionHead } from '../components.js';

export function mountCrew(container) {
  replace(container, [
    sectionHead('Crew'),
    el('div', { class: 'scroll' }, [
      el('div', { class: 'empty' }, [
        el('div', { class: 'empty__mark dim', text: 'NO CREW' }),
        el('p', { class: 'empty__note', text:
          MODE === 'local'
            ? 'Crews need a shared backend — an invite code that only works on one '
              + 'device is not a crew. Add your Supabase details in js/data/config.js '
              + 'and this becomes available.'
            : 'You are not in a crew yet. Create one and share the code, or enter a '
              + 'code a friend gave you.' }),
      ]),
      el('div', { style: 'padding:0 16px' }, [
        el('button', { class: 'btn btn--block', type: 'button', disabled: MODE === 'local' },
          'Create a crew'),
        el('div', { style: 'height:8px' }),
        el('button', { class: 'btn btn--ghost btn--block', type: 'button', disabled: MODE === 'local' },
          'Enter an invite code'),
      ]),
    ]),
  ]);
}
