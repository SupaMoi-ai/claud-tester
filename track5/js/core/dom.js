/**
 * Minimal DOM helpers.
 *
 * Track 5 has no framework and no build step. What it needs from one is small:
 * build elements without string concatenation (so user-authored text can never
 * become markup), and patch text in place (so the map and any focused input
 * survive a re-render).
 */

/** Create an element. Children may be nodes, strings, or nested arrays. */
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'html') throw new Error('raw html is not allowed — use text');
    else if (k.startsWith('on') && typeof v === 'function') {
      node.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (k === 'dataset') {
      for (const [dk, dv] of Object.entries(v)) if (dv != null) node.dataset[dk] = dv;
    } else if (v === true) node.setAttribute(k, '');
    else node.setAttribute(k, String(v));
  }
  append(node, children);
  return node;
}

export function append(parent, children) {
  const list = Array.isArray(children) ? children : [children];
  for (const c of list) {
    if (c == null || c === false) continue;
    if (Array.isArray(c)) append(parent, c);
    else parent.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return parent;
}

/** Replace a container's children with new ones, in one operation. */
export function replace(parent, children) {
  parent.replaceChildren();
  return append(parent, children);
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/** Set textContent only when it changed, so we don't churn the DOM. */
export function setText(node, text) {
  const s = String(text);
  if (node.textContent !== s) node.textContent = s;
}

/** Set an attribute only when it changed. */
export function setAttr(node, name, value) {
  if (value == null || value === false) {
    if (node.hasAttribute(name)) node.removeAttribute(name);
    return;
  }
  const s = value === true ? '' : String(value);
  if (node.getAttribute(name) !== s) node.setAttribute(name, s);
}

/** SVG elements need their own namespace. */
const SVG_NS = 'http://www.w3.org/2000/svg';

export function svg(tag, attrs = {}, children = []) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'text') node.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') {
      node.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (k === 'dataset') {
      for (const [dk, dv] of Object.entries(v)) if (dv != null) node.dataset[dk] = dv;
    } else node.setAttribute(k, String(v));
  }
  for (const c of Array.isArray(children) ? children : [children]) {
    if (c == null || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}
