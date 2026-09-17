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
  findDropTarget,
  densestArea,
  clearArea,
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

describe('findDropTarget', () => {
  it('ровно над клеткой — эта клетка', () => {
    expect(findDropTarget(createBoard(), SQUARE_2, 3, 4)).toEqual({ row: 3, col: 4 });
  });

  it('между клетками — ближайшая', () => {
    expect(findDropTarget(createBoard(), SQUARE_2, 3.2, 4.7)).toEqual({ row: 3, col: 5 });
  });

  it('держит текущее место на границе клеток', () => {
    const current = { row: 3, col: 4 };
    // Без удержания выбрали бы (3, 5), но фигура ушла от текущего места меньше чем на 0.75.
    expect(findDropTarget(createBoard(), SQUARE_2, 3.1, 4.6, current)).toBe(current);
    // Ушла дальше — место меняется.
    expect(findDropTarget(createBoard(), SQUARE_2, 3.1, 4.8, current)).toEqual({ row: 3, col: 5 });
  });

  it('текущее место стало недоступно — ищет заново', () => {
    const board = place(createBoard(), DOT, 3, 4, 1);
    expect(findDropTarget(board, SQUARE_2, 3.1, 4.4, { row: 3, col: 4 })).toEqual({ row: 3, col: 5 });
  });

  it('под пальцем занято — берёт свободное соседнее место', () => {
    const board = place(createBoard(), DOT, 3, 4, 1);
    expect(findDropTarget(board, DOT, 3.4, 4.3)).toEqual({ row: 4, col: 4 }); // (4,4) ближе, чем (3,5)
  });

  it('за краем поля — ближайшее допустимое внутри', () => {
    expect(findDropTarget(createBoard(), SQUARE_2, -0.4, 6.3)).toEqual({ row: 0, col: 6 });
  });

  it('далеко от поля или всё занято — null', () => {
    expect(findDropTarget(createBoard(), SQUARE_2, -3, 2)).toBeNull();
    expect(findDropTarget(fromRows(Array(8).fill('########')), DOT, 2.5, 2.5)).toBeNull();
  });
});

describe('densestArea / clearArea', () => {
  it('находит самый заполненный квадрат 4×4', () => {
    const board = fromRows([
      '........',
      '........',
      '........',
      '....####',
      '....####',
      '....###.',
      '....####',
      '#.......',
    ]);
    expect(densestArea(board, 4)).toEqual({ row: 3, col: 4, filled: 15 });
  });

  it('на пустом поле — левый верхний угол', () => {
    expect(densestArea(createBoard(), 4)).toEqual({ row: 0, col: 0, filled: 0 });
  });

  it('clearArea очищает квадрат и не трогает остальное', () => {
    const full = fromRows(Array(8).fill('########'));
    const next = clearArea(full, 2, 3, 4);
    expect(filledCount(next)).toBe(64 - 16);
    expect(next[2][3]).toBeNull();
    expect(next[5][6]).toBeNull();
    expect(next[1][3]).not.toBeNull();
    expect(next[2][7]).not.toBeNull();
    expect(filledCount(full)).toBe(64);
  });

  it('после очистки 4×4 на полном поле встаёт любая фигура до 4 клеток в ширину', () => {
    const full = fromRows(Array(8).fill('########'));
    const { row, col } = densestArea(full, 4);
    const next = clearArea(full, row, col, 4);
    expect(canPlaceAnywhere(next, SQUARE_2)).toBe(true);
    expect(canPlaceAnywhere(next, LINE_H3)).toBe(true);
  });
});
