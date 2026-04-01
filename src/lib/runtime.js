import { createRootVNode, mountVNode, patchDom } from './vdom.js';

let activeComponent = null;

export class FunctionComponent {
  constructor(renderFn, props = {}) {
    if (typeof renderFn !== 'function') {
      throw new TypeError('FunctionComponent must receive a function component.');
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
    this.inspector = null;
    this.debugFlow = [];
    this.lastPatchOperations = [];
    this.debugSnapshot = createDebugSnapshot(this);
  }

  attachInspector(inspector) {
    this.inspector = inspector;
    this.publishDebugSnapshot();
    return this;
  }

  getDebugSnapshot() {
    return this.debugSnapshot;
  }

  mount(container) {
    if (!container) {
      throw new Error('mount() needs a real DOM container.');
    }

    this.container = container;
    this.renderAndCommit();
    return this;
  }

  update(nextProps = this.props) {
    if (!this.container) {
      throw new Error('update() can only be called after mount().');
    }

    this.props = nextProps;
    this.recordDebugStep(
      'scheduler',
      `${this.getComponentLabel()}.update() 실행`,
      '예약된 microtask가 실행되면서 루트 컴포넌트가 다시 렌더링을 시작합니다.',
    );
    this.renderAndCommit();
    return this;
  }

  scheduleUpdate() {
    if (this.updateScheduled || !this.container) {
      return;
    }

    this.updateScheduled = true;
    this.recordDebugStep(
      'scheduler',
      `${this.getComponentLabel()}.scheduleUpdate() 예약`,
      'setState가 만든 변경을 한 번의 microtask로 모아서 처리합니다.',
    );
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
      throw new Error('update() cannot run while rendering is in progress.');
    }

    this.hookIndex = 0;
    this.pendingEffects = [];
    this.isRendering = true;
    this.recordDebugStep(
      'render',
      `${this.getComponentLabel()}.renderAndCommit() 시작`,
      'hookIndex를 0으로 되돌리고 루트 함수형 컴포넌트를 다시 실행합니다.',
    );

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
      this.lastPatchOperations = [];
      this.recordDebugStep(
        'patch',
        '초기 마운트',
        '첫 렌더에서는 이전 트리가 없어서 Virtual DOM을 그대로 실제 DOM에 마운트합니다.',
      );
    } else {
      const operations = patchDom(this.container, this.currentTree, nextTree);
      this.lastPatchOperations = operations;
      this.recordDebugStep(
        'diff',
        'diff 단계 완료',
        `이전 트리와 새 트리를 비교해서 ${operations.length}개의 패치 작업을 찾았습니다.`,
      );
      this.recordDebugStep(
        'patch',
        'patch 단계 완료',
        summarizePatchOperations(operations),
      );
    }

    this.currentTree = nextTree;
    this.renderCount += 1;
    this.publishDebugSnapshot();
    this.flushEffects();
  }

  flushEffects() {
    const effectQueue = this.pendingEffects;
    this.pendingEffects = [];

    if (effectQueue.length) {
      this.recordDebugStep(
        'effect',
        'flushEffects() 실행',
        `${effectQueue.length}개의 useEffect callback을 커밋 이후 순서대로 실행합니다.`,
      );
    }

    for (const entry of effectQueue) {
      const hook = this.hooks[entry.index];

      if (typeof hook.cleanup === 'function') {
        this.recordDebugStep(
          'effect',
          `useEffect 슬롯 ${entry.index} cleanup`,
          '이전 effect가 남긴 cleanup 함수를 먼저 실행합니다.',
        );
        hook.cleanup();
      }

      this.recordDebugStep(
        'effect',
        `useEffect 슬롯 ${entry.index} 실행`,
        '의존성이 변경된 effect callback을 실행합니다.',
      );
      const cleanup = entry.callback();
      hook.cleanup = typeof cleanup === 'function' ? cleanup : null;
      this.publishDebugSnapshot();
    }
  }

  resetDebugFlow() {
    this.debugFlow = [];
    this.publishDebugSnapshot();
  }

  recordDebugStep(kind, title, detail) {
    this.debugFlow = [
      ...this.debugFlow,
      {
        id: `flow-${this.renderCount}-${this.debugFlow.length + 1}`,
        kind,
        title,
        detail,
      },
    ];
    this.publishDebugSnapshot();
  }

  publishDebugSnapshot() {
    this.debugSnapshot = createDebugSnapshot(this);

    if (this.inspector?.publish) {
      this.inspector.publish(this.debugSnapshot);
    }
  }

  getComponentLabel() {
    return this.renderFn.name || 'App';
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
  const hook = getHook(
    component,
    'useState',
    'state',
    () => ({
      kind: 'state',
      queue: [],
      value: resolveInitialValue(initialValue),
    }),
  );

  flushStateQueue(hook);

  const setState = (nextValue) => {
    if (component.isRendering) {
      throw new Error('setState must be called from an event or effect, not during render.');
    }

    if (!component.updateScheduled) {
      component.resetDebugFlow();
    }

    hook.queue.push(nextValue);
    component.recordDebugStep(
      'state',
      `useState 슬롯 ${component.hooks.indexOf(hook)} queue 적재`,
      `루트 ${component.getComponentLabel()}의 useState가 다음 값을 큐에 넣었습니다. 현재 대기 중인 업데이트 수는 ${hook.queue.length}개입니다.`,
    );
    component.scheduleUpdate();
  };

  return [hook.value, setState];
}

export function useEffect(callback, deps) {
  const component = assertHookAccess('useEffect');
  const index = component.hookIndex;
  const hook = getHook(
    component,
    'useEffect',
    'effect',
    () => ({
      kind: 'effect',
      cleanup: null,
      deps: undefined,
    }),
  );

  if (shouldRunHook(hook.deps, deps)) {
    component.recordDebugStep(
      'effect',
      `useEffect 슬롯 ${index} 등록`,
      '의존성이 바뀌어서 이번 커밋 이후 effect callback이 실행되도록 예약했습니다.',
    );
    component.pendingEffects.push({
      index,
      callback,
    });
    hook.deps = cloneDeps(deps);
  }
}

export function useMemo(factory, deps) {
  const component = assertHookAccess('useMemo');
  const hook = getHook(
    component,
    'useMemo',
    'memo',
    () => ({
      kind: 'memo',
      deps: undefined,
      value: undefined,
    }),
  );

  if (shouldRunHook(hook.deps, deps)) {
    hook.value = factory();
    hook.deps = cloneDeps(deps);
    component.recordDebugStep(
      'memo',
      `useMemo 슬롯 ${component.hooks.indexOf(hook)} 재계산`,
      `의존성이 바뀌어서 memo 값을 다시 계산했습니다. 현재 값: ${summarizeValue(hook.value)}.`,
    );
  }

  return hook.value;
}

function assertHookAccess(name) {
  if (!activeComponent || !activeComponent.isRendering) {
    throw new Error(`${name} can only be used while FunctionComponent is rendering.`);
  }

  if (activeComponent.childRenderDepth > 0) {
    throw new Error(`${name} can only be used in the root component of this runtime.`);
  }

  return activeComponent;
}

function assertHookKind(hook, expectedKind, name) {
  if (hook.kind !== expectedKind) {
    throw new Error(`${name} was called in a different order. Hooks must keep a stable call order.`);
  }
}

function getHook(component, name, expectedKind, createHook) {
  const index = component.hookIndex++;
  let hook = component.hooks[index];

  if (!hook) {
    hook = createHook();
    component.hooks[index] = hook;
  }

  assertHookKind(hook, expectedKind, name);
  return hook;
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

  throw new TypeError('Components may only return Virtual DOM nodes, strings, numbers, or arrays.');
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

function flushStateQueue(hook) {
  if (!hook.queue.length) {
    return;
  }

  let nextValue = hook.value;

  for (const update of hook.queue) {
    nextValue = typeof update === 'function' ? update(nextValue) : update;
  }

  hook.queue = [];
  hook.value = nextValue;
}

function createDebugSnapshot(component) {
  return {
    renderCount: component.renderCount,
    hooks: component.hooks.map((hook, index) => createHookSnapshot(hook, index)),
    flow: component.debugFlow,
    patchSummary: summarizePatchOperations(component.lastPatchOperations),
  };
}

function createHookSnapshot(hook, index) {
  if (hook.kind === 'state') {
    return {
      slot: index,
      hook: 'useState',
      summary: summarizeValue(hook.value),
      detail: `현재 값: ${summarizeValue(hook.value)}, 대기 중 queue: ${hook.queue.length}개`,
    };
  }

  if (hook.kind === 'memo') {
    return {
      slot: index,
      hook: 'useMemo',
      summary: summarizeValue(hook.value),
      detail: `deps: ${summarizeDeps(hook.deps)}, 계산 결과: ${summarizeValue(hook.value)}`,
    };
  }

  return {
    slot: index,
    hook: 'useEffect',
    summary: hook.cleanup ? 'cleanup 보유' : 'cleanup 없음',
    detail: `deps: ${summarizeDeps(hook.deps)}, cleanup: ${hook.cleanup ? '있음' : '없음'}`,
  };
}

function summarizePatchOperations(operations = []) {
  if (!operations.length) {
    return '적용할 patch 작업이 없었습니다.';
  }

  const counts = operations.reduce((map, operation) => {
    map[operation.type] = (map[operation.type] || 0) + 1;
    return map;
  }, {});

  return Object.entries(counts)
    .map(([type, count]) => `${type} ${count}개`)
    .join(', ');
}

function summarizeDeps(deps) {
  if (!Array.isArray(deps)) {
    return '없음';
  }

  return deps.map((value) => summarizeValue(value)).join(', ');
}

function summarizeValue(value) {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean' || value == null) {
    return String(value);
  }

  return JSON.stringify(value);
}

function scheduleMicrotask(callback) {
  if (typeof queueMicrotask === 'function') {
    queueMicrotask(callback);
    return;
  }

  Promise.resolve().then(callback);
}
