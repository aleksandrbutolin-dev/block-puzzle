import Phaser from 'phaser';
import '@fontsource/nunito/latin-900.css';
import '@fontsource/nunito/cyrillic-900.css';
import { GAME_WIDTH, GAME_HEIGHT } from './config.js';
import { BootScene } from './scenes/BootScene.js';
import { GameScene } from './scenes/GameScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';
import { THEME } from './scenes/theme.js';

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
    scene: [BootScene, GameScene, GameOverScene],
  });

  // Для отладки в консоли браузера (только npm run dev).
  if (import.meta.env.DEV) window.game = game;
}

loadFonts().then(startGame);
