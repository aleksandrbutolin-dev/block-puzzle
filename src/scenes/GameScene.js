import Phaser from 'phaser';
import { GAME_WIDTH } from '../config.js';
import { BOARD_SIZE, createBoard, canPlace, place, findFullLines, applyMove } from '../core/board.js';
import { generateSet, hasAnyMove, pieceSize } from '../core/pieces.js';
import { createRng } from '../core/random.js';
import { createScoreState, scoreMove } from '../core/score.js';
import { loadValue, saveValue } from '../platform/storage.js';
import { THEME } from './theme.js';
import { TEX, TRAY_TEX_PADDING, TRAY_TEX_MARGIN, addBlock } from './textures.js';
import { addText } from './ui.js';

// Раскладка экрана 720×1280.
export const CELL = 80;
export const BOARD_PX = CELL * BOARD_SIZE;
const BOARD_X = (GAME_WIDTH - BOARD_PX) / 2;
const BOARD_Y = 250;

const TRAY_Y = 1075; // центр лотка с фигурами
const TRAY_SLOT_W = GAME_WIDTH / 3;
const TRAY_SLOT_H = 280; // зона захвата фигуры — крупнее самой фигуры
const TRAY_CELL = 44; // размер клетки фигуры в лотке

// Насколько фигура поднята над точкой касания, чтобы палец её не закрывал.
const LIFT_TOUCH = 140;
const LIFT_MOUSE = 20;

const cellCenter = (row, col) => ({
  x: BOARD_X + col * CELL + CELL / 2,
  y: BOARD_Y + row * CELL + CELL / 2,
});

export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    this.rng = createRng();
    this.board = createBoard();
    this.pieces = generateSet(this.board, this.rng);
    this.drag = null;
    this.returning = new Set(); // слоты, чьи фигуры летят обратно в лоток
    this.isOver = false;
    this.scoreState = createScoreState();
    this.bestAtStart = loadValue('best', 0);
    this.best = this.bestAtStart;
    this.shownScore = 0;

    this.add.image(0, 0, TEX.background).setOrigin(0);
    this.createBoardView();

    this.bestText = addText(this, GAME_WIDTH / 2, 52, '', 30);
    this.scoreText = addText(this, GAME_WIDTH / 2, 142, '0', 104);
    this.updateBestText();

    this.trayViews = [0, 1, 2].map(() => this.add.container(0, 0).setDepth(5));
    for (let slot = 0; slot < this.trayViews.length; slot++) {
      this.add
        .zone(TRAY_SLOT_W * slot + TRAY_SLOT_W / 2, TRAY_Y, TRAY_SLOT_W, TRAY_SLOT_H)
        .setInteractive()
        .on('pointerdown', (pointer) => this.startDrag(slot, pointer));
    }
    this.input.on('pointermove', (pointer) => this.moveDrag(pointer));
    this.input.on('pointerup', (pointer) => this.endDrag(pointer));
    this.input.on('pointerupoutside', (pointer) => this.endDrag(pointer));

    this.drawBoard();
    this.drawTray();
  }

  createBoardView() {
    const offset = TRAY_TEX_PADDING + TRAY_TEX_MARGIN;
    this.add.image(BOARD_X - offset, BOARD_Y - offset, TEX.tray).setOrigin(0);

    this.blockViews = [];
    this.previewViews = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      this.blockViews.push([]);
      this.previewViews.push([]);
      for (let c = 0; c < BOARD_SIZE; c++) {
        const { x, y } = cellCenter(r, c);
        this.add.image(x, y, TEX.cell).setDisplaySize(CELL, CELL);
        this.blockViews[r].push(addBlock(this, x, y, CELL, 0).setVisible(false).setDepth(1));
        this.previewViews[r].push(addBlock(this, x, y, CELL, 0).setVisible(false).setDepth(2));
      }
    }
  }

  // ---------- Перетаскивание ----------

  startDrag(slot, pointer) {
    const piece = this.pieces[slot];
    if (this.isOver || this.drag || !piece || this.returning.has(slot)) return;

    const { rows, cols } = pieceSize(piece.cells);
    const sprite = this.makePieceView(piece, CELL).setDepth(10);

    this.drag = {
      slot,
      piece,
      sprite,
      rows,
      cols,
      pointerId: pointer.id,
      lift: pointer.wasTouch ? LIFT_TOUCH : LIFT_MOUSE,
      target: null,
    };

    // Фигура «вырастает» из лотка до размера клеток поля.
    const from = this.trayOrigin(slot, piece);
    sprite.setPosition(from.x, from.y).setScale(TRAY_CELL / CELL);
    this.tweens.add({ targets: sprite, scale: 1, duration: 90, ease: 'Quad.easeOut' });

    this.drawTray();
    this.moveDrag(pointer);
  }

  moveDrag(pointer) {
    const drag = this.drag;
    if (!drag || pointer.id !== drag.pointerId) return;

    const left = pointer.x - (drag.cols * CELL) / 2;
    const top = pointer.y - drag.lift - drag.rows * CELL;
    drag.sprite.setPosition(left, top);

    const row = Math.round((top - BOARD_Y) / CELL);
    const col = Math.round((left - BOARD_X) / CELL);
    const valid = canPlace(this.board, drag.piece.cells, row, col);
    const target = valid ? { row, col } : null;

    if (target?.row !== drag.target?.row || target?.col !== drag.target?.col) {
      drag.target = target;
      this.drawPreview();
    }
  }

  endDrag(pointer) {
    const drag = this.drag;
    if (!drag || pointer.id !== drag.pointerId) return;
    this.drag = null;
    this.drawPreview();

    if (drag.target) {
      drag.sprite.destroy();
      this.makeMove(drag.slot, drag.piece, drag.target.row, drag.target.col);
      return;
    }

    // Мимо — фигура возвращается в лоток.
    const home = this.trayOrigin(drag.slot, drag.piece);
    this.returning.add(drag.slot);
    this.tweens.add({
      targets: drag.sprite,
      x: home.x,
      y: home.y,
      scale: TRAY_CELL / CELL,
      duration: 160,
      ease: 'Quad.easeOut',
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

    if (result.linesCleared > 0) {
      this.animateClear(before, piece, row, col, result.lines);
    }
    this.showMovePopups(scored, piece, row, col);

    if (this.pieces.every((p) => p === null)) {
      this.pieces = generateSet(this.board, this.rng);
    }

    this.drawBoard();
    this.drawTray();

    if (!hasAnyMove(this.board, this.pieces)) {
      this.endGame();
    }
  }

  animateClear(before, piece, row, col, lines) {
    // Цвет очищенной клетки: был на поле до хода или пришёл с фигурой.
    const placed = place(before, piece.cells, row, col, piece.color);
    for (const [r, c] of lineCells(lines)) {
      const { x, y } = cellCenter(r, c);
      const block = addBlock(this, x, y, CELL, placed[r][c]).setDepth(6);
      const distance = Math.abs(r - row) + Math.abs(c - col);
      this.tweens.add({
        targets: block,
        scale: 0,
        alpha: 0,
        delay: distance * 20,
        duration: 220,
        ease: 'Back.easeIn',
        onComplete: () => block.destroy(),
      });
    }
  }

  // ---------- Счёт ----------

  updateScore() {
    const score = this.scoreState.score;
    if (score > this.best) {
      this.best = score;
      saveValue('best', score); // сразу, чтобы рекорд не пропал при закрытии вкладки
      this.updateBestText();
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
    this.tweens.add({
      targets: this.scoreText,
      scale: { from: 1.12, to: 1 },
      duration: 200,
    });
  }

  updateBestText() {
    this.bestText.setText(`Рекорд: ${this.best}`);
  }

  // Всплывающие «+N», «Комбо», «Серия», «Чистое поле» над местом хода.
  showMovePopups(scored, piece, row, col) {
    const { rows, cols } = pieceSize(piece.cells);
    const x = BOARD_X + (col + cols / 2) * CELL;
    const y = BOARD_Y + (row + rows / 2) * CELL;

    const lines = [{ text: `+${scored.points}`, size: 60, color: THEME.text }];
    if (scored.combo >= 2) {
      lines.push({ text: `Комбо ×${scored.combo}`, size: 48, color: THEME.gold });
    }
    if (scored.streak >= 2) {
      lines.push({ text: `Серия ×${scored.streak}`, size: 44, color: THEME.green });
    }
    if (scored.bonusPoints > 0) {
      lines.push({ text: 'Чистое поле!', size: 52, color: THEME.cyan });
    }

    lines.forEach((line, i) => {
      const label = addText(this, x, y + i * 62, line.text, line.size, {
        color: line.color,
      }).setDepth(15);
      // Не даём надписи вылезти за край экрана.
      const half = label.width / 2 + 8;
      label.x = Phaser.Math.Clamp(x, half, GAME_WIDTH - half);
      label.setScale(0.5);
      this.tweens.add({
        targets: label,
        scale: 1,
        duration: 180,
        delay: i * 90,
        ease: 'Back.easeOut',
      });
      this.tweens.add({
        targets: label,
        y: label.y - 90,
        alpha: 0,
        duration: 700,
        delay: 450 + i * 90,
        ease: 'Quad.easeIn',
        onComplete: () => label.destroy(),
      });
    });
  }

  endGame() {
    this.isOver = true;
    const score = this.scoreState.score;
    const isNewBest = score > this.bestAtStart;

    // Пауза, чтобы игрок увидел последний ход.
    this.time.delayedCall(700, () => {
      this.scene.launch('GameOver', { score, best: this.best, isNewBest });
    });
  }

  // ---------- Отрисовка ----------

  // Фигура из блоков; (0, 0) контейнера — левый верхний угол фигуры.
  makePieceView(piece, size) {
    const container = this.add.container(0, 0);
    for (const [r, c] of piece.cells) {
      container.add(addBlock(this, c * size + size / 2, r * size + size / 2, size, piece.color));
    }
    return container;
  }

  trayOrigin(slot, piece) {
    const { rows, cols } = pieceSize(piece.cells);
    return {
      x: TRAY_SLOT_W * slot + TRAY_SLOT_W / 2 - (cols * TRAY_CELL) / 2,
      y: TRAY_Y - (rows * TRAY_CELL) / 2,
    };
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
    for (const line of this.previewViews) {
      for (const view of line) view.setVisible(false);
    }
    const drag = this.drag;
    if (!drag?.target) return;

    const { row, col } = drag.target;
    const texture = TEX.block(drag.piece.color);
    const placed = place(this.board, drag.piece.cells, row, col, drag.piece.color);

    for (const [r, c] of lineCells(findFullLines(placed))) {
      this.previewViews[r][c].setTexture(texture).setAlpha(1).setVisible(true);
    }
    for (const [dr, dc] of drag.piece.cells) {
      const view = this.previewViews[row + dr][col + dc];
      if (!view.visible) view.setTexture(texture).setAlpha(0.4).setVisible(true);
    }
  }

  drawTray() {
    this.pieces.forEach((piece, slot) => {
      const view = this.trayViews[slot];
      view.removeAll(true);
      if (!piece || this.drag?.slot === slot || this.returning.has(slot)) return;
      const { x, y } = this.trayOrigin(slot, piece);
      view.setPosition(x, y);
      for (const [r, c] of piece.cells) {
        const cx = c * TRAY_CELL + TRAY_CELL / 2;
        const cy = r * TRAY_CELL + TRAY_CELL / 2;
        view.add(addBlock(this, cx, cy, TRAY_CELL, piece.color));
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
