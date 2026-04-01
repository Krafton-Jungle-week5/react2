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

export function createInitialGameState() {
  return {
    history: [createEmptyBoard()],
    stepIndex: 0,
    xIsNext: true,
    score: {
      x: 0,
      o: 0,
      draws: 0,
    },
  };
}

export function createEmptyBoard() {
  return Array(9).fill('');
}

export function getCurrentBoard(game) {
  return game.history[game.stepIndex];
}

export function getMoveCount(board) {
  return board.filter(Boolean).length;
}

export function calculateResult(board) {
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

export function playMove(game, index) {
  const board = getCurrentBoard(game);
  const currentResult = calculateResult(board);

  if (board[index] || currentResult.winner || currentResult.isDraw) {
    return game;
  }

  const nextBoard = [...board];
  const nextToken = game.xIsNext ? 'X' : 'O';
  nextBoard[index] = nextToken;

  const nextHistory = game.history.slice(0, game.stepIndex + 1).concat([nextBoard]);
  const nextResult = calculateResult(nextBoard);

  return {
    history: nextHistory,
    stepIndex: nextHistory.length - 1,
    xIsNext: !game.xIsNext,
    score: updateScore(game.score, nextResult),
  };
}

export function jumpToMove(game, stepIndex) {
  return {
    ...game,
    stepIndex,
    xIsNext: stepIndex % 2 === 0,
  };
}

export function resetBoard(game) {
  return {
    ...game,
    history: [createEmptyBoard()],
    stepIndex: 0,
    xIsNext: true,
  };
}

export function buildHistoryLabel(history, index) {
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

function updateScore(score, result) {
  if (result.winner) {
    return {
      ...score,
      [result.winner.toLowerCase()]: score[result.winner.toLowerCase()] + 1,
    };
  }

  if (result.isDraw) {
    return {
      ...score,
      draws: score.draws + 1,
    };
  }

  return score;
}
