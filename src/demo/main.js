import { FunctionComponent, h, useEffect, useMemo, useState } from '../index.js';
import './styles.css';

let nextConceptId = 4;

const INITIAL_CONCEPTS = [
  { id: 'concept-1', label: 'useState로 루트 상태 저장하기', done: true },
  { id: 'concept-2', label: 'useMemo로 완료율 계산하기', done: false },
  { id: 'concept-3', label: 'useEffect로 동기화 메시지 남기기', done: false },
];

function App() {
  const [title, setTitle] = useState('React 핵심 개념 실험실');
  const [draft, setDraft] = useState('');
  const [filter, setFilter] = useState('all');
  const [concepts, setConcepts] = useState(INITIAL_CONCEPTS);
  const [syncMessage, setSyncMessage] = useState('아직 동기화 전입니다.');
  const [batchScore, setBatchScore] = useState(0);

  const summary = useMemo(() => {
    const completed = concepts.filter((item) => item.done).length;
    const total = concepts.length;
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

    return {
      completed,
      percent,
      remaining: total - completed,
      total,
    };
  }, [concepts]);

  const visibleConcepts = useMemo(() => {
    if (filter === 'done') {
      return concepts.filter((item) => item.done);
    }

    if (filter === 'todo') {
      return concepts.filter((item) => !item.done);
    }

    return concepts;
  }, [concepts, filter]);

  useEffect(() => {
    const nextMessage = `${summary.completed}/${summary.total}개 항목이 화면과 동기화되었습니다.`;
    document.title = `${title} · ${summary.percent}%`;
    setSyncMessage(`${nextMessage} (${timestamp()})`);
  }, [title, summary.completed, summary.percent, summary.total]);

  const handleAddConcept = () => {
    const label = draft.trim();

    if (!label) {
      return;
    }

    setConcepts((current) => [
      ...current,
      {
        id: `concept-${nextConceptId++}`,
        label,
        done: false,
      },
    ]);
    setDraft('');
  };

  const handleToggleConcept = (targetId) => {
    setConcepts((current) => {
      return current.map((item) => {
        if (item.id !== targetId) {
          return item;
        }

        return {
          ...item,
          done: !item.done,
        };
      });
    });
  };

  const handleRemoveConcept = (targetId) => {
    setConcepts((current) => current.filter((item) => item.id !== targetId));
  };

  const handleBatchDemo = () => {
    setBatchScore((value) => value + 1);
    setBatchScore((value) => value + 1);
  };

  return h(
    'main',
    { class: 'page-shell' },
    h(
      'section',
      { class: 'hero-panel' },
      h(
        'div',
        { class: 'hero-copy' },
        h('p', { class: 'eyebrow' }, 'Week 5 Assignment'),
        h('h1', { class: 'hero-title' }, title),
        h(
          'p',
          { class: 'hero-description' },
          '루트 컴포넌트가 상태를 들고, 자식 컴포넌트는 props만 받아 화면을 그리는 최소 학습용 데모입니다.',
        ),
      ),
      h(EditorPanel, {
        batchScore,
        draft,
        onAddConcept: handleAddConcept,
        onBatchDemo: handleBatchDemo,
        onDraftInput: (event) => setDraft(event.target.value),
        onTitleInput: (event) => setTitle(event.target.value),
        title,
      }),
    ),
    h(
      'section',
      { class: 'dashboard-grid' },
      h(SummaryCard, {
        label: '완료율',
        value: `${summary.percent}%`,
        caption: `${summary.completed}개 완료 / ${summary.remaining}개 남음`,
      }),
      h(SummaryCard, {
        label: '배칭 점수',
        value: `+${batchScore}`,
        caption: '한 번의 클릭에서 setState 두 번 호출',
      }),
      h(SummaryCard, {
        label: 'useEffect',
        value: '동기화 중',
        caption: syncMessage,
      }),
    ),
    h(FilterTabs, {
      currentFilter: filter,
      onChange: setFilter,
    }),
    h(ConceptList, {
      items: visibleConcepts,
      onRemove: handleRemoveConcept,
      onToggle: handleToggleConcept,
    }),
    h(
      'section',
      { class: 'note-panel' },
      h('h2', { class: 'section-title' }, '구현 포인트'),
      h(
        'ul',
        { class: 'note-list' },
        h('li', {}, '상태는 App 하나에만 있고, 나머지 컴포넌트는 전부 props만 사용합니다.'),
        h('li', {}, 'useMemo가 완료율과 필터링된 목록을 계산합니다.'),
        h('li', {}, 'useEffect가 브라우저 제목과 동기화 메시지를 갱신합니다.'),
        h('li', {}, '기존 Virtual DOM diff/patch가 필요한 부분만 DOM에 반영합니다.'),
      ),
    ),
  );
}

function EditorPanel({
  batchScore,
  draft,
  onAddConcept,
  onBatchDemo,
  onDraftInput,
  onTitleInput,
  title,
}) {
  return h(
    'div',
    { class: 'editor-panel' },
    h('label', { class: 'field-label' }, '데모 제목'),
    h('input', {
      class: 'text-field',
      onInput: onTitleInput,
      placeholder: '데모 제목을 입력하세요',
      type: 'text',
      value: title,
    }),
    h('label', { class: 'field-label' }, '추가할 학습 항목'),
    h(
      'div',
      { class: 'inline-controls' },
      h('input', {
        class: 'text-field',
        onInput: onDraftInput,
        placeholder: '예: diff 후 patch 적용 흐름',
        type: 'text',
        value: draft,
      }),
      h(
        'button',
        {
          class: 'primary-button',
          disabled: !draft.trim(),
          onClick: onAddConcept,
          type: 'button',
        },
        '항목 추가',
      ),
    ),
    h(
      'button',
      {
        class: 'secondary-button',
        onClick: onBatchDemo,
        type: 'button',
      },
      `배칭 데모 실행 (+2, 현재 ${batchScore})`,
    ),
  );
}

function SummaryCard({ caption, label, value }) {
  return h(
    'article',
    { class: 'summary-card' },
    h('p', { class: 'summary-label' }, label),
    h('strong', { class: 'summary-value' }, value),
    h('p', { class: 'summary-caption' }, caption),
  );
}

function FilterTabs({ currentFilter, onChange }) {
  const filters = [
    { key: 'all', label: '전체' },
    { key: 'todo', label: '진행 중' },
    { key: 'done', label: '완료' },
  ];

  return h(
    'section',
    { class: 'filter-row' },
    ...filters.map((filter) => {
      const isActive = currentFilter === filter.key;

      return h(
        'button',
        {
          class: isActive ? 'filter-chip is-active' : 'filter-chip',
          'data-key': filter.key,
          onClick: () => onChange(filter.key),
          type: 'button',
        },
        filter.label,
      );
    }),
  );
}

function ConceptList({ items, onRemove, onToggle }) {
  if (!items.length) {
    return h(
      'section',
      { class: 'empty-state' },
      h('p', { class: 'empty-title' }, '현재 필터에 맞는 항목이 없습니다.'),
      h('p', { class: 'empty-description' }, '새 항목을 추가하거나 필터를 바꿔보세요.'),
    );
  }

  return h(
    'section',
    { class: 'concept-list' },
    ...items.map((item) => {
      return h(ConceptCard, {
        item,
        onRemove,
        onToggle,
      });
    }),
  );
}

function ConceptCard({ item, onRemove, onToggle }) {
  return h(
    'article',
    {
      class: item.done ? 'concept-card is-done' : 'concept-card',
      'data-key': item.id,
    },
    h(
      'div',
      { class: 'concept-copy' },
      h('p', { class: 'concept-badge' }, item.done ? 'Done' : 'Todo'),
      h('h3', { class: 'concept-title' }, item.label),
      h(
        'p',
        { class: 'concept-meta' },
        item.done
          ? '완료된 항목은 다른 필터에서도 그대로 재사용됩니다.'
          : '클릭하면 props 기반 자식 컴포넌트가 다시 렌더링됩니다.',
      ),
    ),
    h(
      'div',
      { class: 'concept-actions' },
      h(
        'button',
        {
          class: 'ghost-button',
          onClick: () => onToggle(item.id),
          type: 'button',
        },
        item.done ? '다시 열기' : '완료 처리',
      ),
      h(
        'button',
        {
          class: 'danger-button',
          onClick: () => onRemove(item.id),
          type: 'button',
        },
        '삭제',
      ),
    ),
  );
}

function timestamp() {
  return new Date().toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

const container = document.querySelector('#app');
const app = new FunctionComponent(App);

app.mount(container);
