import { FunctionComponent, h, useEffect, useMemo, useState } from '../nonfiber/index.js';
import {
  calculateResult,
  createInitialGameState,
  getCurrentBoard,
  getMoveCount,
  resetBoard,
  playMove,
} from '../tic-tac-toe/model.js';
import { createRuntimeInspectorStore, mountRuntimeInspector } from '../demo/runtime-inspector.js';
import '../demo/styles.css';

function App() {
  const [game, setGame] = useState(createInitialGameState);
  const board = getCurrentBoard(game);

  const result = useMemo(() => calculateResult(board), [board]);
  const moveCount = useMemo(() => getMoveCount(board), [board]);
  const statusText = useMemo(() => {
    if (result.winner) {
      return `${result.winner}가 이번 라운드에서 승리했습니다.`;
    }

    if (result.isDraw) {
      return '무승부입니다. 보드를 다시 시작해보세요.';
    }

    return `${game.xIsNext ? 'X' : 'O'} 차례입니다. 빈 칸을 선택하세요.`;
  }, [game.xIsNext, result.isDraw, result.winner]);

  useEffect(() => {
    document.title = result.winner
      ? `논파이버 틱택토 - ${result.winner} 승리`
      : result.isDraw
        ? '논파이버 틱택토 - 무승부'
        : `논파이버 틱택토 - ${game.xIsNext ? 'X' : 'O'} 차례`;
  }, [game.xIsNext, result]);

  const handleSquareClick = (index) => {
    setGame((currentGame) => playMove(currentGame, index));
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
        h('p', { class: 'eyebrow' }, '파이버 없는 훅 데모'),
        h('h1', { class: 'hero-title' }, '논파이버 틱택토'),
        h(
          'p',
          { class: 'hero-description' },
          '같은 게임을 non-fiber 엔트리에서도 실행하고, 아래 인스펙터에서 hooks 슬롯과 렌더링 단계를 그대로 비교할 수 있습니다.',
        ),
      ),
      h(StatusPanel, {
        moveCount,
        statusText,
        winner: result.winner,
        xIsNext: game.xIsNext,
      }),
    ),
    h(
      'section',
      { class: 'game-layout' },
      h(
        'section',
        { class: 'board-panel' },
        h(
          'div',
          { class: 'section-heading' },
          h(
            'div',
            {},
            h('p', { class: 'panel-kicker' }, '보드'),
            h('h2', { class: 'section-title' }, statusText),
          ),
          h(
            'div',
            { class: 'move-pill' },
            '수',
            h('strong', {}, `${moveCount}/9`),
          ),
        ),
        h(Board, {
          board,
          onSquareClick: handleSquareClick,
          winningLine: result.winningLine,
        }),
        h(
          'div',
          { class: 'button-row' },
          h(
            'button',
            {
              class: 'primary-button',
              onClick: () => setGame((currentGame) => resetBoard(currentGame)),
              type: 'button',
            },
            '보드 초기화',
          ),
          h(
            'button',
            {
              class: 'ghost-button',
              onClick: () => setGame(createInitialGameState()),
              type: 'button',
            },
            '점수까지 초기화',
          ),
        ),
      ),
      h(
        'aside',
        { class: 'side-panel' },
        h(ScoreCard, { score: game.score }),
        h(RuntimeSummaryCard, { moveCount, result }),
      ),
    ),
  );
}

function StatusPanel({ moveCount, statusText, winner, xIsNext }) {
  const badgeClass = winner
    ? 'status-badge is-win'
    : xIsNext
      ? 'status-badge is-x'
      : 'status-badge is-o';
  const badgeText = winner || (xIsNext ? 'X 차례' : 'O 차례');

  return h(
    'div',
    { class: 'status-card' },
    h('span', { class: badgeClass }, badgeText),
    h('strong', { class: 'status-title' }, statusText),
    h('p', { class: 'status-caption' }, `현재 ${moveCount}칸이 채워져 있습니다.`),
  );
}

function Board({ board, onSquareClick, winningLine }) {
  return h(
    'section',
    { class: 'board-grid' },
    ...board.map((value, index) =>
      h(Square, {
        index,
        isWinning: winningLine.includes(index),
        onClick: () => onSquareClick(index),
        value,
      }),
    ),
  );
}

function Square({ index, isWinning, onClick, value }) {
  const className = ['square-button', value ? `is-${value.toLowerCase()}` : '', isWinning ? 'is-winning' : '']
    .filter(Boolean)
    .join(' ');

  return h(
    'button',
    {
      'aria-label': `칸-${index + 1}`,
      class: className,
      onClick,
      type: 'button',
    },
    value || '',
  );
}

function ScoreCard({ score }) {
  return h(
    'section',
    { class: 'info-card' },
    h('p', { class: 'panel-kicker' }, '점수'),
    h(
      'div',
      { class: 'score-grid' },
      h(ScoreItem, { label: 'X 승리', value: score.x }),
      h(ScoreItem, { label: 'O 승리', value: score.o }),
      h(ScoreItem, { label: '무승부', value: score.draws }),
    ),
  );
}

function ScoreItem({ label, value }) {
  return h(
    'article',
    { class: 'score-item' },
    h('span', { class: 'score-label' }, label),
    h('strong', { class: 'score-value' }, String(value)),
  );
}

function RuntimeSummaryCard({ moveCount, result }) {
  const summary = result.winner
    ? `${result.winner} 승리 상태라 이후 클릭은 무시됩니다.`
    : result.isDraw
      ? '무승부 상태라 reset 버튼으로 다음 라운드를 시작할 수 있습니다.'
      : '클릭할 때마다 inspector가 hooks 슬롯과 patch 단계를 함께 기록합니다.';

  return h(
    'section',
    { class: 'info-card' },
    h('p', { class: 'panel-kicker' }, '시연 포인트'),
    h('h3', { class: 'history-title' }, '논파이버에서도 같은 흐름'),
    h('p', { class: 'timeline-detail' }, summary),
    h('p', { class: 'timeline-detail' }, `현재 보드에 놓인 말 수는 ${moveCount}개입니다.`),
  );
}

const appContainer = document.querySelector('#app');
const inspectorContainer = document.querySelector('#inspector-root');
const inspectorStore = createRuntimeInspectorStore();

const app = new FunctionComponent(App);
app.attachInspector(inspectorStore).mount(appContainer);

if (inspectorContainer) {
  mountRuntimeInspector(
    inspectorContainer,
    inspectorStore,
    '논파이버 hooks + 렌더 파이프라인',
    '동일한 루트 hooks 런타임이 setState 이후 어떤 순서로 update, renderAndCommit, diff, patch, effect를 처리하는지 그대로 확인할 수 있습니다.',
  );
}
