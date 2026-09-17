import Phaser from 'phaser';

// Стартовая сцена. Позже здесь будет загрузка ресурсов и SDK.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    this.scene.start('Game');
  }
}
