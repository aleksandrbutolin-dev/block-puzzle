// Уровни «Приключения» — данные, без кода.
//
// rows: строки поля сверху вниз. '.' пусто, '#' блок, 'I' лёд (1 слой), 'J' лёд (2 слоя), 'G' кристалл.
// goals: сколько нужно набрать — score (очки), lines (линии), gems (кристаллы), ice (слоёв льда).
// moves: лимит ходов. stars: сколько ходов должно остаться для 2 и 3 звёзд.
// difficulty: 0–1, влияет на размер выпадающих фигур (как в «Классике» по очкам).

const E = '........';

export const LEVELS = [
  {
    id: 1,
    chapter: 1,
    moves: 10,
    difficulty: 0,
    goals: { lines: 2 },
    stars: [4, 6],
    rows: [E, E, E, E, E, E, E, '#####...'],
  },
  {
    id: 2,
    chapter: 1,
    moves: 12,
    difficulty: 0,
    goals: { lines: 3 },
    stars: [4, 7],
    rows: [E, E, E, E, E, '###.....', '####....', '#####...'],
  },
  {
    id: 3,
    chapter: 1,
    moves: 12,
    difficulty: 0.1,
    goals: { score: 300 },
    stars: [4, 6],
    rows: [E, E, E, E, E, E, '..####..', '..####..'],
  },
  {
    id: 4,
    chapter: 1,
    moves: 12,
    difficulty: 0.1,
    goals: { gems: 2 },
    stars: [5, 7],
    rows: [E, E, E, E, E, E, '#G###...', '###G##..'],
  },
  {
    id: 5,
    chapter: 1,
    moves: 14,
    difficulty: 0.2,
    goals: { ice: 3 },
    stars: [5, 8],
    rows: [E, E, E, E, E, '#I##....', '##I#....', '###I#...'],
  },
  {
    id: 6,
    chapter: 1,
    moves: 15,
    difficulty: 0.2,
    goals: { lines: 4, score: 200 },
    stars: [4, 7],
    rows: [E, E, E, E, '##......', '###.....', '####....', '#####...'],
  },
  {
    id: 7,
    chapter: 1,
    moves: 15,
    difficulty: 0.3,
    goals: { gems: 4 },
    stars: [5, 8],
    rows: [E, E, E, E, '..G#....', '.##G#...', '#G###...', '###G##..'],
  },
  {
    id: 8,
    chapter: 1,
    moves: 16,
    difficulty: 0.3,
    goals: { ice: 6 },
    stars: [5, 8],
    rows: [E, E, E, E, '#J#.....', '.#J#....', '..#J#...', '#####...'],
  },
  {
    id: 9,
    chapter: 1,
    moves: 16,
    difficulty: 0.4,
    goals: { score: 800 },
    stars: [4, 7],
    rows: [E, E, E, '###.....', '####....', '#####...', '######..', '#######.'],
  },
  {
    id: 10,
    chapter: 1,
    moves: 18,
    difficulty: 0.4,
    goals: { gems: 6, lines: 3 },
    stars: [5, 8],
    rows: [E, E, '..G.....', '.#G#....', '#GG##...', '##G###..', '###G###.', '########'],
  },
  {
    id: 11,
    chapter: 1,
    moves: 18,
    difficulty: 0.5,
    goals: { ice: 8 },
    stars: [5, 8],
    rows: [E, E, E, '#J#J....', '.#J#....', '#J#J#...', '..###...', '#####...'],
  },
  {
    id: 12,
    chapter: 1,
    moves: 20,
    difficulty: 0.5,
    goals: { score: 1200, gems: 3 },
    stars: [5, 9],
    rows: [E, E, '#G#.....', '##G#....', '###G#...', '#####...', '######..', '#######.'],
  },
];

export const LEVELS_TOTAL = LEVELS.length;

export function getLevel(id) {
  return LEVELS.find((level) => level.id === id) ?? null;
}

export function chapterOf(id) {
  return getLevel(id)?.chapter ?? 1;
}
