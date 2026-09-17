import { GAME_WIDTH } from '../config.js';
import { TEX } from './textures.js';

// Облака: [x, y, масштаб, прозрачность, скорость px/с].
const CLOUDS = [
  [110, 185, 0.9, 0.55, 9],
  [615, 105, 0.7, 0.5, 6],
  [580, 215, 0.5, 0.4, 4],
];

// Закатный фон с плывущими облаками — общий для всех экранов.
export function addBackdrop(scene) {
  scene.add.image(0, 0, TEX.background).setOrigin(0);
  const clouds = CLOUDS.map(([x, y, scale, alpha, speed]) => ({
    image: scene.add.image(x, y, TEX.cloud).setScale(scale).setAlpha(alpha),
    speed,
  }));

  const update = (_time, delta) => {
    for (const { image, speed } of clouds) {
      image.x += (speed * delta) / 1000;
      if (image.x - image.displayWidth / 2 > GAME_WIDTH) image.x = -image.displayWidth / 2;
    }
  };
  scene.events.on('update', update);
  scene.events.once('shutdown', () => scene.events.off('update', update));
}
