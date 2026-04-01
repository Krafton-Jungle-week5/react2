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

export function mountRuntimeInspector(container, store, title, description) {
  function InspectorApp() {
    const [snapshot, setSnapshot] = useState(() => store.getSnapshot());

    useEffect(() => {
      return store.subscribe((nextSnapshot) => setSnapshot(nextSnapshot));
    }, []);

    return h(
      'section',
      { class: 'inspector-shell' },
      h(
        'div',
        { class: 'info-card inspector-hero' },
        h('p', { class: 'panel-kicker' }, '런타임 인스펙터'),
        h('h2', { class: 'history-title' }, title),
        h('p', { class: 'timeline-detail inspector-description' }, description),
        h('p', { class: 'inspector-render-count' }, `루트 App 렌더 횟수: ${snapshot.renderCount}`),
      ),
      h(HookSlotsCard, { hooks: snapshot.hooks }),
      h(RenderFlowCard, { flow: snapshot.flow, patchSummary: snapshot.patchSummary }),
    );
  }

  return new FunctionComponent(InspectorApp).mount(container);
}

function HookSlotsCard({ hooks }) {
  return h(
    'section',
    { class: 'info-card history-card' },
    h('p', { class: 'panel-kicker' }, 'Hooks 동작 시각화'),
    h('h3', { class: 'history-title' }, '루트 hooks[] 슬롯'),
    hooks.length
      ? h(
          'div',
          { class: 'timeline-list' },
          ...hooks.map((hook) =>
            h(
              'article',
              {
                class: 'hook-slot-card',
                'data-key': `hook-slot-${hook.slot}`,
              },
              h('strong', { class: 'timeline-title' }, `슬롯 ${hook.slot} · ${hook.hook}`),
              h('p', { class: 'timeline-detail' }, `현재 값: ${hook.summary}`),
              h('p', { class: 'timeline-detail' }, hook.detail),
            ),
          ),
        )
      : h('p', { class: 'timeline-detail' }, '아직 기록된 hook 슬롯이 없습니다.'),
  );
}

function RenderFlowCard({ flow, patchSummary }) {
  return h(
    'section',
    { class: 'info-card history-card' },
    h('p', { class: 'panel-kicker' }, '렌더링 흐름 추적'),
    h('h3', { class: 'history-title' }, 'setState -> patch -> effect'),
    h('p', { class: 'timeline-detail inspector-description' }, `최근 patch 요약: ${patchSummary}`),
    flow.length
      ? h(
          'div',
          { class: 'timeline-list' },
          ...flow.map((entry, index) =>
            h(
              'article',
              {
                class: `timeline-entry is-${entry.kind}`,
                'data-key': entry.id,
              },
              h('strong', { class: 'timeline-title' }, `${index + 1}. ${entry.title}`),
              h('p', { class: 'timeline-detail' }, entry.detail),
            ),
          ),
        )
      : h('p', { class: 'timeline-detail' }, '아직 기록된 렌더링 흐름이 없습니다.'),
  );
}
