import Phaser from 'phaser';
import { GAME_WIDTH } from '../config.js';
import {
  BOARD_SIZE,
  createBoard,
  place,
  applyMove,
  densestArea,
  clearArea,
} from '../core/board.js';
import {
  generateSet,
  refillPiece,
  hasAnyMove,
  pieceSize,
  difficultyForScore,
  MERCY_REROLLS,
} from '../core/pieces.js';
import { createRng } from '../core/random.js';
import { createScoreState, scoreMove, milestonesCrossed } from '../core/score.js';
import { getProgress, setProgress } from '../meta/store.js';
import {
  recordMove,
  recordGameEnd,
  updateBest,
  needsAssist,
  addCoins,
  MILESTONE_COINS,
} from '../meta/progress.js';
import { playSound } from '../platform/audio.js';
import { THEME } from './theme.js';
import { TEX, addBlock } from './textures.js';
import { addText, addIconButton, addSoundButton } from './ui.js';
import { addBackdrop } from './backdrop.js';
import { Tutorial } from './tutorial.js';
import { BoardScene, BOARD_X, BOARD_Y, BOARD_PX, CELL, cellCenter, lineCells } from './BoardScene.js';

// Помощь после нескольких быстрых проигрышей: сложность растёт медленнее, перебросов больше.
const ASSIST_DIFFICULTY = 0.5;
const ASSIST_REROLLS = 5;

// «Продолжить?» освобождает квадрат такого размера.
const REVIVE_AREA = 4;

// «Классика»: бесконечная партия до конца ходов, рекорд, отметки, «Продолжить?».
export class GameScene extends BoardScene {
  constructor() {
    super('Game');
  }

  create() {
    this.rng = createRng();
    this.board = createBoard();
    this.pieces = generateSet(this.board, this.rng);
    this.isOver = false;
    this.revived = false; // «Продолжить?» уже использовано в этой партии
    this.moves = 0;
    this.assist = needsAssist(getProgress());
    this.scoreState = createScoreState();
    this.bestAtStart = getProgress().best;
    this.best = this.bestAtStart;
    this.shownScore = 0;

    addBackdrop(this);
    this.buildBoard();

    this.bestText = addText(this, GAME_WIDTH / 2, 52, '', 30);
    this.scoreText = addText(this, GAME_WIDTH / 2, 142, '0', 104);
    this.updateBestText();

    addSoundButton(this);
    addIconButton(this, 58, 58, TEX.home, () => this.goHome());

    this.drawBoard();
    this.drawTray([0, 1, 2]);
    playSound('deal'); // слышно при «Заново»; до первого касания звук ещё закрыт

    this.tutorial = getProgress().tutorialDone ? null : new Tutorial(this);
  }

  // ---------- Правила «Классики» ----------

  canDrag(slot) {
    if (this.isOver) return false;
    if (this.tutorial && !this.tutorial.allowsSlot(slot)) return false;
    this.tutorial?.onDragStart();
    return true;
  }

  constrainTarget(row, col, current) {
    return this.tutorial ? this.tutorial.constrain(row, col) : super.constrainTarget(row, col, current);
  }

  onPlaced(slot, piece, row, col) {
    this.makeMove(slot, piece, row, col);
  }

  onDragCancelled() {
    this.tutorial?.onDragCancel();
  }

  // Выход в меню посреди партии: партия не засчитывается.
  goHome() {
    if (this.isOver) return;
    playSound('button');
    this.scene.start('Menu');
  }

  // ---------- Ход ----------

  makeMove(slot, piece, row, col) {
    this.moves += 1;
    const before = this.board;
    const result = applyMove(before, piece.cells, row, col, piece.color);
    this.board = result.board;
    this.pieces[slot] = null;

    const boardEmpty = this.board.every((line) => line.every((cell) => cell === null));
    const scoreBefore = this.scoreState.score;
    const scored = scoreMove(this.scoreState, { ...result, boardEmpty });
    this.scoreState = scored.state;
    this.updateScore();

    const milestones = milestonesCrossed(scoreBefore, scored.state.score);
    if (milestones.length > 0) {
      const coins = milestones.length * MILESTONE_COINS;
      setProgress(addCoins(getProgress(), coins));
      this.showMilestone(milestones[milestones.length - 1], coins);
    }
    const tracked = recordMove(getProgress(), { ...result, streak: scored.streak, boardEmpty });
    setProgress(tracked.progress);
    tracked.completed.forEach((task, i) => this.showTaskDone(task, i));

    this.drawBoard();
    this.animateLanding(piece, row, col);
    this.playMoveSounds(scored, boardEmpty);
    if (result.linesCleared > 0) {
      this.animateClear(before, piece, row, col, result.lines);
    }
    if (result.linesCleared >= 2 || boardEmpty) {
      this.pulseCamera(result.linesCleared);
    }
    this.showMovePopups(scored, piece, row, col);

    if (this.tutorial) {
      this.tutorial.afterMove();
      return;
    }

    // На место поставленной фигуры сразу приходит новая — в лотке всегда три.
    this.pieces[slot] = refillPiece(this.board, this.pieces, slot, this.rng, this.refillOptions());
    playSound('refill');
    this.drawTray([slot]);

    if (!hasAnyMove(this.board, this.pieces)) {
      this.endGame();
    }
  }

  // Сложность новой фигуры: растёт с очками, при помощи — медленнее.
  refillOptions() {
    const difficulty = difficultyForScore(this.scoreState.score);
    return this.assist
      ? { difficulty: difficulty * ASSIST_DIFFICULTY, rerolls: ASSIST_REROLLS }
      : { difficulty, rerolls: MERCY_REROLLS };
  }

  playMoveSounds(scored, boardEmpty) {
    playSound('place');
    if (scored.combo === 0) return;
    playSound('pop', { lines: scored.combo, streak: scored.streak });
    if (scored.combo >= 2) playSound('combo', { lines: scored.combo });
    if (scored.streak >= 2) playSound('streak');
    if (boardEmpty) playSound('clearBoard');
  }

  animateClear(before, piece, row, col, lines) {
    // Цвет очищенной клетки: был на поле до хода или пришёл с фигурой.
    const placed = place(before, piece.cells, row, col, piece.color);
    let index = 0;
    for (const [r, c] of lineCells(lines)) {
      const delay = (Math.abs(r - row) + Math.abs(c - col)) * 28;
      this.popBlock(r, c, placed[r][c], delay, index++ % 2 === 0);
    }

    // Светлая вспышка вдоль очищаемых линий.
    for (const r of lines.rows) {
      this.flashLine(GAME_WIDTH / 2, cellCenter(r, 0).y, BOARD_PX, CELL);
    }
    for (const c of lines.cols) {
      this.flashLine(cellCenter(0, c).x, BOARD_Y + BOARD_PX / 2, CELL, BOARD_PX);
    }
  }

  // ---------- Счёт ----------

  updateScore() {
    const score = this.scoreState.score;
    if (score > this.best) {
      const firstTime = this.best === this.bestAtStart && this.bestAtStart > 0;
      this.best = score;
      setProgress(updateBest(getProgress(), score)); // сразу, чтобы рекорд не пропал при закрытии вкладки
      this.updateBestText();
      if (firstTime) this.celebrateBest();
    }
    // Число «набегает» к новому значению.
    this.tweens.killTweensOf(this);
    this.tweens.add({
      targets: this,
      shownScore: score,
      duration: 350,
      ease: 'Quad.easeOut',
      onUpdate: () => this.scoreText.setText(String(Math.round(this.shownScore))),
    });
    this.tweens.killTweensOf(this.scoreText);
    this.tweens.add({
      targets: this.scoreText,
      scale: { from: 1.18, to: 1 },
      duration: 320,
      ease: 'Back.easeOut',
    });
  }

  updateBestText() {
    this.bestText.setText(`Рекорд: ${this.best}`);
  }

  // Прежний рекорд побит в этой партии — надпись вспыхивает золотом.
  celebrateBest() {
    playSound('record');
    this.bestText.setColor(THEME.gold);
    this.tweens.add({
      targets: this.bestText,
      scale: { from: 1.5, to: 1 },
      duration: 500,
      ease: 'Back.easeOut',
    });
    this.burst(this.bestText.x - 90, this.bestText.y, 2, 2);
    this.burst(this.bestText.x + 90, this.bestText.y, 2, 2);
  }

  // Всплывающие «+N», «Комбо», «Серия», «Чистое поле» над местом хода.
  showMovePopups(scored, piece, row, col) {
    const { rows, cols } = pieceSize(piece.cells);
    const x = BOARD_X + (col + cols / 2) * CELL;
    const y = BOARD_Y + (row + rows / 2) * CELL;

    const { popups } = this;
    const lines = [];
    popups.points.setText(`+${scored.points}`);
    lines.push(popups.points);
    if (scored.combo >= 2) {
      popups.combo.setText(`Комбо ×${scored.combo}`);
      lines.push(popups.combo);
    }
    if (scored.streak >= 2) {
      popups.streak.setText(`Серия ×${scored.streak}`);
      lines.push(popups.streak);
    }
    if (scored.bonusPoints > 0) lines.push(popups.clearBoard);

    lines.forEach((label, i) => {
      // Не даём надписи вылезти за край экрана.
      const half = label.width / 2 + 8;
      const startY = y + i * 62;
      this.tweens.killTweensOf(label);
      label
        .setVisible(true)
        .setPosition(Phaser.Math.Clamp(x, half, GAME_WIDTH - half), startY)
        .setAlpha(1)
        .setScale(0)
        .setAngle(i % 2 ? 4 : -4);
      this.tweens.chain({
        targets: label,
        tweens: [
          {
            scale: 1,
            angle: 0,
            duration: 300,
            delay: i * 100,
            ease: 'Back.easeOut',
          },
          {
            y: startY - 90,
            alpha: 0,
            duration: 600,
            delay: 350,
            ease: 'Sine.easeIn',
            onComplete: () => label.setVisible(false),
          },
        ],
      });
    });
  }

  // «1000!» над полем: крупная золотая надпись, монеты, звёзды.
  showMilestone(value, coins) {
    const cx = GAME_WIDTH / 2;
    const cy = BOARD_Y + BOARD_PX / 2 - 60;
    const title = addText(this, 0, 0, `${value}!`, 120, { color: THEME.gold, stroke: '#8a4a0c' });
    const coinIcon = this.add.image(0, 0, TEX.coin).setDisplaySize(64, 64);
    const coinText = addText(this, 0, 0, `+${coins}`, 52, { color: THEME.gold, stroke: '#8a4a0c' });
    const rowWidth = coinIcon.displayWidth + 10 + coinText.width - coinText.padding.left * 2;
    coinIcon.setPosition(-rowWidth / 2 + coinIcon.displayWidth / 2, 95);
    coinText.setPosition(coinIcon.x + coinIcon.displayWidth / 2 + 10 + (coinText.width - coinText.padding.left * 2) / 2, 95);

    const banner = this.add.container(cx, cy, [title, coinIcon, coinText]).setDepth(30);
    banner.setScale(0).setAngle(-8);
    this.tweens.chain({
      targets: banner,
      tweens: [
        { scale: 1, angle: 0, duration: 420, ease: 'Back.easeOut' },
        { y: cy - 70, alpha: 0, duration: 450, delay: 900, ease: 'Sine.easeIn', onComplete: () => banner.destroy() },
      ],
    });

    // Звёзды всех цветов вокруг надписи.
    for (let i = 0; i < 7; i++) {
      const angle = (i / 7) * Math.PI * 2;
      this.time.delayedCall(120 + i * 40, () =>
        this.burst(cx + Math.cos(angle) * 170, cy + Math.sin(angle) * 80, i, 2),
      );
    }
    this.time.delayedCall(150, () => playSound('fanfare'));
  }

  // Плашка «Задание выполнено!» сверху. Подробный экран заданий — в меню.
  showTaskDone(task, index) {
    const y = 250 + index * 90;
    const label = addText(this, GAME_WIDTH / 2, y, `Задание выполнено! +${task.reward}`, 38, {
      color: THEME.gold,
    }).setDepth(25);
    const bg = this.add
      .rectangle(GAME_WIDTH / 2, y, label.width + 20, 78, 0x1e2958, 0.92)
      .setStrokeStyle(4, 0xffd84a)
      .setDepth(24);
    const group = [bg, label];
    for (const item of group) item.setScale(0);
    this.time.delayedCall(250 + index * 200, () => playSound('record'));
    this.tweens.add({
      targets: group,
      scale: 1,
      duration: 350,
      delay: 250 + index * 200,
      ease: 'Back.easeOut',
    });
    this.tweens.add({
      targets: group,
      alpha: 0,
      y: y - 40,
      duration: 400,
      delay: 2200 + index * 200,
      onComplete: () => group.forEach((item) => item.destroy()),
    });
  }

  // Ходов нет: поле «засыпает», затем — «Продолжить?» (один раз за партию) или итог.
  endGame() {
    this.isOver = true;
    this.dimBoard(true);
    this.time.delayedCall(250, () => playSound('gameOver'));

    // Пауза, чтобы игрок увидел последний ход.
    this.time.delayedCall(800, () => {
      if (this.revived) {
        this.finishGame();
        return;
      }
      this.scene.launch('Continue', {
        onContinue: () => this.revive(),
        onGiveUp: () => this.finishGame(),
      });
    });
  }

  finishGame() {
    const score = this.scoreState.score;
    const ended = recordGameEnd(getProgress(), { score, moves: this.moves });
    setProgress(ended.progress);
    this.scene.launch('GameOver', {
      score,
      best: this.best,
      isNewBest: score > this.bestAtStart,
      coinsEarned: ended.coins,
      tasksDone: ended.completed,
    });
  }

  // Блоки тускнеют сверху вниз (dim) или возвращают яркость.
  dimBoard(dim) {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const view = this.blockViews[r][c];
        this.tweens.killTweensOf(view);
        this.tweens.add({
          targets: view,
          alpha: dim ? 0.45 : 1,
          duration: 200,
          delay: dim ? r * 45 + c * 15 : 0,
        });
      }
    }
  }

  // Вторая попытка: самый заполненный квадрат 4×4 лопается, фигуры — новые.
  revive() {
    this.revived = true;
    this.dimBoard(false);

    const { row, col } = densestArea(this.board, REVIVE_AREA);
    const before = this.board;
    this.board = clearArea(this.board, row, col, REVIVE_AREA);
    this.drawBoard();
    for (let r = row; r < row + REVIVE_AREA; r++) {
      for (let c = col; c < col + REVIVE_AREA; c++) {
        if (before[r][c] === null) continue;
        const delay = (Math.abs(r - row - 1.5) + Math.abs(c - col - 1.5)) * 40;
        this.popBlock(r, c, before[r][c], delay, (r + c) % 2 === 0);
      }
    }
    playSound('clearBoard');

    this.pieces = generateSet(this.board, this.rng);
    this.drawTray([0, 1, 2]);
    this.time.delayedCall(450, () => {
      this.isOver = !hasAnyMove(this.board, this.pieces);
      if (this.isOver) this.endGame();
    });
  }

  // ---------- Отрисовка ----------

}
