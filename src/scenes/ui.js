import { THEME } from './theme.js';

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
    label.setShadow(0, Math.round(size * 0.08), outline, 0, true, true);
  }
  return label;
}

// Объёмная кнопка: боковина снизу, при нажатии лицевая часть «проседает».
export function addButton(scene, x, y, label, onClick, { width = 380, height = 104 } = {}) {
  const depth = 12;
  const radius = height / 2;
  const container = scene.add.container(x, y);
  const side = scene.add.graphics();
  const face = scene.add.graphics();

  side.fillStyle(THEME.buttonSide, 1);
  side.fillRoundedRect(-width / 2, -height / 2 + depth, width, height, radius);

  face.fillStyle(THEME.button, 1);
  face.fillRoundedRect(-width / 2, -height / 2, width, height, radius);
  face.fillStyle(THEME.buttonHighlight, 0.7);
  face.fillRoundedRect(-width / 2 + 24, -height / 2 + 10, width - 48, height * 0.3, height * 0.15);

  const text = addText(scene, 0, -2, label, 46, { stroke: '#1f6b34' });
  const faceGroup = scene.add.container(0, 0, [face, text]);
  container.add([side, faceGroup]);
  container
    .setSize(width, height + depth)
    .setInteractive({ useHandCursor: true });

  const press = (down) => {
    faceGroup.y = down ? depth - 3 : 0;
  };
  container.on('pointerdown', () => press(true));
  container.on('pointerout', () => press(false));
  container.on('pointerup', () => {
    press(false);
    onClick();
  });
  return container;
}
