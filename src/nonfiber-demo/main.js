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
        h('p', { class: 'eyebrow' }, '파이버 없는 훅 데모'),
        h('h1', { class: 'hero-title' }, '논파이버 틱택토'),
        h(
          'p',
          { class: 'hero-description' },
          '같은 게임을 non-fiber 엔트리에서도 실행하고, 오른쪽 패널에서 hooks 슬롯을 그대로 비교할 수 있습니다.',
        ),
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
            '점수까지 초기화',
          ),
        ),
      ),
      h('aside', { class: 'side-panel', id: 'inspector-root' }),
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
