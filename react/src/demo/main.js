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
import './styles.css';

function App() {
  const [game, setGame] = useState(createInitialGameState);
  const board = getCurrentBoard(game);

  const result = useMemo(() => calculateResult(board), [board]);
  const moveCount = useMemo(() => getMoveCount(board), [board]);
  const statusText = useMemo(() => {
    if (result.winner) {
      return `${result.winner} 승리`;
    }

    if (result.isDraw) {
      return '무승부';
    }

    return `다음 차례: ${game.xIsNext ? 'X' : 'O'}`;
  }, [game.xIsNext, result.isDraw, result.winner]);
  const effectPreview = getEffectStatus(game, result);

  useEffect(() => {
    document.body.dataset.runtimeEffect = effectPreview;
  }, [game.xIsNext, result, effectPreview]);

  return h(
    'main',
    { class: 'page-shell' },
    h(
      'section',
      { class: 'hero-panel' },
      h(
        'div',
        { class: 'hero-layout' },
        h(
          'div',
          { class: 'hero-main' },
          h(
            'div',
            { class: 'hero-topline' },
            h(
              'div',
              { class: 'hero-copy' },
              h(
                'div',
                { class: 'hero-title-row' },
                h(TicTacToeBadge),
                h('h1', { class: 'hero-title' }, 'Tic Tac Toe'),
              ),
            ),
          ),
        ),
        h(
          'div',
          { class: 'hero-history' },
          h(MoveHistoryPanel, {
            currentStep: game.stepIndex,
            history: game.history,
            onJump: (stepIndex) => setGame((currentGame) => jumpToMove(currentGame, stepIndex)),
          }),
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
        h(HookValuePanel, {
          board,
          effectPreview,
          game,
          moveCount,
          result,
          statusText,
        }),
      ),
    ),
  );
}

function HookValuePanel({ board, effectPreview, game, moveCount, result, statusText }) {
  return h(
    'section',
    { class: 'info-card hook-values-card' },
    h('p', { class: 'panel-kicker' }, '현재 값'),
    h('h3', { class: 'history-title hook-values-title' }, 'Hook 값'),
    h(
      'div',
      { class: 'hook-value-groups' },
      h(HookGroup, {
        fields: [
          ['현재 단계', String(game.stepIndex)],
          ['X 차례 여부', String(game.xIsNext)],
          ['다음 플레이어', game.xIsNext ? 'X' : 'O'],
          ['X 점수', String(game.score.x)],
          ['O 점수', String(game.score.o)],
          ['무승부 수', String(game.score.draws)],
          ['히스토리 길이', String(game.history.length)],
          ['현재 보드', JSON.stringify(board)],
        ],
        hookName: 'useState',
      }),
      h(HookGroup, {
        fields: [
          ['승자', result.winner || 'null'],
          ['무승부 여부', String(result.isDraw)],
          ['승리 줄', JSON.stringify(result.winningLine)],
          ['놓인 수', String(moveCount)],
          ['상태 문구', formatStatusTextValue(result, game)],
        ],
        hookName: 'useMemo',
      }),
      h(HookGroup, {
        fields: [
          ['다음 차례 여부', `game.xIsNext = ${String(game.xIsNext)}`],
          ['게임 결과', JSON.stringify(result)],
          ['다음 effect 값', effectPreview],
        ],
        hookName: 'useEffect',
      }),
    ),
  );
}

function HookGroup({ fields, hookName }) {
  return h(
    'article',
    { class: 'hook-value-group' },
    h('p', { class: 'hook-value-group-title' }, hookName),
    h(
      'div',
      { class: 'hook-json-list' },
      ...fields.map(([label, value]) =>
        h(
          'p',
          { class: 'hook-json-row' },
          h('span', { class: 'hook-json-key' }, `${label}:`),
          h('span', { class: 'hook-json-value' }, value),
        ),
      ),
    ),
  );
}

function MoveHistoryPanel({ currentStep, history, onJump }) {
  const latestStep = history.length - 1;
  const canGoPrev = currentStep > 0;
  const canGoNext = currentStep < latestStep;

  return h(
    'section',
    { class: 'info-card history-card move-history-card' },
    h('p', { class: 'panel-kicker history-kicker' }, '히스토리'),
    h('p', { class: 'timeline-detail move-history-caption' }, `현재 단계: ${currentStep}`),
    h(
      'div',
      { class: 'move-history-viewer' },
      h(
        'button',
        {
          'aria-label': '이전 수',
          class: 'move-history-nav',
          disabled: !canGoPrev,
          onClick: () => onJump(currentStep - 1),
          type: 'button',
        },
        '<',
      ),
      h(
        'div',
        { class: 'move-history-button is-active move-history-current' },
        h('span', { class: 'move-history-step' }, `#${currentStep}`),
        h('span', { class: 'move-history-label' }, buildHistoryLabel(history, currentStep)),
      ),
      h(
        'button',
        {
          'aria-label': '다음 수',
          class: 'move-history-nav',
          disabled: !canGoNext,
          onClick: () => onJump(currentStep + 1),
          type: 'button',
        },
        '>',
      ),
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
      'aria-label': `칸 ${index + 1}`,
      class: className,
      onClick,
      type: 'button',
    },
    value || '',
  );
}

function getEffectStatus(game, result) {
  if (result.winner) {
    return `${result.winner} win synced`;
  }

  if (result.isDraw) {
    return 'draw synced';
  }

  return `${game.xIsNext ? 'X' : 'O'} turn synced`;
}

function formatStatusTextValue(result, game) {
  if (result.winner) {
    return `${result.winner} win`;
  }

  if (result.isDraw) {
    return 'draw';
  }

  return `${game.xIsNext ? 'X' : 'O'} turn`;
}

function TicTacToeBadge() {
  const cells = ['x', 'o', 'x', 'o', 'x', 'o', 'x', 'o', 'x'];

  return h(
    'div',
    { class: 'hero-badge-board', 'aria-hidden': 'true' },
    ...cells.map((cell, index) =>
      h(
        'div',
        { class: `hero-badge-cell is-${cell}`, 'data-key': `hero-badge-${index}` },
        cell.toUpperCase(),
      ),
    ),
  );
}

const appContainer = document.querySelector('#app');

const app = new FunctionComponent(App);
app.mount(appContainer);
