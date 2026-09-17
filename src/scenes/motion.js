// Уважаем системную настройку «уменьшить анимацию» (iOS: Универсальный доступ → Движение).
// Зацикленные покачивания и пульсации выключаем, короткие отклики на действия оставляем.

// Для проверки без настроек системы: добавьте к адресу ?reduced=1
const forced =
  typeof location !== 'undefined' && new URLSearchParams(location.search).has('reduced');

export const reducedMotion =
  forced ||
  (typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false);

// Бесконечная анимация: при «уменьшить анимацию» просто не запускается.
export function loopTween(scene, config) {
  if (reducedMotion) return null;
  return scene.tweens.add({ yoyo: true, repeat: -1, ...config });
}
