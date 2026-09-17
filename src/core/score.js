// Подсчёт очков. Без зависимостей от Phaser.
//
// - за каждую поставленную клетку — 1 очко;
// - за линии: 10 × линий × линий (комбо: 1 → 10, 2 → 40, 3 → 90);
// - серия: ходы с очисткой подряд умножают очки за линии (×1, ×1.5, ×2, …);
//   серия прерывается, если STREAK_GRACE ходов подряд ничего не очищено;
// - чистое поле после хода — бонус CLEAR_BOARD_BONUS.

export const POINTS_PER_CELL = 1;
export const POINTS_PER_LINE = 10;
export const STREAK_STEP = 0.5;
export const STREAK_GRACE = 3; // = размер набора: целый набор без очистки
export const CLEAR_BOARD_BONUS = 300;

export function createScoreState() {
  return { score: 0, streak: 0, movesWithoutClear: 0 };
}

export function streakMultiplier(streak) {
  return 1 + Math.max(0, streak - 1) * STREAK_STEP;
}

// Возвращает новое состояние и разбивку очков за ход (для всплывающих надписей).
export function scoreMove(state, { cellsPlaced, linesCleared, boardEmpty = false }) {
  const placePoints = cellsPlaced * POINTS_PER_CELL;

  let { streak, movesWithoutClear } = state;
  if (linesCleared > 0) {
    streak += 1;
    movesWithoutClear = 0;
  } else {
    movesWithoutClear += 1;
    if (movesWithoutClear >= STREAK_GRACE) streak = 0;
  }

  const multiplier = linesCleared > 0 ? streakMultiplier(streak) : 1;
  const linePoints = Math.round(POINTS_PER_LINE * linesCleared * linesCleared * multiplier);
  const bonusPoints = boardEmpty && linesCleared > 0 ? CLEAR_BOARD_BONUS : 0;
  const points = placePoints + linePoints + bonusPoints;

  return {
    state: { score: state.score + points, streak, movesWithoutClear },
    points,
    placePoints,
    linePoints,
    bonusPoints,
    combo: linesCleared,
    streak: linesCleared > 0 ? streak : 0,
    multiplier,
  };
}

// Отметки внутри бесконечной партии: каждые MILESTONE_STEP очков — праздник и награда.
export const MILESTONE_STEP = 1000;

// Отметки, пройденные при росте счёта с before до after: [1000, 2000, …].
export function milestonesCrossed(before, after, step = MILESTONE_STEP) {
  const result = [];
  for (let m = (Math.floor(before / step) + 1) * step; m <= after; m += step) result.push(m);
  return result;
}
