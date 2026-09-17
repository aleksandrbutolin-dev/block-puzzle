// Стиль «мультяшное 3D», тёплый закат.
export const THEME = {
  background: 0x6d5fd0, // цвет вокруг игры на широких экранах
  // Индекс цвета фигуры → основной цвет блока. Длина = COLOR_COUNT.
  blocks: [0xff4f64, 0xff9a3c, 0xffcf3a, 0x5cd65c, 0x33c4f0, 0x5a7bff, 0xb865ff],

  font: '"Nunito", Arial, sans-serif',
  text: '#ffffff',
  outline: '#4a2170', // обводка мультяшных надписей
  textMuted: '#fde8ff',
  gold: '#ffd84a',
  green: '#7dff8a',
  cyan: '#7fe8ff',

  panel: 0xfff3e6,
  panelText: '#4a2170',
  panelMuted: '#a07cb8',
  overlay: 0x2a1040,

  button: 0x4fd06a,
  buttonSide: 0x2f9a48,
  buttonHighlight: 0x8ff0a0,

  // Цвета для canvas.
  css: {
    cellHole: '#4b2d6e',
    trayTop: '#7b4fa8',
    trayBottom: '#633d92',
    trayEdge: '#3f2266',
  },
};
