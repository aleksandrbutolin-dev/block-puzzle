// Незаконченная партия «Классики»: закрыл вкладку — вернулся к тому же полю.
// Чистые функции проверки; чтение и запись — через storage.

import { BOARD_SIZE } from '../core/board.js';
import { loadValue, saveValue } from '../platform/storage.js';

const KEY = 'classic';
export const CLASSIC_SAVE_VERSION = 1;

// Состояние партии → запись для хранилища.
export function packClassicGame({ board, pieces, scoreState, moves, revived }) {
  return { version: CLASSIC_SAVE_VERSION, board, pieces, scoreState, moves, revived: Boolean(revived) };
}

// Запись из хранилища корректна? Бракованную (старую, повреждённую) не восстанавливаем.
export function isValidClassicSave(saved) {
  if (!saved || typeof saved !== 'object' || saved.version !== CLASSIC_SAVE_VERSION) return false;
  const { board, pieces, scoreState, moves } = saved;
  if (!Array.isArray(board) || board.length !== BOARD_SIZE) return false;
  if (!board.every((row) => Array.isArray(row) && row.length === BOARD_SIZE)) return false;
  if (!Array.isArray(pieces) || pieces.length !== 3) return false;
  if (!pieces.every((p) => p === null || (Array.isArray(p.cells) && Number.isInteger(p.color)))) return false;
  if (!scoreState || !Number.isFinite(scoreState.score)) return false;
  if (!Number.isInteger(moves) || moves < 1) return false;
  return true;
}

export function loadClassicGame() {
  const saved = loadValue(KEY, null);
  return isValidClassicSave(saved) ? saved : null;
}

export function saveClassicGame(state) {
  saveValue(KEY, packClassicGame(state));
}

export function clearClassicGame() {
  saveValue(KEY, null);
}
