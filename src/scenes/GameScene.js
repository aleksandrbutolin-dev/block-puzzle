import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { BOARD_SIZE, createBoard, canPlace, place, findFullLines, applyMove } from '../core/board.js';
import { generateSet, hasAnyMove, pieceSize } from '../core/pieces.js';
import { createRng } from '../core/random.js';
import { THEME, drawBlock } from './theme.js';

// Раскладка экрана 720×1280.
const CELL = 80;
const BOARD_PX = CELL * BOARD_SIZE;
const BOARD_X = (GAME_WIDTH - BOARD_PX) / 2;
const BOARD_Y = 240;
const BOARD_PADDING = 12;

const TRAY_Y = 1060; // центр лотка с фигурами
const TRAY_SLOT_W = GAME_WIDTH / 3;
const TRAY_SLOT_H = 280; // зона захвата фигуры — крупнее самой фигуры
const TRAY_CELL = 40; // фигуры в лотке — в половину размера

// Насколько фигура поднята над точкой касания, чтобы палец её не закрывал.
const LIFT_TOUCH = 140;
const LIFT_MOUSE = 20;

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

    this.add
      .text(GAME_WIDTH / 2, 90, '0', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '84px',
        fontStyle: 'bold',
        color: THEME.text,
      })
      .setOrigin(0.5);

    this.boardGraphics = this.add.graphics();
    this.previewGraphics = this.add.graphics();
    this.trayGraphics = this.add.graphics();

    for (let slot = 0; slot < this.pieces.length; slot++) {
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

  // ---------- Перетаскивание ----------

  startDrag(slot, pointer) {
    const piece = this.pieces[slot];
    if (this.isOver || this.drag || !piece || this.returning.has(slot)) return;

    const { rows, cols } = pieceSize(piece.cells);
    const sprite = this.add.graphics().setDepth(10);
    for (const [r, c] of piece.cells) {
      drawBlock(sprite, c * CELL, r * CELL, CELL, THEME.blocks[piece.color]);
    }

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
    this.previewGraphics.clear();

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

    if (result.linesCleared > 0) {
      this.animateClear(before, piece, row, col, result.lines);
    }

    if (this.pieces.every((p) => p === null)) {
      this.pieces = generateSet(this.board, this.rng);
    }

    this.drawBoard();
    this.drawTray();

    if (!hasAnyMove(this.board, this.pieces)) {
      this.showNoMoves();
    }
  }

  animateClear(before, piece, row, col, lines) {
    // Цвет очищенной клетки: был на поле до хода или пришёл с фигурой.
    const placed = place(before, piece.cells, row, col, piece.color);
    const cells = new Map();
    for (const r of lines.rows) {
      for (let c = 0; c < BOARD_SIZE; c++) cells.set(`${r},${c}`, [r, c]);
    }
    for (const c of lines.cols) {
      for (let r = 0; r < BOARD_SIZE; r++) cells.set(`${r},${c}`, [r, c]);
    }

    for (const [r, c] of cells.values()) {
      const g = this.add.graphics().setDepth(5);
      drawBlock(g, -CELL / 2, -CELL / 2, CELL, THEME.blocks[placed[r][c]]);
      g.setPosition(BOARD_X + c * CELL + CELL / 2, BOARD_Y + r * CELL + CELL / 2);
      const distance = Math.abs(r - row) + Math.abs(c - col);
      this.tweens.add({
        targets: g,
        scale: 0,
        alpha: 0,
        delay: distance * 20,
        duration: 220,
        ease: 'Back.easeIn',
        onComplete: () => g.destroy(),
      });
    }
  }

  // Временно, до экрана «Игра окончена» (шаг 2.5).
  showNoMoves() {
    this.isOver = true;
    this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6)
      .setDepth(20)
      .setInteractive()
      .on('pointerup', () => this.scene.restart());
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'Ходов нет\n\nнажмите, чтобы начать заново', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '40px',
        color: THEME.text,
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(21);
  }

  // ---------- Отрисовка ----------

  trayOrigin(slot, piece) {
    const { rows, cols } = pieceSize(piece.cells);
    return {
      x: TRAY_SLOT_W * slot + TRAY_SLOT_W / 2 - (cols * TRAY_CELL) / 2,
      y: TRAY_Y - (rows * TRAY_CELL) / 2,
    };
  }

  drawBoard() {
    const g = this.boardGraphics;
    g.clear();
    g.fillStyle(THEME.boardBackground, 1);
    g.fillRoundedRect(
      BOARD_X - BOARD_PADDING,
      BOARD_Y - BOARD_PADDING,
      BOARD_PX + BOARD_PADDING * 2,
      BOARD_PX + BOARD_PADDING * 2,
      20,
    );
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const x = BOARD_X + c * CELL;
        const y = BOARD_Y + r * CELL;
        const value = this.board[r][c];
        if (value === null) {
          g.fillStyle(THEME.emptyCell, 1);
          g.fillRoundedRect(x + 3, y + 3, CELL - 6, CELL - 6, 10);
        } else {
          drawBlock(g, x, y, CELL, THEME.blocks[value]);
        }
      }
    }
  }

  // Подсветка места под фигурой и линий, которые исчезнут после хода.
  drawPreview() {
    const g = this.previewGraphics;
    g.clear();
    const drag = this.drag;
    if (!drag?.target) return;

    const { row, col } = drag.target;
    const color = THEME.blocks[drag.piece.color];
    const placed = place(this.board, drag.piece.cells, row, col, drag.piece.color);
    const lines = findFullLines(placed);

    for (const r of lines.rows) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        drawBlock(g, BOARD_X + c * CELL, BOARD_Y + r * CELL, CELL, color);
      }
    }
    for (const c of lines.cols) {
      for (let r = 0; r < BOARD_SIZE; r++) {
        drawBlock(g, BOARD_X + c * CELL, BOARD_Y + r * CELL, CELL, color);
      }
    }

    g.fillStyle(color, 0.35);
    for (const [dr, dc] of drag.piece.cells) {
      const x = BOARD_X + (col + dc) * CELL;
      const y = BOARD_Y + (row + dr) * CELL;
      g.fillRoundedRect(x + 3, y + 3, CELL - 6, CELL - 6, 10);
    }
  }

  drawTray() {
    const g = this.trayGraphics;
    g.clear();
    this.pieces.forEach((piece, slot) => {
      if (!piece || this.drag?.slot === slot || this.returning.has(slot)) return;
      const { x, y } = this.trayOrigin(slot, piece);
      for (const [r, c] of piece.cells) {
        drawBlock(g, x + c * TRAY_CELL, y + r * TRAY_CELL, TRAY_CELL, THEME.blocks[piece.color]);
      }
    });
  }
}
