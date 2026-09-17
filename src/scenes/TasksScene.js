import Phaser from 'phaser';
import { GAME_WIDTH } from '../config.js';
import { THEME } from './theme.js';
import { TEX, addBlock } from './textures.js';
import { addBackdrop } from './backdrop.js';
import { addText, addButton, addIconButton, addSoundButton, addCoinCounter, flyCoins } from './ui.js';
import { getProgress, setProgress, checkInToday } from '../meta/store.js';
import { claimTask, isTaskDone, dailyBonusReady, claimDailyBonus, DAILY_BONUS } from '../meta/progress.js';
import { taskText, timeUntilTomorrow } from '../meta/texts.js';
import { loopTween, reducedMotion } from './motion.js';

// Цвет блока-значка для типа задания.
const TASK_COLORS = { lines: 4, pieces: 1, games: 3, combo: 2, streak: 6, score: 5, clearBoard: 0 };

const CARD_W = 640;
const CARD_H = 180;
const CARD_X = (GAME_WIDTH - CARD_W) / 2;
const FIRST_CARD_Y = 316;
const CARD_GAP = 24;
const BONUS_Y = 990; // полоса «бонус за все задания»

export class TasksScene extends Phaser.Scene {
  constructor() {
    super('Tasks');
  }

  create() {
    // Экран могли открыть после полуночи — обновим задания дня.
    checkInToday();
    addBackdrop(this);

    addIconButton(this, 58, 58, TEX.home, () => this.scene.start('Menu'));
    addSoundButton(this);
    this.coins = addCoinCounter(this, GAME_WIDTH / 2 - 95, 58);
    this.coins.setValue(getProgress().coins);

    addText(this, GAME_WIDTH / 2, 168, 'Задания дня', 66);
    this.timerText = addText(this, GAME_WIDTH / 2, 258, '', 30, { color: THEME.textMuted });
    this.updateTimer();
    this.time.addEvent({ delay: 1000, loop: true, callback: () => this.updateTimer() });

    this.cards = [];
    this.drawCards();

    addButton(this, GAME_WIDTH / 2, 1150, 'Играть', () => this.scene.start('Game'), {
      width: 400,
      height: 110,
      fontSize: 54,
    });
  }

  updateTimer() {
    this.timerText.setText(`Новые задания через ${timeUntilTomorrow()}`);
  }

  drawCards() {
    for (const card of this.cards) card.destroy();
    this.cards = getProgress().daily.tasks.map((task, i) =>
      this.createCard(task, FIRST_CARD_Y + i * (CARD_H + CARD_GAP)),
    );
    this.cards.push(this.createBonusStrip());
  }

  // Полоса под карточками: бонус за все три задания дня.
  createBonusStrip() {
    const progress = getProgress();
    const tasks = progress.daily.tasks;
    const claimedCount = tasks.filter((t) => t.claimed).length;
    const ready = dailyBonusReady(progress);
    const got = progress.daily.bonusClaimed;
    const strip = this.add.container(CARD_X, BONUS_Y);
    const h = 96;

    const bg = this.add.graphics();
    bg.fillStyle(0x3f2266, 0.32);
    bg.fillRoundedRect(0, 4, CARD_W, h, 30);
    bg.fillStyle(ready ? 0xffc93a : 0xffd9a0, 1);
    bg.fillRoundedRect(0, 0, CARD_W, h, 30);
    bg.fillStyle(got ? 0x2a3566 : 0x1e2958, 1);
    bg.fillRoundedRect(6, 6, CARD_W - 12, h - 12, 26);
    strip.add(bg);

    const chest = this.add.image(58, h / 2, TEX.chest(got)).setDisplaySize(64, 64);
    const label = addText(this, 106, h / 2, `Все задания: +${DAILY_BONUS}`, 32, { color: THEME.gold }).setOrigin(0, 0.5);
    label.x -= label.padding.left;
    strip.add([chest, label]);

    const rightX = CARD_W - 105;
    if (got) {
      strip.add(addText(this, rightX, h / 2, 'Получено', 30, { color: THEME.green }));
    } else if (ready) {
      const button = addButton(this, rightX, h / 2, 'Забрать', () => this.claimBonus(strip), {
        width: 170,
        height: 66,
        fontSize: 30,
        variant: 'orange',
      });
      strip.add(button);
      loopTween(this, { targets: button, scale: 1.07, duration: 450 });
    } else {
      strip.add(addText(this, rightX, h / 2, `${claimedCount} из ${tasks.length}`, 32, { color: THEME.textMuted }));
    }
    return strip;
  }

  claimBonus(strip) {
    const { progress, reward } = claimDailyBonus(getProgress());
    if (reward === 0) return;
    setProgress(progress);
    flyCoins(this, strip.x + 58, strip.y + 48, this.coins, 12);
    this.coins.setValue(progress.coins, true);
    this.time.delayedCall(350, () => this.drawCards());
  }

  createCard(task, y) {
    const done = isTaskDone(task);
    const card = this.add.container(CARD_X, y);

    const bg = this.add.graphics();
    bg.fillStyle(0x3f2266, 0.32);
    bg.fillRoundedRect(0, 5, CARD_W, CARD_H, 32);
    bg.fillStyle(0xffd9a0, 1);
    bg.fillRoundedRect(0, 0, CARD_W, CARD_H, 32);
    bg.fillStyle(task.claimed ? 0x2a3566 : 0x1e2958, 1);
    bg.fillRoundedRect(6, 6, CARD_W - 12, CARD_H - 12, 28);
    card.add(bg);

    const icon = addBlock(this, 75, CARD_H / 2, 90, TASK_COLORS[task.type] ?? 0);
    if (task.claimed) icon.setAlpha(0.5);
    card.add(icon);

    const title = addText(this, 140, 52, taskText(task), 32, {
      wordWrap: { width: 300 },
      align: 'left',
    }).setOrigin(0, 0.5);
    title.x -= title.padding.left;
    card.add(title);

    // Полоса прогресса
    const barX = 140;
    const barY = 120;
    const barW = 290;
    const barH = 34;
    const bar = this.add.graphics();
    bar.fillStyle(0x0e1430, 1);
    bar.fillRoundedRect(barX, barY - barH / 2, barW, barH, barH / 2);
    const fill = Math.max(task.progress / task.target, 0);
    if (fill > 0) {
      bar.fillStyle(done ? 0x4fd06a : 0xffc93a, 1);
      bar.fillRoundedRect(barX, barY - barH / 2, Math.max(barW * fill, barH), barH, barH / 2);
      bar.fillStyle(0xffffff, 0.3);
      bar.fillRoundedRect(barX + 6, barY - barH / 2 + 4, Math.max(barW * fill - 12, 8), 8, 4);
    }
    const barText = addText(this, barX + barW / 2, barY, `${task.progress} / ${task.target}`, 30);
    card.add([bar, barText]);

    // Награда и кнопка
    const rightX = CARD_W - 105;
    const coin = this.add.image(rightX - 36, 46, TEX.coin).setDisplaySize(48, 48);
    const reward = addText(this, rightX + 28, 46, `${task.reward}`, 36, { color: THEME.gold });
    card.add([coin, reward]);

    if (task.claimed) {
      card.add(addText(this, rightX, 122, 'Получено', 30, { color: THEME.green }));
    } else if (done) {
      const button = addButton(this, rightX, 120, 'Забрать', () => this.claim(task.id, card), {
        width: 170,
        height: 66,
        fontSize: 30,
        variant: 'orange',
      });
      card.add(button);
      loopTween(this, { targets: button, scale: 1.07, duration: 450 });
    } else {
      card.add(addText(this, rightX, 122, `${Math.floor(fill * 100)}%`, 32, { color: THEME.textMuted }));
    }

    card.setScale(0.9).setAlpha(0);
    this.tweens.add({ targets: card, scale: 1, alpha: 1, duration: 300, ease: 'Back.easeOut' });
    return card;
  }

  claim(taskId, card) {
    const { progress, reward } = claimTask(getProgress(), taskId);
    if (reward === 0) return;
    setProgress(progress);
    flyCoins(this, card.x + CARD_W - 135, card.y + 52, this.coins, 8);
    this.coins.setValue(progress.coins, true);
    this.time.delayedCall(350, () => this.drawCards());
  }
}
