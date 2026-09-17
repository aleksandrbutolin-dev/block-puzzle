import Phaser from 'phaser';
import { GAME_WIDTH } from '../config.js';
import { BOARD_SIZE } from '../core/board.js';
import { generateSet, refillPiece, hasAnyMove } from '../core/pieces.js';
import { createRng } from '../core/random.js';
import { createScoreState, scoreMove } from '../core/score.js';
import {
  createLevelState,
  applyLevelMove,
  levelStatus,
  starsFor,
  hammerCell,
} from '../core/level.js';
import { getLevel, LEVELS_TOTAL } from '../core/levels.js';
import { getProgress, setProgress } from '../meta/store.js';
import { currentLevel, recordMove, recordLevelEnd } from '../meta/progress.js';
import { playSound } from '../platform/audio.js';
import { THEME } from './theme.js';
import { TEX, addBlock } from './textures.js';
import { addText, addIconButton, addSoundButton } from './ui.js';
import { addBackdrop } from './backdrop.js';
import { BoardScene, BOARD_X, BOARD_Y, BOARD_PX, CELL, cellCenter } from './BoardScene.js';

// Подписи целей.
const GOAL_LABELS = { score: 'Очки', lines: 'Линии', gems: 'Кристаллы', ice: 'Лёд' };

// Шапка: две карточки одной высоты под заголовком уровня.
const HUD_TOP = 98;
const HUD_H = 92;

// «Приключение»: уровень с целями и лимитом ходов.
export class LevelScene extends BoardScene {
  constructor() {
    super('Level');
  }

  create(data = {}) {
    const progress = getProgress();
    this.levelId = data.levelId ?? currentLevel(progress, LEVELS_TOTAL);
    this.def = getLevel(this.levelId);
    this.state = createLevelState(this.def);
    this.board = this.state.board;
    this.rng = createRng();
    this.scoreState = createScoreState();
    this.pieces = generateSet(this.board, this.rng);
    this.finished = false;

    addBackdrop(this);
    this.buildBoard();
    this.createHud();
    this.createBoosterBar();

    this.drawBoard();
    this.drawTray([0, 1, 2]);
    playSound('deal');
  }

  // ---------- Правила уровня ----------

  canDrag() {
    return !this.finished;
  }

  canUseBoosters() {
    return !this.finished;
  }

  // Молоток на уровне: лёд теряет слой, кристалл засчитывается, ход не тратится.
  useHammer(row, col) {
    const before = this.state;
    const result = hammerCell(before, row, col);
    this.state = result.state;
    this.board = result.state.board;
    this.drawBoard();
    for (const [r, c] of result.cleared) this.popBlock(r, c, before.board[r][c] ?? 0, 0, true);
    for (const [r, c] of result.iceBroken) this.crackIce(r, c);
    for (const [r, c] of result.gems) this.flyGem(r, c);
    playSound('pop', { lines: 1, streak: 1 });
    this.updateHud();
    this.checkStatus();
  }

  useSwap() {
    this.pieces = generateSet(this.board, this.rng);
    this.drawTray([0, 1, 2]);
    playSound('deal');
    this.checkStatus();
  }

  checkStatus() {
    const status = levelStatus(this.state, hasAnyMove(this.board, this.pieces));
    if (status !== 'playing') this.finish(status);
  }

  onPlaced(slot, piece, row, col) {
    const before = this.state;
    // Сколько линий уйдёт — нужно знать до начисления очков.
    const preview = applyLevelMove(before, piece.cells, row, col, piece.color, 0);
    const boardEmpty = preview.state.board.every((line) => line.every((cell) => cell === null));
    const scored = scoreMove(this.scoreState, {
      cellsPlaced: piece.cells.length,
      linesCleared: preview.linesCleared,
      boardEmpty,
    });
    this.scoreState = scored.state;

    const result = applyLevelMove(before, piece.cells, row, col, piece.color, scored.points);
    this.state = result.state;
    this.board = result.state.board;
    this.pieces[slot] = null;

    this.drawBoard();
    this.animateLanding(piece, row, col);
    playSound('place');
    if (result.linesCleared > 0) {
      this.animateLevelClear(before, result, row, col);
      playSound('pop', { lines: result.linesCleared, streak: scored.streak });
      if (result.linesCleared >= 2) {
        playSound('combo', { lines: result.linesCleared });
        this.pulseCamera(result.linesCleared);
      }
    }
    this.showPoints(scored, piece, row, col);
    this.updateHud();

    // Ходы на уровнях идут в задания дня наравне с «Классикой».
    const tracked = recordMove(getProgress(), {
      linesCleared: result.linesCleared,
      streak: scored.streak,
      boardEmpty,
    });
    setProgress(tracked.progress);
    tracked.completed.forEach((task, i) => this.showTaskDone(task, i));

    this.pieces[slot] = refillPiece(this.board, this.pieces, slot, this.rng, {
      difficulty: this.def.difficulty,
    });
    this.drawTray([slot]);

    this.checkStatus();
  }

  // ---------- Экран ----------

  createHud() {
    addIconButton(this, 58, 48, TEX.home, () => this.scene.start('Map'));
    addSoundButton(this);
    addText(this, GAME_WIDTH / 2, 40, `Уровень ${this.levelId}`, 36);

    // Ходы
    const panel = this.add.graphics();
    panel.fillStyle(0x1e2958, 0.9);
    panel.fillRoundedRect(40, HUD_TOP, 170, HUD_H, 28);
    panel.lineStyle(4, 0xffd9a0, 1);
    panel.strokeRoundedRect(40, HUD_TOP, 170, HUD_H, 28);
    addText(this, 125, HUD_TOP + 26, 'Ходы', 28, { color: THEME.textMuted });
    this.movesText = addText(this, 125, HUD_TOP + 64, '', 38);

    // Цели
    const goals = this.state.goals;
    // Три цели в одной карточке — надписи мельче, иначе они сходятся вплотную.
    const many = goals.length > 2;
    const width = many ? 460 : 430;
    const left = GAME_WIDTH - 40 - width;
    const goalPanel = this.add.graphics();
    goalPanel.fillStyle(0x1e2958, 0.9);
    goalPanel.fillRoundedRect(left, HUD_TOP, width, HUD_H, 28);
    goalPanel.lineStyle(4, 0xffd9a0, 1);
    goalPanel.strokeRoundedRect(left, HUD_TOP, width, HUD_H, 28);

    // Состояние уровня пересоздаётся каждым ходом, поэтому цели ищем по индексу, а не по ссылке.
    this.goalViews = goals.map((goal, i) => {
      const step = width / goals.length;
      const x = left + step * i + step / 2;
      addText(this, x, HUD_TOP + 26, GOAL_LABELS[goal.type], many ? 24 : 28, { color: THEME.textMuted });
      const icon = this.goalIcon(goal.type, x - (many ? 40 : 44), HUD_TOP + 64, many);
      const text = addText(this, x + (many ? 18 : 22), HUD_TOP + 64, '', many ? 30 : 34);
      return { index: i, type: goal.type, text, icon };
    });
    this.updateHud();
  }

  goalIcon(type, x, y, small = false) {
    const k = small ? 0.82 : 1;
    if (type === 'gems') return this.add.image(x, y, TEX.gem).setDisplaySize(52 * k, 52 * k);
    if (type === 'ice') return this.add.image(x, y, TEX.ice(1)).setDisplaySize(46 * k, 46 * k);
    if (type === 'lines') return addBlock(this, x, y, 46 * k, 3);
    return this.add.image(x, y, TEX.coin).setDisplaySize(46, 46).setVisible(false);
  }

  updateHud() {
    this.movesText.setText(String(this.state.movesLeft ?? '∞'));
    if (this.state.movesLeft !== null && this.state.movesLeft <= 3) {
      this.movesText.setColor('#ff8a8a');
    }
    for (const { index, text } of this.goalViews) {
      const goal = this.state.goals[index];
      const done = goal.progress >= goal.target;
      // Готовую цель показываем цветом и полным счётом, без текстового значка «галочка».
      text.setText(`${goal.progress}/${goal.target}`);
      text.setColor(done ? THEME.green : THEME.text);
    }
  }

  showPoints(scored, piece, row, col) {
    const label = this.popups.points;
    const x = BOARD_X + (col + 0.5) * CELL;
    const y = BOARD_Y + (row + 0.5) * CELL;
    this.tweens.killTweensOf(label);
    label.setText(`+${scored.points}`).setVisible(true).setAlpha(1).setScale(0).setPosition(
      Phaser.Math.Clamp(x, label.width / 2, GAME_WIDTH - label.width / 2),
      y,
    );
    this.tweens.chain({
      targets: label,
      tweens: [
        { scale: 1, duration: 260, ease: 'Back.easeOut' },
        {
          y: y - 80,
          alpha: 0,
          duration: 520,
          delay: 260,
          ease: 'Sine.easeIn',
          onComplete: () => label.setVisible(false),
        },
      ],
    });
  }

  // Лопаются очищенные блоки, трескается лёд, кристаллы летят к счётчику цели.
  animateLevelClear(before, result, row, col) {
    let index = 0;
    for (const [r, c] of result.cleared) {
      const color = before.board[r][c] ?? 0;
      const delay = (Math.abs(r - row) + Math.abs(c - col)) * 24;
      this.popBlock(r, c, color, delay, index++ % 2 === 0);
    }
    for (const [r, c] of result.iceBroken) {
      this.crackIce(r, c);
    }
    for (const [r, c] of result.gems) {
      this.flyGem(r, c);
    }
    for (const r of result.lines.rows) {
      this.flashLine(GAME_WIDTH / 2, cellCenter(r, 0).y, BOARD_PX, CELL);
    }
    for (const c of result.lines.cols) {
      this.flashLine(cellCenter(0, c).x, BOARD_Y + BOARD_PX / 2, CELL, BOARD_PX);
    }
  }

  crackIce(r, c) {
    const { x, y } = cellCenter(r, c);
    const shard = this.add.image(x, y, TEX.ice(1)).setDisplaySize(CELL, CELL).setDepth(7);
    this.tweens.add({
      targets: shard,
      scale: shard.scale * 1.3,
      alpha: 0,
      angle: 12,
      duration: 260,
      onComplete: () => shard.destroy(),
    });
    playSound('button');
  }

  flyGem(r, c) {
    const { x, y } = cellCenter(r, c);
    const view = this.goalViews.find(({ type }) => type === 'gems');
    const gem = this.add.image(x, y, TEX.gem).setDisplaySize(64, 64).setDepth(20);
    if (!view) {
      this.tweens.add({ targets: gem, alpha: 0, duration: 400, onComplete: () => gem.destroy() });
      return;
    }
    this.tweens.chain({
      targets: gem,
      tweens: [
        { y: y - 50, scale: gem.scale * 1.2, duration: 220, ease: 'Quad.easeOut' },
        {
          x: view.icon.x,
          y: view.icon.y,
          scale: gem.scale * 0.6,
          duration: 420,
          ease: 'Quad.easeIn',
          onComplete: () => {
            gem.destroy();
            playSound('coin');
            this.tweens.add({
              targets: view.icon,
              scale: view.icon.scale * 1.3,
              duration: 120,
              yoyo: true,
            });
          },
        },
      ],
    });
  }

  // Поверх блоков рисуем лёд и кристаллы.
  createBoardView() {
    super.createBoardView();
    this.iceViews = [];
    this.gemViews = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      this.iceViews.push([]);
      this.gemViews.push([]);
      for (let c = 0; c < BOARD_SIZE; c++) {
        const { x, y } = cellCenter(r, c);
        this.iceViews[r].push(
          this.add.image(x, y, TEX.ice(1)).setDisplaySize(CELL, CELL).setVisible(false).setDepth(4),
        );
        this.gemViews[r].push(
          this.add.image(x, y, TEX.gem).setDisplaySize(CELL * 0.62, CELL * 0.62).setVisible(false).setDepth(4),
        );
      }
    }
  }

  drawBoard() {
    super.drawBoard();
    if (!this.iceViews || !this.state) return;
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const layers = this.state.ice[r][c];
        const ice = this.iceViews[r][c];
        ice.setVisible(layers > 0);
        if (layers > 0) ice.setTexture(TEX.ice(Math.min(layers, 2)));
        this.gemViews[r][c].setVisible(this.state.gem[r][c]);
      }
    }
  }

  finish(status) {
    this.finished = true;
    const stars = status === 'won' ? starsFor(this.state) : 0;
    playSound(status === 'won' ? 'fanfare' : 'gameOver');
    const ended = recordLevelEnd(getProgress());
    setProgress(ended.progress);
    this.time.delayedCall(700, () => {
      this.scene.launch('LevelResult', {
        levelId: this.levelId,
        status,
        stars,
        score: this.state.score,
        hasNext: this.levelId < LEVELS_TOTAL,
        tasksDone: ended.completed,
      });
    });
  }
}
