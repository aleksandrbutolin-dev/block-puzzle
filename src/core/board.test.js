import { describe, it, expect } from 'vitest';
import {
  BOARD_SIZE,
  createBoard,
  canPlace,
  canPlaceAnywhere,
  place,
  findFullLines,
  clearLines,
  applyMove,
} from './board.js';

const DOT = [[0, 0]];
const SQUARE_2 = [[0, 0], [0, 1], [1, 0], [1, 1]];
const LINE_H3 = [[0, 0], [0, 1], [0, 2]];
const LINE_H8 = Array.from({ length: 8 }, (_, i) => [0, i]);
const LINE_V8 = Array.from({ length: 8 }, (_, i) => [i, 0]);

// Поле из строк вида '#.......': '#' — занято, '.' — пусто.
function fromRows(rows) {
  return rows.map((line) => [...line].map((ch) => (ch === '#' ? 1 : null)));
}

function toRows(board) {
  return board.map((line) => line.map((cell) => (cell === null ? '.' : '#')).join(''));
}

function filledCount(board) {
  return board.flat().filter((cell) => cell !== null).length;
}

describe('createBoard', () => {
  it('создаёт пустое поле 8×8', () => {
    const board = createBoard();
    expect(board).toHaveLength(BOARD_SIZE);
    expect(board.every((line) => line.length === BOARD_SIZE)).toBe(true);
    expect(filledCount(board)).toBe(0);
  });

  it('строки — разные массивы', () => {
    const board = createBoard();
    board[0][0] = 1;
    expect(board[1][0]).toBeNull();
  });
});

describe('canPlace', () => {
  it('разрешает фигуру на пустом поле', () => {
    expect(canPlace(createBoard(), SQUARE_2, 0, 0)).toBe(true);
    expect(canPlace(createBoard(), SQUARE_2, 6, 6)).toBe(true);
  });

  it('запрещает выход за правый и нижний край', () => {
    expect(canPlace(createBoard(), SQUARE_2, 0, 7)).toBe(false);
    expect(canPlace(createBoard(), SQUARE_2, 7, 0)).toBe(false);
  });

  it('запрещает отрицательные координаты', () => {
    expect(canPlace(createBoard(), DOT, -1, 0)).toBe(false);
    expect(canPlace(createBoard(), DOT, 0, -1)).toBe(false);
  });

  it('запрещает наложение на занятую клетку', () => {
    const board = place(createBoard(), DOT, 1, 1, 1);
    expect(canPlace(board, SQUARE_2, 0, 0)).toBe(false);
    expect(canPlace(board, SQUARE_2, 2, 2)).toBe(true);
  });
});

describe('place', () => {
  it('заполняет клетки цветом и не меняет исходное поле', () => {
    const board = createBoard();
    const next = place(board, LINE_H3, 2, 3, 'red');
    expect(next[2].slice(3, 6)).toEqual(['red', 'red', 'red']);
    expect(filledCount(next)).toBe(3);
    expect(filledCount(board)).toBe(0);
  });

  it('бросает ошибку при недопустимом ходе', () => {
    expect(() => place(createBoard(), LINE_H3, 0, 6, 1)).toThrow();
  });
});

describe('findFullLines', () => {
  it('на пустом поле линий нет', () => {
    expect(findFullLines(createBoard())).toEqual({ rows: [], cols: [] });
  });

  it('находит заполненную строку и столбец', () => {
    const board = fromRows([
      '#.......',
      '########',
      '#.......',
      '#.......',
      '#.......',
      '#.......',
      '#.......',
      '#.......',
    ]);
    expect(findFullLines(board)).toEqual({ rows: [1], cols: [0] });
  });

  it('почти полная строка не считается', () => {
    const board = fromRows(['#######.', ...Array(7).fill('........')]);
    expect(findFullLines(board)).toEqual({ rows: [], cols: [] });
  });
});

describe('clearLines', () => {
  it('очищает строку и столбец, общая клетка не мешает', () => {
    const board = fromRows([
      '#.......',
      '########',
      '#......#',
      '#.......',
      '#.......',
      '#.......',
      '#.......',
      '#.......',
    ]);
    const next = clearLines(board, { rows: [1], cols: [0] });
    expect(toRows(next)).toEqual([
      '........',
      '........',
      '.......#',
      '........',
      '........',
      '........',
      '........',
      '........',
    ]);
    expect(filledCount(board)).toBe(16); // исходное поле не изменилось
  });
});

describe('applyMove', () => {
  it('ход без очистки', () => {
    const result = applyMove(createBoard(), SQUARE_2, 0, 0, 1);
    expect(result.linesCleared).toBe(0);
    expect(result.cellsPlaced).toBe(4);
    expect(filledCount(result.board)).toBe(4);
  });

  it('фигура дополняет строку — строка очищается', () => {
    const board = fromRows(['#####...', ...Array(7).fill('........')]);
    const result = applyMove(board, LINE_H3, 0, 5, 1);
    expect(result.lines).toEqual({ rows: [0], cols: [] });
    expect(result.linesCleared).toBe(1);
    expect(filledCount(result.board)).toBe(0);
  });

  it('комбо: одна фигура закрывает две строки сразу', () => {
    const board = fromRows([
      '######..',
      '######..',
      ...Array(6).fill('........'),
    ]);
    const result = applyMove(board, SQUARE_2, 0, 6, 1);
    expect(result.lines).toEqual({ rows: [0, 1], cols: [] });
    expect(result.linesCleared).toBe(2);
    expect(filledCount(result.board)).toBe(0);
  });

  it('крест: одна клетка закрывает строку и столбец', () => {
    const board = fromRows([
      '...#....',
      '...#....',
      '...#....',
      '###.####',
      '...#....',
      '...#....',
      '...#....',
      '...#....',
    ]);
    const result = applyMove(board, DOT, 3, 3, 1);
    expect(result.lines).toEqual({ rows: [3], cols: [3] });
    expect(result.linesCleared).toBe(2);
    expect(filledCount(result.board)).toBe(0);
  });

  it('линия 8 клеток на пустом поле сразу очищается', () => {
    expect(applyMove(createBoard(), LINE_H8, 4, 0, 1).linesCleared).toBe(1);
    expect(applyMove(createBoard(), LINE_V8, 0, 4, 1).linesCleared).toBe(1);
  });
});

describe('canPlaceAnywhere', () => {
  it('на пустом поле место есть', () => {
    expect(canPlaceAnywhere(createBoard(), SQUARE_2)).toBe(true);
  });

  it('квадрату 2×2 некуда встать на шахматном поле, точке — есть', () => {
    const board = fromRows(
      Array.from({ length: 8 }, (_, r) => (r % 2 ? '.#.#.#.#' : '#.#.#.#.')),
    );
    expect(canPlaceAnywhere(board, SQUARE_2)).toBe(false);
    expect(canPlaceAnywhere(board, DOT)).toBe(true);
  });

  it('на полностью занятом поле места нет', () => {
    const board = fromRows(Array(8).fill('########'));
    expect(canPlaceAnywhere(board, DOT)).toBe(false);
  });
});
