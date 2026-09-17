// Локальное хранилище. localStorage может быть недоступен
// (приватный режим, запрет в iframe) — тогда данные живут до перезагрузки.
// На этапе 5 сюда добавятся облачные сохранения Яндекс Игр.

const PREFIX = 'block-puzzle:';
const memory = new Map();

export function loadValue(key, fallback) {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return memory.has(key) ? memory.get(key) : fallback;
  }
}

export function saveValue(key, value) {
  memory.set(key, value);
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // остаётся только в памяти
  }
}
