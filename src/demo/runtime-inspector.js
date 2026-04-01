import { FunctionComponent, h, useEffect, useState } from '../index.js';

export function createRuntimeInspectorStore() {
  let snapshot = {
    renderCount: 0,
    hooks: [],
    flow: [],
    patchSummary: '아직 patch 정보가 없습니다.',
  };
  const listeners = new Set();

  return {
    getSnapshot() {
      return snapshot;
    },
    publish(nextSnapshot) {
      snapshot = nextSnapshot;
      listeners.forEach((listener) => listener(snapshot));
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export function mountRuntimeInspector(container, store) {
  function InspectorApp() {
    const [viewState, setViewState] = useState(() => ({
      current: store.getSnapshot(),
      previousHooks: [],
    }));

    useEffect(() => {
      return store.subscribe((nextSnapshot) => {
        setViewState((currentViewState) => ({
          current: nextSnapshot,
          previousHooks: currentViewState.current.hooks || [],
        }));
      });
    }, []);

    return h(
      'section',
      { class: 'inspector-shell' },
      h(HookSlotsCard, {
        hooks: viewState.current.hooks,
        previousHooks: viewState.previousHooks,
        renderCount: viewState.current.renderCount,
      }),
    );
  }

  return new FunctionComponent(InspectorApp).mount(container);
}

function HookSlotsCard({ hooks, previousHooks, renderCount }) {
  const visibleSlots = hooks.filter((hook) => ![1, 2].includes(hook.slot));

  const comparedHooks = visibleSlots.map((hook, index) => {
    const previousHook = previousHooks.find((entry) => entry.slot === hook.slot);
    const changed = !previousHook
      || previousHook.summary !== hook.summary
      || previousHook.detail !== hook.detail;

    return {
      ...hook,
      displaySlot: index + 1,
      previousSummary: previousHook?.summary || '이전 값 없음',
      statusClassName: changed ? 'is-changed' : 'is-stable',
      changed,
    };
  });

  return h(
    'section',
    { class: 'info-card history-card inspector-panel' },
    h('p', { class: 'panel-kicker' }, '동작 시각화'),
    h('h3', { class: 'history-title' }, '루트 hooks'),
    h(
      'div',
      { class: 'hook-summary-card' },
      h(
        'p',
        { class: 'timeline-detail inspector-meta' },
        `루트 App 렌더 ${renderCount}회`,
      ),
    ),
    comparedHooks.length
      ? h(
          'div',
          { class: 'hook-slot-grid' },
          ...comparedHooks.map((hook) =>
            h(
              'article',
              {
                class: `hook-slot-card ${hook.statusClassName}`,
                'data-key': `hook-slot-${hook.slot}`,
              },
              h(
                'div',
                { class: 'hook-slot-header' },
                h('strong', { class: 'timeline-title' }, `슬롯 ${hook.displaySlot}`),
              ),
              h('p', { class: 'timeline-detail hook-kind' }, hook.hook),
              h('p', { class: 'hook-label' }, '이전 값'),
              h('p', { class: 'timeline-detail hook-before' }, hook.previousSummary),
              h('p', { class: 'hook-label' }, '현재 값'),
              h('p', { class: 'timeline-detail hook-after' }, hook.summary),
            ),
          ),
        )
      : h('p', { class: 'timeline-detail' }, '아직 기록된 hook 슬롯이 없습니다.'),
  );
}
