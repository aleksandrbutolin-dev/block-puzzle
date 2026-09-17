// Набор значков. Все рисуются по одной системе:
// круглая подложка (кремовое кольцо + тёмная середина), белый символ,
// скруглённые концы линий, одна толщина штриха, поля 18% от размера.
//
// Текстура 192 px — вдвое больше экранного размера, чтобы значок оставался чётким.

export const ICON_PX = 192;

const STROKE = 0.075; // толщина линии от размера значка
const RING = '#fff0d2';
const RING_DARK = '#f0a86a';
const INNER = '#2c3a78';
const INNER_DARK = '#1e2958';

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

// Круглая подложка под символ.
function badge(ctx, S) {
  const c = S / 2;
  ctx.save();
  ctx.shadowColor = 'rgba(40, 14, 60, 0.45)';
  ctx.shadowBlur = S * 0.08;
  ctx.shadowOffsetY = S * 0.04;
  const ring = ctx.createLinearGradient(0, 0, 0, S);
  ring.addColorStop(0, RING);
  ring.addColorStop(1, RING_DARK);
  ctx.fillStyle = ring;
  ctx.beginPath();
  ctx.arc(c, c, c - S * 0.045, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const inner = ctx.createLinearGradient(0, 0, 0, S);
  inner.addColorStop(0, INNER);
  inner.addColorStop(1, INNER_DARK);
  ctx.fillStyle = inner;
  ctx.beginPath();
  ctx.arc(c, c, c - S * 0.14, 0, Math.PI * 2);
  ctx.fill();

  // Блик по верхнему краю кольца
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.lineWidth = S * 0.02;
  ctx.beginPath();
  ctx.arc(c, c, c - S * 0.07, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();
}

// Настройки белого символа поверх подложки.
function glyph(ctx, S) {
  ctx.strokeStyle = '#ffffff';
  ctx.fillStyle = '#ffffff';
  ctx.lineWidth = S * STROKE;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

// ---------- Символы ----------

function home(ctx, S) {
  badge(ctx, S);
  const c = S / 2;
  ctx.fillStyle = '#ffffff';
  ctx.lineJoin = 'round';
  ctx.lineWidth = S * 0.05;
  ctx.strokeStyle = '#ffffff';

  ctx.beginPath(); // крыша
  ctx.moveTo(c - S * 0.3, c);
  ctx.lineTo(c, c - S * 0.24);
  ctx.lineTo(c + S * 0.3, c);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  roundRect(ctx, c - S * 0.2, c - S * 0.02, S * 0.4, S * 0.24, S * 0.035); // стены
  ctx.fill();

  ctx.fillStyle = INNER; // дверь
  roundRect(ctx, c - S * 0.065, c + S * 0.08, S * 0.13, S * 0.14, S * 0.025);
  ctx.fill();
}

function speaker(ctx, S) {
  const c = S / 2;
  ctx.beginPath();
  ctx.moveTo(c - S * 0.22, c - S * 0.08);
  ctx.lineTo(c - S * 0.12, c - S * 0.08);
  ctx.lineTo(c + S * 0.01, c - S * 0.21);
  ctx.lineTo(c + S * 0.01, c + S * 0.21);
  ctx.lineTo(c - S * 0.12, c + S * 0.08);
  ctx.lineTo(c - S * 0.22, c + S * 0.08);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function soundOn(ctx, S) {
  badge(ctx, S);
  glyph(ctx, S);
  const c = S / 2;
  speaker(ctx, S);
  for (const r of [0.12, 0.2]) {
    ctx.beginPath();
    ctx.arc(c + S * 0.05, c, S * r, -0.9, 0.9);
    ctx.stroke();
  }
}

function soundOff(ctx, S) {
  badge(ctx, S);
  glyph(ctx, S);
  const c = S / 2;
  speaker(ctx, S);
  ctx.strokeStyle = '#ff6b7a';
  ctx.beginPath();
  ctx.moveTo(c + S * 0.09, c - S * 0.1);
  ctx.lineTo(c + S * 0.25, c + S * 0.1);
  ctx.moveTo(c + S * 0.25, c - S * 0.1);
  ctx.lineTo(c + S * 0.09, c + S * 0.1);
  ctx.stroke();
}

function video(ctx, S) {
  badge(ctx, S);
  glyph(ctx, S);
  const c = S / 2;
  roundRect(ctx, c - S * 0.24, c - S * 0.17, S * 0.48, S * 0.34, S * 0.07);
  ctx.fill();
  ctx.fillStyle = INNER;
  ctx.beginPath(); // треугольник воспроизведения
  ctx.moveTo(c - S * 0.06, c - S * 0.1);
  ctx.lineTo(c + S * 0.11, c);
  ctx.lineTo(c - S * 0.06, c + S * 0.1);
  ctx.closePath();
  ctx.fill();
}

function hammer(ctx, S) {
  badge(ctx, S);
  const c = S / 2;
  ctx.save();
  ctx.translate(c, c);
  ctx.rotate(-0.62);
  // рукоять
  ctx.fillStyle = '#c47f3b';
  roundRect(ctx, -S * 0.035, -S * 0.04, S * 0.07, S * 0.3, S * 0.035);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
  roundRect(ctx, -S * 0.012, -S * 0.02, S * 0.02, S * 0.24, S * 0.01);
  ctx.fill();
  // боёк
  ctx.fillStyle = '#e8e4f4';
  roundRect(ctx, -S * 0.19, -S * 0.22, S * 0.38, S * 0.18, S * 0.05);
  ctx.fill();
  ctx.fillStyle = '#a49dc4';
  roundRect(ctx, -S * 0.19, -S * 0.08, S * 0.38, S * 0.05, S * 0.02);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  roundRect(ctx, -S * 0.15, -S * 0.19, S * 0.12, S * 0.05, S * 0.02);
  ctx.fill();
  ctx.restore();
}

function swap(ctx, S) {
  badge(ctx, S);
  glyph(ctx, S);
  const c = S / 2;
  const r = S * 0.2;
  const rad = (deg) => (deg * Math.PI) / 180;

  // Верхняя и нижняя дуги с разрывами по бокам.
  ctx.beginPath();
  ctx.arc(c, c, r, rad(195), rad(345));
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(c, c, r, rad(15), rad(165));
  ctx.stroke();

  // Наконечники на концах дуг, по касательной.
  const arrow = (deg, clockwise) => {
    const a = rad(deg);
    ctx.save();
    ctx.translate(c + Math.cos(a) * r, c + Math.sin(a) * r);
    ctx.rotate(a + (clockwise ? Math.PI / 2 : -Math.PI / 2));
    ctx.beginPath();
    ctx.moveTo(-S * 0.07, -S * 0.055);
    ctx.lineTo(0, S * 0.055);
    ctx.lineTo(S * 0.07, -S * 0.055);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };
  arrow(345, true);
  arrow(165, false);
}

function lock(ctx, S) {
  const c = S / 2;
  ctx.strokeStyle = '#d8d2ea';
  ctx.lineWidth = S * 0.1;
  ctx.lineCap = 'round';
  ctx.beginPath(); // дужка
  ctx.arc(c, c - S * 0.1, S * 0.17, Math.PI, 0);
  ctx.stroke();

  ctx.fillStyle = '#5d5680';
  roundRect(ctx, c - S * 0.27, c - S * 0.1, S * 0.54, S * 0.44, S * 0.11);
  ctx.fill();
  ctx.fillStyle = '#8a82ab';
  roundRect(ctx, c - S * 0.23, c - S * 0.06, S * 0.46, S * 0.32, S * 0.09);
  ctx.fill();
  ctx.fillStyle = '#3f3a5c';
  ctx.beginPath();
  ctx.arc(c, c + S * 0.07, S * 0.06, 0, Math.PI * 2);
  ctx.fill();
  roundRect(ctx, c - S * 0.025, c + S * 0.07, S * 0.05, S * 0.12, S * 0.025);
  ctx.fill();
}

function tasks(ctx, S) {
  // Планшет со списком — без круглой подложки, значок кнопки меню.
  ctx.fillStyle = '#b07a3c';
  roundRect(ctx, S * 0.16, S * 0.1, S * 0.68, S * 0.82, S * 0.11);
  ctx.fill();
  ctx.fillStyle = '#fff4e0';
  roundRect(ctx, S * 0.21, S * 0.16, S * 0.58, S * 0.7, S * 0.08);
  ctx.fill();
  ctx.fillStyle = '#c99050';
  roundRect(ctx, S * 0.38, S * 0.05, S * 0.24, S * 0.13, S * 0.06);
  ctx.fill();

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let i = 0; i < 3; i++) {
    const y = S * (0.34 + i * 0.18);
    ctx.strokeStyle = '#46cf3c';
    ctx.lineWidth = S * 0.06;
    ctx.beginPath();
    ctx.moveTo(S * 0.28, y);
    ctx.lineTo(S * 0.33, y + S * 0.05);
    ctx.lineTo(S * 0.42, y - S * 0.06);
    ctx.stroke();
    ctx.strokeStyle = '#c3b0a0';
    ctx.lineWidth = S * 0.05;
    ctx.beginPath();
    ctx.moveTo(S * 0.5, y);
    ctx.lineTo(S * 0.72, y);
    ctx.stroke();
  }
}

// Четыре блока — значок коллекции. drawBlock приходит из textures.js.
function collection(ctx, S, drawBlock, colors, icons) {
  const cell = S * 0.44;
  const gap = S * 0.04;
  const order = [0, 2, 4, 6];
  order.forEach((color, i) => {
    const x = (i % 2) * (cell + gap) + S * 0.04;
    const y = Math.floor(i / 2) * (cell + gap) + S * 0.04;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(cell / 128, cell / 128);
    drawBlock(ctx, 128, colors[color], icons[color]);
    ctx.restore();
  });
}

function coin(ctx, S) {
  const c = S / 2;
  const r = c - S * 0.05;
  ctx.fillStyle = '#b86e12';
  ctx.beginPath();
  ctx.arc(c, c + S * 0.035, r, 0, Math.PI * 2);
  ctx.fill();

  const face = ctx.createLinearGradient(0, 0, 0, S);
  face.addColorStop(0, '#fff2a8');
  face.addColorStop(0.5, '#ffc93a');
  face.addColorStop(1, '#f0a017');
  ctx.fillStyle = face;
  ctx.beginPath();
  ctx.arc(c, c, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#d98010';
  ctx.lineWidth = S * 0.045;
  ctx.beginPath();
  ctx.arc(c, c, r * 0.76, 0, Math.PI * 2);
  ctx.stroke();

  // звезда на монете
  ctx.fillStyle = '#e9940f';
  starPath(ctx, c, c + S * 0.01, r * 0.46);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  starPath(ctx, c, c - S * 0.01, r * 0.44);
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.beginPath();
  ctx.ellipse(c - r * 0.42, c - r * 0.5, r * 0.2, r * 0.11, -0.7, 0, Math.PI * 2);
  ctx.fill();
}

function starPath(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * 0.46 : r;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  ctx.closePath();
}

function star(ctx, S) {
  const c = S / 2;
  ctx.lineJoin = 'round';
  ctx.lineWidth = S * 0.09;
  ctx.strokeStyle = '#ffffff';
  ctx.fillStyle = '#ffffff';
  starPath(ctx, c, c, S * 0.44);
  ctx.stroke();
  ctx.fill();
  // мягкая тень внутри — звезда выглядит объёмной при подкраске
  ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
  starPath(ctx, c, c + S * 0.03, S * 0.3);
  ctx.fill();
}

function chest(ctx, S, open) {
  const c = S / 2;
  const bodyTop = S * 0.5;
  const drawBody = () => {
    ctx.fillStyle = '#8a5322';
    roundRect(ctx, S * 0.14, bodyTop - S * 0.02, S * 0.72, S * 0.36, S * 0.07);
    ctx.fill();
    ctx.fillStyle = '#c47f3b';
    roundRect(ctx, S * 0.18, bodyTop + S * 0.02, S * 0.64, S * 0.28, S * 0.05);
    ctx.fill();
    ctx.fillStyle = '#ffc93a';
    roundRect(ctx, c - S * 0.05, bodyTop + S * 0.02, S * 0.1, S * 0.26, S * 0.03);
    ctx.fill();
  };
  const drawLid = (dy, angle) => {
    ctx.save();
    ctx.translate(c, bodyTop + dy);
    ctx.rotate(angle);
    ctx.fillStyle = '#6f3f18';
    roundRect(ctx, -S * 0.36, -S * 0.24, S * 0.72, S * 0.26, S * 0.1);
    ctx.fill();
    ctx.fillStyle = '#a2652c';
    roundRect(ctx, -S * 0.32, -S * 0.2, S * 0.64, S * 0.18, S * 0.08);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    roundRect(ctx, -S * 0.26, -S * 0.17, S * 0.4, S * 0.05, S * 0.02);
    ctx.fill();
    ctx.restore();
  };

  if (open) {
    // Крышка откинута назад и вверх, из сундука видны монеты.
    ctx.save();
    ctx.translate(S * 0.2, bodyTop - S * 0.02);
    ctx.rotate(-0.85);
    ctx.fillStyle = '#6f3f18';
    roundRect(ctx, -S * 0.04, -S * 0.26, S * 0.66, S * 0.24, S * 0.09);
    ctx.fill();
    ctx.fillStyle = '#a2652c';
    roundRect(ctx, 0, -S * 0.22, S * 0.58, S * 0.16, S * 0.07);
    ctx.fill();
    ctx.restore();

    drawBody();
    ctx.fillStyle = '#ffd23f';
    for (const [x, y, r] of [[0.36, 0.5, 0.08], [0.5, 0.46, 0.09], [0.64, 0.5, 0.08]]) {
      ctx.beginPath();
      ctx.arc(S * x, S * y, S * r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#e9940f';
    for (const [x, y, r] of [[0.36, 0.5, 0.04], [0.5, 0.46, 0.045], [0.64, 0.5, 0.04]]) {
      ctx.beginPath();
      ctx.arc(S * x, S * y, S * r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    drawBody();
    drawLid(0, 0);
    ctx.fillStyle = '#ffc93a';
    ctx.beginPath();
    ctx.arc(c, bodyTop - S * 0.02, S * 0.06, 0, Math.PI * 2);
    ctx.fill();
  }
}

function gem(ctx, S) {
  const c = S / 2;
  const r = S * 0.3;
  const points = [
    [c, c - r],
    [c + r * 0.85, c - r * 0.15],
    [c + r * 0.5, c + r],
    [c - r * 0.5, c + r],
    [c - r * 0.85, c - r * 0.15],
  ];
  ctx.beginPath();
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  const fill = ctx.createLinearGradient(0, c - r, 0, c + r);
  fill.addColorStop(0, '#bff3ff');
  fill.addColorStop(1, '#3fb6e0');
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = '#1a5f80';
  ctx.lineWidth = S * 0.05;
  ctx.lineJoin = 'round';
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = S * 0.03;
  ctx.beginPath();
  ctx.moveTo(c - r * 0.85, c - r * 0.15);
  ctx.lineTo(c, c + r * 0.12);
  ctx.lineTo(c + r * 0.85, c - r * 0.15);
  ctx.moveTo(c, c - r);
  ctx.lineTo(c, c + r * 0.12);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.beginPath();
  ctx.ellipse(c - r * 0.3, c - r * 0.4, r * 0.15, r * 0.08, -0.5, 0, Math.PI * 2);
  ctx.fill();
}

// Ледяная корка поверх блока: layers = 1 или 2.
function ice(ctx, S, layers) {
  const inset = S * 0.03;
  const w = S - inset * 2;
  const radius = S * 0.24;
  ctx.save();
  roundRect(ctx, inset, inset, w, w, radius);
  ctx.clip();

  const alpha = layers > 1 ? 0.85 : 0.62;
  const fill = ctx.createLinearGradient(0, 0, S, S);
  fill.addColorStop(0, `rgba(240, 252, 255, ${alpha})`);
  fill.addColorStop(1, `rgba(150, 210, 245, ${alpha})`);
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, S, S);

  // Снежинка: шесть лучей с веточками.
  const c = S / 2;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.lineWidth = S * (layers > 1 ? 0.04 : 0.03);
  ctx.lineCap = 'round';
  const arm = S * (layers > 1 ? 0.34 : 0.3);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const ex = c + Math.cos(a) * arm;
    const ey = c + Math.sin(a) * arm;
    ctx.beginPath();
    ctx.moveTo(c, c);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    // веточки
    for (const t of [0.55, 0.85]) {
      const bx = c + Math.cos(a) * arm * t;
      const by = c + Math.sin(a) * arm * t;
      for (const side of [-0.6, 0.6]) {
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + Math.cos(a + side) * arm * 0.22, by + Math.sin(a + side) * arm * 0.22);
        ctx.stroke();
      }
    }
  }

  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.beginPath();
  ctx.ellipse(S * 0.3, S * 0.26, S * 0.15, S * 0.07, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.lineWidth = S * 0.035;
  roundRect(ctx, inset + S * 0.02, inset + S * 0.02, w - S * 0.04, w - S * 0.04, radius - S * 0.02);
  ctx.stroke();
}

// Рука-указатель для обучения. Кончик пальца — в точке HAND_TIP.
export const HAND_TIP = { x: 0.42, y: 0.06 };

function hand(ctx, S) {
  const u = S / 128;
  const outline = '#3a1d5c';
  const skin = '#ffe0c7';
  const parts = [
    [44, 6, 26, 70, 13], // указательный палец
    [30, 56, 70, 60, 22], // ладонь
    [16, 66, 34, 22, 11], // большой палец
  ].map((part) => part.map((v) => v * u));

  ctx.lineJoin = 'round';
  ctx.lineWidth = 10 * u;
  ctx.strokeStyle = outline;
  for (const part of parts) {
    roundRect(ctx, ...part);
    ctx.stroke();
  }
  ctx.fillStyle = skin;
  for (const part of parts) {
    roundRect(ctx, ...part);
    ctx.fill();
  }

  ctx.strokeStyle = '#f4b996';
  ctx.lineWidth = 4 * u;
  ctx.lineCap = 'round';
  for (const x of [70, 84]) {
    ctx.beginPath();
    ctx.moveTo(x * u, 62 * u);
    ctx.lineTo(x * u, 80 * u);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(244, 185, 150, 0.6)';
  roundRect(ctx, 34 * u, 96 * u, 62 * u, 16 * u, 8 * u);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  roundRect(ctx, 50 * u, 12 * u, 6 * u, 22 * u, 3 * u);
  ctx.fill();
}

export const ICONS = {
  home,
  soundOn,
  soundOff,
  video,
  hammer,
  swap,
  lock,
  tasks,
  collection,
  coin,
  star,
  gem,
  ice,
  chest,
  hand,
};
