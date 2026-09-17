// Стиль «мультяшное 3D», тёплый закат.
export const THEME = {
  background: 0x6d5fd0, // цвет вокруг игры на широких экранах

  // Индекс цвета фигуры → основной цвет блока. Длина = COLOR_COUNT.
  // Оттенки разнесены по кругу и по яркости, у каждого свой значок (BLOCK_ICONS).
  blocks: [
    0xf5333f, // красный
    0xff8a1c, // оранжевый
    0xffd21a, // жёлтый
    0x46cf3c, // зелёный
    0x14c8c4, // бирюзовый
    0x2f63ff, // синий
    0xff55c8, // розовый
  ],

  font: '"Nunito", Arial, sans-serif',
  text: '#ffffff',
  outline: '#3a1d5c', // обводка мультяшных надписей
  gold: '#ffd84a',
  green: '#7dff8a',
  cyan: '#7fe8ff',

  panel: 0xfff3e6,
  panelText: '#3a1d5c',
  panelMuted: '#9a7ab4',
  overlay: 0x1a0e30,

  button: 0x4fd06a,
  buttonSide: 0x2f9a48,
  buttonHighlight: 0x8ff0a0,

  // Цвета для canvas.
  css: {
    frameLight: '#fff0d2', // тёплая рамка поля и полки
    frameDark: '#f0a86a',
    frameShadow: '#8a4a6e',
    boardTop: '#2c3a78',
    boardBottom: '#1e2958',
    cellHole: '#17204a',
    cellEdge: '#3d4d94',
  },
};

// Значок, выдавленный на блоке. Индекс совпадает с THEME.blocks.
export const BLOCK_ICONS = ['heart', 'circle', 'star', 'diamond', 'drop', 'square', 'flower'];
