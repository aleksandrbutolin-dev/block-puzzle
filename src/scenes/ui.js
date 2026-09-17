import { THEME } from './theme.js';

export const FONT = 'Arial, sans-serif';

export function addText(scene, x, y, text, size, style = {}) {
  return scene.add
    .text(x, y, text, { fontFamily: FONT, fontSize: `${size}px`, color: THEME.text, ...style })
    .setOrigin(0.5);
}

// Кнопка: скруглённый прямоугольник + подпись, срабатывает при отпускании.
export function addButton(scene, x, y, label, onClick, { width = 360, height = 96 } = {}) {
  const container = scene.add.container(x, y);
  const bg = scene.add.graphics();
  const draw = (color) => {
    bg.clear();
    bg.fillStyle(color, 1);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, height / 2);
  };
  draw(THEME.accent);

  const text = addText(scene, 0, 0, label, 40, { fontStyle: 'bold' });
  container.add([bg, text]);
  container.setSize(width, height).setInteractive({ useHandCursor: true });

  container.on('pointerdown', () => {
    draw(THEME.accentPressed);
    container.setScale(0.96);
  });
  container.on('pointerout', () => {
    draw(THEME.accent);
    container.setScale(1);
  });
  container.on('pointerup', () => {
    draw(THEME.accent);
    container.setScale(1);
    onClick();
  });
  return container;
}
