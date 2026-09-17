// Логика игрового поля. Без зависимостей от Phaser.
//
// Поле — массив строк: board[row][col]. Пустая клетка — null,
// занятая — значение цвета (любое, кроме null), например 3 или 'red'.
// Фигура — массив смещений клеток [[row, col], ...] относительно её
// левого верхнего угла. Все функции возвращают новое поле и не меняют исходное.

export const BOARD_SIZE = 8;

export function createBoard(size = BOARD_SIZE) {
  return Array.from({ length: size }, () => Array(size).fill(null));
}

export function isInside(board, row, col) {
  return row >= 0 && row < board.length && col >= 0 && col < board[0].length;
}

// Можно ли поставить фигуру так, чтобы её точка [0, 0] оказалась в (row, col).
export function canPlace(board, cells, row, col) {
  return cells.every(([dr, dc]) => {
    const r = row + dr;
    const c = col + dc;
    return isInside(board, r, c) && board[r][c] === null;
  });
}

// Есть ли на поле хоть одно место для фигуры.
export function canPlaceAnywhere(board, cells) {
  for (let row = 0; row < board.length; row++) {
    for (let col = 0; col < board[0].length; col++) {
      if (canPlace(board, cells, row, col)) return true;
    }
  }
  return false;
}

export function place(board, cells, row, col, color) {
  if (!canPlace(board, cells, row, col)) {
    throw new Error(`Фигуру нельзя поставить в (${row}, ${col})`);
  }
  const next = board.map((line) => line.slice());
  for (const [dr, dc] of cells) {
    next[row + dr][col + dc] = color;
  }
  return next;
}

// Индексы полностью заполненных строк и столбцов.
export function findFullLines(board) {
  const rows = [];
  const cols = [];
  for (let r = 0; r < board.length; r++) {
    if (board[r].every((cell) => cell !== null)) rows.push(r);
  }
  for (let c = 0; c < board[0].length; c++) {
    if (board.every((line) => line[c] !== null)) cols.push(c);
  }
  return { rows, cols };
}

export function clearLines(board, { rows, cols }) {
  const next = board.map((line) => line.slice());
  for (const r of rows) next[r].fill(null);
  for (const c of cols) {
    for (const line of next) line[c] = null;
  }
  return next;
}

// Полный ход: поставить фигуру и очистить заполненные линии.
// Возвращает новое поле и сведения для подсчёта очков и анимации.
export function applyMove(board, cells, row, col, color) {
  const placed = place(board, cells, row, col, color);
  const lines = findFullLines(placed);
  return {
    board: clearLines(placed, lines),
    lines,
    linesCleared: lines.rows.length + lines.cols.length,
    cellsPlaced: cells.length,
  };
}
