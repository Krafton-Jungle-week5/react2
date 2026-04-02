import { FunctionComponent, h, useEffect, useState } from '../index.js';

export function createRuntimeInspectorStore() {
  let snapshot = {
    renderCount: 0,
    hooks: [],
    flow: [],
    patchSummary: 'No patch operations yet.',
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

    useEffect(() => store.subscribe((nextSnapshot) => setSnapshot(nextSnapshot)), []);

    return h(HookSlotsCard, {
      hooks: snapshot.hooks,
      renderCount: snapshot.renderCount,
    });
  }

  return new FunctionComponent(InspectorApp).mount(container);
}

function HookSlotsCard({ hooks, renderCount }) {
  const comparedHooks = hooks.map((hook, index) => ({
    ...hook,
    displaySlot: index + 1,
  }));

  return h(
    'section',
    { class: 'info-card history-card inspector-panel' },
    h('p', { class: 'panel-kicker' }, 'HOOKS'),
    h('h3', { class: 'history-title' }, 'Runtime hooks'),
    h(
      'div',
      { class: 'hook-summary-card' },
      h('p', { class: 'timeline-detail inspector-meta' }, `renderCount: ${renderCount}`),
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
                h('strong', { class: 'timeline-title' }, `slot ${hook.slot}`),
              ),
              h('p', { class: 'timeline-detail hook-kind' }, hook.hook),
              h('p', { class: 'hook-label' }, 'current value'),
              renderHookFields(hook.fields, hook.summary, 'hook-after'),
            ),
          ),
        )
      : h('p', { class: 'timeline-detail' }, 'No hook values recorded yet.'),
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
        h('span', { class: 'hook-field-label' }, `${field.label}:`),
        h('span', { class: 'hook-field-value' }, field.value),
      ),
    ),
  );
}
