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

export function diffTrees(previousTree, nextTree) {
  const operations = [];

  diffNode(previousTree, nextTree, [], operations);

  return operations;
}

export function patchDom(container, previousTree, nextTree) {
  const operations = sortPatchOperations(diffTrees(previousTree, nextTree));

  applyPatchOperations(container, operations);

  return operations;
}

export function applyPatchOperations(container, operations) {
  for (const operation of operations) {
    applyPatchOperation(container, operation);
  }
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

function diffNode(previousNode, nextNode, path, operations) {
  if (!nextNode) {
    return;
  }

  if (nextNode.type === 'root') {
    diffChildren(path, previousNode?.children || [], nextNode.children || [], operations);
    return;
  }

  if (nextNode.type === 'text') {
    if (previousNode?.value !== nextNode.value) {
      operations.push({
        type: 'UPDATE_TEXT',
        path,
        value: nextNode.value,
      });
    }
    return;
  }

  const payload = diffProps(previousNode?.attrs || {}, nextNode.attrs || {});

  if (payload.set || payload.remove.length) {
    operations.push({
      type: 'UPDATE_PROPS',
      path,
      payload,
    });
  }

  diffChildren(path, previousNode?.children || [], nextNode.children || [], operations);
}

function diffChildren(parentPath, previousChildren, nextChildren, operations) {
  if (canUseKeyedDiff(previousChildren, nextChildren)) {
    diffKeyedChildren(parentPath, previousChildren, nextChildren, operations);
    return;
  }

  diffIndexedChildren(parentPath, previousChildren, nextChildren, operations);
}

function diffIndexedChildren(parentPath, previousChildren, nextChildren, operations) {
  const sharedLength = Math.min(previousChildren.length, nextChildren.length);

  for (let index = 0; index < sharedLength; index += 1) {
    const previousChild = previousChildren[index];
    const nextChild = nextChildren[index];
    const path = parentPath.concat(index);

    if (canReuseVNode(previousChild, nextChild)) {
      diffNode(previousChild, nextChild, path, operations);
      continue;
    }

    operations.push(createRemovalOperation(parentPath, previousChild, index));
    operations.push(createInsertionOperation(parentPath, nextChild, index));
  }

  for (let index = sharedLength; index < nextChildren.length; index += 1) {
    operations.push(createInsertionOperation(parentPath, nextChildren[index], index));
  }

  for (let index = previousChildren.length - 1; index >= nextChildren.length; index -= 1) {
    operations.push(createRemovalOperation(parentPath, previousChildren[index], index));
  }
}

function diffKeyedChildren(parentPath, previousChildren, nextChildren, operations) {
  const previousByKey = new Map(
    previousChildren.map((child, index) => [getVNodeKey(child), { child, index }]),
  );
  const usedKeys = new Set();

  for (let nextIndex = 0; nextIndex < nextChildren.length; nextIndex += 1) {
    const nextChild = nextChildren[nextIndex];
    const key = getVNodeKey(nextChild);
    const match = previousByKey.get(key);
    const path = parentPath.concat(nextIndex);

    if (!match) {
      operations.push(createInsertionOperation(parentPath, nextChild, nextIndex, key));
      continue;
    }

    usedKeys.add(key);

    if (!canReuseVNode(match.child, nextChild)) {
      operations.push(createRemovalOperation(parentPath, match.child, match.index, key));
      operations.push(createInsertionOperation(parentPath, nextChild, nextIndex, key));
      continue;
    }

    if (match.index !== nextIndex) {
      operations.push({
        type: 'MOVE_CHILD',
        path,
        parentPath,
        fromIndex: match.index,
        toIndex: nextIndex,
        key,
      });
    }

    diffNode(match.child, nextChild, path, operations);
  }

  for (let index = previousChildren.length - 1; index >= 0; index -= 1) {
    const previousChild = previousChildren[index];
    const key = getVNodeKey(previousChild);

    if (!usedKeys.has(key)) {
      operations.push(createRemovalOperation(parentPath, previousChild, index, key));
    }
  }
}

function createInsertionOperation(parentPath, node, index, key = getVNodeKey(node)) {
  return {
    type: 'INSERT_CHILD',
    path: parentPath.concat(index),
    parentPath,
    index,
    key,
    node: cloneVNode(node),
  };
}

function createRemovalOperation(parentPath, node, index, key = getVNodeKey(node)) {
  return {
    type: 'REMOVE_CHILD',
    path: parentPath.concat(index),
    parentPath,
    index,
    key,
    node: cloneVNode(node),
  };
}

function sortPatchOperations(operations) {
  const priority = {
    REMOVE_CHILD: 0,
    INSERT_CHILD: 1,
    MOVE_CHILD: 2,
    UPDATE_PROPS: 3,
    UPDATE_TEXT: 4,
  };

  return operations
    .map((operation, order) => ({ ...operation, order }))
    .sort((left, right) => {
      const typeDiff = priority[left.type] - priority[right.type];

      if (typeDiff !== 0) {
        return typeDiff;
      }

      if (left.type === 'REMOVE_CHILD' && right.type === 'REMOVE_CHILD') {
        const depthDiff = right.parentPath.length - left.parentPath.length;

        if (depthDiff !== 0) {
          return depthDiff;
        }

        return right.index - left.index;
      }

      if (left.type === 'MOVE_CHILD' && right.type === 'MOVE_CHILD') {
        const parentDiff = comparePath(left.parentPath, right.parentPath);

        if (parentDiff !== 0) {
          return parentDiff;
        }

        return left.toIndex - right.toIndex;
      }

      if (left.type === 'INSERT_CHILD' && right.type === 'INSERT_CHILD') {
        const parentDiff = comparePath(left.parentPath, right.parentPath);

        if (parentDiff !== 0) {
          return parentDiff;
        }

        return left.index - right.index;
      }

      return comparePath(left.path, right.path) || left.order - right.order;
    });
}

function applyPatchOperation(container, operation) {
  switch (operation.type) {
    case 'REMOVE_CHILD':
      applyRemoval(container, operation);
      return;
    case 'MOVE_CHILD':
      applyMove(container, operation);
      return;
    case 'INSERT_CHILD':
      applyInsertion(container, operation);
      return;
    case 'UPDATE_PROPS':
      applyPropsUpdate(container, operation);
      return;
    case 'UPDATE_TEXT':
      applyTextUpdate(container, operation);
  }
}

function applyRemoval(container, operation) {
  const parentNode = getTargetContainerNode(container, operation.parentPath);

  if (!parentNode) {
    return;
  }

  const targetNode = operation.key
    ? findChildNodeByKey(parentNode, operation.key) || parentNode.childNodes[operation.index]
    : parentNode.childNodes[operation.index];

  if (targetNode) {
    parentNode.removeChild(targetNode);
  }
}

function applyMove(container, operation) {
  const parentNode = getTargetContainerNode(container, operation.parentPath);

  if (!parentNode) {
    return;
  }

  const movingNode = operation.key
    ? findChildNodeByKey(parentNode, operation.key)
    : parentNode.childNodes[operation.fromIndex];

  if (!movingNode) {
    return;
  }

  const snapshot = Array.from(parentNode.childNodes);
  const anchorNode = snapshot[operation.toIndex] || null;

  if (!anchorNode) {
    parentNode.appendChild(movingNode);
    return;
  }

  if (snapshot.indexOf(movingNode) < operation.toIndex) {
    parentNode.insertBefore(movingNode, anchorNode.nextSibling);
  } else {
    parentNode.insertBefore(movingNode, anchorNode);
  }
}

function applyInsertion(container, operation) {
  const parentNode = getTargetContainerNode(container, operation.parentPath);

  if (!parentNode) {
    return;
  }

  const referenceNode = parentNode.childNodes[operation.index] || null;

  parentNode.insertBefore(
    renderVNode(operation.node, parentNode.ownerDocument || document),
    referenceNode,
  );
}

function applyPropsUpdate(container, operation) {
  const node = getDomNodeAtPath(container, operation.path);

  if (!(node instanceof Element)) {
    return;
  }

  for (const name of operation.payload.remove) {
    removeDomAttribute(node, name);
  }

  for (const [name, value] of Object.entries(operation.payload.set || {})) {
    setDomAttribute(node, name, value);
  }
}

function applyTextUpdate(container, operation) {
  const node = getDomNodeAtPath(container, operation.path);

  if (node) {
    node.textContent = operation.value;
  }
}

function getTargetContainerNode(container, path) {
  if (!path.length) {
    return container;
  }

  return getDomNodeAtPath(container, path);
}

function getDomNodeAtPath(container, path) {
  let currentNode = container;

  for (const index of path) {
    currentNode = currentNode?.childNodes?.[index] || null;
  }

  return currentNode;
}

function findChildNodeByKey(parentNode, key) {
  return Array.from(parentNode.children).find((child) => {
    return child.getAttribute('data-key') === key || child.id === key;
  }) || null;
}

function comparePath(leftPath, rightPath) {
  const length = Math.min(leftPath.length, rightPath.length);

  for (let index = 0; index < length; index += 1) {
    if (leftPath[index] !== rightPath[index]) {
      return leftPath[index] - rightPath[index];
    }
  }

  return leftPath.length - rightPath.length;
}

function diffProps(previousAttrs, nextAttrs) {
  const set = {};
  const remove = [];
  const names = new Set([...Object.keys(previousAttrs), ...Object.keys(nextAttrs)]);

  for (const name of names) {
    if (!(name in nextAttrs)) {
      remove.push(name);
      continue;
    }

    if (previousAttrs[name] !== nextAttrs[name]) {
      set[name] = nextAttrs[name];
    }
  }

  return {
    set: Object.keys(set).length ? set : null,
    remove,
  };
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

function canReuseVNode(previousNode, nextNode) {
  if (!previousNode || !nextNode) {
    return false;
  }

  if (previousNode.type !== nextNode.type) {
    return false;
  }

  if (previousNode.type === 'text') {
    return true;
  }

  return previousNode.tag === nextNode.tag;
}

function canUseKeyedDiff(previousChildren, nextChildren) {
  if (!previousChildren.length || !nextChildren.length) {
    return false;
  }

  const previousKeys = previousChildren.map((child) => getVNodeKey(child));
  const nextKeys = nextChildren.map((child) => getVNodeKey(child));

  if (!previousKeys.every(Boolean) || !nextKeys.every(Boolean)) {
    return false;
  }

  return new Set(previousKeys).size === previousKeys.length
    && new Set(nextKeys).size === nextKeys.length;
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
