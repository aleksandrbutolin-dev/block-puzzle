import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'Block Puzzle', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '72px',
        color: '#ffffff',
      })
      .setOrigin(0.5);
  }
}
