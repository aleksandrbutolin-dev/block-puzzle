// Лидерборд «Классики»: лучший результат среди всех игроков.
// Пока — заглушка: число хранится локально, чтобы показать интерфейс.
// На этапе 5 здесь будет лидерборд Яндекс Игр (ysdk.leaderboards), интерфейс не меняется.

import { loadValue, saveValue } from './storage.js';

const KEY = 'world-record';
// Стартовое значение заглушки — до подключения SDK «мир» это этот ориентир.
const STUB_RECORD = { score: 2500, name: 'Игрок' };

// Лучший результат в мире: { score, name }.
export async function getWorldRecord() {
  return loadValue(KEY, STUB_RECORD);
}

// Отправить свой результат. Заглушка запоминает его как мировой, если он выше.
export async function submitScore(score) {
  const record = await getWorldRecord();
  if (score > record.score) saveValue(KEY, { score, name: 'Ты' });
}
