// Тексты мета-прогрессии (RU). На этапе 5 переедут в общую локализацию RU/EN.

// Русское множественное число: plural(5, ['линию', 'линии', 'линий']) → 'линий'.
export function plural(n, [one, few, many]) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

export function taskText({ type, target: n }) {
  switch (type) {
    case 'lines':
      return `Собери ${n} ${plural(n, ['линию', 'линии', 'линий'])}`;
    case 'pieces':
      return `Поставь ${n} ${plural(n, ['фигуру', 'фигуры', 'фигур'])}`;
    case 'games':
      return `Сыграй ${n} ${plural(n, ['партию', 'партии', 'партий'])}`;
    case 'combo':
      return `Убери ${n} ${plural(n, ['линию', 'линии', 'линий'])} одним ходом`;
    case 'streak':
      return `Серия очисток ×${n}`;
    case 'score':
      return `Набери ${n} ${plural(n, ['очко', 'очка', 'очков'])} за партию`;
    case 'clearBoard':
      return 'Очисти всё поле';
    default:
      return type;
  }
}

// «Новые задания через 5 ч 07 мин».
export function timeUntilTomorrow(now = new Date()) {
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const minutes = Math.max(0, Math.ceil((midnight - now) / 60000));
  const h = Math.floor(minutes / 60);
  const m = String(minutes % 60).padStart(2, '0');
  return `${h} ч ${m} мин`;
}

export const SKIN_NAMES = {
  toys: 'Игрушки',
  crystals: 'Кристаллы',
};
