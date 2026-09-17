import Phaser from 'phaser';
import { generateTextures } from './textures.js';
import { BOARD_PX } from './GameScene.js';

// Стартовая сцена: готовит графику. Позже здесь будет загрузка звуков и SDK.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    generateTextures(this, BOARD_PX);
    this.scene.start('Game');
  }
}
