import Phaser from 'phaser';
import { GAME_WIDTH } from '../config.js';
import { BOARD_SIZE, createBoard } from '../core/board.js';
import { generateSet, pieceSize } from '../core/pieces.js';
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
const TRAY_CELL = 40; // фигуры в лотке — в половину размера

export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    this.rng = createRng();
    this.board = createBoard();
    this.pieces = generateSet(this.board, this.rng);

    this.add
      .text(GAME_WIDTH / 2, 90, '0', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '84px',
        fontStyle: 'bold',
        color: THEME.text,
      })
      .setOrigin(0.5);

    this.boardGraphics = this.add.graphics();
    this.trayGraphics = this.add.graphics();

    this.createButton(GAME_WIDTH / 2, 1225, 'Новый набор', () => {
      this.pieces = generateSet(this.board, this.rng);
      this.drawTray();
    });

    this.drawBoard();
    this.drawTray();
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

  drawTray() {
    const g = this.trayGraphics;
    g.clear();
    this.pieces.forEach((piece, slot) => {
      if (!piece) return;
      const { rows, cols } = pieceSize(piece.cells);
      const centerX = TRAY_SLOT_W * slot + TRAY_SLOT_W / 2;
      const left = centerX - (cols * TRAY_CELL) / 2;
      const top = TRAY_Y - (rows * TRAY_CELL) / 2;
      for (const [r, c] of piece.cells) {
        drawBlock(g, left + c * TRAY_CELL, top + r * TRAY_CELL, TRAY_CELL, THEME.blocks[piece.color]);
      }
    });
  }

  createButton(x, y, label, onClick) {
    const width = 320;
    const height = 72;
    const bg = this.add
      .rectangle(x, y, width, height, THEME.button)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(x, y, label, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '32px',
        color: THEME.text,
      })
      .setOrigin(0.5);
    bg.on('pointerdown', () => bg.setFillStyle(THEME.buttonPressed));
    bg.on('pointerout', () => bg.setFillStyle(THEME.button));
    bg.on('pointerup', () => {
      bg.setFillStyle(THEME.button);
      onClick();
    });
    return bg;
  }
}
