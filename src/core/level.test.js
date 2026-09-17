import { describe, it, expect } from 'vitest';
import {
  createLevelState,
  applyLevelMove,
  levelStatus,
  hammerCell,
  goalsDone,
  starsFor,
} from './level.js';

const DOT = [[0, 0]];
const LINE_H2 = [[0, 0], [0, 1]];
const LINE_H5 = [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]];
const SQUARE_2 = [[0, 0], [0, 1], [1, 0], [1, 1]];
const EMPTY_ROWS = Array(8).fill('........');

// Уровень: строка 7 заполнена, кроме двух последних клеток.
function levelWithRow(row7, goals = { lines: 1 }, extra = {}) {
  return createLevelState({
    id: 1,
    moves: 5,
    rows: [...EMPTY_ROWS.slice(0, 7), row7],
    goals,
    stars: [2, 4],
    ...extra,
  });
}

const filled = (state) => state.board.flat().filter((v) => v !== null).length;

describe('createLevelState', () => {
  it('расставляет блоки, лёд и кристаллы', () => {
    const state = levelWithRow('#IJG....');
    expect(filled(state)).toBe(4);
    expect(state.ice[7][1]).toBe(1);
    expect(state.ice[7][2]).toBe(2);
    expect(state.gem[7][3]).toBe(true);
    expect(state.ice[7][0]).toBe(0);
    expect(state.movesLeft).toBe(5);
  });

  it('цели берутся из описания, порядок — как в GOAL_TYPES', () => {
    const state = levelWithRow('........', { gems: 3, score: 500 });
    expect(state.goals).toEqual([
      { type: 'score', target: 500, progress: 0 },
      { type: 'gems', target: 3, progress: 0 },
    ]);
  });
});

describe('applyLevelMove', () => {
  it('обычная линия очищается, ход тратится', () => {
    const state = levelWithRow('######..');
    const result = applyLevelMove(state, LINE_H2, 7, 6, 3, 12);
    expect(result.linesCleared).toBe(1);
    expect(filled(result.state)).toBe(0);
    expect(result.state.movesLeft).toBe(4);
    expect(result.state.score).toBe(12);
    expect(state.movesLeft).toBe(5); // исходное состояние не меняется
  });

  it('лёд в один слой: клетка освобождается, лёд засчитан', () => {
    const state = levelWithRow('#####I..', { ice: 1 });
    const result = applyLevelMove(state, LINE_H2, 7, 6, 3, 0);
    expect(result.iceBroken).toEqual([[7, 5]]);
    expect(result.state.ice[7][5]).toBe(0);
    expect(filled(result.state)).toBe(0);
    expect(result.state.goals[0].progress).toBe(1);
  });

  it('лёд в два слоя: первая очистка снимает слой, клетка остаётся', () => {
    const state = levelWithRow('#####J..', { ice: 2 });
    const first = applyLevelMove(state, LINE_H2, 7, 6, 3, 0);
    expect(first.state.ice[7][5]).toBe(1);
    expect(first.state.board[7][5]).not.toBeNull();
    expect(filled(first.state)).toBe(1);
    expect(first.cleared).not.toContainEqual([7, 5]);

    // Заполняем строку заново вокруг ледяной клетки — лёд сходит со второй очистки.
    const left = applyLevelMove(first.state, LINE_H5, 7, 0, 3, 0);
    const second = applyLevelMove(left.state, LINE_H2, 7, 6, 3, 0);
    expect(second.state.ice[7][5]).toBe(0);
    expect(filled(second.state)).toBe(0);
    expect(second.state.goals[0].progress).toBe(2);
  });

  it('кристалл собирается вместе с блоком', () => {
    const state = levelWithRow('#####G..', { gems: 1 });
    const result = applyLevelMove(state, LINE_H2, 7, 6, 3, 0);
    expect(result.gems).toEqual([[7, 5]]);
    expect(result.state.gem[7][5]).toBe(false);
    expect(result.state.goals[0].progress).toBe(1);
  });

  it('кристалл во льду собирается только когда лёд сошёл', () => {
    const state = createLevelState({
      moves: 9,
      rows: [...EMPTY_ROWS.slice(0, 7), '#####J..'],
      goals: { gems: 1 },
    });
    state.gem[7][5] = true;
    const first = applyLevelMove(state, LINE_H2, 7, 6, 3, 0);
    expect(first.gems).toHaveLength(0);
    expect(first.state.gem[7][5]).toBe(true);
    const left = applyLevelMove(first.state, LINE_H5, 7, 0, 3, 0);
    const second = applyLevelMove(left.state, LINE_H2, 7, 6, 3, 0);
    expect(second.gems).toEqual([[7, 5]]);
  });

  it('прогресс целей не превышает цель', () => {
    const state = levelWithRow('######..', { lines: 1, score: 10 });
    const result = applyLevelMove(state, LINE_H2, 7, 6, 3, 999);
    expect(result.state.goals.map((g) => g.progress)).toEqual([10, 1]);
  });

  it('без лимита ходов movesLeft остаётся null', () => {
    const state = levelWithRow('........', { lines: 1 }, { moves: null });
    expect(applyLevelMove(state, DOT, 0, 0, 1, 1).state.movesLeft).toBeNull();
  });
});

describe('levelStatus и звёзды', () => {
  it('цель выполнена — победа', () => {
    const state = levelWithRow('######..', { lines: 1 });
    const result = applyLevelMove(state, LINE_H2, 7, 6, 3, 0);
    expect(goalsDone(result.state)).toBe(true);
    expect(levelStatus(result.state)).toBe('won');
  });

  it('ходы кончились — поражение', () => {
    const state = levelWithRow('........', { lines: 5 }, { moves: 1 });
    const result = applyLevelMove(state, DOT, 0, 0, 1, 0);
    expect(result.state.movesLeft).toBe(0);
    expect(levelStatus(result.state)).toBe('lost');
  });

  it('некуда ставить — поражение', () => {
    const state = levelWithRow('........', { lines: 5 });
    expect(levelStatus(state, false)).toBe('lost');
    expect(levelStatus(state, true)).toBe('playing');
  });

  it('победа важнее исчерпанных ходов', () => {
    const state = levelWithRow('######..', { lines: 1 }, { moves: 1 });
    const result = applyLevelMove(state, LINE_H2, 7, 6, 3, 0);
    expect(levelStatus(result.state)).toBe('won');
  });

  it('звёзды по запасу ходов', () => {
    const play = (moves) => {
      const state = levelWithRow('######..', { lines: 1 }, { moves, stars: [2, 4] });
      return starsFor(applyLevelMove(state, LINE_H2, 7, 6, 3, 0).state);
    };
    expect(play(1)).toBe(1); // остался 0 ходов
    expect(play(3)).toBe(2); // осталось 2
    expect(play(6)).toBe(3); // осталось 5
  });

  it('без прохождения звёзд нет', () => {
    expect(starsFor(levelWithRow('........', { lines: 3 }))).toBe(0);
  });
});

describe('поле уровня совместимо с обычными фигурами', () => {
  it('квадрат нельзя поставить на занятые клетки', () => {
    const state = levelWithRow('##......');
    const result = () => applyLevelMove(state, SQUARE_2, 6, 0, 1, 0);
    expect(result).toThrow(); // place бросает ошибку на занятой клетке
  });
});

describe('hammerCell (молоток на уровне)', () => {
  it('убирает обычный блок', () => {
    const state = levelWithRow('##......');
    const result = hammerCell(state, 7, 0);
    expect(result.state.board[7][0]).toBeNull();
    expect(result.cleared).toEqual([[7, 0]]);
    expect(filled(state)).toBe(2); // исходное состояние не изменилось
  });

  it('по льду в два слоя: снимает слой, блок остаётся', () => {
    const state = levelWithRow('J#......', { ice: 2 });
    const first = hammerCell(state, 7, 0);
    expect(first.state.ice[7][0]).toBe(1);
    expect(first.state.board[7][0]).not.toBeNull();
    expect(first.state.goals[0].progress).toBe(1);

    const second = hammerCell(first.state, 7, 0);
    expect(second.state.ice[7][0]).toBe(0);
    expect(second.state.board[7][0]).toBeNull();
    expect(second.state.goals[0].progress).toBe(2);
  });

  it('кристалл засчитывается', () => {
    const state = levelWithRow('G#......', { gems: 1 });
    const result = hammerCell(state, 7, 0);
    expect(result.gems).toEqual([[7, 0]]);
    expect(result.state.goals[0].progress).toBe(1);
  });

  it('по пустой клетке ничего не делает', () => {
    const state = levelWithRow('##......');
    expect(hammerCell(state, 0, 0).state).toBe(state);
  });

  it('ход не тратится', () => {
    const state = levelWithRow('##......');
    expect(hammerCell(state, 7, 0).state.movesLeft).toBe(state.movesLeft);
  });
});
