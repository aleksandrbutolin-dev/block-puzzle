import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { THEME } from './theme.js';
import { TEX } from './textures.js';
import { addText, addButton, addTextButton, showToast } from './ui.js';
import { showRewarded } from '../platform/ads.js';
import { playSound } from '../platform/audio.js';
import { loopTween } from './motion.js';

const PANEL_W = 560;
const PANEL_H = 560;
const DECIDE_SECONDS = 7; // после — автоматически «Нет»

// Окно «Продолжить?» поверх GameScene: реклама за вторую попытку.
// data: { onContinue, onGiveUp } — вызывается ровно одно из них.
export class ContinueScene extends Phaser.Scene {
  constructor() {
    super('Continue');
  }

  create({ onContinue, onGiveUp }) {
    this.onContinue = onContinue;
    this.onGiveUp = onGiveUp;
    this.decided = false;

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const shade = this.add
      .rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, THEME.overlay, 0.6)
      .setInteractive()
      .setAlpha(0);

    const panel = this.add.container(cx, cy);
    const bg = this.add.graphics();
    bg.fillStyle(0x2a1040, 0.2);
    bg.fillRoundedRect(-PANEL_W / 2, -PANEL_H / 2 + 9, PANEL_W, PANEL_H, 48);
    bg.fillStyle(0xe8cfe0, 1);
    bg.fillRoundedRect(-PANEL_W / 2, -PANEL_H / 2 + 8, PANEL_W, PANEL_H, 48);
    bg.fillStyle(THEME.panel, 1);
    bg.fillRoundedRect(-PANEL_W / 2, -PANEL_H / 2, PANEL_W, PANEL_H, 48);

    const ribbon = this.add.graphics();
    ribbon.fillStyle(0x2f55c0, 1);
    ribbon.fillRoundedRect(-230, -PANEL_H / 2 - 40, 460, 100, 50);
    ribbon.fillStyle(0x4f86ff, 1);
    ribbon.fillRoundedRect(-230, -PANEL_H / 2 - 48, 460, 96, 48);
    const title = addText(this, 0, -PANEL_H / 2, 'Продолжить?', 54, { stroke: '#1d3a8a' });

    const text = addText(this, 0, -150, 'Места больше нет.\nОсвободим часть поля —\nиграй дальше!', 34, {
      color: THEME.panelText,
      stroke: null,
      lineSpacing: 4,
    });

    // Кольцо обратного отсчёта
    this.ring = this.add.graphics();
    this.countText = addText(this, 0, 20, String(DECIDE_SECONDS), 56, {
      color: THEME.panelText,
      stroke: null,
    });

    const yes = addButton(this, 0, 150, 'Продолжить', () => this.accept(), {
      width: 420,
      height: 110,
      fontSize: 44,
      icon: TEX.video,
    });
    loopTween(this, { targets: yes, scale: 1.05, duration: 500, ease: 'Sine.easeInOut' });

    const no = addTextButton(this, 0, 245, 'Нет, спасибо', 32, () => this.decline());

    panel.add([bg, ribbon, title, text, this.ring, this.countText, yes, no.text, no.zone]);
    this.buttons = [yes, no.zone];

    panel.setScale(0.7).setAlpha(0);
    this.tweens.add({ targets: shade, alpha: 1, duration: 250 });
    this.tweens.add({ targets: panel, scale: 1, alpha: 1, duration: 380, ease: 'Back.easeOut' });

    this.timeLeft = DECIDE_SECONDS;
    this.countdown = this.time.addEvent({
      delay: 50,
      loop: true,
      callback: () => this.tick(0.05),
    });
    this.drawRing(1);
  }

  tick(seconds) {
    this.timeLeft = Math.max(0, this.timeLeft - seconds);
    this.countText.setText(String(Math.ceil(this.timeLeft)));
    this.drawRing(this.timeLeft / DECIDE_SECONDS);
    if (this.timeLeft === 0) this.decline();
  }

  drawRing(fraction) {
    const g = this.ring;
    g.clear();
    g.lineStyle(12, 0xe8d6ef, 1);
    g.strokeCircle(0, 20, 52);
    g.lineStyle(12, 0x4f86ff, 1);
    g.beginPath();
    g.arc(0, 20, 52, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * fraction, false);
    g.strokePath();
  }

  lock() {
    this.decided = true;
    this.countdown.remove();
    for (const button of this.buttons) button.disableInteractive();
  }

  async accept() {
    if (this.decided) return;
    this.lock();
    const rewarded = await showRewarded();
    if (rewarded) {
      this.scene.stop();
      this.onContinue();
    } else {
      showToast(this, 'Реклама недоступна', GAME_HEIGHT / 2 + 330);
      this.time.delayedCall(900, () => this.finish());
    }
  }

  decline() {
    if (this.decided) return;
    this.lock();
    playSound('back');
    this.finish();
  }

  finish() {
    this.scene.stop();
    this.onGiveUp();
  }
}
