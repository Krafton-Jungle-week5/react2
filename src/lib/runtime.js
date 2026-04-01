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
      `${this.getComponentLabel()}.update()`,
      'Reserved microtask is now flushing the pending root update.',
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
      `${this.getComponentLabel()}.scheduleUpdate()`,
      'setState queued a root update and batched it into one microtask.',
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
      `${this.getComponentLabel()}.renderAndCommit()`,
      'Root component is rerendering from hook slot 0.',
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
        'initial mount',
        'First render mounted the Virtual DOM tree into the real DOM.',
      );
    } else {
      const operations = patchDom(this.container, this.currentTree, nextTree);
      this.lastPatchOperations = operations;
      this.recordDebugStep(
        'diff',
        'diff',
        `Compared previous and next Virtual DOM trees and found ${operations.length} patch operations.`,
      );
      this.recordDebugStep(
        'patch',
        'patch',
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
        'flushEffects()',
        `Running ${effectQueue.length} useEffect callback(s) after commit.`,
      );
    }

    for (const entry of effectQueue) {
      const hook = this.hooks[entry.index];

      if (typeof hook.cleanup === 'function') {
        this.recordDebugStep(
          'effect',
          `useEffect slot ${entry.index} cleanup`,
          'Running the previous cleanup before the next effect callback.',
        );
        hook.cleanup();
      }

      this.recordDebugStep(
        'effect',
        `useEffect slot ${entry.index}`,
        'Running the latest effect callback because dependencies changed.',
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
  const hook = getHook(component, 'useState', 'state', () => ({
    kind: 'state',
    queue: [],
    value: resolveInitialValue(initialValue),
  }));

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
      `useState slot ${component.hooks.indexOf(hook)}`,
      `Queued the latest root state update. Pending queue length: ${hook.queue.length}.`,
    );
    component.scheduleUpdate();
  };

  return [hook.value, setState];
}

export function useEffect(callback, deps) {
  const component = assertHookAccess('useEffect');
  const index = component.hookIndex;
  const hook = getHook(component, 'useEffect', 'effect', () => ({
    kind: 'effect',
    cleanup: null,
    deps: undefined,
  }));

  if (shouldRunHook(hook.deps, deps)) {
    component.recordDebugStep(
      'effect',
      `useEffect slot ${index}`,
      'Dependencies changed, so the effect callback was queued for after commit.',
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
  const hook = getHook(component, 'useMemo', 'memo', () => ({
    kind: 'memo',
    deps: undefined,
    value: undefined,
  }));

  if (shouldRunHook(hook.deps, deps)) {
    hook.value = factory();
    hook.deps = cloneDeps(deps);
    component.recordDebugStep(
      'memo',
      `useMemo slot ${component.hooks.indexOf(hook)}`,
      `Recomputed the memoized value: ${summarizeValue(hook.value)}.`,
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
    flow: summarizeFlow(component.debugFlow),
    patchSummary: summarizePatchOperations(component.lastPatchOperations),
  };
}

function createHookSnapshot(hook, index) {
  if (hook.kind === 'state') {
    const summary = summarizeStateValue(hook.value);

    return {
      slot: index,
      hook: 'useState',
      summary,
      detail: `latest: ${summary}, queue: ${hook.queue.length}`,
      fields: createStateFields(hook.value),
    };
  }

  if (hook.kind === 'memo') {
    const summary = summarizeMemoValue(hook.value);
    return {
      slot: index,
      hook: 'useMemo',
      summary,
      detail: `deps: ${summarizeDeps(hook.deps)}, result: ${summary}`,
      fields: createMemoFields(hook.value),
    };
  }

  return {
    slot: index,
    hook: 'useEffect',
    summary: summarizeEffectDeps(hook.deps),
    detail: `deps: ${summarizeEffectDeps(hook.deps)}, cleanup: ${hook.cleanup ? 'yes' : 'no'}`,
    fields: createEffectFields(hook.deps, hook.cleanup),
  };
}

function createStateFields(value) {
  if (isGameState(value)) {
    return [
      { label: '현재 수', value: String(value.stepIndex) },
      { label: '다음 턴', value: value.xIsNext ? 'X' : 'O' },
      { label: 'X', value: String(value.score.x) },
      { label: 'O', value: String(value.score.o) },
      { label: '무승부', value: String(value.score.draws) },
    ];
  }

  return [{ label: '값', value: summarizeValue(value) }];
}

function createMemoFields(value) {
  if (isGameResult(value)) {
    return [
      { label: '승자', value: value.winner || '없음' },
      { label: '무승부', value: value.isDraw ? '예' : '아니오' },
      { label: '라인', value: value.winningLine.length ? value.winningLine.join('-') : '없음' },
    ];
  }

  if (typeof value === 'string') {
    return [{ label: '문구', value: summarizeStatusText(value) }];
  }

  if (typeof value === 'number') {
    return [{ label: '값', value: String(value) }];
  }

  if (Array.isArray(value)) {
    return [{ label: '배열', value: summarizeMemoValue(value) }];
  }

  return [{ label: '값', value: summarizeValue(value) }];
}

function createEffectFields(deps, cleanup) {
  if (!Array.isArray(deps) || !deps.length) {
    return [
      { label: '의존성', value: '없음' },
      { label: 'cleanup', value: cleanup ? '있음' : '없음' },
    ];
  }

  return [
    {
      label: '의존성 1',
      value: formatEffectDependency(deps[0], 0),
    },
    {
      label: '의존성 2',
      value: formatEffectDependency(deps[1], 1),
    },
    { label: 'cleanup', value: cleanup ? '있음' : '없음' },
  ].filter((entry) => entry.value !== undefined);
}

function formatEffectDependency(value, index) {
  if (index === 0 && typeof value === 'boolean') {
    return value ? 'X 다음 턴' : 'O 다음 턴';
  }

  if (index === 1 && isGameResult(value)) {
    if (value.winner) {
      return `${value.winner} 승리`;
    }

    if (value.isDraw) {
      return '무승부';
    }

    return '진행 중';
  }

  return summarizeMemoValue(value);
}

function summarizeStatusText(value) {
  if (value.includes('X') && value.includes('차례')) {
    return 'X 차례';
  }

  if (value.includes('O') && value.includes('차례')) {
    return 'O 차례';
  }

  if (value.includes('X') && value.includes('승리')) {
    return 'X 승리';
  }

  if (value.includes('O') && value.includes('승리')) {
    return 'O 승리';
  }

  if (value.includes('무승부')) {
    return '무승부';
  }

  return value;
}

function summarizePatchOperations(operations = []) {
  if (!operations.length) {
    return 'no patch operations';
  }

  const counts = operations.reduce((map, operation) => {
    map[operation.type] = (map[operation.type] || 0) + 1;
    return map;
  }, {});

  return Object.entries(counts)
    .map(([type, count]) => `${type} ${count}`)
    .join(', ');
}

function summarizeFlow(flow) {
  if (!flow.length) {
    return [];
  }

  const orderedKinds = ['state', 'scheduler', 'render', 'memo', 'diff', 'patch', 'effect'];

  return orderedKinds
    .map((kind) => flow.filter((entry) => entry.kind === kind).at(-1))
    .filter(Boolean);
}

function summarizeDeps(deps) {
  if (!Array.isArray(deps)) {
    return 'none';
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

function summarizeMemoValue(value) {
  if (isGameResult(value)) {
    if (value.winner) {
      return `winner ${value.winner} / line ${value.winningLine.join('-')}`;
    }

    if (value.isDraw) {
      return 'draw';
    }

    return 'winner none / draw no';
  }

  if (Array.isArray(value)) {
    if (value.length <= 9 && value.every((entry) => typeof entry === 'string')) {
      return value.map((entry) => entry || '-').join(' ');
    }

    return `array(${value.length})`;
  }

  return summarizeValue(value);
}

function summarizeEffectDeps(deps) {
  if (!Array.isArray(deps) || !deps.length) {
    return 'effect idle';
  }

  return deps.map((value) => summarizeMemoValue(value)).join(' / ');
}

function summarizeStateValue(value) {
  if (isGameState(value)) {
    return `step ${value.stepIndex} / next ${value.xIsNext ? 'X' : 'O'} / X:${value.score.x} O:${value.score.o} D:${value.score.draws}`;
  }

  return summarizeValue(value);
}

function isGameState(value) {
  return Boolean(
    value
    && typeof value === 'object'
    && Array.isArray(value.history)
    && typeof value.stepIndex === 'number'
    && typeof value.xIsNext === 'boolean'
    && value.score
    && typeof value.score.x === 'number'
    && typeof value.score.o === 'number'
    && typeof value.score.draws === 'number',
  );
}

function isGameResult(value) {
  return Boolean(
    value
    && typeof value === 'object'
    && 'winner' in value
    && 'winningLine' in value
    && 'isDraw' in value,
  );
}

function scheduleMicrotask(callback) {
  if (typeof queueMicrotask === 'function') {
    queueMicrotask(callback);
    return;
  }

  Promise.resolve().then(callback);
}
