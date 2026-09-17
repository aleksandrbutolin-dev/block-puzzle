import { describe, it, expect } from 'vitest';
import {
  createScoreState,
  scoreMove,
  streakMultiplier,
  milestonesCrossed,
  CLEAR_BOARD_BONUS,
} from './score.js';

function play(moves) {
  let state = createScoreState();
  const results = [];
  for (const move of moves) {
    const result = scoreMove(state, move);
    state = result.state;
    results.push(result);
  }
  return { state, results };
}

const place = (cellsPlaced) => ({ cellsPlaced, linesCleared: 0 });
const clear = (cellsPlaced, linesCleared, boardEmpty = false) => ({
  cellsPlaced,
  linesCleared,
  boardEmpty,
});

describe('scoreMove', () => {
  it('начальный счёт 0', () => {
    expect(createScoreState().score).toBe(0);
  });

  it('очко за каждую клетку', () => {
    const { state, results } = play([place(4)]);
    expect(results[0].points).toBe(4);
    expect(state.score).toBe(4);
  });

  it('одна линия — 10 очков', () => {
    const r = play([clear(3, 1)]).results[0];
    expect(r.linePoints).toBe(10);
    expect(r.points).toBe(13);
    expect(r.combo).toBe(1);
  });

  it('комбо растёт квадратично', () => {
    expect(play([clear(1, 2)]).results[0].linePoints).toBe(40);
    expect(play([clear(1, 3)]).results[0].linePoints).toBe(90);
    expect(play([clear(1, 4)]).results[0].linePoints).toBe(160);
  });

  it('счёт накапливается', () => {
    const { state } = play([place(4), clear(3, 1), place(2)]);
    expect(state.score).toBe(4 + 13 + 2);
  });
});

describe('серия', () => {
  it('множитель: ×1, ×1.5, ×2', () => {
    expect(streakMultiplier(0)).toBe(1);
    expect(streakMultiplier(1)).toBe(1);
    expect(streakMultiplier(2)).toBe(1.5);
    expect(streakMultiplier(3)).toBe(2);
  });

  it('очистка несколько ходов подряд увеличивает очки за линии', () => {
    const { results } = play([clear(1, 1), clear(1, 1), clear(1, 1)]);
    expect(results.map((r) => r.streak)).toEqual([1, 2, 3]);
    expect(results.map((r) => r.linePoints)).toEqual([10, 15, 20]);
  });

  it('один-два хода без очистки серию не прерывают', () => {
    const { results } = play([clear(1, 1), place(1), place(1), clear(1, 1)]);
    expect(results[3].streak).toBe(2);
    expect(results[3].linePoints).toBe(15);
  });

  it('три хода без очистки прерывают серию', () => {
    const { results } = play([clear(1, 1), place(1), place(1), place(1), clear(1, 1)]);
    expect(results[4].streak).toBe(1);
    expect(results[4].linePoints).toBe(10);
  });

  it('ход без очистки не получает множитель и показывает серию 0', () => {
    const { results } = play([clear(1, 1), clear(1, 1), place(4)]);
    expect(results[2].points).toBe(4);
    expect(results[2].streak).toBe(0);
  });

  it('серия и комбо вместе', () => {
    const { results } = play([clear(1, 1), clear(1, 2)]);
    expect(results[1].linePoints).toBe(60); // 40 × 1.5
  });
});

describe('чистое поле', () => {
  it('бонус, если после очистки поле пустое', () => {
    const r = play([clear(3, 1, true)]).results[0];
    expect(r.bonusPoints).toBe(CLEAR_BOARD_BONUS);
    expect(r.points).toBe(3 + 10 + CLEAR_BOARD_BONUS);
  });

  it('без очистки бонуса нет', () => {
    expect(play([{ cellsPlaced: 1, linesCleared: 0, boardEmpty: true }]).results[0].bonusPoints).toBe(0);
  });
});

describe('milestonesCrossed', () => {
  it('пересечение одной отметки', () => {
    expect(milestonesCrossed(950, 1010)).toEqual([1000]);
  });

  it('ровно на отметке — засчитывается один раз', () => {
    expect(milestonesCrossed(900, 1000)).toEqual([1000]);
    expect(milestonesCrossed(1000, 1050)).toEqual([]);
  });

  it('без пересечения и несколько сразу', () => {
    expect(milestonesCrossed(100, 900)).toEqual([]);
    expect(milestonesCrossed(1900, 4100)).toEqual([2000, 3000, 4000]);
  });

  it('свой шаг', () => {
    expect(milestonesCrossed(0, 250, 100)).toEqual([100, 200]);
  });
});
