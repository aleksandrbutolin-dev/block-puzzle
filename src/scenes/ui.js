import { GAME_WIDTH } from '../config.js';
import { THEME, DEPTH, MIN_TAP } from './theme.js';
import { TEX } from './textures.js';
import { playSound, isMuted, setMuted } from '../platform/audio.js';

// Мультяшная надпись: жирный округлый шрифт, толстая обводка и тень снизу.
export function addText(scene, x, y, text, size, style = {}) {
  const outline = style.stroke === null ? null : (style.stroke ?? THEME.outline);
  const thickness = outline ? Math.round(size * 0.16) : 0;
  const pad = thickness + Math.round(size * 0.1);
  const { stroke, shadow = true, ...rest } = style;

  const label = scene.add
    .text(x, y, text, {
      fontFamily: THEME.font,
      fontStyle: '900',
      fontSize: `${size}px`,
      color: THEME.text,
      align: 'center',
      stroke: outline ?? undefined,
      strokeThickness: thickness,
      padding: { left: pad, right: pad, top: pad, bottom: pad },
      ...rest,
    })
    .setOrigin(0.5);

  if (outline && shadow) {
    // Мягкая тень: небольшое смещение и полупрозрачный цвет обводки.
    label.setShadow(0, Math.max(2, Math.round(size * 0.045)), THEME.textShadow, 0, false, true);
  }
  return label;
}

// Цвета объёмных кнопок: лицо, боковина, блик, обводка текста.
const BUTTON_VARIANTS = {
  green: [0x4fd06a, 0x2f9a48, 0x8ff0a0, '#1f6b34'],
  blue: [0x4f86ff, 0x2f55c0, 0x9dbcff, '#1d3a8a'],
  pink: [0xff6fae, 0xc9447f, 0xffb0d2, '#8a2358'],
  orange: [0xffa53d, 0xc97416, 0xffd49a, '#8a4a0c'],
  gray: [0x9a93b5, 0x6f6890, 0xc9c4dc, '#4a4468'],
};

// Объёмная кнопка: боковина снизу, при нажатии лицевая часть «проседает».
export function addButton(
  scene,
  x,
  y,
  label,
  onClick,
  { width = 380, height = 104, variant = 'green', fontSize = 46, icon = null } = {},
) {
  const [faceColor, sideColor, highlight, textStroke] = BUTTON_VARIANTS[variant];
  const depth = 12;
  const radius = Math.min(height / 2, 40);
  const container = scene.add.container(x, y);
  const side = scene.add.graphics();
  const face = scene.add.graphics();

  side.fillStyle(sideColor, 1);
  side.fillRoundedRect(-width / 2, -height / 2 + depth, width, height, radius);

  face.fillStyle(faceColor, 1);
  face.fillRoundedRect(-width / 2, -height / 2, width, height, radius);
  face.fillStyle(highlight, 0.7);
  face.fillRoundedRect(-width / 2 + 20, -height / 2 + 8, width - 40, height * 0.28, height * 0.14);

  const parts = [face];
  const text = addText(scene, 0, -2, label, fontSize, { stroke: textStroke });
  if (icon && !label) {
    parts.push(scene.add.image(0, -2, icon).setDisplaySize(height * 0.62, height * 0.62));
  } else if (icon) {
    const image = scene.add.image(0, -2, icon).setDisplaySize(height * 0.62, height * 0.62);
    const gap = 14;
    const total = image.displayWidth + gap + text.width - text.padding.left - text.padding.right;
    image.x = -total / 2 + image.displayWidth / 2;
    text.x = image.x + image.displayWidth / 2 + gap + (text.width - text.padding.left - text.padding.right) / 2;
    parts.push(image);
  }
  parts.push(text);

  const faceGroup = scene.add.container(0, 0, parts);
  container.add([side, faceGroup]);
  container.setSize(width, height + depth).setInteractive({ useHandCursor: true });

  const press = (down) => {
    faceGroup.y = down ? depth - 3 : 0;
  };
  container.on('pointerdown', () => press(true));
  container.on('pointerout', () => press(false));
  container.on('pointerup', () => {
    press(false);
    playSound('button');
    onClick();
  });
  container.label = text;
  return container;
}

// Круглая кнопка-значок (домой, звук). Нажатия ловит зона не меньше MIN_TAP,
// даже если сам значок нарисован мельче.
export function addIconButton(scene, x, y, texture, onClick, size = 92) {
  const button = scene.add.image(x, y, texture).setDisplaySize(size, size).setDepth(DEPTH.hud);
  const base = button.scale;
  const side = Math.max(size, MIN_TAP);
  const zone = scene.add
    .zone(x, y, side, side)
    .setDepth(DEPTH.hud)
    .setInteractive({ useHandCursor: true })
    .on('pointerdown', () => button.setScale(base * 0.9))
    .on('pointerout', () => button.setScale(base))
    .on('pointerup', () => {
      button.setScale(base);
      onClick(button);
    });
  button.zone = zone; // чтобы вызывающий мог выключить нажатие вместе с показом
  return button;
}

// Текстовая кнопка («Нет, спасибо», «К карте»): у надписи своя зона нажатия MIN_TAP по высоте.
export function addTextButton(scene, x, y, label, size, onClick, options = {}) {
  const text = addText(scene, x, y, label, size, { color: THEME.panelMuted, stroke: null, ...options });
  const width = Math.max(text.width + 60, 260);
  const zone = scene.add
    .zone(x, y, width, MIN_TAP)
    .setInteractive({ useHandCursor: true })
    .on('pointerdown', () => text.setScale(0.94))
    .on('pointerout', () => text.setScale(1))
    .on('pointerup', () => {
      text.setScale(1);
      playSound('button');
      onClick();
    });
  return { text, zone };
}

// «★ 12» — картинкой звезды, а не текстовым символом.
export function addStarCount(scene, x, y, count, size = 40) {
  const container = scene.add.container(x, y);
  const star = scene.add.image(0, 0, TEX.star).setDisplaySize(size, size).setTint(0xffd23f);
  const text = addText(scene, 0, 0, String(count), size);
  const gap = 10;
  const total = size + gap + text.width - text.padding.left * 2;
  star.x = -total / 2 + size / 2;
  text.x = star.x + size / 2 + gap + (text.width - text.padding.left * 2) / 2;
  container.add([star, text]);
  return container;
}

export function addSoundButton(scene, x = GAME_WIDTH - 58, y = 58) {
  return addIconButton(scene, x, y, isMuted() ? TEX.soundOff : TEX.soundOn, (button) => {
    setMuted(!isMuted());
    button.setTexture(isMuted() ? TEX.soundOff : TEX.soundOn);
    playSound('button');
  });
}

// Плашка с монетами. setValue(n, animate) — плавно досчитывает.
export function addCoinCounter(scene, x, y) {
  const container = scene.add.container(x, y).setDepth(DEPTH.hud);
  const bg = scene.add.graphics();
  bg.fillStyle(0x1e2958, 0.85);
  bg.fillRoundedRect(0, -30, 190, 60, 30);
  bg.lineStyle(4, 0xffd9a0, 1);
  bg.strokeRoundedRect(0, -30, 190, 60, 30);
  const icon = scene.add.image(28, 0, TEX.coin).setDisplaySize(64, 64);
  const text = addText(scene, 0, 0, '0', 38, { color: THEME.gold }).setOrigin(0, 0.5);
  text.x = 64 - text.padding.left;
  container.add([bg, icon, text]);

  const shown = { v: 0 };
  const iconScale = icon.scale;
  const counter = {
    container,
    icon,
    setValue(value, animate = false) {
      scene.tweens.killTweensOf(shown);
      if (!animate) {
        shown.v = value;
        text.setText(String(value));
        return;
      }
      scene.tweens.add({
        targets: shown,
        v: value,
        duration: 700,
        ease: 'Quad.easeOut',
        onUpdate: () => text.setText(String(Math.round(shown.v))),
      });
      scene.tweens.killTweensOf(icon);
      icon.setScale(iconScale);
      scene.tweens.add({ targets: icon, scale: iconScale * 1.25, duration: 120, yoyo: true, repeat: 2 });
    },
  };
  return counter;
}

// Монеты разлетаются из точки и прилетают в счётчик.
export function flyCoins(scene, fromX, fromY, counter, count = 8, onDone = () => {}) {
  const target = counter.container.getWorldTransformMatrix();
  const tx = target.tx + counter.icon.x;
  const ty = target.ty + counter.icon.y;
  for (let i = 0; i < count; i++) {
    const coin = scene.add.image(fromX, fromY, TEX.coin).setDisplaySize(52, 52).setDepth(DEPTH.flying);
    const angle = (i / count) * Math.PI * 2;
    scene.tweens.chain({
      targets: coin,
      tweens: [
        {
          x: fromX + Math.cos(angle) * 90,
          y: fromY + Math.sin(angle) * 90,
          duration: 280,
          ease: 'Quad.easeOut',
        },
        {
          x: tx,
          y: ty,
          scale: coin.scale * 0.7,
          duration: 450,
          delay: i * 45,
          ease: 'Quad.easeIn',
          onComplete: () => {
            coin.destroy();
            playSound('coin');
            if (i === count - 1) onDone();
          },
        },
      ],
    });
  }
}

// Короткая всплывающая подсказка по центру.
export function showToast(scene, message, y = 640) {
  const label = addText(scene, GAME_WIDTH / 2, y, message, 40).setDepth(DEPTH.toast);
  label.setScale(0);
  scene.tweens.chain({
    targets: label,
    tweens: [
      { scale: 1, duration: 250, ease: 'Back.easeOut' },
      { alpha: 0, y: y - 40, duration: 300, delay: 900, onComplete: () => label.destroy() },
    ],
  });
}
