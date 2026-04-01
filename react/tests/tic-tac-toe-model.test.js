import {
  buildHistoryLabel,
  calculateResult,
  createInitialGameState,
  jumpToMove,
  playMove,
  resetBoard,
} from '../src/tic-tac-toe/model.js';

describe('tic-tac-toe model helpers', () => {
  it('creates a single root state object for the whole game', () => {
    const game = createInitialGameState();

    expect(game).toEqual({
      history: [Array(9).fill('')],
      stepIndex: 0,
      xIsNext: true,
      score: {
        x: 0,
        o: 0,
        draws: 0,
      },
    });
  });

  it('plays a move by returning the next root state snapshot', () => {
    const nextGame = playMove(createInitialGameState(), 0);

    expect(nextGame.history).toHaveLength(2);
    expect(nextGame.history[1][0]).toBe('X');
    expect(nextGame.stepIndex).toBe(1);
    expect(nextGame.xIsNext).toBe(false);
  });

  it('updates the score when a winning move is played', () => {
    let game = createInitialGameState();

    game = playMove(game, 0);
    game = playMove(game, 3);
    game = playMove(game, 1);
    game = playMove(game, 4);
    game = playMove(game, 2);

    expect(calculateResult(game.history[game.stepIndex]).winner).toBe('X');
    expect(game.score.x).toBe(1);
    expect(game.score.o).toBe(0);
    expect(game.score.draws).toBe(0);
  });

  it('supports time travel without losing the accumulated score', () => {
    let game = createInitialGameState();

    game = playMove(game, 0);
    game = playMove(game, 4);
    game = playMove(game, 1);
    game = jumpToMove(game, 1);

    expect(game.stepIndex).toBe(1);
    expect(game.xIsNext).toBe(false);
    expect(game.score).toEqual({ x: 0, o: 0, draws: 0 });
  });

  it('resets the board while preserving the score object', () => {
    let game = createInitialGameState();

    game = playMove(game, 0);
    game = playMove(game, 3);
    game = playMove(game, 1);
    game = playMove(game, 4);
    game = playMove(game, 2);
    game = resetBoard(game);

    expect(game.history).toEqual([Array(9).fill('')]);
    expect(game.stepIndex).toBe(0);
    expect(game.xIsNext).toBe(true);
    expect(game.score.x).toBe(1);
  });

  it('builds readable labels for move history buttons', () => {
    const first = Array(9).fill('');
    const second = [...first];
    second[4] = 'X';
    const history = [first, second];

    expect(buildHistoryLabel(history, 0)).toBe('Go to game start');
    expect(buildHistoryLabel(history, 1)).toBe('Go to move 1 (X on 5)');
  });
});
