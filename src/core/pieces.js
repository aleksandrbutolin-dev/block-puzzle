// Фигуры и генератор наборов. Без зависимостей от Phaser.
//
// Семейство фигуры задаётся одной формой; все её повороты строятся автоматически.
// weight — насколько часто выпадает семейство (делится поровну между поворотами).

import { canPlaceAnywhere } from './board.js';
import { pickWeighted, randomInt } from './random.js';

export const PIECES_PER_SET = 3;
export const COLOR_COUNT = 7;

// Форма рисуется строками: '#' — клетка фигуры.
const FAMILIES = [
  { family: 'dot', weight: 2, shape: ['#'] },
  { family: 'line2', weight: 6, shape: ['##'] },
  { family: 'line3', weight: 8, shape: ['###'] },
  { family: 'line4', weight: 6, shape: ['####'] },
  { family: 'line5', weight: 4, shape: ['#####'] },
  { family: 'square2', weight: 8, shape: ['##', '##'] },
  { family: 'square3', weight: 3, shape: ['###', '###', '###'] },
  { family: 'rect2x3', weight: 4, shape: ['###', '###'] },
  { family: 'corner3', weight: 8, shape: ['#.', '##'] },
  { family: 'corner5', weight: 4, shape: ['#..', '#..', '###'] },
  { family: 'L', weight: 8, shape: ['#.', '#.', '##'] },
  { family: 'J', weight: 8, shape: ['.#', '.#', '##'] },
  { family: 'T', weight: 6, shape: ['###', '.#.'] },
  { family: 'S', weight: 5, shape: ['.##', '##.'] },
  { family: 'Z', weight: 5, shape: ['##.', '.##'] },
];

function parseShape(rows) {
  const cells = [];
  rows.forEach((line, r) => {
    [...line].forEach((ch, c) => {
      if (ch === '#') cells.push([r, c]);
    });
  });
  return cells;
}

// Сдвиг к (0, 0) и стабильный порядок клеток — чтобы сравнивать формы.
export function normalize(cells) {
  const minR = Math.min(...cells.map(([r]) => r));
  const minC = Math.min(...cells.map(([, c]) => c));
  return cells
    .map(([r, c]) => [r - minR, c - minC])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}

function rotate(cells) {
  return normalize(cells.map(([r, c]) => [c, -r]));
}

function uniqueRotations(cells) {
  const result = [];
  const seen = new Set();
  let current = normalize(cells);
  for (let i = 0; i < 4; i++) {
    const key = JSON.stringify(current);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(current);
    }
    current = rotate(current);
  }
  return result;
}

export function pieceSize(cells) {
  return {
    rows: Math.max(...cells.map(([r]) => r)) + 1,
    cols: Math.max(...cells.map(([, c]) => c)) + 1,
  };
}

// Все варианты фигур: { id, family, cells, weight }.
export const PIECE_VARIANTS = FAMILIES.flatMap(({ family, weight, shape }) => {
  const rotations = uniqueRotations(parseShape(shape));
  return rotations.map((cells, i) => ({
    id: `${family}-${i}`,
    family,
    cells,
    weight: weight / rotations.length,
  }));
});

function makePiece(rng, variant) {
  return {
    id: variant.id,
    family: variant.family,
    cells: variant.cells,
    color: randomInt(rng, COLOR_COUNT),
  };
}

const REROLL_ATTEMPTS = 10;

// Сколько раз перебросить новую фигуру, если ни одна из трёх не помещается.
// Больше — игра легче, меньше — сложнее. Полная гарантия сделала бы игру бесконечной.
export const MERCY_REROLLS = 2;

export function generatePiece(rng) {
  return makePiece(rng, pickWeighted(rng, PIECE_VARIANTS));
}

// Новая фигура на место использованной (pieces[slot] уже не учитывается).
export function refillPiece(board, pieces, slot, rng, rerolls = MERCY_REROLLS) {
  const withNew = (piece) => pieces.map((p, i) => (i === slot ? piece : p));
  let piece = generatePiece(rng);
  for (let i = 0; i < rerolls && !hasAnyMove(board, withNew(piece)); i++) {
    piece = generatePiece(rng);
  }
  return piece;
}

// Стартовый набор из трёх фигур. Старается, чтобы хотя бы одна помещалась на поле:
// несколько раз перебрасывает набор, затем подменяет одну фигуру на подходящую.
// Если на поле не помещается вообще ничего — возвращает обычный набор (конец игры).
export function generateSet(board, rng, count = PIECES_PER_SET) {
  const roll = () => Array.from({ length: count }, () => generatePiece(rng));

  let set = roll();
  for (let i = 0; i < REROLL_ATTEMPTS && !hasAnyMove(board, set); i++) {
    set = roll();
  }
  if (hasAnyMove(board, set)) return set;

  const fitting = PIECE_VARIANTS.filter((v) => canPlaceAnywhere(board, v.cells));
  if (fitting.length > 0) {
    set[randomInt(rng, count)] = makePiece(rng, pickWeighted(rng, fitting));
  }
  return set;
}

// Можно ли поставить хоть одну из оставшихся фигур. null — уже использованная фигура.
export function hasAnyMove(board, pieces) {
  return pieces.some((piece) => piece !== null && canPlaceAnywhere(board, piece.cells));
}
