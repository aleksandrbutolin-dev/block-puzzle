import { describe, it, expect } from 'vitest';
import { LEVELS, LEVELS_TOTAL, getLevel } from './levels.js';
import { createLevelState, GOAL_TYPES } from './level.js';
import { BOARD_SIZE } from './board.js';

const count = (level, ch) => level.rows.join('').split(ch).length - 1;

describe('уровни', () => {
  it('нумерация по порядку, без пропусков', () => {
    expect(LEVELS.map((l) => l.id)).toEqual(LEVELS.map((_, i) => i + 1));
    expect(getLevel(1).id).toBe(1);
    expect(getLevel(LEVELS_TOTAL + 1)).toBeNull();
  });

  it.each(LEVELS.map((l) => [l.id, l]))('уровень %i корректен', (id, level) => {
    expect(level.rows).toHaveLength(BOARD_SIZE);
    for (const row of level.rows) {
      expect(row).toHaveLength(BOARD_SIZE);
      expect(row).toMatch(/^[.#IJG]+$/);
    }
    expect(level.moves).toBeGreaterThan(3);
    expect(level.difficulty).toBeGreaterThanOrEqual(0);
    expect(level.difficulty).toBeLessThanOrEqual(1);

    // Пороги звёзд: 3 звезды требуют больше запаса, чем 2, и обе достижимы.
    const [two, three] = level.stars;
    expect(three).toBeGreaterThan(two);
    expect(three).toBeLessThan(level.moves);

    // Цели известного типа и не пустые.
    const goals = Object.keys(level.goals);
    expect(goals.length).toBeGreaterThan(0);
    for (const type of goals) {
      expect(GOAL_TYPES).toContain(type);
      expect(level.goals[type]).toBeGreaterThan(0);
    }
  });

  it.each(LEVELS.filter((l) => l.goals.gems).map((l) => [l.id, l]))(
    'на уровне %i кристаллов хватает для цели',
    (id, level) => {
      expect(count(level, 'G')).toBeGreaterThanOrEqual(level.goals.gems);
    },
  );

  it.each(LEVELS.filter((l) => l.goals.ice).map((l) => [l.id, l]))(
    'на уровне %i слоёв льда хватает для цели',
    (id, level) => {
      expect(count(level, 'I') + count(level, 'J') * 2).toBeGreaterThanOrEqual(level.goals.ice);
    },
  );

  it('заготовка занимает меньше половины поля — есть куда ставить', () => {
    for (const level of LEVELS) {
      const state = createLevelState(level);
      const filled = state.board.flat().filter((v) => v !== null).length;
      expect(filled).toBeLessThan((BOARD_SIZE * BOARD_SIZE) / 2);
    }
  });

  it('сложность и число ходов растут от уровня к уровню', () => {
    for (let i = 1; i < LEVELS.length; i++) {
      expect(LEVELS[i].difficulty).toBeGreaterThanOrEqual(LEVELS[i - 1].difficulty);
      expect(LEVELS[i].moves).toBeGreaterThanOrEqual(LEVELS[i - 1].moves);
    }
  });
});
