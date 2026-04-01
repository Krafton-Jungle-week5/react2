import { FunctionComponent, h, useEffect, useMemo, useState } from '../index.js';
import './styles.css';

const WINNING_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function App() {
  const [history, setHistory] = useState([createEmptyBoard()]);
  const [stepIndex, setStepIndex] = useState(0);
  const [xIsNext, setXIsNext] = useState(true);
  const [score, setScore] = useState({ x: 0, o: 0, draws: 0 });

  const board = history[stepIndex];

  const result = useMemo(() => {
    return calculateResult(board);
  }, [board]);

  const moveCount = useMemo(() => {
    return board.filter(Boolean).length;
  }, [board]);

  const statusText = useMemo(() => {
    if (result.winner) {
      return `${result.winner} wins the round.`;
    }

    if (result.isDraw) {
      return 'Draw game. Reset the board or jump to an earlier move.';
    }

    return `${xIsNext ? 'X' : 'O'} turn. Choose a square.`;
  }, [result.isDraw, result.winner, xIsNext]);

  useEffect(() => {
    document.title = result.winner
      ? `Tic-Tac-Toe - ${result.winner} won`
      : result.isDraw
        ? 'Tic-Tac-Toe - Draw'
        : `Tic-Tac-Toe - ${xIsNext ? 'X' : 'O'} turn`;
  }, [result.isDraw, result.winner, xIsNext]);

  const handleSquareClick = (index) => {
    if (board[index] || result.winner || result.isDraw) {
      return;
    }

    const nextBoard = [...board];
    const nextToken = xIsNext ? 'X' : 'O';
    nextBoard[index] = nextToken;

    const nextHistory = history.slice(0, stepIndex + 1).concat([nextBoard]);
    const nextResult = calculateResult(nextBoard);

    setHistory(nextHistory);
    setStepIndex(nextHistory.length - 1);
    setXIsNext(!xIsNext);

    if (nextResult.winner) {
      setScore((current) => ({
        ...current,
        [nextResult.winner.toLowerCase()]: current[nextResult.winner.toLowerCase()] + 1,
      }));
      return;
    }

    if (nextResult.isDraw) {
      setScore((current) => ({
        ...current,
        draws: current.draws + 1,
      }));
    }
  };

  const jumpToStep = (nextStepIndex) => {
    setStepIndex(nextStepIndex);
    setXIsNext(nextStepIndex % 2 === 0);
  };

  const resetBoard = () => {
    setHistory([createEmptyBoard()]);
    setStepIndex(0);
    setXIsNext(true);
  };

  const resetEverything = () => {
    resetBoard();
    setScore({ x: 0, o: 0, draws: 0 });
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
        h('p', { class: 'eyebrow' }, 'React2 Demo'),
        h('h1', { class: 'hero-title' }, 'Tic-Tac-Toe Playground'),
        h(
          'p',
          { class: 'hero-description' },
          'The old experiment screen has been replaced with a simple game that proves state updates, memoized winner checks, effects, and rerendering on top of the custom React2 runtime.',
        ),
      ),
      h(StatusPanel, {
        moveCount,
        statusText,
        winner: result.winner,
        xIsNext,
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
            h('p', { class: 'panel-kicker' }, 'Board'),
            h('h2', { class: 'section-title' }, statusText),
          ),
          h(
            'div',
            { class: 'move-pill' },
            'Moves',
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
              onClick: resetBoard,
              type: 'button',
            },
            'Reset Board',
          ),
          h(
            'button',
            {
              class: 'ghost-button',
              onClick: resetEverything,
              type: 'button',
            },
            'Reset Score',
          ),
        ),
      ),
      h(
        'aside',
        { class: 'side-panel' },
        h(ScoreCard, { score }),
        h(GuideCard, { renderCount: history.length - 1 }),
        h(HistoryCard, {
          history,
          stepIndex,
          onJump: jumpToStep,
        }),
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
  const badgeText = winner || (xIsNext ? 'X TURN' : 'O TURN');

  return h(
    'div',
    { class: 'status-card' },
    h('span', { class: badgeClass }, badgeText),
    h('strong', { class: 'status-title' }, statusText),
    h('p', { class: 'status-caption' }, `${moveCount} squares are filled in the current round.`),
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
  const className = [
    'square-button',
    value ? `is-${value.toLowerCase()}` : '',
    isWinning ? 'is-winning' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return h(
    'button',
    {
      'aria-label': `square-${index + 1}`,
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
    h('p', { class: 'panel-kicker' }, 'Score'),
    h(
      'div',
      { class: 'score-grid' },
      h(ScoreItem, { label: 'X Wins', value: score.x }),
      h(ScoreItem, { label: 'O Wins', value: score.o }),
      h(ScoreItem, { label: 'Draws', value: score.draws }),
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

function GuideCard({ renderCount }) {
  return h(
    'section',
    { class: 'info-card' },
    h('p', { class: 'panel-kicker' }, 'Runtime Notes'),
    h(
      'ul',
      { class: 'guide-list' },
      h('li', {}, 'All hooks live in the root App component because this runtime only supports root-level hooks.'),
      h('li', {}, 'Winner detection and move count are memoized with useMemo.'),
      h('li', {}, `The board has rerendered through ${renderCount} committed move${renderCount === 1 ? '' : 's'}.`),
    ),
  );
}

function HistoryCard({ history, onJump, stepIndex }) {
  return h(
    'section',
    { class: 'info-card history-card' },
    h('p', { class: 'panel-kicker' }, 'Time Travel'),
    h('h3', { class: 'history-title' }, 'Move History'),
    h(
      'div',
      { class: 'history-list' },
      ...history.map((board, index) =>
        h(
          'button',
          {
            class: index === stepIndex ? 'history-button is-active' : 'history-button',
            onClick: () => onJump(index),
            type: 'button',
          },
          buildHistoryLabel(history, index),
        ),
      ),
    ),
  );
}

function buildHistoryLabel(history, index) {
  if (index === 0) {
    return 'Go to game start';
  }

  const currentBoard = history[index];
  const previousBoard = history[index - 1];
  const changedIndex = currentBoard.findIndex((cell, cellIndex) => cell !== previousBoard[cellIndex]);
  const token = changedIndex >= 0 ? currentBoard[changedIndex] : '';

  if (!token) {
    return `Go to move ${index}`;
  }

  return `Go to move ${index} (${token} on ${changedIndex + 1})`;
}

function calculateResult(board) {
  for (const line of WINNING_LINES) {
    const [first, second, third] = line;
    if (board[first] && board[first] === board[second] && board[first] === board[third]) {
      return {
        winner: board[first],
        winningLine: line,
        isDraw: false,
      };
    }
  }

  return {
    winner: null,
    winningLine: [],
    isDraw: board.every(Boolean),
  };
}

function createEmptyBoard() {
  return Array(9).fill('');
}

const container = document.querySelector('#app');
const app = new FunctionComponent(App);

app.mount(container);
