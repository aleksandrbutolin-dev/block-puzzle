// Мета-прогрессия: монеты, серия входов, ежедневные задания, темы, рекорд.
// Чистые функции без Phaser и без хранилища: принимают состояние, возвращают новое.

import { createRng, randomInt } from '../core/random.js';

export const SAVE_VERSION = 1;

// ---------- Экономика ----------

export const POINTS_PER_COIN = 100; // монета за каждые 100 очков партии
export const STREAK_REWARDS = [10, 15, 20, 25, 30, 40, 100]; // дни 1–7, дальше по кругу

export const SKINS = [
  { id: 'toys', price: 0 },
  { id: 'crystals', price: 500 },
];

// Шаблоны заданий. metric — какой счётчик растёт; mode: sum — копится за день, max — лучший результат.
export const TASK_TYPES = {
  lines: { metric: 'lines', mode: 'sum', options: [[10, 30], [15, 40], [20, 50]] },
  pieces: { metric: 'pieces', mode: 'sum', options: [[30, 20], [50, 30]] },
  games: { metric: 'games', mode: 'sum', options: [[2, 20], [3, 30]] },
  combo: { metric: 'combo', mode: 'max', options: [[2, 30], [3, 50]] },
  streak: { metric: 'streak', mode: 'max', options: [[3, 30], [4, 40]] },
  score: { metric: 'score', mode: 'max', options: [[300, 20], [500, 35], [800, 50]] },
  clearBoard: { metric: 'clearBoards', mode: 'sum', options: [[1, 50]] },
};
export const TASKS_PER_DAY = 3;

// ---------- Состояние ----------

export function createProgress() {
  return {
    version: SAVE_VERSION,
    coins: 0,
    best: 0,
    streak: { count: 0, lastDay: null },
    daily: { day: null, tasks: [] },
    skins: { owned: ['toys'], selected: 'toys' },
    stats: { games: 0, lines: 0, pieces: 0, quickLosses: 0 },
  };
}

// Сохранение из хранилища → корректное состояние (недостающие поля — по умолчанию).
export function migrateProgress(saved, legacyBest = 0) {
  const base = createProgress();
  if (!saved || typeof saved !== 'object') {
    return { ...base, best: legacyBest };
  }
  return {
    ...base,
    ...saved,
    version: SAVE_VERSION,
    best: Math.max(saved.best ?? 0, legacyBest),
    streak: { ...base.streak, ...saved.streak },
    daily: { ...base.daily, ...saved.daily },
    skins: { ...base.skins, ...saved.skins },
    stats: { ...base.stats, ...saved.stats },
  };
}

const clone = (value) => JSON.parse(JSON.stringify(value));

// ---------- Дни ----------

// Локальная дата 'YYYY-MM-DD': новый день у игрока — в его полночь.
export function dayKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function daysBetween(fromKey, toKey) {
  const toUtc = (key) => {
    const [y, m, d] = key.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtc(toKey) - toUtc(fromKey)) / 86400000);
}

function hashString(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// ---------- Задания ----------

// Одинаковые задания у всех игроков в один день: зерно — дата.
export function generateDailyTasks(day) {
  const rng = createRng(hashString(day));
  const types = Object.keys(TASK_TYPES);
  const tasks = [];
  while (tasks.length < TASKS_PER_DAY) {
    const type = types.splice(randomInt(rng, types.length), 1)[0];
    const options = TASK_TYPES[type].options;
    const [target, reward] = options[randomInt(rng, options.length)];
    tasks.push({ id: `${day}:${type}`, type, target, reward, progress: 0, claimed: false });
  }
  return tasks;
}

export function isTaskDone(task) {
  return task.progress >= task.target;
}

// Начало сессии: новый день → новые задания, серия входа и награда за неё.
export function checkIn(progress, now = new Date()) {
  const next = clone(progress);
  const today = dayKey(now);

  if (next.daily.day !== today) {
    next.daily = { day: today, tasks: generateDailyTasks(today) };
  }

  const { lastDay } = next.streak;
  if (lastDay === today) return { progress: next, reward: 0, streakDay: next.streak.count };

  const gap = lastDay ? daysBetween(lastDay, today) : Infinity;
  next.streak.count = gap === 1 ? next.streak.count + 1 : 1;
  next.streak.lastDay = today;
  const reward = STREAK_REWARDS[(next.streak.count - 1) % STREAK_REWARDS.length];
  next.coins += reward;
  return { progress: next, reward, streakDay: next.streak.count };
}

function applyMetrics(next, values) {
  const completed = [];
  for (const task of next.daily.tasks) {
    const { metric, mode } = TASK_TYPES[task.type];
    const value = values[metric];
    if (value === undefined || isTaskDone(task)) continue;
    task.progress = mode === 'sum' ? task.progress + value : Math.max(task.progress, value);
    task.progress = Math.min(task.progress, task.target);
    if (isTaskDone(task)) completed.push(task);
  }
  return completed;
}

// Ход в партии. Возвращает задания, выполненные этим ходом.
export function recordMove(progress, { linesCleared = 0, streak = 0, boardEmpty = false }) {
  const next = clone(progress);
  next.stats.pieces += 1;
  next.stats.lines += linesCleared;
  const completed = applyMetrics(next, {
    pieces: 1,
    lines: linesCleared,
    combo: linesCleared,
    streak,
    clearBoards: boardEmpty && linesCleared > 0 ? 1 : 0,
  });
  return { progress: next, completed };
}

export function coinsForScore(score) {
  return Math.floor(score / POINTS_PER_COIN);
}

// Партия короче стольких ходов — «быстрый проигрыш».
export const QUICK_LOSS_MOVES = 20;
// После стольких быстрых проигрышей подряд игра помогает.
export const ASSIST_AFTER = 2;

export function needsAssist(progress) {
  return (progress.stats.quickLosses ?? 0) >= ASSIST_AFTER;
}

// Конец партии: монеты за очки, рекорд, счётчик партий, счётчик быстрых проигрышей.
export function recordGameEnd(progress, { score, moves = Infinity }) {
  const next = clone(progress);
  next.stats.quickLosses = moves < QUICK_LOSS_MOVES ? (next.stats.quickLosses ?? 0) + 1 : 0;
  const coins = coinsForScore(score);
  const isNewBest = score > next.best;
  next.coins += coins;
  next.best = Math.max(next.best, score);
  next.stats.games += 1;
  const completed = applyMetrics(next, { games: 1, score });
  return { progress: next, coins, isNewBest, completed };
}

// Рекорд во время партии — чтобы не потерять его при закрытии вкладки.
export function updateBest(progress, score) {
  if (score <= progress.best) return progress;
  return { ...progress, best: score };
}

export function claimTask(progress, taskId) {
  const next = clone(progress);
  const task = next.daily.tasks.find((t) => t.id === taskId);
  if (!task || task.claimed || !isTaskDone(task)) return { progress, reward: 0 };
  task.claimed = true;
  next.coins += task.reward;
  return { progress: next, reward: task.reward };
}

// ---------- Темы ----------

export function buySkin(progress, skinId) {
  const skin = SKINS.find((s) => s.id === skinId);
  if (!skin || progress.skins.owned.includes(skinId) || progress.coins < skin.price) {
    return { progress, ok: false };
  }
  const next = clone(progress);
  next.coins -= skin.price;
  next.skins.owned.push(skinId);
  next.skins.selected = skinId;
  return { progress: next, ok: true };
}

export function selectSkin(progress, skinId) {
  if (!progress.skins.owned.includes(skinId)) return progress;
  const next = clone(progress);
  next.skins.selected = skinId;
  return next;
}
