// Генератор случайных чисел с зерном (mulberry32).
// Одинаковое зерно → одинаковая последовательность: удобно для тестов и повторов.
export function createRng(seed = Date.now()) {
  let state = seed >>> 0;
  return function rng() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomInt(rng, maxExclusive) {
  return Math.floor(rng() * maxExclusive);
}

// Выбор элемента с учётом поля weight.
export function pickWeighted(rng, items) {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = rng() * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll < 0) return item;
  }
  return items[items.length - 1];
}
