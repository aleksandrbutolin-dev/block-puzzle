import { describe, it, expect } from 'vitest';
import { createBoard } from '../core/board.js';
import { packClassicGame, isValidClassicSave, CLASSIC_SAVE_VERSION } from './classicSave.js';

const piece = { id: 'o', family: 'o', cells: [[0, 0], [0, 1], [1, 0], [1, 1]], color: 2 };

function sample() {
  return packClassicGame({
    board: createBoard(),
    pieces: [piece, null, piece],
    scoreState: { score: 120, streak: 1, movesWithoutClear: 0 },
    moves: 5,
    revived: false,
  });
}

describe('сохранение партии «Классики»', () => {
  it('упакованная партия проходит проверку', () => {
    const saved = sample();
    expect(saved.version).toBe(CLASSIC_SAVE_VERSION);
    expect(isValidClassicSave(saved)).toBe(true);
  });

  it('пустая, чужая или повреждённая запись отклоняется', () => {
    expect(isValidClassicSave(null)).toBe(false);
    expect(isValidClassicSave({ ...sample(), version: 0 })).toBe(false);
    expect(isValidClassicSave({ ...sample(), board: [] })).toBe(false);
    expect(isValidClassicSave({ ...sample(), pieces: [piece] })).toBe(false);
    expect(isValidClassicSave({ ...sample(), pieces: [piece, { cells: 'x' }, null] })).toBe(false);
    expect(isValidClassicSave({ ...sample(), scoreState: null })).toBe(false);
    expect(isValidClassicSave({ ...sample(), moves: 0 })).toBe(false);
  });
});
