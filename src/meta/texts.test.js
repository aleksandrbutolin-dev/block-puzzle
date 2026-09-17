import { describe, it, expect } from 'vitest';
import { plural, taskText, timeUntilTomorrow } from './texts.js';
import { TASK_TYPES } from './progress.js';

const forms = ['линию', 'линии', 'линий'];

describe('plural', () => {
  it.each([
    [1, 'линию'],
    [2, 'линии'],
    [4, 'линии'],
    [5, 'линий'],
    [11, 'линий'],
    [12, 'линий'],
    [14, 'линий'],
    [15, 'линий'],
    [21, 'линию'],
    [22, 'линии'],
    [111, 'линий'],
    [0, 'линий'],
  ])('%i → %s', (n, expected) => {
    expect(plural(n, forms)).toBe(expected);
  });
});

describe('taskText', () => {
  it('тексты с правильными окончаниями', () => {
    expect(taskText({ type: 'lines', target: 15 })).toBe('Собери 15 линий');
    expect(taskText({ type: 'games', target: 2 })).toBe('Сыграй 2 партии');
    expect(taskText({ type: 'games', target: 3 })).toBe('Сыграй 3 партии');
    expect(taskText({ type: 'pieces', target: 30 })).toBe('Поставь 30 фигур');
    expect(taskText({ type: 'score', target: 500 })).toBe('Набери 500 очков за партию');
    expect(taskText({ type: 'combo', target: 2 })).toBe('Убери 2 линии одним ходом');
  });

  it('у каждого типа задания есть текст', () => {
    for (const type of Object.keys(TASK_TYPES)) {
      const [target] = TASK_TYPES[type].options[0];
      expect(taskText({ type, target })).not.toBe(type);
    }
  });
});

describe('timeUntilTomorrow', () => {
  it('до полуночи', () => {
    expect(timeUntilTomorrow(new Date(2026, 8, 17, 18, 53))).toBe('5 ч 07 мин');
    expect(timeUntilTomorrow(new Date(2026, 8, 17, 23, 59, 30))).toBe('0 ч 01 мин');
    expect(timeUntilTomorrow(new Date(2026, 8, 17, 0, 0))).toBe('24 ч 00 мин');
  });
});
