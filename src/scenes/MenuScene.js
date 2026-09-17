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
} from './ui.js';
import { getProgress, takeCheckInReward } from '../meta/store.js';
import { STREAK_REWARDS, isTaskDone, currentLevel, totalStars } from '../meta/progress.js';
import { LEVELS_TOTAL } from '../core/levels.js';
import { playSound } from '../platform/audio.js';
import { loopTween, reducedMotion } from './motion.js';

// Цвета карточек режимов: лицо, боковина, блик, обводка текста.
const CARD_COLORS = {
  green: [0x3fb75c, 0x25793a, 0x8ff0a0, '#1f6b34'],
  blue: [0x3f6fe0, 0x2a4aa0, 0x9dbcff, '#1d3a8a'],
};

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

    // Выбор режима: две карточки с названием и пояснением, что внутри.
    addText(this, GAME_WIDTH / 2, 330, 'Выбери режим игры', 32, { color: THEME.textMuted });

    const level = currentLevel(progress, LEVELS_TOTAL);
    const adventure = this.modeCard(456, {
      variant: 'green',
      title: 'Приключение',
      desc: 'Уровни с целями и звёздами',
      meta: `Уровень ${level} из ${LEVELS_TOTAL} · звёзд ${totalStars(progress)}`,
      icon: (x, y) => this.add.image(x, y, TEX.star).setDisplaySize(62, 62),
      onTap: () => this.scene.start('Map'),
    });
    loopTween(this, { targets: adventure, scale: 1.03, duration: 900, ease: 'Sine.easeInOut' });

    this.modeCard(654, {
      variant: 'blue',
      title: 'Классика',
      desc: 'Бесконечная игра на рекорд',
      meta: `Рекорд: ${progress.best}`,
      icon: (x, y) => addBlock(this, x, y, 58, 5),
      onTap: () => this.scene.start('Game'),
    });

    this.createStreakRow(progress.streak.count);

    const readyTasks = progress.daily.tasks.filter((t) => isTaskDone(t) && !t.claimed).length;
    addButton(this, GAME_WIDTH / 2 - 165, 1090, 'Задания', () => this.scene.start('Tasks'), {
      width: 300,
      height: 110,
      variant: 'blue',
      fontSize: 36,
      icon: TEX.tasks,
    });
    // Готовые награды показываем подписью под кнопкой, а не значком поверх неё.
    if (readyTasks > 0) {
      addText(this, GAME_WIDTH / 2 - 165, 1172, `Награды: ${readyTasks}`, 30, { color: THEME.gold });
    }

    addButton(this, GAME_WIDTH / 2 + 165, 1090, 'Коллекция', () => this.scene.start('Collection'), {
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

  createLogo() {
    const size = 60;
    const gap = 6;
    const total = LOGO_BLOCKS.length * size + (LOGO_BLOCKS.length - 1) * gap;
    LOGO_BLOCKS.forEach((color, i) => {
      const x = GAME_WIDTH / 2 - total / 2 + size / 2 + i * (size + gap);
      const block = addBlock(this, x, 150, size, color);
      const base = block.scale;
      block.setScale(0);
      this.tweens.add({ targets: block, scale: base, duration: 400, delay: 100 + i * 70, ease: 'Back.easeOut' });
      loopTween(this, {
        targets: block,
        y: 136,
        duration: 500,
        delay: 500 + i * 90,
        repeatDelay: 1800,
        ease: 'Sine.easeInOut',
      });
    });
    const title = addText(this, GAME_WIDTH / 2, 232, 'Блок-пазл', 78);
    title.setAngle(-3);
    loopTween(this, { targets: title, angle: 3, duration: 1600, ease: 'Sine.easeInOut' });
    if (reducedMotion) title.setAngle(0);
  }

  // Ряд из 7 дней серии: пройденные — золотые, сегодняшний — крупнее.
  createStreakRow(streakCount) {
    const y = 915;
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
      addText(this, x, y + 74, `${day}`, 30, { color: done ? THEME.gold : '#8f9bd6', stroke: null });
      if (isToday) {
        loopTween(this, { targets: circle, alpha: 0.75, duration: 600 });
      }
    });
  }

  // Карточка режима: название, пояснение и строка прогресса.
  modeCard(y, { variant, title, desc, meta, icon, onTap }) {
    const W = 620;
    const H = 176;
    const [face, side, highlight, textStroke] = CARD_COLORS[variant];
    const card = this.add.container(GAME_WIDTH / 2, y);

    const g = this.add.graphics();
    g.fillStyle(0x2a1040, 0.18);
    g.fillRoundedRect(-W / 2, -H / 2 + 14, W, H, 40);
    g.fillStyle(side, 1);
    g.fillRoundedRect(-W / 2, -H / 2 + 10, W, H, 40);
    g.fillStyle(face, 1);
    g.fillRoundedRect(-W / 2, -H / 2, W, H, 40);
    g.fillStyle(highlight, 0.55);
    g.fillRoundedRect(-W / 2 + 22, -H / 2 + 8, W - 44, 34, 17);

    const plate = this.add.circle(-W / 2 + 84, 0, 54, 0xffffff, 0.22).setStrokeStyle(4, 0xffffff, 0.5);
    const art = icon(plate.x, 0);

    const left = -W / 2 + 156;
    const titleText = addText(this, left, -46, title, 46, { stroke: textStroke }).setOrigin(0, 0.5);
    titleText.x = left - titleText.padding.left;
    const descText = addText(this, left, 10, desc, 26, { stroke: null }).setOrigin(0, 0.5);
    descText.x = left - descText.padding.left;
    const metaText = addText(this, left, 56, meta, 26, { color: THEME.gold, stroke: null }).setOrigin(0, 0.5);
    metaText.x = left - metaText.padding.left;

    // Стрелка «дальше» у правого края.
    const arrow = this.add.graphics();
    arrow.fillStyle(0xffffff, 0.85);
    arrow.beginPath();
    arrow.moveTo(W / 2 - 66, -22);
    arrow.lineTo(W / 2 - 38, 0);
    arrow.lineTo(W / 2 - 66, 22);
    arrow.lineTo(W / 2 - 54, 0);
    arrow.closePath();
    arrow.fillPath();

    card.add([g, plate, art, titleText, descText, metaText, arrow]);

    const zone = this.add.zone(0, 0, W, H).setInteractive({ useHandCursor: true });
    card.add(zone);
    zone.on('pointerdown', () => {
      playSound('button');
      this.tweens.add({ targets: card, scale: 0.97, duration: 90, yoyo: true, onComplete: onTap });
    });
    return card;
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
    loopTween(this, { targets: coin, angle: 8, duration: 500, ease: 'Sine.easeInOut' });
    this.time.delayedCall(250, () => playSound('record'));
  }
}
