import { describe, it, expect } from 'vitest';
import { createBoard, place, canPlaceAnywhere } from './board.js';
import { createRng, pickWeighted } from './random.js';
import {
  PIECE_VARIANTS,
  COLOR_COUNT,
  generateSet,
  hasAnyMove,
  normalize,
  pieceSize,
} from './pieces.js';

function variantsOf(family) {
  return PIECE_VARIANTS.filter((v) => v.family === family);
}

function fullBoardExcept(emptyCells) {
  let board = createBoard().map((line) => line.fill(1));
  for (const [r, c] of emptyCells) board[r][c] = null;
  return board;
}

describe('random', () => {
  it('одинаковое зерно даёт одинаковую последовательность', () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 5 }, a);
    const seqB = Array.from({ length: 5 }, b);
    expect(seqA).toEqual(seqB);
  });

  it('разные зёрна дают разные последовательности', () => {
    expect(createRng(1)()).not.toBe(createRng(2)());
  });

  it('значения в диапазоне [0, 1)', () => {
    const rng = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const x = rng();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });

  it('pickWeighted учитывает веса', () => {
    const rng = createRng(3);
    const items = [{ name: 'rare', weight: 1 }, { name: 'common', weight: 9 }];
    let common = 0;
    for (let i = 0; i < 2000; i++) {
      if (pickWeighted(rng, items).name === 'common') common++;
    }
    expect(common / 2000).toBeGreaterThan(0.85);
    expect(common / 2000).toBeLessThan(0.95);
  });
});

describe('PIECE_VARIANTS', () => {
  it('число поворотов у каждого семейства', () => {
    expect(variantsOf('dot')).toHaveLength(1);
    expect(variantsOf('square2')).toHaveLength(1);
    expect(variantsOf('square3')).toHaveLength(1);
    expect(variantsOf('line3')).toHaveLength(2);
    expect(variantsOf('rect2x3')).toHaveLength(2);
    expect(variantsOf('S')).toHaveLength(2);
    expect(variantsOf('Z')).toHaveLength(2);
    expect(variantsOf('corner3')).toHaveLength(4);
    expect(variantsOf('corner5')).toHaveLength(4);
    expect(variantsOf('L')).toHaveLength(4);
    expect(variantsOf('J')).toHaveLength(4);
    expect(variantsOf('T')).toHaveLength(4);
  });

  it('у всех вариантов уникальные id', () => {
    const ids = PIECE_VARIANTS.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('все формы нормализованы и различны', () => {
    const keys = PIECE_VARIANTS.map((v) => JSON.stringify(v.cells));
    expect(new Set(keys).size).toBe(keys.length);
    for (const v of PIECE_VARIANTS) {
      expect(v.cells).toEqual(normalize(v.cells));
    }
  });

  it('фигуры не больше 5×5 и помещаются на пустое поле', () => {
    for (const v of PIECE_VARIANTS) {
      const { rows, cols } = pieceSize(v.cells);
      expect(rows).toBeLessThanOrEqual(5);
      expect(cols).toBeLessThanOrEqual(5);
      expect(canPlaceAnywhere(createBoard(), v.cells)).toBe(true);
    }
  });

  it('вес семейства делится между поворотами', () => {
    const lWeight = variantsOf('L').reduce((sum, v) => sum + v.weight, 0);
    const squareWeight = variantsOf('square2')[0].weight;
    expect(lWeight).toBeCloseTo(squareWeight);
  });

  it('правильные клетки у поворотов буквы L', () => {
    const shapes = variantsOf('L').map((v) => JSON.stringify(v.cells));
    expect(shapes).toContain(JSON.stringify([[0, 0], [1, 0], [2, 0], [2, 1]]));
    expect(shapes).toContain(JSON.stringify([[0, 0], [0, 1], [0, 2], [1, 0]]));
  });
});

describe('generateSet', () => {
  it('выдаёт три фигуры с цветом', () => {
    const set = generateSet(createBoard(), createRng(1));
    expect(set).toHaveLength(3);
    for (const piece of set) {
      expect(piece.cells.length).toBeGreaterThan(0);
      expect(piece.color).toBeGreaterThanOrEqual(0);
      expect(piece.color).toBeLessThan(COLOR_COUNT);
    }
  });

  it('одинаковое зерно — одинаковый набор', () => {
    const a = generateSet(createBoard(), createRng(99)).map((p) => p.id);
    const b = generateSet(createBoard(), createRng(99)).map((p) => p.id);
    expect(a).toEqual(b);
  });

  it('встречаются разные семейства', () => {
    const rng = createRng(5);
    const families = new Set();
    for (let i = 0; i < 200; i++) {
      for (const piece of generateSet(createBoard(), rng)) families.add(piece.family);
    }
    expect(families.size).toBe(15);
  });

  it('мелкие частые фигуры выпадают чаще редких крупных', () => {
    const rng = createRng(11);
    const counts = {};
    for (let i = 0; i < 1000; i++) {
      for (const piece of generateSet(createBoard(), rng)) {
        counts[piece.family] = (counts[piece.family] ?? 0) + 1;
      }
    }
    expect(counts.square2).toBeGreaterThan(counts.square3 * 1.5);
    expect(counts.line3).toBeGreaterThan(counts.dot * 2);
  });

  it('на почти полном поле в наборе есть фигура, которая помещается', () => {
    // Свободна только одна клетка — встать может лишь точка.
    const board = fullBoardExcept([[4, 4]]);
    for (let seed = 0; seed < 50; seed++) {
      const set = generateSet(board, createRng(seed));
      expect(hasAnyMove(board, set)).toBe(true);
      expect(set.some((p) => p.family === 'dot')).toBe(true);
    }
  });

  it('свободна полоса 1×5 — в наборе есть подходящая линия или точка', () => {
    const board = fullBoardExcept([[7, 0], [7, 1], [7, 2], [7, 3], [7, 4]]);
    for (let seed = 0; seed < 50; seed++) {
      expect(hasAnyMove(board, generateSet(board, createRng(seed)))).toBe(true);
    }
  });

  it('на полностью занятом поле всё равно выдаёт три фигуры', () => {
    const board = fullBoardExcept([]);
    const set = generateSet(board, createRng(1));
    expect(set).toHaveLength(3);
    expect(hasAnyMove(board, set)).toBe(false);
  });
});

describe('hasAnyMove', () => {
  const dot = PIECE_VARIANTS.find((v) => v.family === 'dot');
  const square = PIECE_VARIANTS.find((v) => v.family === 'square2');

  it('все фигуры использованы — ходов нет', () => {
    expect(hasAnyMove(createBoard(), [null, null, null])).toBe(false);
  });

  it('пропускает использованные фигуры', () => {
    expect(hasAnyMove(createBoard(), [null, square, null])).toBe(true);
  });

  it('нет места для квадрата, но есть для точки', () => {
    const board = fullBoardExcept([[0, 0]]);
    expect(hasAnyMove(board, [square, null, null])).toBe(false);
    expect(hasAnyMove(board, [square, dot, null])).toBe(true);
  });

  it('после хода место может закончиться', () => {
    const board = place(fullBoardExcept([[0, 0]]), dot.cells, 0, 0, 1);
    expect(hasAnyMove(board, [dot])).toBe(false);
  });
});
