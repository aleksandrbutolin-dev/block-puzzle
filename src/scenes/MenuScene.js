import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { THEME } from './theme.js';
import { TEX, addBlock } from './textures.js';
import { addBackdrop } from './backdrop.js';
import {
  addText,
  addButton,
  addSoundButton,
  addCoinCounter,
  flyCoins,
  showToast,
} from './ui.js';
import { getProgress, takeCheckInReward } from '../meta/store.js';
import { STREAK_REWARDS, isTaskDone } from '../meta/progress.js';
import { playSound } from '../platform/audio.js';

// Цвета блоков в логотипе.
const LOGO_BLOCKS = [0, 1, 2, 3, 4, 5, 6];

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    const progress = getProgress();
    addBackdrop(this);

    this.coins = addCoinCounter(this, 24, 58);
    addSoundButton(this);

    this.createLogo();
    addText(this, GAME_WIDTH / 2, 470, `Рекорд: ${progress.best}`, 40);

    const play = addButton(this, GAME_WIDTH / 2, 610, 'Играть', () => this.scene.start('Game'), {
      width: 460,
      height: 130,
      fontSize: 64,
    });
    this.tweens.add({
      targets: play,
      scale: 1.05,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.createStreakRow(progress.streak.count);

    const readyTasks = progress.daily.tasks.filter((t) => isTaskDone(t) && !t.claimed).length;
    const tasksButton = addButton(this, GAME_WIDTH / 2 - 165, 1080, 'Задания', () => this.scene.start('Tasks'), {
      width: 300,
      height: 110,
      variant: 'blue',
      fontSize: 36,
      icon: TEX.tasks,
    });
    if (readyTasks > 0) this.addBadge(tasksButton, readyTasks);

    addButton(this, GAME_WIDTH / 2 + 165, 1080, 'Коллекция', () => this.soon(), {
      width: 300,
      height: 110,
      variant: 'pink',
      fontSize: 34,
      icon: TEX.collection,
    });

    const checkIn = takeCheckInReward();
    if (checkIn.reward > 0) {
      this.coins.setValue(progress.coins - checkIn.reward);
      this.time.delayedCall(400, () => this.showDailyReward(checkIn));
    } else {
      this.coins.setValue(progress.coins);
    }
  }

  soon() {
    showToast(this, 'Скоро!', 900);
  }

  createLogo() {
    const size = 72;
    const gap = 6;
    const total = LOGO_BLOCKS.length * size + (LOGO_BLOCKS.length - 1) * gap;
    LOGO_BLOCKS.forEach((color, i) => {
      const x = GAME_WIDTH / 2 - total / 2 + size / 2 + i * (size + gap);
      const block = addBlock(this, x, 190, size, color);
      const base = block.scale;
      block.setScale(0);
      this.tweens.chain({
        targets: block,
        tweens: [
          { scale: base, duration: 400, delay: 100 + i * 70, ease: 'Back.easeOut' },
          {
            y: 175,
            duration: 500,
            delay: i * 90,
            yoyo: true,
            repeat: -1,
            repeatDelay: 1800,
            ease: 'Sine.easeInOut',
          },
        ],
      });
    });
    const title = addText(this, GAME_WIDTH / 2, 320, 'Блок-пазл', 104);
    title.setAngle(-3);
    this.tweens.add({
      targets: title,
      angle: 3,
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  // Ряд из 7 дней серии: пройденные — золотые, сегодняшний — крупнее.
  createStreakRow(streakCount) {
    const y = 840;
    const panel = this.add.graphics();
    panel.fillStyle(0x1e2958, 0.88);
    panel.fillRoundedRect(30, y - 115, GAME_WIDTH - 60, 225, 36);
    panel.lineStyle(5, 0xffd9a0, 1);
    panel.strokeRoundedRect(30, y - 115, GAME_WIDTH - 60, 225, 36);
    addText(this, GAME_WIDTH / 2, y - 72, `Серия входов: ${streakCount} дн.`, 36);

    const today = ((Math.max(streakCount, 1) - 1) % STREAK_REWARDS.length) + 1;
    const step = (GAME_WIDTH - 110) / STREAK_REWARDS.length;
    STREAK_REWARDS.forEach((reward, i) => {
      const day = i + 1;
      const x = 55 + step / 2 + i * step;
      const done = day <= today;
      const isToday = day === today;
      const circle = this.add.graphics();
      const r = isToday ? 40 : 34;
      circle.fillStyle(done ? 0xffc93a : 0x3a4a8a, 1);
      circle.fillCircle(x, y + 10, r);
      circle.lineStyle(4, isToday ? 0xffffff : done ? 0xd98010 : 0x5a6ab0, 1);
      circle.strokeCircle(x, y + 10, r);
      addText(this, x, y + 10, String(reward), isToday ? 30 : 26, {
        color: done ? '#7a3a00' : '#c9d2ff',
        stroke: null,
      });
      addText(this, x, y + 72, `${day}`, 24, { color: done ? THEME.gold : '#8f9bd6', stroke: null });
      if (isToday) {
        this.tweens.add({
          targets: circle,
          alpha: 0.75,
          duration: 600,
          yoyo: true,
          repeat: -1,
        });
      }
    });
  }

  addBadge(button, count) {
    const badge = this.add.container(button.x + 130, button.y - 50).setDepth(25);
    const circle = this.add.circle(0, 0, 26, 0xff3b4e).setStrokeStyle(4, 0xffffff);
    badge.add([circle, addText(this, 0, -1, String(count), 30, { stroke: null })]);
    this.tweens.add({ targets: badge, scale: 1.15, duration: 500, yoyo: true, repeat: -1 });
  }

  // Окно «Награда за вход».
  showDailyReward({ reward, streakDay }) {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const layer = this.add.container(0, 0).setDepth(50);
    const shade = this.add
      .rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, THEME.overlay, 0.65)
      .setInteractive();
    layer.add(shade);

    const panel = this.add.container(cx, cy);
    const bg = this.add.graphics();
    bg.fillStyle(0xe8cfe0, 1);
    bg.fillRoundedRect(-260, -250, 520, 520, 48);
    bg.fillStyle(THEME.panel, 1);
    bg.fillRoundedRect(-260, -258, 520, 520, 48);
    const ribbon = this.add.graphics();
    ribbon.fillStyle(0xc97416, 1);
    ribbon.fillRoundedRect(-230, -300, 460, 100, 50);
    ribbon.fillStyle(0xffa53d, 1);
    ribbon.fillRoundedRect(-230, -308, 460, 96, 48);
    const title = addText(this, 0, -260, 'Награда за вход', 44, { stroke: '#8a4a0c' });
    const dayText = addText(this, 0, -160, `День ${streakDay}`, 40, {
      color: THEME.panelMuted,
      stroke: null,
    });
    const coin = this.add.image(0, -30, TEX.coin).setDisplaySize(150, 150);
    const amount = addText(this, 0, 90, `+${reward}`, 72, { color: THEME.gold, stroke: '#b5651d' });
    const button = addButton(this, 0, 195, 'Забрать', () => {
      button.disableInteractive();
      const m = coin.getWorldTransformMatrix();
      flyCoins(this, m.tx, m.ty, this.coins, 10, () => {});
      this.coins.setValue(getProgress().coins, true);
      coin.setVisible(false);
      this.tweens.add({
        targets: layer,
        alpha: 0,
        duration: 300,
        delay: 250,
        onComplete: () => layer.destroy(),
      });
    });
    panel.add([bg, ribbon, title, dayText, coin, amount, button]);
    layer.add(panel);

    panel.setScale(0.5).setAlpha(0);
    shade.setAlpha(0);
    this.tweens.add({ targets: shade, alpha: 1, duration: 250 });
    this.tweens.add({ targets: panel, scale: 1, alpha: 1, duration: 400, ease: 'Back.easeOut' });
    this.tweens.add({ targets: coin, angle: 8, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.time.delayedCall(250, () => playSound('record'));
  }
}
