// Текущий прогресс игрока: загрузка, сохранение, вход дня.
// На этапе 5 сюда добавятся облачные сохранения Яндекс Игр.

import { loadValue, saveValue } from '../platform/storage.js';
import { migrateProgress, checkIn } from './progress.js';

const KEY = 'progress';
let current = null;
let lastCheckIn = { reward: 0, streakDay: 0, lostStreak: 0 };

export function getProgress() {
  if (!current) {
    // 'best' — рекорд из версии до мета-прогрессии.
    current = migrateProgress(loadValue(KEY, null), loadValue('best', 0));
  }
  return current;
}

export function setProgress(next) {
  if (next !== current) {
    current = next;
    saveValue(KEY, next);
  }
  return current;
}

// Вызывается при запуске: новый день → задания и награда за серию.
export function checkInToday(now = new Date()) {
  const result = checkIn(getProgress(), now);
  setProgress(result.progress);
  lastCheckIn = { reward: result.reward, streakDay: result.streakDay, lostStreak: result.lostStreak };
  return lastCheckIn;
}

// Награда за вход, которую ещё не показали игроку (для окна в меню).
export function takeCheckInReward() {
  const result = lastCheckIn;
  lastCheckIn = { reward: 0, streakDay: result.streakDay, lostStreak: 0 };
  return result;
}
