import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { THEME } from './theme.js';
import { TEX } from './textures.js';
import { addText, addButton } from './ui.js';
import { playSound } from '../platform/audio.js';
import { loopTween, reducedMotion } from './motion.js';

const PANEL_W = 560;
const PANEL_H = 620;

// Окно «Игра окончена» поверх GameScene.
export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  create({ score, best, isNewBest, coinsEarned = 0, tasksDone = [] }) {
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
    const scoreLabel = addText(this, 0, -196, 'Счёт', 32, muted);
    const scoreText = addText(this, 0, -84, '0', 104, { color: THEME.panelText, stroke: null });
    const bestText = isNewBest
      ? addText(this, 0, 20, 'Новый рекорд!', 44, { color: THEME.gold, stroke: '#b5651d' })
      : addText(this, 0, 20, `Рекорд: ${best}`, 40, muted);

    // Монеты за партию
    const coinsText = addText(this, 0, 100, `+${coinsEarned}`, 52, { color: THEME.gold, stroke: '#b5651d' });
    const coinIcon = this.add.image(0, 100, TEX.coin).setDisplaySize(60, 60);
    const rowWidth = coinIcon.displayWidth + 12 + coinsText.width;
    coinIcon.x = -rowWidth / 2 + coinIcon.displayWidth / 2;
    coinsText.setOrigin(0, 0.5).setX(coinIcon.x + coinIcon.displayWidth / 2 + 12 - coinsText.padding.left);

    const again = addButton(this, 70, 215, 'Заново', () => this.restart(), { width: 300 });
    const home = addButton(this, -175, 215, '', () => this.toMenu(), {
      width: 150,
      variant: 'blue',
      icon: TEX.home,
    });

    panel.add([bg, ribbon, title, scoreLabel, scoreText, bestText, coinIcon, coinsText, again, home]);
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

    // Задания, выполненные последней партией, — плашка над окном.
    tasksDone.forEach((task, i) => {
      const banner = addText(this, cx, 228 - i * 62, `Задание выполнено! +${task.reward}`, 38, {
        color: THEME.gold,
      }).setScale(0);
      this.tweens.add({
        targets: banner,
        scale: 1,
        duration: 400,
        delay: 700 + i * 200,
        ease: 'Back.easeOut',
        onStart: () => playSound('record'),
      });
    });

    if (isNewBest) {
      this.time.delayedCall(450, () => playSound('fanfare'));
      loopTween(this, { targets: bestText, scale: 1.12, duration: 500, ease: 'Sine.easeInOut' });
    }
  }

  restart() {
    this.scene.stop();
    this.scene.get('Game').scene.restart();
  }

  toMenu() {
    this.scene.stop();
    this.scene.get('Game').scene.start('Menu');
  }
}
