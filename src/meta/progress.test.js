import { describe, it, expect } from 'vitest';
import {
  SAVE_VERSION,
  STREAK_REWARDS,
  TASK_TYPES,
  TASKS_PER_DAY,
  createProgress,
  migrateProgress,
  dayKey,
  daysBetween,
  generateDailyTasks,
  checkIn,
  recordMove,
  recordGameEnd,
  updateBest,
  needsAssist,
  QUICK_LOSS_MOVES,
  claimTask,
  coinsForScore,
  addCoins,
  completeTutorial,
  levelStars,
  isLevelDone,
  isLevelUnlocked,
  currentLevel,
  totalStars,
  completeLevel,
  COINS_PER_STAR,
  buySkin,
  selectSkin,
} from './progress.js';

const day = (d, hour = 12) => new Date(2026, 8, d, hour); // сентябрь 2026, локальное время

// Прогресс с заданием нужного типа (задания дня случайны — подставляем своё).
function withTask(type, target, reward = 30) {
  const { progress } = checkIn(createProgress(), day(17));
  progress.daily.tasks = [{ id: `t:${type}`, type, target, reward, progress: 0, claimed: false }];
  return progress;
}

describe('дни', () => {
  it('dayKey — локальная дата', () => {
    expect(dayKey(day(7))).toBe('2026-09-07');
    expect(dayKey(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31');
  });

  it('daysBetween, в том числе через месяц и год', () => {
    expect(daysBetween('2026-09-17', '2026-09-18')).toBe(1);
    expect(daysBetween('2026-09-30', '2026-10-01')).toBe(1);
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1);
    expect(daysBetween('2026-09-17', '2026-09-20')).toBe(3);
  });
});

describe('migrateProgress', () => {
  it('пустое сохранение — новый прогресс', () => {
    const p = migrateProgress(null);
    expect(p).toEqual(createProgress());
    expect(p.version).toBe(SAVE_VERSION);
  });

  it('переносит старый рекорд из прежнего хранилища', () => {
    expect(migrateProgress(null, 345).best).toBe(345);
    expect(migrateProgress({ best: 500 }, 345).best).toBe(500);
  });

  it('дополняет недостающие поля и сохраняет существующие', () => {
    const p = migrateProgress({ coins: 77, skins: { owned: ['toys', 'crystals'] } });
    expect(p.coins).toBe(77);
    expect(p.skins.owned).toEqual(['toys', 'crystals']);
    expect(p.skins.selected).toBe('toys');
    expect(p.stats.games).toBe(0);
  });
});

describe('generateDailyTasks', () => {
  it('три разных задания', () => {
    const tasks = generateDailyTasks('2026-09-17');
    expect(tasks).toHaveLength(TASKS_PER_DAY);
    expect(new Set(tasks.map((t) => t.type)).size).toBe(TASKS_PER_DAY);
    for (const t of tasks) {
      expect(TASK_TYPES[t.type]).toBeDefined();
      expect(t.progress).toBe(0);
      expect(t.claimed).toBe(false);
    }
  });

  it('один день — одни задания, у разных дней — разные', () => {
    expect(generateDailyTasks('2026-09-17')).toEqual(generateDailyTasks('2026-09-17'));
    const week = ['17', '18', '19', '20', '21', '22', '23'].map((d) =>
      generateDailyTasks(`2026-09-${d}`).map((t) => t.type).join(),
    );
    expect(new Set(week).size).toBeGreaterThan(1);
  });
});

describe('checkIn', () => {
  it('первый вход: день 1, награда и задания', () => {
    const { progress, reward, streakDay } = checkIn(createProgress(), day(17));
    expect(streakDay).toBe(1);
    expect(reward).toBe(STREAK_REWARDS[0]);
    expect(progress.coins).toBe(STREAK_REWARDS[0]);
    expect(progress.daily.day).toBe('2026-09-17');
    expect(progress.daily.tasks).toHaveLength(TASKS_PER_DAY);
  });

  it('повторный вход в тот же день — без награды, задания не меняются', () => {
    const first = checkIn(createProgress(), day(17, 9)).progress;
    first.daily.tasks[0].progress = 5;
    const second = checkIn(first, day(17, 22));
    expect(second.reward).toBe(0);
    expect(second.progress.coins).toBe(first.coins);
    expect(second.progress.daily.tasks[0].progress).toBe(5);
  });

  it('вход на следующий день продлевает серию', () => {
    let p = createProgress();
    const rewards = [];
    for (let d = 17; d <= 24; d++) {
      const result = checkIn(p, day(d));
      p = result.progress;
      rewards.push(result.reward);
    }
    expect(p.streak.count).toBe(8);
    expect(rewards).toEqual([...STREAK_REWARDS, STREAK_REWARDS[0]]); // после 7-го дня — по кругу
  });

  it('пропуск дня сбрасывает серию', () => {
    let p = checkIn(createProgress(), day(17)).progress;
    p = checkIn(p, day(18)).progress;
    const result = checkIn(p, day(20));
    expect(result.streakDay).toBe(1);
    expect(result.reward).toBe(STREAK_REWARDS[0]);
  });

  it('новый день — новые задания, прогресс обнулён', () => {
    const first = checkIn(createProgress(), day(17)).progress;
    first.daily.tasks[0].progress = 3;
    const next = checkIn(first, day(18)).progress;
    expect(next.daily.day).toBe('2026-09-18');
    expect(next.daily.tasks.every((t) => t.progress === 0)).toBe(true);
  });

  it('не меняет исходный объект', () => {
    const p = createProgress();
    checkIn(p, day(17));
    expect(p).toEqual(createProgress());
  });
});

describe('recordMove', () => {
  it('задание на линии копится и выполняется', () => {
    let p = withTask('lines', 5);
    let result = recordMove(p, { linesCleared: 3 });
    expect(result.completed).toHaveLength(0);
    expect(result.progress.daily.tasks[0].progress).toBe(3);
    result = recordMove(result.progress, { linesCleared: 4 });
    expect(result.completed.map((t) => t.type)).toEqual(['lines']);
    expect(result.progress.daily.tasks[0].progress).toBe(5); // не больше цели
  });

  it('выполненное задание не сообщается повторно', () => {
    const p = recordMove(withTask('lines', 1), { linesCleared: 1 }).progress;
    expect(recordMove(p, { linesCleared: 2 }).completed).toHaveLength(0);
  });

  it('комбо — по лучшему ходу, а не сумме', () => {
    let p = withTask('combo', 3);
    p = recordMove(p, { linesCleared: 2 }).progress;
    p = recordMove(p, { linesCleared: 2 }).progress;
    expect(p.daily.tasks[0].progress).toBe(2);
    expect(recordMove(p, { linesCleared: 3 }).completed).toHaveLength(1);
  });

  it('серия и фигуры', () => {
    expect(recordMove(withTask('streak', 3), { linesCleared: 1, streak: 3 }).completed).toHaveLength(1);
    let p = withTask('pieces', 2);
    p = recordMove(p, {}).progress;
    expect(recordMove(p, {}).completed).toHaveLength(1);
    expect(p.stats.pieces).toBe(1);
  });

  it('чистое поле засчитывается только при очистке', () => {
    expect(recordMove(withTask('clearBoard', 1), { boardEmpty: true }).completed).toHaveLength(0);
    expect(
      recordMove(withTask('clearBoard', 1), { linesCleared: 2, boardEmpty: true }).completed,
    ).toHaveLength(1);
  });
});

describe('recordGameEnd', () => {
  it('монеты за очки, рекорд и счётчик партий', () => {
    const start = createProgress();
    const { progress, coins, isNewBest } = recordGameEnd(start, { score: 1234 });
    expect(coins).toBe(12);
    expect(coinsForScore(99)).toBe(0);
    expect(progress.coins).toBe(12);
    expect(progress.best).toBe(1234);
    expect(isNewBest).toBe(true);
    expect(progress.stats.games).toBe(1);
  });

  it('рекорд не уменьшается', () => {
    const p = { ...createProgress(), best: 900 };
    const { progress, isNewBest } = recordGameEnd(p, { score: 500 });
    expect(progress.best).toBe(900);
    expect(isNewBest).toBe(false);
  });

  it('задания «сыграй партии» и «набери очков»', () => {
    let p = withTask('games', 2);
    p = recordGameEnd(p, { score: 10 }).progress;
    expect(recordGameEnd(p, { score: 10 }).completed).toHaveLength(1);
    expect(recordGameEnd(withTask('score', 500), { score: 499 }).completed).toHaveLength(0);
    expect(recordGameEnd(withTask('score', 500), { score: 500 }).completed).toHaveLength(1);
  });

  it('updateBest во время партии', () => {
    const p = { ...createProgress(), best: 100 };
    expect(updateBest(p, 50)).toBe(p);
    expect(updateBest(p, 150).best).toBe(150);
  });
});

describe('claimTask', () => {
  it('награда только за выполненное и один раз', () => {
    let p = withTask('lines', 2, 40);
    const id = p.daily.tasks[0].id;
    expect(claimTask(p, id).reward).toBe(0); // не выполнено

    p = recordMove(p, { linesCleared: 2 }).progress;
    const coinsBefore = p.coins;
    const first = claimTask(p, id);
    expect(first.reward).toBe(40);
    expect(first.progress.coins).toBe(coinsBefore + 40);
    expect(first.progress.daily.tasks[0].claimed).toBe(true);

    const second = claimTask(first.progress, id);
    expect(second.reward).toBe(0);
    expect(second.progress.coins).toBe(first.progress.coins);
  });

  it('неизвестное задание', () => {
    const p = createProgress();
    expect(claimTask(p, 'нет такого').progress).toBe(p);
  });
});

describe('темы', () => {
  it('по умолчанию есть и выбрана «Игрушки»', () => {
    expect(createProgress().skins).toEqual({ owned: ['toys'], selected: 'toys' });
  });

  it('не хватает монет — покупки нет', () => {
    const p = { ...createProgress(), coins: 100 };
    const result = buySkin(p, 'crystals');
    expect(result.ok).toBe(false);
    expect(result.progress).toBe(p);
  });

  it('покупка списывает монеты и сразу выбирает тему', () => {
    const p = { ...createProgress(), coins: 650 };
    const { progress, ok } = buySkin(p, 'crystals');
    expect(ok).toBe(true);
    expect(progress.coins).toBe(150);
    expect(progress.skins).toEqual({ owned: ['toys', 'crystals'], selected: 'crystals' });
    expect(buySkin(progress, 'crystals').ok).toBe(false); // второй раз не купить
  });

  it('выбрать можно только купленную', () => {
    const p = createProgress();
    expect(selectSkin(p, 'crystals')).toBe(p);
    const bought = buySkin({ ...p, coins: 500 }, 'crystals').progress;
    expect(selectSkin(bought, 'toys').skins.selected).toBe('toys');
  });
});

describe('помощь после быстрых проигрышей', () => {
  const quick = { score: 50, moves: QUICK_LOSS_MOVES - 1 };
  const normal = { score: 900, moves: QUICK_LOSS_MOVES + 30 };

  it('два быстрых проигрыша подряд включают помощь', () => {
    let p = createProgress();
    expect(needsAssist(p)).toBe(false);
    p = recordGameEnd(p, quick).progress;
    expect(needsAssist(p)).toBe(false);
    p = recordGameEnd(p, quick).progress;
    expect(needsAssist(p)).toBe(true);
  });

  it('нормальная партия выключает помощь', () => {
    let p = createProgress();
    p = recordGameEnd(p, quick).progress;
    p = recordGameEnd(p, quick).progress;
    p = recordGameEnd(p, normal).progress;
    expect(needsAssist(p)).toBe(false);
    expect(p.stats.quickLosses).toBe(0);
  });

  it('старое сохранение без счётчика', () => {
    const p = migrateProgress({ stats: { games: 3 } });
    expect(p.stats.quickLosses).toBe(0);
    expect(needsAssist(p)).toBe(false);
  });

  it('без числа ходов партия не считается быстрой', () => {
    let p = createProgress();
    p = recordGameEnd(p, { score: 10 }).progress;
    p = recordGameEnd(p, { score: 10 }).progress;
    expect(needsAssist(p)).toBe(false);
  });
});

describe('addCoins', () => {
  it('добавляет монеты и не меняет исходный объект', () => {
    const p = { ...createProgress(), coins: 10 };
    expect(addCoins(p, 5).coins).toBe(15);
    expect(p.coins).toBe(10);
  });
});

describe('обучение', () => {
  it('новый игрок — обучение не пройдено', () => {
    expect(createProgress().tutorialDone).toBe(false);
    expect(migrateProgress(null).tutorialDone).toBe(false);
  });

  it('кто уже играл — обучение считается пройденным', () => {
    expect(migrateProgress({ stats: { games: 4 } }).tutorialDone).toBe(true);
    expect(migrateProgress(null, 300).tutorialDone).toBe(true);
    expect(migrateProgress({ stats: { games: 0 } }).tutorialDone).toBe(false);
  });

  it('сохранённый флаг главнее', () => {
    expect(migrateProgress({ tutorialDone: false, stats: { games: 4 } }).tutorialDone).toBe(false);
  });

  it('completeTutorial', () => {
    const p = createProgress();
    const done = completeTutorial(p);
    expect(done.tutorialDone).toBe(true);
    expect(p.tutorialDone).toBe(false);
    expect(completeTutorial(done)).toBe(done);
  });
});

describe('уровни «Приключения»', () => {
  it('в начале открыт только первый', () => {
    const p = createProgress();
    expect(isLevelUnlocked(p, 1)).toBe(true);
    expect(isLevelUnlocked(p, 2)).toBe(false);
    expect(currentLevel(p, 30)).toBe(1);
    expect(totalStars(p)).toBe(0);
  });

  it('прохождение открывает следующий и даёт монеты за звёзды', () => {
    const { progress, newStars, coins } = completeLevel(createProgress(), 1, 2);
    expect(newStars).toBe(2);
    expect(coins).toBe(2 * COINS_PER_STAR);
    expect(progress.coins).toBe(2 * COINS_PER_STAR);
    expect(levelStars(progress, 1)).toBe(2);
    expect(isLevelDone(progress, 1)).toBe(true);
    expect(isLevelUnlocked(progress, 2)).toBe(true);
    expect(currentLevel(progress, 30)).toBe(2);
  });

  it('повторное прохождение хуже — ничего не меняется', () => {
    const p = completeLevel(createProgress(), 1, 3).progress;
    const again = completeLevel(p, 1, 2);
    expect(again.progress).toBe(p);
    expect(again.coins).toBe(0);
    expect(levelStars(p, 1)).toBe(3);
  });

  it('улучшение результата — монеты только за новые звёзды', () => {
    const p = completeLevel(createProgress(), 1, 1).progress;
    const better = completeLevel(p, 1, 3);
    expect(better.newStars).toBe(2);
    expect(better.coins).toBe(2 * COINS_PER_STAR);
    expect(levelStars(better.progress, 1)).toBe(3);
  });

  it('всего звёзд и текущий уровень', () => {
    let p = createProgress();
    p = completeLevel(p, 1, 3).progress;
    p = completeLevel(p, 2, 1).progress;
    expect(totalStars(p)).toBe(4);
    expect(currentLevel(p, 30)).toBe(3);
  });

  it('все уровни пройдены — текущий последний', () => {
    let p = createProgress();
    for (let id = 1; id <= 3; id++) p = completeLevel(p, id, 3).progress;
    expect(currentLevel(p, 3)).toBe(3);
  });

  it('старое сохранение без уровней', () => {
    const p = migrateProgress({ coins: 10 });
    expect(p.levels.stars).toEqual({});
    expect(isLevelUnlocked(p, 1)).toBe(true);
  });
});
