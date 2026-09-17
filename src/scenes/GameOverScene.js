import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { THEME } from './theme.js';
import { addText, addButton } from './ui.js';

// Окно «Игра окончена» поверх GameScene.
export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  create({ score, best, isNewBest }) {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    // Затемнение перехватывает касания, чтобы игра под ним не реагировала.
    const shade = this.add
      .rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, THEME.overlay, 0.75)
      .setInteractive();
    shade.alpha = 0;

    const panel = this.add.container(cx, cy);
    const bg = this.add.graphics();
    bg.fillStyle(THEME.panel, 1);
    bg.fillRoundedRect(-280, -300, 560, 600, 36);

    const title = addText(this, 0, -220, 'Игра окончена', 52, { fontStyle: 'bold' });
    const scoreLabel = addText(this, 0, -120, 'Счёт', 32, { color: THEME.textMuted });
    const scoreText = addText(this, 0, -50, '0', 96, { fontStyle: 'bold' });
    const bestText = isNewBest
      ? addText(this, 0, 50, 'Новый рекорд!', 44, { color: THEME.gold, fontStyle: 'bold' })
      : addText(this, 0, 50, `Рекорд: ${best}`, 36, { color: THEME.textMuted });
    const button = addButton(this, 0, 190, 'Заново', () => this.restart());

    panel.add([bg, title, scoreLabel, scoreText, bestText, button]);
    panel.setScale(0.8).setAlpha(0);

    this.tweens.add({ targets: shade, alpha: 1, duration: 250 });
    this.tweens.add({
      targets: panel,
      scale: 1,
      alpha: 1,
      duration: 300,
      delay: 150,
      ease: 'Back.easeOut',
    });

    // Счёт «набегает» от 0.
    const counter = { value: 0 };
    this.tweens.add({
      targets: counter,
      value: score,
      duration: Math.min(1200, 300 + score),
      delay: 400,
      ease: 'Quad.easeOut',
      onUpdate: () => scoreText.setText(String(Math.round(counter.value))),
    });

    if (isNewBest) {
      this.tweens.add({
        targets: bestText,
        scale: 1.12,
        duration: 500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  restart() {
    this.scene.stop();
    this.scene.get('Game').scene.restart();
  }
}
