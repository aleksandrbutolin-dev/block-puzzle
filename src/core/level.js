// Уровень режима «Приключение»: заготовка поля, препятствия, цели, ходы, звёзды.
// Без зависимостей от Phaser. Поле — то же, что в «Классике» (board.js),
// а препятствия лежат отдельными слоями поверх клеток.

import { BOARD_SIZE, createBoard, place, findFullLines } from './board.js';

// Символы в описании уровня.
// '.' пусто, '#' блок, 'I' блок во льду (1 слой), 'J' блок во льду (2 слоя), 'G' блок с кристаллом.
const CHARS = {
  '.': { filled: false },
  '#': { filled: true },
  I: { filled: true, ice: 1 },
  J: { filled: true, ice: 2 },
  G: { filled: true, gem: true },
};

export const GOAL_TYPES = ['score', 'gems', 'ice', 'lines'];

function grid(value) {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(value));
}

// Описание уровня (данные) → состояние партии.
export function createLevelState(def) {
  const board = createBoard();
  const ice = grid(0);
  const gem = grid(false);

  (def.rows ?? []).forEach((line, r) => {
    [...line].forEach((ch, c) => {
      const cell = CHARS[ch];
      if (!cell?.filled) return;
      board[r][c] = (r + c) % 7; // цвет блоков-заготовок
      if (cell.ice) ice[r][c] = cell.ice;
      if (cell.gem) gem[r][c] = true;
    });
  });

  const goals = GOAL_TYPES.filter((type) => def.goals?.[type] > 0).map((type) => ({
    type,
    target: def.goals[type],
    progress: 0,
  }));

  return {
    def,
    board,
    ice,
    gem,
    goals,
    movesLeft: def.moves,
    score: 0,
    finished: false,
  };
}

const clone = (state) => ({
  ...state,
  board: state.board.map((line) => line.slice()),
  ice: state.ice.map((line) => line.slice()),
  gem: state.gem.map((line) => line.slice()),
  goals: state.goals.map((goal) => ({ ...goal })),
});

function addProgress(state, type, amount) {
  if (amount <= 0) return;
  const goal = state.goals.find((g) => g.type === type);
  if (goal) goal.progress = Math.min(goal.target, goal.progress + amount);
}

export function goalsDone(state) {
  return state.goals.every((goal) => goal.progress >= goal.target);
}

// Ход в уровне: фигура ставится, заполненные линии очищаются.
// Лёд не исчезает сразу: каждая очистка снимает один слой, и только потом клетка освобождается.
export function applyLevelMove(state, cells, row, col, color, points = 0) {
  const next = clone(state);
  next.board = place(next.board, cells, row, col, color);

  const lines = findFullLines(next.board);
  const cleared = [];
  const iceBroken = [];
  const gems = [];

  const touched = new Map();
  for (const r of lines.rows) {
    for (let c = 0; c < BOARD_SIZE; c++) touched.set(r * BOARD_SIZE + c, [r, c]);
  }
  for (const c of lines.cols) {
    for (let r = 0; r < BOARD_SIZE; r++) touched.set(r * BOARD_SIZE + c, [r, c]);
  }

  for (const [r, c] of touched.values()) {
    if (next.ice[r][c] > 0) {
      next.ice[r][c] -= 1;
      iceBroken.push([r, c]);
      if (next.ice[r][c] > 0) continue; // остался ещё слой — клетка не освобождается
    }
    if (next.gem[r][c]) {
      next.gem[r][c] = false;
      gems.push([r, c]);
    }
    next.board[r][c] = null;
    cleared.push([r, c]);
  }

  const linesCleared = lines.rows.length + lines.cols.length;
  next.score += points;
  next.movesLeft = next.movesLeft === null ? null : next.movesLeft - 1;

  addProgress(next, 'score', points);
  addProgress(next, 'lines', linesCleared);
  addProgress(next, 'gems', gems.length);
  addProgress(next, 'ice', iceBroken.length);

  return { state: next, lines, linesCleared, cleared, iceBroken, gems };
}

// Молоток на уровне: со льдом снимает слой, иначе убирает блок (кристалл засчитывается).
export function hammerCell(state, row, col) {
  if (state.board[row][col] === null) return { state, iceBroken: [], gems: [], cleared: [] };
  const next = clone(state);
  const iceBroken = [];
  const gems = [];
  const cleared = [];

  if (next.ice[row][col] > 0) {
    next.ice[row][col] -= 1;
    iceBroken.push([row, col]);
  }
  if (next.ice[row][col] === 0) {
    if (next.gem[row][col]) {
      next.gem[row][col] = false;
      gems.push([row, col]);
    }
    next.board[row][col] = null;
    cleared.push([row, col]);
  }

  addProgress(next, 'gems', gems.length);
  addProgress(next, 'ice', iceBroken.length);
  return { state: next, iceBroken, gems, cleared };
}

// 'playing' | 'won' | 'lost'. hasMoves — можно ли поставить хоть одну фигуру из лотка.
export function levelStatus(state, hasMoves = true) {
  if (goalsDone(state)) return 'won';
  if (state.movesLeft !== null && state.movesLeft <= 0) return 'lost';
  if (!hasMoves) return 'lost';
  return 'playing';
}

// Звёзды: 1 — за прохождение, 2 и 3 — за запас ходов (def.stars = [для 2, для 3]).
export function starsFor(state) {
  if (!goalsDone(state)) return 0;
  const [two = 0, three = 0] = state.def.stars ?? [];
  const left = state.movesLeft ?? 0;
  if (left >= three) return 3;
  if (left >= two) return 2;
  return 1;
}
