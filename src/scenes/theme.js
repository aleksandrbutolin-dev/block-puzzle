// Временная палитра (до выбора стиля на этапе 3).
export const THEME = {
  background: 0x1a1a2e,
  boardBackground: 0x16213e,
  emptyCell: 0x24304f,
  text: '#ffffff',
  textMuted: '#8a94b8',
  accent: 0x3dbb6e,
  accentPressed: 0x2e9456,
  gold: '#ffd93d',
  overlay: 0x0b0b16,
  panel: 0x232a4a,
  // Индекс цвета фигуры → цвет блока. Длина = COLOR_COUNT.
  blocks: [0xff5c5c, 0xffa53d, 0xffd93d, 0x5ed16a, 0x3dc9ff, 0x5c7cff, 0xc35cff],
};

// Скруглённый блок с простым бликом сверху.
export function drawBlock(graphics, x, y, size, color) {
  const radius = Math.max(2, size * 0.14);
  const inset = Math.max(1, size * 0.04);
  graphics.fillStyle(color, 1);
  graphics.fillRoundedRect(x + inset, y + inset, size - inset * 2, size - inset * 2, radius);
  graphics.fillStyle(0xffffff, 0.22);
  graphics.fillRoundedRect(
    x + inset * 3,
    y + inset * 3,
    size - inset * 6,
    (size - inset * 6) * 0.3,
    radius * 0.6,
  );
}
