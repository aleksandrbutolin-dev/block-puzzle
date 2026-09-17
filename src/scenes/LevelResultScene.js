import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { THEME } from './theme.js';
import { TEX } from './textures.js';
import { addText, addButton, addTextButton, flyCoins, addCoinCounter } from './ui.js';
import { getProgress, setProgress } from '../meta/store.js';
import { completeLevel } from '../meta/progress.js';
import { playSound } from '../platform/audio.js';

const PANEL_W = 580;
const PANEL_H = 660;

// Итог уровня: звёзды и награда либо предложение повторить.
export class LevelResultScene extends Phaser.Scene {
  constructor() {
    super('LevelResult');
  }

  create({ levelId, status, stars, score, hasNext, tasksDone = [] }) {
    const won = status === 'won';
    const reward = won ? completeLevel(getProgress(), levelId, stars) : { coins: 0 };
    if (won) setProgress(reward.progress);

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const shade = this.add
      .rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, THEME.overlay, 0.65)
      .setInteractive()
      .setAlpha(0);

    this.coins = addCoinCounter(this, 24, 58);
    this.coins.setValue(getProgress().coins - reward.coins);

    const panel = this.add.container(cx, cy);
    const bg = this.add.graphics();
    bg.fillStyle(0x2a1040, 0.2);
    bg.fillRoundedRect(-PANEL_W / 2, -PANEL_H / 2 + 9, PANEL_W, PANEL_H, 48);
    bg.fillStyle(0xe8cfe0, 1);
    bg.fillRoundedRect(-PANEL_W / 2, -PANEL_H / 2 + 8, PANEL_W, PANEL_H, 48);
    bg.fillStyle(THEME.panel, 1);
    bg.fillRoundedRect(-PANEL_W / 2, -PANEL_H / 2, PANEL_W, PANEL_H, 48);

    const ribbon = this.add.graphics();
    const ribbonColors = won ? [0x2f9a48, 0x4fd06a] : [0xc9447f, 0xff6fae];
    ribbon.fillStyle(ribbonColors[0], 1);
    ribbon.fillRoundedRect(-240, -PANEL_H / 2 - 40, 480, 100, 50);
    ribbon.fillStyle(ribbonColors[1], 1);
    ribbon.fillRoundedRect(-240, -PANEL_H / 2 - 48, 480, 96, 48);
    const title = addText(this, 0, -PANEL_H / 2, won ? 'Уровень пройден!' : 'Не получилось', 46, {
      stroke: won ? '#1f6b34' : '#8a2358',
    });

    panel.add([bg, ribbon, title]);
    panel.add(this.createStars(stars, won));

    const scoreLabel = addText(this, 0, 60, `Счёт: ${score}`, 40, {
      color: THEME.panelText,
      stroke: null,
    });
    panel.add(scoreLabel);

    if (won && reward.coins > 0) {
      const coinIcon = this.add.image(-50, 130, TEX.coin).setDisplaySize(60, 60);
      const coinText = addText(this, 20, 130, `+${reward.coins}`, 46, {
        color: THEME.gold,
        stroke: '#b5651d',
      });
      panel.add([coinIcon, coinText]);
      this.time.delayedCall(1200, () => {
        const m = coinIcon.getWorldTransformMatrix();
        flyCoins(this, m.tx, m.ty, this.coins, 8);
        this.coins.setValue(getProgress().coins, true);
      });
    } else if (won) {
      panel.add(
        addText(this, 0, 130, 'Звёзды уже получены', 30, { color: THEME.panelMuted, stroke: null }),
      );
    } else {
      panel.add(
        addText(this, 0, 130, 'Ходы закончились.\nПопробуй ещё раз!', 32, {
          color: THEME.panelMuted,
          stroke: null,
          lineSpacing: 4,
        }),
      );
    }

    // Главная кнопка: дальше по уровням, повтор или выход.
    const mainLabel = won ? (hasNext ? 'Дальше' : 'К карте') : 'Ещё раз';
    const mainAction = () => {
      if (!won) return this.go(levelId);
      return hasNext ? this.go(levelId + 1) : this.toMap();
    };
    panel.add(addButton(this, 0, 230, mainLabel, mainAction, { width: 360, height: 104 }));

    if (mainLabel !== 'К карте') {
      const toMap = addTextButton(this, 0, 306, 'К карте', 32, () => this.toMap());
      panel.add([toMap.text, toMap.zone]);
    }

    // Задания, выполненные этим уровнем, — плашка над окном.
    tasksDone.forEach((task, i) => {
      const banner = addText(this, cx, 200 - i * 62, `Задание выполнено! +${task.reward}`, 38, {
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

    panel.setScale(0.6).setAlpha(0);
    this.tweens.add({ targets: shade, alpha: 1, duration: 250 });
    this.tweens.add({ targets: panel, scale: 1, alpha: 1, duration: 420, ease: 'Back.easeOut' });
  }

  // Три звезды: полученные загораются по очереди.
  createStars(stars, won) {
    const views = [];
    for (let i = 0; i < 3; i++) {
      const star = this.add
        .image((i - 1) * 130, -120 + (i === 1 ? -30 : 0), TEX.star)
        .setDisplaySize(110, 110);
      const base = star.scale;
      views.push(star);

      if (!won || i >= stars) {
        star.setTint(0x4a3a6a).setAlpha(0.4);
        continue;
      }
      star.setTint(0xffd23f);
      star.setScale(0);
      this.tweens.add({
        targets: star,
        scale: base,
        angle: { from: -25, to: 0 },
        duration: 450,
        delay: 500 + i * 280,
        ease: 'Back.easeOut',
        onComplete: () => playSound('record'),
      });
    }
    return views;
  }

  go(levelId) {
    this.scene.stop();
    this.scene.get('Level').scene.start('Level', { levelId });
  }

  toMap() {
    this.scene.stop();
    this.scene.get('Level').scene.start('Map');
  }
}
