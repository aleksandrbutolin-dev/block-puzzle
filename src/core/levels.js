// Уровни «Приключения» — данные, без кода.
//
// rows: строки поля сверху вниз. '.' пусто, '#' блок, 'I' лёд (1 слой), 'J' лёд (2 слоя), 'G' кристалл.
// goals: сколько нужно набрать — score (очки), lines (линии), gems (кристаллы), ice (слоёв льда).
// moves: лимит ходов. stars: сколько ходов должно остаться для 2 и 3 звёзд.
// difficulty: 0–1, влияет на размер выпадающих фигур (как в «Классике» по очкам).

const E = '........';

export const LEVELS = [
  // ---------- Глава 1: Закат ----------
  { id: 1, chapter: 1, moves: 10, difficulty: 0, goals: { lines: 2 }, stars: [4, 6],
    rows: [E, E, E, E, E, E, E, '#####...'] },
  { id: 2, chapter: 1, moves: 12, difficulty: 0, goals: { lines: 3 }, stars: [4, 7],
    rows: [E, E, E, E, E, '###.....', '####....', '#####...'] },
  { id: 3, chapter: 1, moves: 12, difficulty: 0.1, goals: { score: 90 }, stars: [4, 6],
    rows: [E, E, E, E, E, E, '..####..', '..####..'] },
  { id: 4, chapter: 1, moves: 12, difficulty: 0.1, goals: { gems: 2 }, stars: [5, 7],
    rows: [E, E, E, E, E, E, '###G##..', '###G##..'] },
  { id: 5, chapter: 1, moves: 14, difficulty: 0.2, goals: { ice: 3 }, stars: [5, 8],
    rows: [E, E, E, E, E, E, '##I#I#..', '###I##..'] },
  { id: 6, chapter: 1, moves: 15, difficulty: 0.2, goals: { lines: 4, score: 150 }, stars: [4, 7],
    rows: [E, E, E, E, '##......', '###.....', '####....', '#####...'] },
  { id: 7, chapter: 1, moves: 15, difficulty: 0.3, goals: { gems: 4 }, stars: [5, 8],
    rows: [E, E, E, E, E, '#G#G##..', '###G##..', '##G###..'] },
  { id: 8, chapter: 1, moves: 16, difficulty: 0.3, goals: { ice: 6 }, stars: [5, 8],
    rows: [E, E, E, E, E, '#I#I##..', '#I#I##..', '##I#I#..'] },
  { id: 9, chapter: 1, moves: 16, difficulty: 0.4, goals: { score: 220 }, stars: [4, 7],
    rows: [E, E, E, E, '###.....', '####....', '#####...', '######..'] },
  { id: 10, chapter: 1, moves: 18, difficulty: 0.4, goals: { gems: 5, lines: 3 }, stars: [5, 8],
    rows: [E, E, E, E, '#G#G##..', '##G###..', '#G#G##..', '######..'] },
  { id: 11, chapter: 1, moves: 18, difficulty: 0.5, goals: { ice: 8 }, stars: [5, 8],
    rows: [E, E, E, E, E, '#J#J##..', '#J#J##..', '######..'] },
  { id: 12, chapter: 1, moves: 20, difficulty: 0.5, goals: { score: 300, gems: 3 }, stars: [5, 9],
    rows: [E, E, E, '##G###..', '######..', '#G####..', '######..', '###G##..'] },

  // ---------- Глава 2: Лес ----------
  { id: 13, chapter: 2, moves: 16, difficulty: 0.4, goals: { lines: 5 }, stars: [4, 7],
    rows: [E, E, E, E, '###.....', '####....', '#####...', '######..'] },
  { id: 14, chapter: 2, moves: 16, difficulty: 0.45, goals: { ice: 4, lines: 3 }, stars: [4, 7],
    rows: [E, E, E, E, E, '#I#I##..', '#I#I##..', '######..'] },
  { id: 15, chapter: 2, moves: 17, difficulty: 0.45, goals: { gems: 5 }, stars: [5, 8],
    rows: [E, E, E, E, '#G#G##..', '##G###..', '#G####..', '###G##..'] },
  { id: 16, chapter: 2, moves: 17, difficulty: 0.5, goals: { score: 170 }, stars: [4, 7],
    rows: [E, E, E, '##......', '###.....', '####....', '#####...', '######..'] },
  { id: 17, chapter: 2, moves: 18, difficulty: 0.5, goals: { ice: 8, lines: 4 }, stars: [5, 8],
    rows: [E, E, E, E, '#J#J##..', '#J#J##..', '######..', '######..'] },
  { id: 18, chapter: 2, moves: 18, difficulty: 0.55, goals: { gems: 4, score: 250 }, stars: [5, 8],
    rows: [E, E, E, E, '###G##..', '#G####..', '####G#..', '##G###..'] },
  { id: 19, chapter: 2, moves: 19, difficulty: 0.55, goals: { lines: 7 }, stars: [5, 9],
    rows: [E, E, E, '###.....', '####....', '#####...', '######..', '######..'] },
  { id: 20, chapter: 2, moves: 19, difficulty: 0.6, goals: { ice: 4, gems: 3 }, stars: [5, 9],
    rows: [E, E, E, E, '#I#I##..', '#I#I##..', '#G#G##..', '###G##..'] },
  { id: 21, chapter: 2, moves: 20, difficulty: 0.6, goals: { score: 300, lines: 5 }, stars: [5, 9],
    rows: [E, E, E, '##......', '####....', '#####...', '######..', '######..'] },

  // ---------- Глава 3: Ночь ----------
  { id: 22, chapter: 3, moves: 20, difficulty: 0.65, goals: { gems: 6 }, stars: [5, 9],
    rows: [E, E, E, '#G#G##..', '##G###..', '#G#G##..', '###G##..', '######..'] },
  { id: 23, chapter: 3, moves: 20, difficulty: 0.65, goals: { ice: 10 }, stars: [5, 9],
    rows: [E, E, E, '#J#J##..', '#J#J##..', '#I#I##..', '######..', '######..'] },
  { id: 24, chapter: 3, moves: 21, difficulty: 0.7, goals: { lines: 8, gems: 3 }, stars: [5, 9],
    rows: [E, E, E, '###G##..', '######..', '#G####..', '###G##..', '######..'] },
  { id: 25, chapter: 3, moves: 21, difficulty: 0.7, goals: { score: 320 }, stars: [5, 9],
    rows: [E, E, E, '###.....', '#####...', '######..', '######..', '######..'] },
  { id: 26, chapter: 3, moves: 22, difficulty: 0.75, goals: { ice: 8, gems: 4 }, stars: [6, 10],
    rows: [E, E, E, '#J#J##..', '#J#J##..', '#G#G##..', '#G#G##..', '######..'] },
  { id: 27, chapter: 3, moves: 22, difficulty: 0.8, goals: { lines: 10 }, stars: [6, 10],
    rows: [E, E, E, '###.....', '####....', '#####...', '######..', '######..'] },
  { id: 28, chapter: 3, moves: 23, difficulty: 0.8, goals: { gems: 6, score: 300 }, stars: [6, 10],
    rows: [E, E, E, '#G#G##..', '##G###..', '#G#G##..', '###G##..', '######..'] },
  { id: 29, chapter: 3, moves: 24, difficulty: 0.9, goals: { ice: 12 }, stars: [6, 10],
    rows: [E, E, E, '#J#J##..', '#J#J##..', '#J#J##..', '######..', '######..'] },
  { id: 30, chapter: 3, moves: 25, difficulty: 1, goals: { score: 450, gems: 5, lines: 8 }, stars: [6, 11],
    rows: [E, E, E, '#G#G##..', '######..', '##G###..', '#G#G##..', '######..'] },
];

export const LEVELS_TOTAL = LEVELS.length;

// Главы: заголовок на карте и награда за прохождение всех уровней главы.
export const CHAPTERS = [
  { id: 1, title: 'Закат', from: 1, to: 12, reward: { coins: 150 } },
  { id: 2, title: 'Лес', from: 13, to: 21, reward: { coins: 250 } },
  { id: 3, title: 'Ночь', from: 22, to: 30, reward: { coins: 400 } },
];

export function getChapter(id) {
  return CHAPTERS.find((chapter) => chapter.id === id) ?? null;
}

// Глава, которой принадлежит уровень.
export function chapterFor(levelId) {
  return CHAPTERS.find((chapter) => levelId >= chapter.from && levelId <= chapter.to) ?? CHAPTERS[0];
}

export function getLevel(id) {
  return LEVELS.find((level) => level.id === id) ?? null;
}

export function chapterOf(id) {
  return getLevel(id)?.chapter ?? 1;
}
