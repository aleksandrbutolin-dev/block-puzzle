import Phaser from 'phaser';
import '@fontsource/nunito/latin-900.css';
import '@fontsource/nunito/cyrillic-900.css';
import { GAME_WIDTH, GAME_HEIGHT } from './config.js';
import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';
import { ContinueScene } from './scenes/ContinueScene.js';
import { TasksScene } from './scenes/TasksScene.js';
import { CollectionScene } from './scenes/CollectionScene.js';
import { MapScene } from './scenes/MapScene.js';
import { LevelScene } from './scenes/LevelScene.js';
import { LevelResultScene } from './scenes/LevelResultScene.js';
import { THEME } from './scenes/theme.js';
import * as audio from './platform/audio.js';

// Canvas не ждёт шрифты сам: без этого первые надписи нарисуются запасным шрифтом.
function loadFonts() {
  return Promise.all([
    document.fonts.load('900 40px Nunito', 'Aa0'),
    document.fonts.load('900 40px Nunito', 'Яя'),
  ]).catch(() => {
    // не страшно — будет запасной шрифт
  });
}

function startGame() {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: THEME.background,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [BootScene, MenuScene, GameScene, ContinueScene, GameOverScene, TasksScene, CollectionScene, MapScene, LevelScene, LevelResultScene],
    audio: { noAudio: true }, // звук свой — platform/audio.js
    render: { powerPreference: 'high-performance' },
  });

  // Браузер разрешает звук только после касания. Фаза перехвата — раньше, чем игра
  // обработает то же касание; touchend и click нужны старым iOS.
  for (const type of ['pointerdown', 'touchend', 'click']) {
    window.addEventListener(type, audio.unlockAudio, true);
  }

  // Для отладки в консоли браузера (только npm run dev).
  if (import.meta.env.DEV) Object.assign(window, { game, audio });
}

loadFonts().then(startGame);
