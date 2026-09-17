import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { THEME } from './theme.js';
import { addText, addButton } from './ui.js';
import { playSound } from '../platform/audio.js';

const PANEL_W = 560;
const PANEL_H = 620;

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
      .rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, THEME.overlay, 0.6)
      .setInteractive();
    shade.alpha = 0;

    const panel = this.add.container(cx, cy);
    const bg = this.add.graphics();
    bg.fillStyle(0x2a1040, 0.35);
    bg.fillRoundedRect(-PANEL_W / 2, -PANEL_H / 2 + 16, PANEL_W, PANEL_H, 48);
    bg.fillStyle(0xe8cfe0, 1);
    bg.fillRoundedRect(-PANEL_W / 2, -PANEL_H / 2 + 8, PANEL_W, PANEL_H, 48);
    bg.fillStyle(THEME.panel, 1);
    bg.fillRoundedRect(-PANEL_W / 2, -PANEL_H / 2, PANEL_W, PANEL_H, 48);

    // Лента с заголовком
    const ribbon = this.add.graphics();
    ribbon.fillStyle(0xd24d8a, 1);
    ribbon.fillRoundedRect(-240, -PANEL_H / 2 - 40, 480, 100, 50);
    ribbon.fillStyle(0xff7ab0, 1);
    ribbon.fillRoundedRect(-240, -PANEL_H / 2 - 48, 480, 96, 48);
    const title = addText(this, 0, -PANEL_H / 2, 'Игра окончена', 50, { stroke: '#8a2358' });

    const muted = { color: THEME.panelMuted, stroke: null };
    const scoreLabel = addText(this, 0, -170, 'Счёт', 36, muted);
    const scoreText = addText(this, 0, -80, '0', 120, { color: THEME.panelText, stroke: null });
    const bestText = isNewBest
      ? addText(this, 0, 50, 'Новый рекорд!', 44, { color: THEME.gold, stroke: '#b5651d' })
      : addText(this, 0, 50, `Рекорд: ${best}`, 40, muted);
    const button = addButton(this, 0, 190, 'Заново', () => this.restart());

    panel.add([bg, ribbon, title, scoreLabel, scoreText, bestText, button]);
    panel.setScale(0.6).setAlpha(0);

    this.tweens.add({ targets: shade, alpha: 1, duration: 250 });
    this.tweens.add({
      targets: panel,
      scale: 1,
      alpha: 1,
      duration: 420,
      delay: 150,
      ease: 'Back.easeOut',
    });

    // Счёт «набегает» от 0.
    const counter = { value: 0 };
    this.tweens.add({
      targets: counter,
      value: score,
      duration: Math.min(1200, 300 + score),
      delay: 450,
      ease: 'Quad.easeOut',
      onUpdate: () => scoreText.setText(String(Math.round(counter.value))),
    });

    if (isNewBest) {
      this.time.delayedCall(450, () => playSound('fanfare'));
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
    playSound('button');
    this.scene.stop();
    this.scene.get('Game').scene.restart();
  }
}
