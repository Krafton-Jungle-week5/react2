import { commitRoot, reconcileTrees } from './fiber.js';
import { createRootVNode, mountVNode } from './vdom.js';

let activeComponent = null;

export class FunctionComponent {
  constructor(renderFn, props = {}) {
    if (typeof renderFn !== 'function') {
      throw new TypeError('FunctionComponent는 함수형 컴포넌트를 받아야 합니다.');
    }

    this.renderFn = renderFn;
    this.props = props;
    this.hooks = [];
    this.hookIndex = 0;
    this.container = null;
    this.currentTree = createRootVNode([]);
    this.pendingEffects = [];
    this.updateScheduled = false;
    this.isMounted = false;
    this.isRendering = false;
    this.childRenderDepth = 0;
    this.renderCount = 0;
  }

  mount(container) {
    if (!container) {
      throw new Error('mount()에는 실제 DOM 컨테이너가 필요합니다.');
    }

    this.container = container;
    this.renderAndCommit();
    return this;
  }

  update(nextProps = this.props) {
    if (!this.container) {
      throw new Error('mount() 이후에만 update()를 호출할 수 있습니다.');
    }

    this.props = nextProps;
    this.renderAndCommit();
    return this;
  }

  scheduleUpdate() {
    if (this.updateScheduled || !this.container) {
      return;
    }

    this.updateScheduled = true;
    scheduleMicrotask(() => {
      this.updateScheduled = false;
      this.update(this.props);
    });
  }

  renderChildComponent(component, props) {
    this.childRenderDepth += 1;

    try {
      return component(props);
    } finally {
      this.childRenderDepth -= 1;
    }
  }

  renderAndCommit() {
    if (this.isRendering) {
      throw new Error('렌더링 도중에는 update()를 다시 실행할 수 없습니다.');
    }

    this.hookIndex = 0;
    this.pendingEffects = [];
    this.isRendering = true;

    const previousComponent = activeComponent;
    let nextTree;

    try {
      activeComponent = this;
      const output = this.renderFn(this.props);
      nextTree = normalizeRootOutput(output);
    } finally {
      activeComponent = previousComponent;
      this.isRendering = false;
    }

    if (!this.isMounted) {
      mountVNode(this.container, nextTree);
      this.isMounted = true;
    } else {
      const work = reconcileTrees(this.currentTree, nextTree);
      commitRoot(this.container, work.rootFiber);
    }

    this.currentTree = nextTree;
    this.renderCount += 1;
    this.flushEffects();
  }

  flushEffects() {
    const effectQueue = this.pendingEffects;
    this.pendingEffects = [];

    for (const entry of effectQueue) {
      const hook = this.hooks[entry.index];

      if (typeof hook.cleanup === 'function') {
        hook.cleanup();
      }

      const cleanup = entry.callback();
      hook.cleanup = typeof cleanup === 'function' ? cleanup : null;
    }
  }
}

export function h(type, props = {}, ...children) {
  const normalizedChildren = normalizeChildList(children);
  const nextProps = {
    ...(props || {}),
    children: normalizedChildren,
  };

  if (typeof type === 'function') {
    const output = activeComponent
      ? activeComponent.renderChildComponent(type, nextProps)
      : type(nextProps);

    return unwrapComponentOutput(output);
  }

  const attrs = normalizeProps(props);

  return {
    type: 'element',
    tag: type,
    attrs: Object.keys(attrs).length ? attrs : undefined,
    children: normalizedChildren,
  };
}

export function useState(initialValue) {
  const component = assertHookAccess('useState');
  const index = component.hookIndex++;
  let hook = component.hooks[index];

  if (!hook) {
    hook = {
      kind: 'state',
      queue: [],
      value: resolveInitialValue(initialValue),
    };
    component.hooks[index] = hook;
  }

  assertHookKind(hook, 'state', 'useState');

  if (hook.queue.length) {
    let nextValue = hook.value;

    for (const update of hook.queue) {
      nextValue = typeof update === 'function' ? update(nextValue) : update;
    }

    hook.queue = [];
    hook.value = nextValue;
  }

  const setState = (nextValue) => {
    if (component.isRendering) {
      throw new Error('setState는 렌더링 중이 아니라 이벤트나 effect 안에서 호출해야 합니다.');
    }

    hook.queue.push(nextValue);
    component.scheduleUpdate();
  };

  return [hook.value, setState];
}

export function useEffect(callback, deps) {
  const component = assertHookAccess('useEffect');
  const index = component.hookIndex++;
  let hook = component.hooks[index];

  if (!hook) {
    hook = {
      kind: 'effect',
      cleanup: null,
      deps: undefined,
    };
    component.hooks[index] = hook;
  }

  assertHookKind(hook, 'effect', 'useEffect');

  if (shouldRunHook(hook.deps, deps)) {
    component.pendingEffects.push({
      index,
      callback,
    });
    hook.deps = cloneDeps(deps);
  }
}

export function useMemo(factory, deps) {
  const component = assertHookAccess('useMemo');
  const index = component.hookIndex++;
  let hook = component.hooks[index];

  if (!hook) {
    hook = {
      kind: 'memo',
      deps: undefined,
      value: undefined,
    };
    component.hooks[index] = hook;
  }

  assertHookKind(hook, 'memo', 'useMemo');

  if (shouldRunHook(hook.deps, deps)) {
    hook.value = factory();
    hook.deps = cloneDeps(deps);
  }

  return hook.value;
}

function assertHookAccess(name) {
  if (!activeComponent || !activeComponent.isRendering) {
    throw new Error(`${name}는 FunctionComponent 렌더링 중에만 사용할 수 있습니다.`);
  }

  if (activeComponent.childRenderDepth > 0) {
    throw new Error(`${name}는 최상위 루트 컴포넌트에서만 사용할 수 있습니다.`);
  }

  return activeComponent;
}

function assertHookKind(hook, expectedKind, name) {
  if (hook.kind !== expectedKind) {
    throw new Error(`${name} 호출 순서가 바뀌었습니다. Hook은 항상 같은 순서로 호출되어야 합니다.`);
  }
}

function normalizeProps(props = {}) {
  const attrs = {};

  for (const [name, value] of Object.entries(props || {})) {
    if (name === 'children' || value === false || value == null) {
      continue;
    }

    if (name === 'className') {
      attrs.class = value;
      continue;
    }

    if (name === 'htmlFor') {
      attrs.for = value;
      continue;
    }

    attrs[name] = value === true ? '' : value;
  }

  return attrs;
}

function normalizeRootOutput(output) {
  return createRootVNode(normalizeChildValue(output));
}

function unwrapComponentOutput(output) {
  const normalized = normalizeChildValue(output);

  if (normalized.length === 1) {
    return normalized[0];
  }

  return normalized;
}

function normalizeChildList(children) {
  return children.flatMap((child) => normalizeChildValue(child));
}

function normalizeChildValue(child) {
  if (Array.isArray(child)) {
    return child.flatMap((entry) => normalizeChildValue(entry));
  }

  if (child == null || typeof child === 'boolean') {
    return [];
  }

  if (typeof child === 'string' || typeof child === 'number') {
    return [
      {
        type: 'text',
        value: String(child),
      },
    ];
  }

  if (isVNode(child)) {
    return child.type === 'root' ? child.children || [] : [child];
  }

  throw new TypeError('컴포넌트는 Virtual DOM 노드, 문자열, 숫자, 배열만 반환할 수 있습니다.');
}

function isVNode(node) {
  return Boolean(node) && typeof node === 'object' && typeof node.type === 'string';
}

function shouldRunHook(previousDeps, nextDeps) {
  if (nextDeps === undefined || previousDeps === undefined) {
    return true;
  }

  if (previousDeps.length !== nextDeps.length) {
    return true;
  }

  return nextDeps.some((value, index) => !Object.is(value, previousDeps[index]));
}

function cloneDeps(deps) {
  return Array.isArray(deps) ? [...deps] : undefined;
}

function resolveInitialValue(initialValue) {
  return typeof initialValue === 'function' ? initialValue() : initialValue;
}

function scheduleMicrotask(callback) {
  if (typeof queueMicrotask === 'function') {
    queueMicrotask(callback);
    return;
  }

  Promise.resolve().then(callback);
}
