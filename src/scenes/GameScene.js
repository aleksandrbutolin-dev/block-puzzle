import Phaser from 'phaser';
import { GAME_WIDTH } from '../config.js';
import {
  BOARD_SIZE,
  createBoard,
  place,
  findFullLines,
  applyMove,
  findDropTarget,
  densestArea,
  clearArea,
} from '../core/board.js';
import { generateSet, refillPiece, hasAnyMove, pieceSize } from '../core/pieces.js';
import { createRng } from '../core/random.js';
import { createScoreState, scoreMove } from '../core/score.js';
import { getProgress, setProgress } from '../meta/store.js';
import { recordMove, recordGameEnd, updateBest } from '../meta/progress.js';
import { playSound } from '../platform/audio.js';
import { THEME } from './theme.js';
import {
  TEX,
  BOARD_TEX_PADDING,
  BOARD_TEX_MARGIN,
  SHELF_SIZE,
  SHELF_PANEL_CENTER_Y,
  SHELF_INNER,
  addBlock,
} from './textures.js';
import { addText, addIconButton, addSoundButton } from './ui.js';
import { addBackdrop } from './backdrop.js';

// Раскладка экрана 720×1280.
export const CELL = 80;
export const BOARD_PX = CELL * BOARD_SIZE;
const BOARD_X = (GAME_WIDTH - BOARD_PX) / 2;
const BOARD_Y = 250;

const TRAY_Y = 1075; // центр лотка с фигурами
// Три слота делят внутреннюю часть полки поровну.
const TRAY_SLOT_W = SHELF_INNER.width / 3;
const TRAY_LEFT = (GAME_WIDTH - SHELF_INNER.width) / 2;
const TRAY_SLOT_H = 280; // зона захвата фигуры — крупнее самой фигуры
const TRAY_CELL = 44; // размер клетки фигуры в лотке (крупные фигуры — мельче)
// Запас от края слота: фигура не должна вылезать за полку даже при покачивании и «выпрыгивании».
const TRAY_PAD = 14;

// Насколько фигура поднята над точкой касания, чтобы палец её не закрывал.
const LIFT_TOUCH = 140;
const LIFT_MOUSE = 20;

// «Продолжить?» освобождает квадрат такого размера.
const REVIVE_AREA = 4;

// Плавность следования за пальцем: чем больше, тем плотнее фигура «прилипает».
const FOLLOW_SHARPNESS = 28;

const cellCenter = (row, col) => ({
  x: BOARD_X + col * CELL + CELL / 2,
  y: BOARD_Y + row * CELL + CELL / 2,
});

const slotCenter = (slot) => ({ x: TRAY_LEFT + TRAY_SLOT_W * slot + TRAY_SLOT_W / 2, y: TRAY_Y });

// Размер клетки фигуры в лотке: 44 px, но не больше, чем позволяет слот.
function trayCellFor(piece) {
  const { rows, cols } = pieceSize(piece.cells);
  const maxW = TRAY_SLOT_W - 2 * TRAY_PAD;
  const maxH = SHELF_INNER.height - 2 * TRAY_PAD;
  return Math.min(TRAY_CELL, Math.floor(maxW / cols), Math.floor(maxH / rows));
}

export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    this.rng = createRng();
    this.board = createBoard();
    this.pieces = generateSet(this.board, this.rng);
    this.drag = null;
    this.placing = false; // фигура доезжает до клеток — новый захват ждёт
    this.returning = new Set(); // слоты, чьи фигуры летят обратно в лоток
    this.isOver = false;
    this.revived = false; // «Продолжить?» уже использовано в этой партии
    this.scoreState = createScoreState();
    this.bestAtStart = getProgress().best;
    this.best = this.bestAtStart;
    this.shownScore = 0;

    addBackdrop(this);
    this.createBoardView();
    this.add
      .image(GAME_WIDTH / 2, TRAY_Y + SHELF_SIZE.height / 2 - SHELF_PANEL_CENTER_Y, TEX.shelf)
      .setOrigin(0.5);

    this.bestText = addText(this, GAME_WIDTH / 2, 52, '', 30);
    this.scoreText = addText(this, GAME_WIDTH / 2, 142, '0', 104);
    this.updateBestText();

    this.createTray();
    this.createParticles();
    this.createPopups();
    addSoundButton(this);
    addIconButton(this, 58, 58, TEX.home, () => this.goHome());

    this.input.on('pointermove', (pointer) => this.moveDrag(pointer));
    this.input.on('pointerup', (pointer) => this.endDrag(pointer));
    this.input.on('pointerupoutside', (pointer) => this.endDrag(pointer));

    this.drawBoard();
    this.drawTray([0, 1, 2]);
    playSound('deal'); // слышно при «Заново»; до первого касания звук ещё закрыт
  }

  createBoardView() {
    const offset = BOARD_TEX_PADDING + BOARD_TEX_MARGIN;
    this.boardImage = this.add.image(BOARD_X - offset, BOARD_Y - offset, TEX.board).setOrigin(0);

    this.blockViews = [];
    this.previewViews = [];
    this.ghostFrames = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      this.blockViews.push([]);
      this.previewViews.push([]);
      this.ghostFrames.push([]);
      for (let c = 0; c < BOARD_SIZE; c++) {
        const { x, y } = cellCenter(r, c);
        this.add.image(x, y, TEX.cell).setDisplaySize(CELL, CELL);
        this.blockViews[r].push(addBlock(this, x, y, CELL, 0).setVisible(false).setDepth(1));
        this.previewViews[r].push(addBlock(this, x, y, CELL, 0).setVisible(false).setDepth(2));
        this.ghostFrames[r].push(
          this.add.image(x, y, TEX.ghostFrame).setDisplaySize(CELL, CELL).setVisible(false).setDepth(3),
        );
      }
    }
    this.blockScale = this.blockViews[0][0].scaleX;
  }

  // Слот лотка: внешний контейнер (выпрыгивание) → body (покачивание) → блоки.
  createTray() {
    this.trayViews = [0, 1, 2].map((slot) => {
      const { x, y } = slotCenter(slot);
      const body = this.add.container(0, 0);
      const outer = this.add.container(x, y, [body]).setDepth(5);
      // Едва заметное «дыхание» — сильное покачивание рядом с пальцем выглядит как дрожание.
      this.tweens.add({
        targets: body,
        y: -2,
        duration: 1800,
        delay: slot * 250,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      this.add
        .zone(x, y, TRAY_SLOT_W, TRAY_SLOT_H)
        .setInteractive()
        .on('pointerdown', (pointer) => this.startDrag(slot, pointer));
      return { outer, body };
    });
  }

  createParticles() {
    this.particleTint = 0xffffff;
    const tint = { onEmit: () => this.particleTint };
    this.sparks = this.add
      .particles(0, 0, TEX.spark, {
        emitting: false,
        speed: { min: 120, max: 340 },
        angle: { min: 0, max: 360 },
        scale: { start: 0.9, end: 0 },
        alpha: { start: 1, end: 0 },
        lifespan: { min: 350, max: 600 },
        gravityY: 500,
        tint,
        blendMode: 'ADD',
      })
      .setDepth(12);
    this.stars = this.add
      .particles(0, 0, TEX.star, {
        emitting: false,
        speed: { min: 180, max: 420 },
        angle: { min: 200, max: 340 }, // в основном вверх
        scale: { start: 0.75, end: 0.15 },
        alpha: { start: 1, end: 0 },
        rotate: { min: -180, max: 180 },
        lifespan: { min: 550, max: 850 },
        gravityY: 900,
        tint,
      })
      .setDepth(12);
  }

  // Надписи «+N», «Комбо», «Серия», «Чистое поле» создаются один раз и переиспользуются:
  // создание текста на каждом ходу даёт микрозадержки на слабых телефонах.
  createPopups() {
    const make = (size, color) => addText(this, 0, 0, '', size, { color }).setDepth(15).setVisible(false);
    this.popups = {
      points: make(60, THEME.text),
      combo: make(48, THEME.gold),
      streak: make(44, THEME.green),
      clearBoard: make(52, THEME.cyan),
    };
    this.popups.clearBoard.setText('Чистое поле!');
  }

  // Плавное следование фигуры за пальцем (экспоненциальное сглаживание).
  update(_time, delta) {
    const drag = this.drag;
    if (!drag) return;
    const k = 1 - Math.exp((-FOLLOW_SHARPNESS * delta) / 1000);
    const { sprite } = drag;
    sprite.x += (drag.goalX - sprite.x) * k;
    sprite.y += (drag.goalY - drag.liftNow - sprite.y) * k;
  }

  // Выход в меню посреди партии: партия не засчитывается.
  goHome() {
    if (this.isOver) return;
    playSound('button');
    this.scene.start('Menu');
  }

  burst(x, y, color, stars = 1) {
    this.particleTint = THEME.blocks[color];
    this.sparks.explode(5, x, y);
    if (stars > 0) this.stars.explode(stars, x, y);
  }

  // ---------- Перетаскивание ----------

  startDrag(slot, pointer) {
    const piece = this.pieces[slot];
    if (this.isOver || this.drag || this.placing || !piece || this.returning.has(slot)) return;

    const { rows, cols } = pieceSize(piece.cells);
    const sprite = this.makePieceView(piece, CELL, true).setDepth(10);
    playSound('pick');

    this.drag = {
      slot,
      piece,
      sprite,
      rows,
      cols,
      pointerId: pointer.id,
      lift: pointer.wasTouch ? LIFT_TOUCH : LIFT_MOUSE,
      liftNow: 0, // подъём над пальцем нарастает плавно
      goalX: 0,
      goalY: 0,
      target: null,
    };

    // Фигура плавно вырастает из лотка до размера клеток поля и поднимается над пальцем.
    const from = slotCenter(slot);
    sprite.setPosition(from.x, from.y).setScale(trayCellFor(piece) / CELL);
    this.tweens.add({
      targets: sprite,
      scale: 1,
      duration: 200,
      ease: 'Back.easeOut',
      easeParams: [1.1],
    });
    this.tweens.add({
      targets: this.drag,
      liftNow: this.drag.lift,
      duration: 180,
      ease: 'Cubic.easeOut',
    });

    this.drawTray();
    this.moveDrag(pointer);
  }

  moveDrag(pointer) {
    const drag = this.drag;
    if (!drag || pointer.id !== drag.pointerId) return;

    // Цель — под пальцем; сама фигура догоняет её в update().
    // Клетку считаем по полному подъёму, чтобы подсветка не прыгала, пока фигура поднимается.
    drag.goalX = pointer.x;
    drag.goalY = pointer.y - (drag.rows * CELL) / 2;
    const cx = drag.goalX;
    const cy = drag.goalY - drag.lift;

    const left = cx - (drag.cols * CELL) / 2;
    const top = cy - (drag.rows * CELL) / 2;
    const row = (top - BOARD_Y) / CELL;
    const col = (left - BOARD_X) / CELL;
    const target = findDropTarget(this.board, drag.piece.cells, row, col, drag.target);

    const same = target?.row === drag.target?.row && target?.col === drag.target?.col;
    if (!same) {
      drag.target = target;
      this.drawPreview();
    }
  }

  endDrag(pointer) {
    const drag = this.drag;
    if (!drag || pointer.id !== drag.pointerId) return;
    this.drag = null;
    this.drawPreview();

    this.tweens.killTweensOf(drag);
    this.tweens.killTweensOf(drag.sprite);

    if (drag.target) {
      // Фигура мягко доезжает до своих клеток и только потом ставится.
      const { row, col } = drag.target;
      this.placing = true;
      this.tweens.add({
        targets: drag.sprite,
        x: BOARD_X + (col + drag.cols / 2) * CELL,
        y: BOARD_Y + (row + drag.rows / 2) * CELL,
        scale: 1,
        duration: 90,
        ease: 'Quad.easeOut',
        onComplete: () => {
          drag.sprite.destroy();
          this.placing = false;
          this.makeMove(drag.slot, drag.piece, row, col);
        },
      });
      return;
    }

    // Мимо — фигура возвращается в лоток.
    const home = slotCenter(drag.slot);
    this.returning.add(drag.slot);
    playSound('back');
    this.tweens.add({
      targets: drag.sprite,
      x: home.x,
      y: home.y,
      scale: trayCellFor(drag.piece) / CELL,
      duration: 260,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        drag.sprite.destroy();
        this.returning.delete(drag.slot);
        this.drawTray();
      },
    });
  }

  // ---------- Ход ----------

  makeMove(slot, piece, row, col) {
    const before = this.board;
    const result = applyMove(before, piece.cells, row, col, piece.color);
    this.board = result.board;
    this.pieces[slot] = null;

    const boardEmpty = this.board.every((line) => line.every((cell) => cell === null));
    const scored = scoreMove(this.scoreState, { ...result, boardEmpty });
    this.scoreState = scored.state;
    this.updateScore();
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

    // На место поставленной фигуры сразу приходит новая — в лотке всегда три.
    this.pieces[slot] = refillPiece(this.board, this.pieces, slot, this.rng);
    playSound('refill');
    this.drawTray([slot]);

    if (!hasAnyMove(this.board, this.pieces)) {
      this.endGame();
    }
  }

  playMoveSounds(scored, boardEmpty) {
    playSound('place');
    if (scored.combo === 0) return;
    playSound('pop', { lines: scored.combo, streak: scored.streak });
    if (scored.combo >= 2) playSound('combo', { lines: scored.combo });
    if (scored.streak >= 2) playSound('streak');
    if (boardEmpty) playSound('clearBoard');
  }

  // Поставленные блоки сплющиваются и пружинят (squash & stretch).
  animateLanding(piece, row, col) {
    const base = this.blockScale;
    for (const [dr, dc] of piece.cells) {
      const view = this.blockViews[row + dr][col + dc];
      if (!view.visible) continue; // блок сразу ушёл в очищенную линию
      this.tweens.killTweensOf(view);
      view.setScale(base * 1.12, base * 0.88);
      this.tweens.add({
        targets: view,
        scaleX: base,
        scaleY: base,
        duration: 260,
        ease: 'Back.easeOut',
        easeParams: [2],
      });
    }
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

  // Блок подпрыгивает и лопается с искрами (и звёздочкой, если withStar).
  popBlock(r, c, color, delay, withStar) {
    const { x, y } = cellCenter(r, c);
    const base = this.blockScale;
    const block = addBlock(this, x, y, CELL, color).setDepth(6);
    this.tweens.chain({
      targets: block,
      tweens: [
        {
          y: y - 16,
          scaleX: base * 1.18,
          scaleY: base * 1.18,
          duration: 130,
          delay,
          ease: 'Quad.easeOut',
        },
        {
          y,
          scaleX: 0,
          scaleY: 0,
          alpha: 0.4,
          duration: 150,
          ease: 'Back.easeIn',
          onStart: () => this.burst(x, y - 10, color, withStar ? 1 : 0),
          onComplete: () => block.destroy(),
        },
      ],
    });
  }

  flashLine(x, y, width, height) {
    const flash = this.add
      .rectangle(x, y, width, height, 0xfff4d6, 0.38)
      .setDepth(7)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      scaleX: width > height ? 1.04 : 1.3,
      scaleY: width > height ? 1.3 : 1.04,
      duration: 320,
      ease: 'Quad.easeOut',
      onComplete: () => flash.destroy(),
    });
  }

  // Мягкий «вдох» камеры на комбо вместо тряски.
  pulseCamera(lines) {
    const camera = this.cameras.main;
    this.tweens.killTweensOf(camera);
    camera.setZoom(1);
    this.tweens.add({
      targets: camera,
      zoom: 1.012 + Math.min(lines, 4) * 0.004,
      duration: 140,
      yoyo: true,
      ease: 'Sine.easeInOut',
    });
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
    const ended = recordGameEnd(getProgress(), { score });
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

  // Фигура из блоков; (0, 0) контейнера — центр фигуры.
  makePieceView(piece, size, withShadow = false) {
    const { rows, cols } = pieceSize(piece.cells);
    const ox = (cols * size) / 2;
    const oy = (rows * size) / 2;
    const container = this.add.container(0, 0);
    if (withShadow) {
      for (const [r, c] of piece.cells) {
        const shadow = this.add.image(c * size + size / 2 - ox + 8, r * size + size / 2 - oy + 16, TEX.blockShadow);
        container.add(shadow.setDisplaySize(size, size));
      }
    }
    for (const [r, c] of piece.cells) {
      container.add(addBlock(this, c * size + size / 2 - ox, r * size + size / 2 - oy, size, piece.color));
    }
    return container;
  }

  drawBoard() {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const value = this.board[r][c];
        const view = this.blockViews[r][c];
        view.setVisible(value !== null);
        if (value !== null) view.setTexture(TEX.block(value));
      }
    }
  }

  // Подсветка места под фигурой и линий, которые исчезнут после хода.
  drawPreview() {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        this.previewViews[r][c].setVisible(false);
        this.ghostFrames[r][c].setVisible(false);
      }
    }
    const drag = this.drag;
    if (!drag?.target) return;

    const { row, col } = drag.target;
    const texture = TEX.block(drag.piece.color);
    const placed = place(this.board, drag.piece.cells, row, col, drag.piece.color);

    const shown = [];
    for (const [r, c] of lineCells(findFullLines(placed))) {
      shown.push([this.previewViews[r][c].setTexture(texture).setVisible(true), 1]);
    }
    for (const [dr, dc] of drag.piece.cells) {
      const view = this.previewViews[row + dr][col + dc];
      if (!view.visible) shown.push([view.setTexture(texture).setVisible(true), 0.45]);
      shown.push([this.ghostFrames[row + dr][col + dc].setVisible(true), 1]);
    }
    // Подсветка проявляется плавно, а не вспыхивает.
    for (const [view, alpha] of shown) {
      this.tweens.killTweensOf(view);
      view.setAlpha(0);
      this.tweens.add({ targets: view, alpha, duration: 110, ease: 'Sine.easeOut' });
    }
  }

  // popSlots — слоты, где фигура новая: она выпрыгивает.
  drawTray(popSlots = []) {
    this.pieces.forEach((piece, slot) => {
      const { outer, body } = this.trayViews[slot];
      body.removeAll(true);
      if (!piece || this.drag?.slot === slot || this.returning.has(slot)) return;
      body.add(this.makePieceView(piece, trayCellFor(piece)));
      const order = popSlots.indexOf(slot);
      if (order >= 0) {
        this.tweens.killTweensOf(outer);
        outer.setScale(0);
        this.tweens.add({
          targets: outer,
          scale: 1,
          duration: 360,
          delay: 120 + order * 110,
          ease: 'Back.easeOut',
          easeParams: [1.5],
        });
      }
    });
  }
}

// Клетки очищаемых строк и столбцов без повторов: [[row, col], ...].
function lineCells({ rows, cols }) {
  const cells = new Map();
  for (const r of rows) {
    for (let c = 0; c < BOARD_SIZE; c++) cells.set(r * BOARD_SIZE + c, [r, c]);
  }
  for (const c of cols) {
    for (let r = 0; r < BOARD_SIZE; r++) cells.set(r * BOARD_SIZE + c, [r, c]);
  }
  return cells.values();
}
