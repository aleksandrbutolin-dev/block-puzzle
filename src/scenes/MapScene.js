import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { LEVELS, LEVELS_TOTAL, CHAPTERS } from '../core/levels.js';
import { getProgress, setProgress } from '../meta/store.js';
import {
  levelStars,
  isLevelUnlocked,
  currentLevel,
  totalStars,
  isChapterDone,
  isChapterClaimed,
  claimChapter,
} from '../meta/progress.js';
import { playSound } from '../platform/audio.js';
import { THEME, DEPTH } from './theme.js';
import { TEX } from './textures.js';
import { addBackdrop } from './backdrop.js';
import {
  addText,
  addIconButton,
  addSoundButton,
  addCoinCounter,
  showToast,
  flyCoins,
  addStarCount,
} from './ui.js';
import { loopTween } from './motion.js';

const NODE_R = 52; // радиус кружка уровня
const STEP_Y = 165; // расстояние между уровнями
const FIRST_Y = 170; // отступ первого уровня внутри тропинки
const TOP = 230; // ниже шапки
const BOTTOM = GAME_HEIGHT - 40;
const VIEW_H = BOTTOM - TOP;
const DRAG_THRESHOLD = 12; // сдвиг больше — это прокрутка, а не нажатие

const CHAPTER_GAP = 150; // дополнительный отступ перед новой главой

// Зигзаг тропинки.
const nodeX = (index) => GAME_WIDTH / 2 + Math.sin(index * 0.95) * 150;
const nodeY = (index) => FIRST_Y + index * STEP_Y + (LEVELS[index].chapter - 1) * CHAPTER_GAP;

// Карта «Приключения»: тропинка уровней с прокруткой.
export class MapScene extends Phaser.Scene {
  constructor() {
    super('Map');
  }

  create() {
    const progress = getProgress();
    addBackdrop(this);

    // Шапка
    addIconButton(this, 58, 58, TEX.home, () => this.scene.start('Menu'));
    addSoundButton(this);
    this.coins = addCoinCounter(this, GAME_WIDTH / 2 - 95, 58);
    this.coins.setValue(progress.coins);
    const header = addText(this, GAME_WIDTH / 2 - 55, 160, 'Приключение', 40).setDepth(DEPTH.banner);
    addStarCount(this, header.x + header.width / 2 + 45, 162, totalStars(progress), 38).setDepth(DEPTH.banner);

    // Тропинка живёт в контейнере, который двигается при прокрутке.
    this.path = this.add.container(0, 0);
    this.contentH = nodeY(LEVELS_TOTAL - 1) + 220;
    // Тропинка видна только в своей области, под шапкой.
    const maskShape = this.make.graphics({ x: 0, y: 0, add: false });
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(0, TOP, GAME_WIDTH, VIEW_H);
    this.path.setMask(maskShape.createGeometryMask());

    this.drawPath();
    LEVELS.forEach((level, i) => this.createNode(level, i, progress));
    this.createChapterMarks(progress);

    this.setupScroll();
    this.scrollToLevel(currentLevel(progress, LEVELS_TOTAL));
  }

  // Пунктирная дорожка между кружками.
  drawPath() {
    const line = this.add.graphics();
    for (let i = 0; i < LEVELS_TOTAL - 1; i++) {
      const from = { x: nodeX(i), y: nodeY(i) };
      const to = { x: nodeX(i + 1), y: nodeY(i + 1) };
      const steps = 7;
      for (let s = 1; s < steps; s++) {
        const t = s / steps;
        line.fillStyle(0xffffff, 0.35);
        line.fillCircle(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t, 7);
      }
    }
    this.path.add(line);
  }

  // Заголовок главы перед её первым уровнем и сундук с наградой после последнего.
  createChapterMarks(progress) {
    for (const chapter of CHAPTERS) {
      const firstIndex = chapter.from - 1;
      const lastIndex = chapter.to - 1;

      const title = addText(
        this,
        GAME_WIDTH / 2,
        nodeY(firstIndex) - 100,
        `Глава ${chapter.id} · ${chapter.title}`,
        34,
        { color: THEME.textMuted },
      );
      this.path.add(title);

      const x = nodeX(lastIndex) > GAME_WIDTH / 2 ? nodeX(lastIndex) - 175 : nodeX(lastIndex) + 175;
      const y = nodeY(lastIndex) + 10;
      this.createChest(chapter, x, y, progress);
    }
  }

  createChest(chapter, x, y, progress) {
    const done = isChapterDone(progress, chapter);
    const claimed = isChapterClaimed(progress, chapter.id);
    const chest = this.add.image(x, y, TEX.chest(claimed)).setDisplaySize(96, 96);
    const label = addText(this, x, y + 64, `${chapter.reward.coins}`, 30, { color: THEME.gold });
    this.path.add([chest, label]);

    if (!done) {
      chest.setTint(0x8f88ab).setAlpha(0.7);
      return;
    }
    if (claimed) return;

    loopTween(this, { targets: chest, scale: chest.scale * 1.12, duration: 600 });
    const zone = this.add
      .zone(x, y, 120, 120)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => {
        if (this.scrolled) return;
        const result = claimChapter(getProgress(), chapter);
        if (result.coins === 0) return;
        setProgress(result.progress);
        this.tweens.killTweensOf(chest);
        chest.setTexture(TEX.chest(true)).setDisplaySize(96, 96).setScale(chest.scale);
        zone.destroy();
        playSound('fanfare');
        const m = chest.getWorldTransformMatrix();
        flyCoins(this, m.tx, m.ty, this.coins, 10);
        this.coins.setValue(result.progress.coins, true);
        showToast(this, `Глава пройдена! +${result.coins}`, GAME_HEIGHT - 140);
      });
    this.path.add(zone);
  }

  createNode(level, index, progress) {
    const x = nodeX(index);
    const y = nodeY(index);
    const stars = levelStars(progress, level.id);
    const unlocked = isLevelUnlocked(progress, level.id);
    const isCurrent = unlocked && stars === 0;

    const circle = this.add.graphics();
    const fill = stars > 0 ? 0x4fd06a : unlocked ? 0xffc93a : 0x6f6890;
    circle.fillStyle(0x2a1040, 0.35);
    circle.fillCircle(x, y + 6, NODE_R);
    circle.fillStyle(fill, 1);
    circle.fillCircle(x, y, NODE_R);
    circle.lineStyle(6, 0xffffff, unlocked ? 0.9 : 0.4);
    circle.strokeCircle(x, y, NODE_R);
    this.path.add(circle);

    if (unlocked) {
      this.path.add(addText(this, x, y, String(level.id), 44, { stroke: '#4a2170' }));
    } else {
      this.path.add(this.add.image(x, y, TEX.lock).setDisplaySize(64, 64));
    }

    // Звёзды под пройденным уровнем
    if (stars > 0) {
      for (let s = 0; s < 3; s++) {
        const star = this.add
          .image(x + (s - 1) * 34, y + NODE_R + 16, TEX.star)
          .setDisplaySize(34, 34);
        star.setTint(s < stars ? 0xffd23f : 0x4a3a6a).setAlpha(s < stars ? 1 : 0.5);
        this.path.add(star);
      }
    }

    if (isCurrent) {
      const halo = this.add.graphics();
      halo.lineStyle(6, 0xffffff, 0.8);
      halo.strokeCircle(x, y, NODE_R + 12);
      this.path.add(halo);
      loopTween(this, { targets: halo, alpha: 0.2, duration: 700 });
    }

    // Нажатие: зона поверх кружка.
    const zone = this.add
      .zone(x, y, NODE_R * 2.4, NODE_R * 2.4)
      .setInteractive({ useHandCursor: unlocked })
      .on('pointerup', () => {
        if (this.scrolled) return; // это была прокрутка
        if (!unlocked) {
          playSound('back');
          showToast(this, 'Пройди предыдущий уровень', GAME_HEIGHT - 140);
          return;
        }
        playSound('button');
        this.scene.start('Level', { levelId: level.id });
      });
    this.path.add(zone);
  }

  // Прокрутка пальцем с ограничением по краям.
  setupScroll() {
    this.minY = Math.min(0, VIEW_H - this.contentH);
    this.maxY = 0;
    this.path.y = 0;
    this.path.setPosition(0, TOP);

    let startY = 0;
    let startPath = 0;
    let dragging = false;
    this.scrolled = false;

    this.input.on('pointerdown', (pointer) => {
      dragging = true;
      this.scrolled = false;
      startY = pointer.y;
      startPath = this.path.y;
    });
    this.input.on('pointermove', (pointer) => {
      if (!dragging || !pointer.isDown) return;
      const delta = pointer.y - startY;
      if (Math.abs(delta) > DRAG_THRESHOLD) this.scrolled = true;
      this.path.y = Phaser.Math.Clamp(startPath + delta, TOP + this.minY, TOP + this.maxY);
    });
    this.input.on('pointerup', () => {
      dragging = false;
      // Сбрасываем позже, чтобы нажатие на кружок успело проверить флаг.
      this.time.delayedCall(50, () => {
        this.scrolled = false;
      });
    });
  }

  scrollToLevel(id) {
    const index = Math.max(0, id - 1);
    const target = TOP + VIEW_H / 2 - nodeY(index);
    this.path.y = Phaser.Math.Clamp(target, TOP + this.minY, TOP + this.maxY);
  }
}
