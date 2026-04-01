import { FunctionComponent, h, useEffect, useMemo, useState } from '../index.js';
import {
  buildHistoryLabel,
  calculateResult,
  createInitialGameState,
  getCurrentBoard,
  getMoveCount,
  jumpToMove,
  resetBoard,
  playMove,
} from '../tic-tac-toe/model.js';
import { createRuntimeInspectorStore, mountRuntimeInspector } from './runtime-inspector.js';
import './styles.css';

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

    return `${game.xIsNext ? 'X' : 'O'} 차례입니다. 칸을 선택하세요.`;
  }, [game.xIsNext, result.isDraw, result.winner]);

  useEffect(() => {
    const effectStatus = result.winner
      ? `${result.winner} win synced`
      : result.isDraw
        ? 'draw synced'
        : `${game.xIsNext ? 'X' : 'O'} turn synced`;

    document.body.dataset.runtimeEffect = effectStatus;
  }, [game.xIsNext, result]);

  return h(
    'main',
    { class: 'page-shell' },
    h(
      'section',
      { class: 'hero-panel' },
      h(
        'div',
        { class: 'hero-copy' },
        h('p', { class: 'eyebrow' }, '리액트 구현 데모'),
        h('h1', { class: 'hero-title' }, '틱택토 플레이그라운드'),
      ),
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
          onSquareClick: (index) => setGame((currentGame) => playMove(currentGame, index)),
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
            '점수 초기화',
          ),
        ),
      ),
      h(
        'aside',
        { class: 'side-panel' },
        h(MoveHistoryPanel, {
          currentStep: game.stepIndex,
          history: game.history,
          onJump: (stepIndex) => setGame((currentGame) => jumpToMove(currentGame, stepIndex)),
        }),
        h('div', { id: 'inspector-root' }),
      ),
    ),
  );
}

function MoveHistoryPanel({ currentStep, history, onJump }) {
  return h(
    'section',
    { class: 'info-card history-card move-history-card' },
    h('p', { class: 'panel-kicker' }, 'Moves'),
    h('h3', { class: 'history-title' }, 'Move history'),
    h('p', { class: 'timeline-detail move-history-caption' }, `현재 선택한 수: ${currentStep}`),
    h(
      'div',
      { class: 'move-history-list' },
      ...history.map((_, index) => {
        const isActive = index === currentStep;

        return h(
          'button',
          {
            class: `move-history-button${isActive ? ' is-active' : ''}`,
            disabled: isActive,
            onClick: () => onJump(index),
            type: 'button',
          },
          h('span', { class: 'move-history-step' }, `#${index}`),
          h('span', { class: 'move-history-label' }, buildHistoryLabel(history, index)),
        );
      }),
    ),
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

const appContainer = document.querySelector('#app');
const inspectorStore = createRuntimeInspectorStore();

const app = new FunctionComponent(App);
app.attachInspector(inspectorStore).mount(appContainer);

const inspectorContainer = document.querySelector('#inspector-root');

if (inspectorContainer) {
  mountRuntimeInspector(inspectorContainer, inspectorStore);
}
