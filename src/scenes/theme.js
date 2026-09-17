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
  textMuted: '#fde8ff', // второстепенный светлый текст
  outline: '#3a1d5c', // обводка мультяшных надписей
  textShadow: 'rgba(58, 29, 92, 0.45)', // мягкая тень под надписью
  gold: '#ffd84a',
  green: '#7dff8a',
  cyan: '#7fe8ff',

  panel: 0xfff3e6,
  panelText: '#3a1d5c',
  // Контраст к кремовой панели не ниже 4.5:1 (проверено): 5.1 и 4.7.
  panelMuted: '#7a5b96',
  goldOnLight: '#a35d05',
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

// Слои отрисовки: чем больше, тем выше. Единая шкала вместо случайных чисел.
export const DEPTH = {
  board: 1,
  preview: 2,
  ghost: 3,
  overlayCell: 4,
  tray: 5,
  clearing: 6,
  flash: 7,
  drag: 10,
  particles: 12,
  popup: 15,
  hud: 20,
  banner: 25,
  dialog: 50,
  flying: 60,
  toast: 70,
};

// Минимальная сторона зоны нажатия: 44 css px на телефоне ≈ 88 игровых.
export const MIN_TAP = 88;

// Минимальный размер текста: 16 css px на телефоне ≈ 30 игровых.
export const MIN_TEXT = 30;

// Значок, выдавленный на блоке. Индекс совпадает с THEME.blocks.
export const BLOCK_ICONS = ['heart', 'circle', 'star', 'diamond', 'drop', 'square', 'flower'];
