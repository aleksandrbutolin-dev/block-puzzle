import { describe, it, expect } from 'vitest';
import { LEVELS } from './levels.js';
import { BOARD_SIZE, canPlace } from './board.js';
import { createLevelState, applyLevelMove, levelStatus, goalsDone, starsFor } from './level.js';
import { generateSet, refillPiece, hasAnyMove } from './pieces.js';
import { createRng } from './random.js';
import { createScoreState, scoreMove } from './score.js';

// Простой «бот»: проверяет, что уровни вообще проходимы и не слишком лёгкие.
// Он играет разумно, но без стратегии на несколько ходов вперёд — примерно как новичок,
// который видит очевидные ходы.

const filled = (state) => state.board.flat().filter((v) => v !== null).length;

// Насколько ход продвинул цели (в процентах от цели).
const goalValue = (state) =>
  state.goals.reduce((sum, goal) => sum + (goal.progress / goal.target) * 100, 0);

function playLevel(def, seed) {
  let state = createLevelState(def);
  let scoreState = createScoreState();
  const rng = createRng(seed);
  const pieces = generateSet(state.board, rng);

  while (levelStatus(state, hasAnyMove(state.board, pieces)) === 'playing') {
    let best = null;
    for (let slot = 0; slot < pieces.length; slot++) {
      const piece = pieces[slot];
      if (!piece) continue;
      for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
          if (!canPlace(state.board, piece.cells, row, col)) continue;
          const preview = applyLevelMove(state, piece.cells, row, col, piece.color, 0);
          const scored = scoreMove(scoreState, {
            cellsPlaced: piece.cells.length,
            linesCleared: preview.linesCleared,
          });
          const result = applyLevelMove(state, piece.cells, row, col, piece.color, scored.points);
          const value = goalValue(result.state) + result.linesCleared * 8 - filled(result.state) * 1.5;
          if (!best || value > best.value) best = { value, slot, result, scored };
        }
      }
    }
    if (!best) break;
    state = best.result.state;
    scoreState = best.scored.state;
    pieces[best.slot] = refillPiece(state.board, pieces, best.slot, rng, {
      difficulty: def.difficulty,
    });
  }

  return { won: goalsDone(state), stars: starsFor(state), movesLeft: state.movesLeft };
}

const SEEDS = [1, 2, 3];

describe('баланс уровней', () => {
  it.each(LEVELS.map((level) => [level.id, level]))(
    'уровень %i проходим',
    (id, level) => {
      const results = SEEDS.map((seed) => playLevel(level, seed));
      expect(results.some((r) => r.won)).toBe(true);
    },
    20000,
  );

  it('первые уровни проходятся почти всегда, поздние — сложнее', () => {
    const winRate = (level) => SEEDS.filter((seed) => playLevel(level, seed).won).length / SEEDS.length;
    const early = LEVELS.slice(0, 5).map(winRate);
    expect(early.every((rate) => rate === 1)).toBe(true);
  }, 30000);

  it('на трёх звёздах уровни не раздают звёзды даром', () => {
    // Хотя бы где-то бот получает меньше трёх звёзд — значит, есть за что стараться.
    const stars = LEVELS.map((level) => playLevel(level, 1)).map((r) => r.stars);
    expect(stars.some((s) => s > 0 && s < 3)).toBe(true);
  }, 30000);
});
