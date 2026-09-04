/**
 * CHAT — public, pseudonymous conversation about the line.
 *
 * Currently wired to the backend's chat operations, which in LOCAL MODE means
 * this device only. The moderation layer (rate limiting, message reporting,
 * hide-below-threshold) lands with the Supabase implementation — anonymous
 * public chat should not be opened to a real audience without it, and that is
 * called out on screen rather than left as a surprise.
 */

import { el, replace } from '../../core/dom.js';
import * as store from '../../core/state.js';
import * as backend from '../../data/backend.js';
import { MODE } from '../../data/backend.js';
import { sectionHead, emptyState } from '../components.js';
import { clock } from '../../core/time.js';

let list = null;
let input = null;

export function mountChat(container) {
  list = el('div', { class: 'scroll' });

  input = el('input', {
    type: 'text',
    maxlength: '300',
    placeholder: 'Say something',
    'aria-label': 'Message',
    style:
      'flex:1;min-width:0;padding:0 12px;height:44px;border:1px solid var(--fg-faint);'
      + 'background:var(--bg);color:var(--fg);font-family:var(--font-mono);font-size:14px',
  });

  const form = el('form', {
    style: 'display:flex;gap:8px;padding:12px;border-top:1px solid var(--fg-faint);'
      + 'padding-bottom:calc(12px + var(--safe-b))',
    onsubmit: async (e) => {
      e.preventDefault();
      const body = input.value.trim();
      if (!body) return;
      input.value = '';
      await backend.sendChat(body);
      await refresh();
    },
  }, [input, el('button', { class: 'btn', type: 'submit' }, 'Send')]);

  replace(container, [
    sectionHead('Live chat', MODE === 'local' ? 'LOCAL ONLY' : 'PUBLIC'),
    list,
    form,
  ]);

  refresh();
}

async function refresh() {
  const messages = await backend.listChat();
  replace(list, messages.length
    ? messages.map((m) =>
        el('div', { class: 'row', style: 'align-items:flex-start' }, [
          el('div', { class: 'row__main' }, [
            el('div', { style: 'display:flex;gap:8px;align-items:baseline' }, [
              el('span', { class: 'pixel', style: 'font-size:11px', text: m.handle }),
              el('span', { class: 'micro', text: clock(m.at) }),
            ]),
            // textContent, never innerHTML — chat is user-authored input.
            el('div', { style: 'margin-top:2px', text: m.body }),
          ]),
        ]),
      )
    : [emptyState('QUIET', 'Nobody has said anything yet.')]);

  list.scrollTop = list.scrollHeight;
}
