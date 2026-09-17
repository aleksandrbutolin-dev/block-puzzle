import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { THEME, DEPTH } from './theme.js';
import { TEX } from './textures.js';
import { addText, addButton, addTextButton, addCoinCounter, flyCoins, showToast } from './ui.js';
import { getProgress, setProgress } from '../meta/store.js';
import { BOOSTERS, addBooster, buyBooster } from '../meta/progress.js';
import { showRewarded } from '../platform/ads.js';
import { playSound } from '../platform/audio.js';
import { plural } from '../meta/texts.js';

const PANEL_W = 560;
const PANEL_H = 620;

const BOOSTER_INFO = {
  hammer: {
    title: 'Молоток',
    text: 'Убирает один блок\nв любом месте поля',
    texture: TEX.hammer,
  },
  swap: {
    title: 'Обмен',
    text: 'Меняет все три фигуры\nв лотке на новые',
    texture: TEX.swap,
  },
};

// Окно «нет бустера»: купить за монеты или получить за рекламу.
export class BoosterShopScene extends Phaser.Scene {
  constructor() {
    super('BoosterShop');
  }

  create({ boosterId, onDone = () => {} }) {
    this.boosterId = boosterId;
    this.onDone = onDone;
    this.busy = false;

    const info = BOOSTER_INFO[boosterId];
    const booster = BOOSTERS[boosterId];
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    this.add
      .rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, THEME.overlay, 0.65)
      .setDepth(DEPTH.dialog)
      .setInteractive();

    this.coins = addCoinCounter(this, 24, 58);
    this.coins.setValue(getProgress().coins);

    const panel = this.add.container(cx, cy).setDepth(DEPTH.dialog + 1);
    const bg = this.add.graphics();
    bg.fillStyle(0x2a1040, 0.2);
    bg.fillRoundedRect(-PANEL_W / 2, -PANEL_H / 2 + 9, PANEL_W, PANEL_H, 48);
    bg.fillStyle(0xe8cfe0, 1);
    bg.fillRoundedRect(-PANEL_W / 2, -PANEL_H / 2 + 8, PANEL_W, PANEL_H, 48);
    bg.fillStyle(THEME.panel, 1);
    bg.fillRoundedRect(-PANEL_W / 2, -PANEL_H / 2, PANEL_W, PANEL_H, 48);

    const ribbon = this.add.graphics();
    ribbon.fillStyle(0xc97416, 1);
    ribbon.fillRoundedRect(-220, -PANEL_H / 2 - 40, 440, 100, 50);
    ribbon.fillStyle(0xffa53d, 1);
    ribbon.fillRoundedRect(-220, -PANEL_H / 2 - 48, 440, 96, 48);
    const title = addText(this, 0, -PANEL_H / 2, info.title, 48, { stroke: '#8a4a0c' });

    const icon = this.add.image(0, -170, info.texture).setDisplaySize(150, 150);
    const text = addText(this, 0, -60, info.text, 32, {
      color: THEME.panelText,
      stroke: null,
      lineSpacing: 6,
    });

    const enough = getProgress().coins >= booster.price;
    const buy = addButton(this, 0, 60, `${booster.price}`, () => this.buy(), {
      width: 380,
      height: 104,
      variant: enough ? 'orange' : 'gray',
      fontSize: 42,
      icon: TEX.coin,
    });

    const adLabel = `+${booster.perAd} ${plural(booster.perAd, ['штука', 'штуки', 'штук'])}`;
    const watch = addButton(this, 0, 185, adLabel, () => this.watchAd(), {
      width: 380,
      height: 104,
      fontSize: 40,
      icon: TEX.video,
    });

    const cancel = addTextButton(this, 0, 268, 'Не сейчас', 32, () => this.close(false));

    panel.add([bg, ribbon, title, icon, text, buy, watch, cancel.text, cancel.zone]);
    this.buttons = [buy, watch, cancel.zone];
    this.icon = icon;

    panel.setScale(0.7).setAlpha(0);
    this.tweens.add({ targets: panel, scale: 1, alpha: 1, duration: 380, ease: 'Back.easeOut' });
  }

  buy() {
    if (this.busy) return;
    const { progress, ok } = buyBooster(getProgress(), this.boosterId);
    if (!ok) {
      const missing = BOOSTERS[this.boosterId].price - getProgress().coins;
      showToast(this, `Не хватает ${missing} ${plural(missing, ['монеты', 'монет', 'монет'])}`, GAME_HEIGHT / 2 + 330);
      return;
    }
    setProgress(progress);
    this.coins.setValue(progress.coins, true);
    this.granted();
  }

  async watchAd() {
    if (this.busy) return;
    this.busy = true;
    for (const button of this.buttons) button.disableInteractive();
    const rewarded = await showRewarded();
    if (!rewarded) {
      showToast(this, 'Реклама недоступна', GAME_HEIGHT / 2 + 330);
      this.close(false);
      return;
    }
    const booster = BOOSTERS[this.boosterId];
    setProgress(addBooster(getProgress(), this.boosterId, booster.perAd));
    this.granted();
  }

  // Бустер получен: короткий отклик и закрытие.
  granted() {
    this.busy = true;
    playSound('record');
    const m = this.icon.getWorldTransformMatrix();
    flyCoins(this, m.tx, m.ty, this.coins, 4);
    this.time.delayedCall(450, () => this.close(true));
  }

  close(granted) {
    this.scene.stop();
    this.onDone(granted);
  }
}
