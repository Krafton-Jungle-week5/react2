const ELEMENT_NODE = 1;
const TEXT_NODE = 3;
const DOCUMENT_FRAGMENT_NODE = 11;

const BLOCKED_TAGS = new Set([
  'embed',
  'head',
  'iframe',
  'link',
  'meta',
  'object',
  'script',
  'style',
]);

const VOID_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

const PRESERVE_WHITESPACE_TAGS = new Set(['code', 'pre', 'textarea']);
const DOM_EVENT_HANDLERS = Symbol('react2:event-handlers');

export function createRootVNode(children = []) {
  return {
    type: 'root',
    children,
  };
}

export function cloneVNode(node) {
  if (!node) {
    return null;
  }

  if (node.type === 'text') {
    return {
      type: 'text',
      value: node.value,
    };
  }

  return {
    type: node.type,
    tag: node.tag,
    attrs: node.attrs ? { ...node.attrs } : undefined,
    children: node.children ? node.children.map(cloneVNode) : [],
  };
}

export function parseHtmlToVNode(html, doc = document) {
  const template = doc.createElement('template');
  template.innerHTML = html;
  return domNodeToVNode(template.content);
}

export function domNodeToVNode(node) {
  if (!node) {
    return null;
  }

  if (node.nodeType === DOCUMENT_FRAGMENT_NODE) {
    return createRootVNode(
      Array.from(node.childNodes)
        .map((child) => domNodeToVNode(child))
        .filter(Boolean),
    );
  }

  if (node.nodeType === ELEMENT_NODE) {
    return elementToVNode(node);
  }

  if (node.nodeType === TEXT_NODE) {
    return textToVNode(node);
  }

  return null;
}

export function domNodeToVNodeTree(container) {
  return createRootVNode(
    Array.from(container.childNodes)
      .map((child) => domNodeToVNode(child))
      .filter(Boolean),
  );
}

function textToVNode(node) {
  const value = node.textContent ?? '';
  const parentTag = node.parentElement?.tagName?.toLowerCase();

  if (!PRESERVE_WHITESPACE_TAGS.has(parentTag) && value.trim() === '') {
    return null;
  }

  return {
    type: 'text',
    value,
  };
}

function elementToVNode(element) {
  const tag = element.tagName.toLowerCase();

  if (BLOCKED_TAGS.has(tag)) {
    return null;
  }

  const attrs = readElementAttributes(element, tag);

  if (tag === 'textarea') {
    return {
      type: 'element',
      tag,
      attrs,
      children: [],
    };
  }

  return {
    type: 'element',
    tag,
    attrs,
    children: Array.from(element.childNodes)
      .map((child) => domNodeToVNode(child))
      .filter(Boolean),
  };
}

function readElementAttributes(element, tag) {
  const attrs = {};

  for (const attr of Array.from(element.attributes)) {
    attrs[attr.name] = attr.value;
  }

  if (tag === 'input') {
    const type = (element.getAttribute('type') || '').toLowerCase();

    if (type === 'checkbox' || type === 'radio') {
      if (element.checked) {
        attrs.checked = '';
      } else {
        delete attrs.checked;
      }
    }

    if (element.value !== undefined) {
      attrs.value = element.value;
    }
  }

  if (tag === 'textarea') {
    attrs.value = element.value ?? '';
  }

  if (tag === 'option') {
    if (element.selected) {
      attrs.selected = '';
    } else {
      delete attrs.selected;
    }
  }

  return attrs;
}

export function getVNodeKey(node) {
  if (!node || node.type !== 'element') {
    return null;
  }

  return node.attrs?.['data-key'] || node.attrs?.id || null;
}

export function renderVNode(node, doc = document) {
  if (node.type === 'root') {
    const fragment = doc.createDocumentFragment();

    for (const child of node.children) {
      fragment.append(renderVNode(child, doc));
    }

    return fragment;
  }

  if (node.type === 'text') {
    return doc.createTextNode(node.value);
  }

  const element = doc.createElement(node.tag);

  for (const [name, value] of Object.entries(node.attrs || {})) {
    setDomAttribute(element, name, value);
  }

  if (node.tag === 'textarea') {
    element.value = node.attrs?.value ?? '';
    return element;
  }

  for (const child of node.children || []) {
    element.append(renderVNode(child, doc));
  }

  return element;
}

export function mountVNode(container, node) {
  const doc = container.ownerDocument || document;
  const rendered = renderVNode(node, doc);
  container.replaceChildren(rendered);
}

export function setDomAttribute(element, name, value) {
  if (isEventAttribute(name, value)) {
    const eventName = name.slice(2).toLowerCase();
    const handlers = element[DOM_EVENT_HANDLERS] || {};
    const previousHandler = handlers[eventName];

    if (previousHandler) {
      element.removeEventListener(eventName, previousHandler);
    }

    element.addEventListener(eventName, value);
    handlers[eventName] = value;
    element[DOM_EVENT_HANDLERS] = handlers;
    return;
  }

  if (name === 'checked') {
    element.checked = true;
    element.setAttribute('checked', '');
    return;
  }

  if (name === 'value') {
    element.value = value ?? '';

    if (element.tagName.toLowerCase() !== 'textarea') {
      element.setAttribute('value', value ?? '');
    }
    return;
  }

  element.setAttribute(name, value ?? '');
}

export function removeDomAttribute(element, name) {
  if (isEventAttribute(name, element[DOM_EVENT_HANDLERS]?.[name.slice(2).toLowerCase()])) {
    const eventName = name.slice(2).toLowerCase();
    const handlers = element[DOM_EVENT_HANDLERS];
    const previousHandler = handlers?.[eventName];

    if (previousHandler) {
      element.removeEventListener(eventName, previousHandler);
      delete handlers[eventName];
    }

    return;
  }

  if (name === 'checked') {
    element.checked = false;
  }

  if (name === 'value') {
    element.value = '';
  }

  element.removeAttribute(name);
}

export function serializeVNodeToHtml(node) {
  if (node.type === 'root') {
    return node.children.map((child) => serializeNode(child, 0)).join('\n');
  }

  return serializeNode(node, 0);
}

function serializeNode(node, depth) {
  if (node.type === 'text') {
    return `${indent(depth)}${escapeText(node.value)}`;
  }

  const attrs = Object.entries(node.attrs || {})
    .filter(([, value]) => typeof value !== 'function')
    .map(([name, value]) => {
      if (value === '') {
        return name;
      }

      return `${name}="${escapeAttribute(value)}"`;
    })
    .join(' ');
  const openTag = attrs ? `<${node.tag} ${attrs}>` : `<${node.tag}>`;

  if (node.tag === 'textarea') {
    return `${indent(depth)}${openTag}${escapeText(node.attrs?.value ?? '')}</${node.tag}>`;
  }

  if (VOID_TAGS.has(node.tag)) {
    return `${indent(depth)}${openTag}`;
  }

  if (!node.children?.length) {
    return `${indent(depth)}${openTag}</${node.tag}>`;
  }

  if (
    node.children.length === 1
    && node.children[0].type === 'text'
    && node.children[0].value.length <= 48
    && !node.children[0].value.includes('\n')
  ) {
    return `${indent(depth)}${openTag}${escapeText(node.children[0].value)}</${node.tag}>`;
  }

  const children = node.children
    .map((child) => serializeNode(child, depth + 1))
    .join('\n');

  return `${indent(depth)}${openTag}\n${children}\n${indent(depth)}</${node.tag}>`;
}

function indent(depth) {
  return '  '.repeat(depth);
}

function escapeText(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function escapeAttribute(text) {
  return escapeText(text).replaceAll('"', '&quot;');
}

function isEventAttribute(name, value) {
  return name.startsWith('on') && typeof value === 'function';
}

export function countVNodeStats(tree) {
  const stats = {
    totalNodes: 0,
    elements: 0,
    textNodes: 0,
    keyedElements: 0,
    maxDepth: 0,
  };

  walkTree(tree, 0, (node, depth) => {
    if (node.type === 'root') {
      stats.maxDepth = Math.max(stats.maxDepth, depth);
      return;
    }

    stats.totalNodes += 1;
    stats.maxDepth = Math.max(stats.maxDepth, depth);

    if (node.type === 'text') {
      stats.textNodes += 1;
      return;
    }

    stats.elements += 1;

    if (getVNodeKey(node)) {
      stats.keyedElements += 1;
    }
  });

  return stats;
}

function walkTree(node, depth, visit) {
  visit(node, depth);

  if (!node.children?.length) {
    return;
  }

  for (const child of node.children) {
    walkTree(child, depth + 1, visit);
  }
}
