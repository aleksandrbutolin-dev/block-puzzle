// Реклама. Пока — заглушка для локальной игры и GitHub Pages:
// вместо ролика на 2 секунды показывается экран «Реклама».
// На этапе 5 здесь будет SDK Яндекс Игр (ysdk.adv.showRewardedVideo), интерфейс не меняется.

import { pauseAudio } from './audio.js';

const STUB_DURATION = 2000;

// Реклама за вознаграждение. Возвращает true, если награду нужно выдать.
export function showRewarded() {
  return new Promise((resolve) => {
    pauseAudio(true);
    const overlay = document.createElement('div');
    overlay.style.cssText = [
      'position:fixed',
      'inset:0',
      'z-index:1000',
      'display:flex',
      'flex-direction:column',
      'align-items:center',
      'justify-content:center',
      'gap:16px',
      'background:rgba(10,6,25,0.92)',
      'color:#fff',
      'font:900 28px Nunito, Arial, sans-serif',
      'touch-action:none',
    ].join(';');
    const title = document.createElement('div');
    title.textContent = 'Реклама';
    const hint = document.createElement('div');
    hint.style.cssText = 'font-size:16px;opacity:0.7';
    hint.textContent = 'заглушка — настоящая реклама появится с SDK Яндекса';
    const timer = document.createElement('div');
    timer.style.cssText = 'font-size:48px';
    overlay.append(title, hint, timer);
    document.body.append(overlay);

    const started = performance.now();
    const tick = () => {
      const left = Math.max(0, STUB_DURATION - (performance.now() - started));
      timer.textContent = String(Math.ceil(left / 1000));
      if (left > 0) {
        requestAnimationFrame(tick);
        return;
      }
      overlay.remove();
      pauseAudio(false);
      resolve(true);
    };
    tick();
  });
}
