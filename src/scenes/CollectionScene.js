import Phaser from 'phaser';
import { GAME_WIDTH } from '../config.js';
import { THEME } from './theme.js';
import { TEX, addBlock, setSkin } from './textures.js';
import { addBackdrop } from './backdrop.js';
import {
  addText,
  addButton,
  addIconButton,
  addSoundButton,
  addCoinCounter,
  showToast,
} from './ui.js';
import { getProgress, setProgress } from '../meta/store.js';
import { SKINS, buySkin, selectSkin } from '../meta/progress.js';
import { SKIN_NAMES, plural } from '../meta/texts.js';
import { playSound } from '../platform/audio.js';
import { loopTween, reducedMotion } from './motion.js';

const CARD_W = 640;
const CARD_H = 380;
const CARD_X = (GAME_WIDTH - CARD_W) / 2;
const FIRST_CARD_Y = 270;
const CARD_GAP = 40;

// Превью темы: 7 блоков всех цветов в две строки.
const PREVIEW = [
  [0, 0, 0], [1, 0, 1], [2, 0, 2], [3, 0, 3],
  [4, 1, 0.5], [5, 1, 1.5], [6, 1, 2.5],
];

export class CollectionScene extends Phaser.Scene {
  constructor() {
    super('Collection');
  }

  create() {
    addBackdrop(this);
    addIconButton(this, 58, 58, TEX.home, () => this.scene.start('Menu'));
    addSoundButton(this);
    this.coins = addCoinCounter(this, GAME_WIDTH / 2 - 95, 58);
    this.coins.setValue(getProgress().coins);

    addText(this, GAME_WIDTH / 2, 175, 'Коллекция', 70);

    this.cards = [];
    this.drawCards();

    addButton(this, GAME_WIDTH / 2, 1150, 'Играть', () => this.scene.start('Game'), {
      width: 400,
      height: 110,
      fontSize: 54,
    });
  }

  drawCards(animate = true) {
    for (const card of this.cards) card.destroy();
    this.cards = SKINS.map((skin, i) =>
      this.createCard(skin, FIRST_CARD_Y + i * (CARD_H + CARD_GAP), animate),
    );
  }

  createCard(skin, y, animate) {
    const { skins, coins } = getProgress();
    const owned = skins.owned.includes(skin.id);
    const selected = skins.selected === skin.id;
    const card = this.add.container(CARD_X, y);

    const bg = this.add.graphics();
    bg.fillStyle(0x3f2266, 0.32);
    bg.fillRoundedRect(0, 5, CARD_W, CARD_H, 36);
    bg.fillStyle(selected ? 0x7dff8a : 0xffd9a0, 1);
    bg.fillRoundedRect(0, 0, CARD_W, CARD_H, 36);
    bg.fillStyle(0x1e2958, 1);
    bg.fillRoundedRect(8, 8, CARD_W - 16, CARD_H - 16, 30);
    card.add(bg);

    card.add(addText(this, CARD_W / 2, 55, SKIN_NAMES[skin.id], 48));

    // Превью блоков
    const size = 84;
    const gap = 8;
    const previewW = 4 * size + 3 * gap;
    const px = CARD_W / 2 - previewW / 2 + size / 2;
    for (const [color, row, col] of PREVIEW) {
      const block = addBlock(this, px + col * (size + gap), 135 + row * (size + gap), size, color, skin.id);
      card.add(block);
      if (animate) {
        loopTween(this, {
          targets: block,
          y: block.y - 8,
          duration: 500,
          delay: color * 70,
          repeatDelay: 1500,
          ease: 'Sine.easeInOut',
        });
      }
    }

    const buttonY = CARD_H - 62;
    if (selected) {
      card.add(addText(this, CARD_W / 2, buttonY, 'Выбрана', 42, { color: THEME.green }));
    } else if (owned) {
      card.add(
        addButton(this, CARD_W / 2, buttonY, 'Выбрать', () => this.select(skin.id), {
          width: 300,
          height: 84,
          variant: 'blue',
          fontSize: 40,
        }),
      );
    } else {
      const canBuy = coins >= skin.price;
      const button = addButton(this, CARD_W / 2, buttonY, `${skin.price}`, () => this.buy(skin, card), {
        width: 300,
        height: 84,
        variant: canBuy ? 'orange' : 'gray',
        fontSize: 42,
        icon: TEX.coin,
      });
      card.add(button);
      if (canBuy) {
        loopTween(this, { targets: button, scale: 1.06, duration: 450 });
      }
    }

    if (animate) {
      card.setAlpha(0).setScale(0.92);
      this.tweens.add({ targets: card, alpha: 1, scale: 1, duration: 300, ease: 'Back.easeOut' });
    }
    return card;
  }

  select(skinId) {
    setProgress(selectSkin(getProgress(), skinId));
    setSkin(skinId);
    this.drawCards(false);
  }

  buy(skin, card) {
    const { progress, ok } = buySkin(getProgress(), skin.id);
    if (!ok) {
      const missing = skin.price - getProgress().coins;
      showToast(this, `Не хватает ${missing} ${plural(missing, ['монеты', 'монет', 'монет'])}`, card.y + CARD_H / 2);
      // Кнопка мягко качается «нет-нет» вместо тряски экрана.
      const button = card.list[card.list.length - 1];
      this.tweens.killTweensOf(button);
      button.setAngle(0).setScale(1);
      this.tweens.add({ targets: button, angle: 4, duration: 70, yoyo: true, repeat: 2, ease: 'Sine.easeInOut' });
      return;
    }
    setProgress(progress);
    setSkin(skin.id);
    this.coins.setValue(progress.coins, true);
    playSound('fanfare');
    this.celebrate(card.x + CARD_W / 2, card.y + CARD_H / 2);
    this.drawCards(false);
  }

  // Конфетти из блоков новой темы.
  celebrate(x, y) {
    for (let i = 0; i < 24; i++) {
      const block = addBlock(this, x, y, 36, i % 7).setDepth(50);
      const angle = Math.random() * Math.PI * 2;
      const distance = 160 + Math.random() * 220;
      this.tweens.add({
        targets: block,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance + 120,
        angle: Math.random() * 720 - 360,
        alpha: 0,
        duration: 900 + Math.random() * 400,
        ease: 'Cubic.easeOut',
        onComplete: () => block.destroy(),
      });
    }
    showToast(this, 'Новая тема!', y);
  }
}
