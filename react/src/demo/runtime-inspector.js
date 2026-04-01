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
    const [snapshot, setSnapshot] = useState(() => store.getSnapshot());

    useEffect(() => {
      return store.subscribe((nextSnapshot) => setSnapshot(nextSnapshot));
    }, []);

    return h(
      'section',
      { class: 'inspector-shell' },
      h(HookSlotsCard, {
        hooks: snapshot.hooks,
        renderCount: snapshot.renderCount,
      }),
    );
  }

  return new FunctionComponent(InspectorApp).mount(container);
}

function HookSlotsCard({ hooks, renderCount }) {
  const visibleSlots = hooks.filter((hook) => ![1, 2].includes(hook.slot));
  const comparedHooks = visibleSlots.map((hook, index) => ({
    ...hook,
    displaySlot: index + 1,
  }));

  return h(
    'section',
    { class: 'info-card history-card inspector-panel' },
    h('p', { class: 'panel-kicker' }, '동작 시각화'),
    h('h3', { class: 'history-title' }, '루트 hooks'),
    h(
      'div',
      { class: 'hook-summary-card' },
      h('p', { class: 'timeline-detail inspector-meta' }, `루트 App 렌더 ${renderCount}회`),
    ),
    comparedHooks.length
      ? h(
          'div',
          { class: 'hook-slot-grid' },
          ...comparedHooks.map((hook) =>
            h(
              'article',
              {
                class: `hook-slot-card hook-slot-card--slot-${hook.displaySlot}`,
                'data-key': `hook-slot-${hook.slot}`,
              },
              h(
                'div',
                { class: 'hook-slot-header' },
                h('strong', { class: 'timeline-title' }, `슬롯 ${hook.displaySlot}`),
              ),
              h('p', { class: 'timeline-detail hook-kind' }, hook.hook),
              h('p', { class: 'hook-label' }, '현재 값'),
              renderHookFields(hook.fields, hook.summary, 'hook-after'),
            ),
          ),
        )
      : h('p', { class: 'timeline-detail' }, '아직 기록된 hook 슬롯이 없습니다.'),
  );
}

function renderHookFields(fields, summary, className) {
  if (!Array.isArray(fields) || !fields.length) {
    return h('p', { class: `timeline-detail ${className}` }, summary);
  }

  return h(
    'div',
    { class: `hook-field-list ${className}` },
    ...fields.map((field) =>
      h(
        'p',
        { class: 'hook-field-row' },
        h('span', { class: 'hook-field-label' }, `${field.label}`),
        h('span', { class: 'hook-field-value' }, field.value),
      ),
    ),
  );
}
