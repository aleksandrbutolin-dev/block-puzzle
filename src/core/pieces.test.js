import { describe, it, expect } from 'vitest';
import { createBoard, place, canPlaceAnywhere } from './board.js';
import { createRng, pickWeighted } from './random.js';
import {
  PIECE_VARIANTS,
  COLOR_COUNT,
  generatePiece,
  refillPiece,
  difficultyForScore,
  sizeFactor,
  MAX_DIFFICULTY_SCORE,
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

describe('refillPiece', () => {
  const square = PIECE_VARIANTS.find((v) => v.family === 'square2');

  it('выдаёт фигуру с цветом', () => {
    const piece = refillPiece(createBoard(), [null, square, square], 0, createRng(1));
    expect(piece.cells.length).toBeGreaterThan(0);
    expect(piece.color).toBeLessThan(COLOR_COUNT);
  });

  it('если другие фигуры помещаются — без переброса', () => {
    for (let seed = 0; seed < 30; seed++) {
      const refilled = refillPiece(createBoard(), [null, square, square], 0, createRng(seed));
      expect(refilled.id).toBe(generatePiece(createRng(seed)).id);
    }
  });

  it('одинаковое зерно — одинаковая фигура', () => {
    const board = fullBoardExcept([[0, 0]]);
    const a = refillPiece(board, [square, null, square], 1, createRng(7));
    const b = refillPiece(board, [square, null, square], 1, createRng(7));
    expect(a).toEqual(b);
  });

  it('переброс повышает шанс спастись, но не гарантирует его', () => {
    // Свободен прямоугольник 1×3 — квадраты не встают, помещаются только мелкие фигуры.
    const board = fullBoardExcept([[7, 0], [7, 1], [7, 2]]);
    const pieces = [square, null, square];
    let savedWith = 0;
    let savedWithout = 0;
    for (let seed = 0; seed < 400; seed++) {
      const withMercy = refillPiece(board, pieces, 1, createRng(seed));
      const noMercy = refillPiece(board, pieces, 1, createRng(seed), { rerolls: 0 });
      if (hasAnyMove(board, [square, withMercy, square])) savedWith++;
      if (hasAnyMove(board, [square, noMercy, square])) savedWithout++;
    }
    expect(savedWith).toBeGreaterThan(savedWithout);
    expect(savedWith).toBeLessThan(400);
  });
});

describe('сложность', () => {
  it('difficultyForScore: от 0 до 1', () => {
    expect(difficultyForScore(0)).toBe(0);
    expect(difficultyForScore(MAX_DIFFICULTY_SCORE / 2)).toBe(0.5);
    expect(difficultyForScore(MAX_DIFFICULTY_SCORE * 3)).toBe(1);
    expect(difficultyForScore(-5)).toBe(0);
  });

  it('sizeFactor: без сложности все равны', () => {
    for (const n of [1, 2, 3, 5, 9]) expect(sizeFactor(n, 0)).toBe(1);
  });

  it('sizeFactor: на максимуме мелкие реже, крупные чаще, в пределах', () => {
    expect(sizeFactor(1, 1)).toBe(0.3);
    expect(sizeFactor(3, 1)).toBe(1);
    expect(sizeFactor(5, 1)).toBeCloseTo(2.2);
    expect(sizeFactor(9, 1)).toBe(2.5);
  });

  it('на высокой сложности мелких фигур (1–3 клетки) вдвое меньше, крупных (5+) — больше', () => {
    const shares = (difficulty) => {
      const rng = createRng(21);
      let small = 0;
      let big = 0;
      for (let i = 0; i < 5000; i++) {
        const n = generatePiece(rng, difficulty).cells.length;
        if (n <= 3) small++;
        if (n >= 5) big++;
      }
      return { small: small / 5000, big: big / 5000 };
    };
    const easy = shares(0);
    const hard = shares(1);
    expect(hard.small).toBeLessThan(easy.small * 0.65);
    expect(hard.big).toBeGreaterThan(easy.big * 1.4);
  });

  it('refillPiece учитывает сложность', () => {
    const board = createBoard();
    const square = PIECE_VARIANTS.find((v) => v.family === 'square2');
    let easyDots = 0;
    let hardDots = 0;
    for (let seed = 0; seed < 2000; seed++) {
      if (refillPiece(board, [null, square, square], 0, createRng(seed)).cells.length <= 2) easyDots++;
      if (refillPiece(board, [null, square, square], 0, createRng(seed), { difficulty: 1 }).cells.length <= 2) hardDots++;
    }
    expect(hardDots).toBeLessThan(easyDots * 0.6);
  });

  it('больше перебросов — чаще спасение', () => {
    const board = fullBoardExcept([[7, 0], [7, 1], [7, 2]]);
    const square = PIECE_VARIANTS.find((v) => v.family === 'square2');
    const saved = (rerolls) => {
      let n = 0;
      for (let seed = 0; seed < 400; seed++) {
        const p = refillPiece(board, [square, null, square], 1, createRng(seed), { rerolls });
        if (hasAnyMove(board, [square, p, square])) n++;
      }
      return n;
    };
    expect(saved(5)).toBeGreaterThan(saved(2));
  });
});
