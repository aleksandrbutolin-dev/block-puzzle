// Процедурная графика в «мультяшном 3D» стиле: рисуется на canvas при запуске.
// Без файлов картинок — быстрее загрузка и нет вопросов с лицензиями.

import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { THEME, BLOCK_ICONS } from './theme.js';

// Текущая тема блоков (id из SKINS). Меняется через setSkin().
let currentSkin = 'toys';

export function setSkin(skinId) {
  currentSkin = skinId;
}

export const TEX = {
  block: (color) => `block-${currentSkin}-${color}`,
  blockOf: (skin, color) => `block-${skin}-${color}`,
  blockShadow: 'block-shadow',
  ghostFrame: 'ghost-frame',
  cell: 'cell',
  board: 'board',
  shelf: 'shelf',
  background: 'background',
  cloud: 'cloud',
  coin: 'coin',
  soundOn: 'sound-on',
  soundOff: 'sound-off',
  home: 'icon-home',
  tasks: 'icon-tasks',
  collection: 'icon-collection',
  spark: 'spark',
  star: 'star',
};

const BLOCK_PX = 128; // текстура крупнее экранного размера — чётче при уменьшении
export const BOARD_TEX_PADDING = 22; // рамка вокруг клеток поля
export const BOARD_TEX_MARGIN = 28; // место под тень
export const SHELF_SIZE = { width: 688, height: 280 };
const SHELF_MARGIN = 8; // отступ панели от края текстуры (сверху ещё место под тень)
const SHELF_FRAME = 10; // толщина рамки полки
const SHELF_PANEL_H = SHELF_SIZE.height - 44;
export const SHELF_PANEL_CENTER_Y = SHELF_MARGIN + SHELF_PANEL_H / 2; // центр панели внутри текстуры
// Тёмная внутренняя часть полки — фигуры в лотке должны помещаться в неё.
export const SHELF_INNER = {
  width: SHELF_SIZE.width - 2 * (SHELF_MARGIN + SHELF_FRAME),
  height: SHELF_PANEL_H - 2 * SHELF_FRAME,
};

// ---------- Цвета ----------

function toRgb(hex) {
  return { r: (hex >> 16) & 255, g: (hex >> 8) & 255, b: hex & 255 };
}

// amount > 0 — светлее (к белому), < 0 — темнее (к чёрному).
function shade(hex, amount, alpha = 1) {
  const { r, g, b } = toRgb(hex);
  const target = amount > 0 ? 255 : 0;
  const k = Math.abs(amount);
  const mix = (v) => Math.round(v + (target - v) * k);
  return `rgba(${mix(r)}, ${mix(g)}, ${mix(b)}, ${alpha})`;
}

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

function makeCanvas(scene, key, width, height, draw) {
  if (scene.textures.exists(key)) return;
  const texture = scene.textures.createCanvas(key, width, height);
  draw(texture.getContext(), width, height);
  texture.refresh();
}

// Детерминированный «рандом» для фона — картинка одинакова при каждом запуске.
function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ---------- Значки на блоках ----------

// Контур значка с центром (cx, cy) и размером r.
function iconPath(ctx, icon, cx, cy, r) {
  ctx.beginPath();
  switch (icon) {
    case 'heart': {
      const top = cy - r * 0.45;
      ctx.moveTo(cx, cy + r * 0.85);
      ctx.bezierCurveTo(cx - r * 1.25, cy + r * 0.05, cx - r * 0.85, top - r * 0.75, cx, top + r * 0.05);
      ctx.bezierCurveTo(cx + r * 0.85, top - r * 0.75, cx + r * 1.25, cy + r * 0.05, cx, cy + r * 0.85);
      break;
    }
    case 'circle':
      ctx.arc(cx, cy, r * 0.78, 0, Math.PI * 2);
      break;
    case 'star':
      for (let i = 0; i < 10; i++) {
        const rr = i % 2 ? r * 0.45 : r;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr + r * 0.08);
      }
      break;
    case 'diamond':
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r * 0.78, cy);
      ctx.lineTo(cx, cy + r);
      ctx.lineTo(cx - r * 0.78, cy);
      break;
    case 'drop':
      ctx.moveTo(cx, cy - r);
      ctx.bezierCurveTo(cx + r * 0.2, cy - r * 0.5, cx + r * 0.8, cy, cx + r * 0.8, cy + r * 0.3);
      ctx.arc(cx, cy + r * 0.3, r * 0.8, 0, Math.PI);
      ctx.bezierCurveTo(cx - r * 0.8, cy, cx - r * 0.2, cy - r * 0.5, cx, cy - r);
      break;
    case 'square':
      roundRect(ctx, cx - r * 0.7, cy - r * 0.7, r * 1.4, r * 1.4, r * 0.28);
      return;
    case 'flower':
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
        const px = cx + Math.cos(a) * r * 0.5;
        const py = cy + Math.sin(a) * r * 0.5;
        ctx.moveTo(px + r * 0.42, py);
        ctx.arc(px, py, r * 0.42, 0, Math.PI * 2);
      }
      ctx.moveTo(cx + r * 0.4, cy);
      ctx.arc(cx, cy, r * 0.4, 0, Math.PI * 2);
      return;
  }
  ctx.closePath();
}

// «Выдавленный» значок: тёмная нижняя кромка + светлая заливка.
function drawIcon(ctx, icon, cx, cy, r, base) {
  iconPath(ctx, icon, cx, cy + 3, r);
  ctx.fillStyle = shade(base, -0.45, 0.55);
  ctx.fill();
  iconPath(ctx, icon, cx, cy, r);
  const g = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  g.addColorStop(0, shade(base, 0.7, 0.95));
  g.addColorStop(1, shade(base, 0.3, 0.9));
  ctx.fillStyle = g;
  ctx.fill();
}

// ---------- Блок: глянцевая пластиковая игрушка ----------

function drawBlock(ctx, S, base, icon) {
  const inset = 4;
  const w = S - inset * 2;
  const radius = S * 0.24;
  const depth = S * 0.08; // высота «бортика» снизу
  const faceH = w - depth - 4;

  // Тёмная обводка всего блока — чёткая граница между соседями
  ctx.fillStyle = shade(base, -0.62);
  roundRect(ctx, inset, inset, w, w, radius);
  ctx.fill();

  // Боковина (объём)
  ctx.fillStyle = shade(base, -0.32);
  roundRect(ctx, inset + 3, inset + 3, w - 6, w - 6, radius - 3);
  ctx.fill();

  // Лицевая грань
  const fx = inset + 3;
  const fy = inset + 3;
  const fw = w - 6;
  const face = ctx.createLinearGradient(0, fy, 0, fy + faceH);
  face.addColorStop(0, shade(base, 0.32));
  face.addColorStop(0.5, shade(base, 0.02));
  face.addColorStop(1, shade(base, -0.1));
  ctx.fillStyle = face;
  roundRect(ctx, fx, fy, fw, faceH, radius - 3);
  ctx.fill();

  ctx.save();
  roundRect(ctx, fx, fy, fw, faceH, radius - 3);
  ctx.clip();

  // Светлая фаска сверху-слева
  ctx.strokeStyle = shade(base, 0.6, 0.9);
  ctx.lineWidth = 5;
  roundRect(ctx, fx + 1, fy + 1, fw - 2, faceH + 20, radius - 4);
  ctx.stroke();

  // «Подушка» в центре — вторая ступень объёма
  const px = fx + S * 0.14;
  const py = fy + S * 0.13;
  const pw = fw - S * 0.28;
  const ph = faceH - S * 0.24;
  ctx.fillStyle = shade(base, -0.28, 0.55);
  roundRect(ctx, px, py + 2, pw, ph, S * 0.16);
  ctx.fill();
  const pillow = ctx.createLinearGradient(0, py, 0, py + ph);
  pillow.addColorStop(0, shade(base, 0.12));
  pillow.addColorStop(1, shade(base, 0.2));
  ctx.fillStyle = pillow;
  roundRect(ctx, px, py, pw, ph - 1, S * 0.16);
  ctx.fill();

  drawIcon(ctx, icon, S / 2, py + ph / 2, S * 0.2, base);

  // Глянец сверху
  const hl = ctx.createLinearGradient(0, fy, 0, fy + faceH * 0.45);
  hl.addColorStop(0, 'rgba(255, 255, 255, 0.55)');
  hl.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = hl;
  roundRect(ctx, fx + S * 0.08, fy + S * 0.03, fw - S * 0.16, faceH * 0.34, S * 0.14);
  ctx.fill();
  ctx.restore();

  // Блики
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.beginPath();
  ctx.ellipse(S * 0.24, S * 0.17, S * 0.06, S * 0.035, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(S * 0.35, S * 0.13, S * 0.018, 0, Math.PI * 2);
  ctx.fill();
}

// ---------- Блок: гранёный кристалл ----------

// Восьмиугольник с отступом inset и срезанными углами cut.
function octagon(S, inset, cut) {
  const a = inset;
  const b = S - inset;
  return [
    [a + cut, a], [b - cut, a], [b, a + cut], [b, b - cut],
    [b - cut, b], [a + cut, b], [a, b - cut], [a, a + cut],
  ];
}

function polygon(ctx, points) {
  ctx.beginPath();
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
}

// Грани по кругу: верх, верх-право, право, низ-право, низ, низ-лево, лево, верх-лево.
const FACET_LIGHT = [0.5, 0.28, -0.12, -0.35, -0.42, -0.22, 0.14, 0.4];

function drawCrystal(ctx, S, base, icon) {
  // Тень и тёмный контур
  polygon(ctx, octagon(S, 4, 30).map(([x, y]) => [x, y + 4]));
  ctx.fillStyle = 'rgba(20, 5, 40, 0.35)';
  ctx.fill();
  polygon(ctx, octagon(S, 3, 30));
  ctx.fillStyle = shade(base, -0.62);
  ctx.fill();

  const outer = octagon(S, 7, 27);
  const inner = octagon(S, 30, 13);

  // Грани
  for (let k = 0; k < 8; k++) {
    const n = (k + 1) % 8;
    polygon(ctx, [outer[k], outer[n], inner[n], inner[k]]);
    ctx.fillStyle = shade(base, FACET_LIGHT[k]);
    ctx.fill();
  }

  // Рёбра между гранями
  ctx.strokeStyle = shade(base, 0.7, 0.45);
  ctx.lineWidth = 1.5;
  for (let k = 0; k < 8; k++) {
    ctx.beginPath();
    ctx.moveTo(...outer[k]);
    ctx.lineTo(...inner[k]);
    ctx.stroke();
  }

  // Центральная площадка
  polygon(ctx, inner);
  const table = ctx.createLinearGradient(0, S * 0.25, S, S * 0.75);
  table.addColorStop(0, shade(base, 0.35));
  table.addColorStop(0.5, shade(base, 0.05));
  table.addColorStop(1, shade(base, -0.15));
  ctx.fillStyle = table;
  ctx.fill();

  // Диагональный отблеск на площадке
  ctx.save();
  polygon(ctx, inner);
  ctx.clip();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.beginPath();
  ctx.moveTo(S * 0.2, S * 0.62);
  ctx.lineTo(S * 0.62, S * 0.2);
  ctx.lineTo(S * 0.74, S * 0.2);
  ctx.lineTo(S * 0.2, S * 0.74);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  polygon(ctx, inner);
  ctx.strokeStyle = shade(base, 0.6, 0.6);
  ctx.lineWidth = 2;
  ctx.stroke();

  drawIcon(ctx, icon, S / 2, S / 2, S * 0.15, base);

  // Искра
  const sx = S * 0.28;
  const sy = S * 0.2;
  const r = S * 0.1;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.beginPath();
  ctx.moveTo(sx, sy - r);
  ctx.quadraticCurveTo(sx, sy, sx + r, sy);
  ctx.quadraticCurveTo(sx, sy, sx, sy + r);
  ctx.quadraticCurveTo(sx, sy, sx - r, sy);
  ctx.quadraticCurveTo(sx, sy, sx, sy - r);
  ctx.fill();
}

const BLOCK_DRAWERS = { toys: drawBlock, crystals: drawCrystal };

// Мягкая тень под фигурой в руке.
function drawBlockShadow(ctx, S) {
  for (let i = 0; i < 6; i++) {
    const grow = i * 3;
    ctx.fillStyle = 'rgba(10, 5, 30, 0.13)';
    roundRect(ctx, 14 - grow, 14 - grow, S - 28 + grow * 2, S - 28 + grow * 2, S * 0.24 + grow);
    ctx.fill();
  }
}

// Белая рамка подсказки места.
function drawGhostFrame(ctx, S) {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.lineWidth = 6;
  roundRect(ctx, 8, 8, S - 16, S - 16, S * 0.22);
  ctx.stroke();
}

// ---------- Пустая клетка: углубление в поле ----------

function drawCell(ctx, S) {
  const inset = 6;
  const w = S - inset * 2;
  const radius = S * 0.2;

  // Светлая нижняя кромка
  ctx.fillStyle = THEME.css.cellEdge;
  roundRect(ctx, inset, inset + 3, w, w - 3, radius);
  ctx.fill();

  ctx.fillStyle = THEME.css.cellHole;
  roundRect(ctx, inset, inset, w, w - 3, radius);
  ctx.fill();

  // Внутренняя тень сверху
  ctx.save();
  roundRect(ctx, inset, inset, w, w - 3, radius);
  ctx.clip();
  const inner = ctx.createLinearGradient(0, inset, 0, inset + w * 0.4);
  inner.addColorStop(0, 'rgba(0, 0, 15, 0.55)');
  inner.addColorStop(1, 'rgba(0, 0, 15, 0)');
  ctx.fillStyle = inner;
  ctx.fillRect(0, 0, S, S);
  ctx.restore();
}

// ---------- Поле и полка: тёмная панель в тёплой рамке ----------

function drawFramedPanel(ctx, x, y, w, h, radius, frame, alpha = 1) {
  // Тень
  ctx.save();
  ctx.shadowColor = 'rgba(60, 15, 60, 0.5)';
  ctx.shadowBlur = 26;
  ctx.shadowOffsetY = 14;
  ctx.fillStyle = THEME.css.frameShadow;
  roundRect(ctx, x, y + 8, w, h, radius);
  ctx.fill();
  ctx.restore();

  // Рамка
  const outer = ctx.createLinearGradient(0, y, 0, y + h);
  outer.addColorStop(0, THEME.css.frameLight);
  outer.addColorStop(1, THEME.css.frameDark);
  ctx.fillStyle = outer;
  roundRect(ctx, x, y, w, h, radius);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.lineWidth = 3;
  roundRect(ctx, x + 2, y + 2, w - 4, h - 4, radius - 2);
  ctx.stroke();

  // Внутренняя панель
  const ix = x + frame;
  const iy = y + frame;
  const iw = w - frame * 2;
  const ih = h - frame * 2;
  const ir = radius - frame * 0.7;
  ctx.globalAlpha = alpha;
  const inner = ctx.createLinearGradient(0, iy, 0, iy + ih);
  inner.addColorStop(0, THEME.css.boardTop);
  inner.addColorStop(1, THEME.css.boardBottom);
  ctx.fillStyle = inner;
  roundRect(ctx, ix, iy, iw, ih, ir);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Тень рамки на панели
  ctx.save();
  roundRect(ctx, ix, iy, iw, ih, ir);
  ctx.clip();
  const lip = ctx.createLinearGradient(0, iy, 0, iy + 24);
  lip.addColorStop(0, 'rgba(0, 0, 20, 0.5)');
  lip.addColorStop(1, 'rgba(0, 0, 20, 0)');
  ctx.fillStyle = lip;
  ctx.fillRect(ix, iy, iw, 24);
  ctx.restore();
}

function drawBoard(ctx, W, H) {
  const m = BOARD_TEX_MARGIN;
  drawFramedPanel(ctx, m, m, W - m * 2, H - m * 2, 46, 14);
}

function drawShelf(ctx, W, H) {
  drawFramedPanel(ctx, SHELF_MARGIN, SHELF_MARGIN, W - SHELF_MARGIN * 2, SHELF_PANEL_H, 40, SHELF_FRAME, 0.92);
}

// ---------- Фон: тёплый закат, облака, холмы ----------

function drawBackground(ctx, W, H) {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#6d5fd0');
  sky.addColorStop(0.3, '#a77ad8');
  sky.addColorStop(0.58, '#f39ab9');
  sky.addColorStop(0.82, '#ffbf8f');
  sky.addColorStop(1, '#ffd9a3');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Солнце за полем — тёплое свечение
  const sun = ctx.createRadialGradient(W * 0.5, H * 0.6, 0, W * 0.5, H * 0.6, W * 0.9);
  sun.addColorStop(0, 'rgba(255, 236, 190, 0.8)');
  sun.addColorStop(0.35, 'rgba(255, 200, 160, 0.3)');
  sun.addColorStop(1, 'rgba(255, 200, 160, 0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, W, H);

  // Боке — мягкие светлые круги
  const rnd = seeded(7);
  for (let i = 0; i < 18; i++) {
    const x = rnd() * W;
    const y = rnd() * H * 0.75;
    const r = 20 + rnd() * 70;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255, 245, 230, ${0.08 + rnd() * 0.12})`);
    g.addColorStop(1, 'rgba(255, 245, 230, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Холмы внизу — два слоя
  const hills = (baseY, amp, color, phase) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 10) {
      const y = baseY + Math.sin(x / 110 + phase) * amp + Math.sin(x / 47 + phase * 2) * amp * 0.25;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
  };
  hills(H * 0.74, 26, 'rgba(214, 120, 170, 0.55)', 0.6);
  hills(H * 0.8, 20, 'rgba(160, 84, 160, 0.75)', 2.1);

  const ground = ctx.createLinearGradient(0, H * 0.84, 0, H);
  ground.addColorStop(0, 'rgba(120, 60, 140, 0.6)');
  ground.addColorStop(1, 'rgba(80, 40, 110, 0.85)');
  ctx.fillStyle = ground;
  ctx.fillRect(0, H * 0.86, W, H * 0.14);
}

// Пушистое облако с тенью снизу (отдельная картинка — облака плывут).
function drawCloud(ctx, W, H) {
  const cx = W / 2 - 12;
  const cy = H / 2;
  const puffs = [
    [-60, 10, 34], [-25, -12, 42], [18, -20, 48], [58, -2, 38], [85, 14, 26], [0, 16, 40],
  ];
  const path = (dy) => {
    ctx.beginPath();
    for (const [px, py, r] of puffs) {
      ctx.moveTo(cx + px + r, cy + py + dy);
      ctx.arc(cx + px, cy + py + dy, r, 0, Math.PI * 2);
    }
  };
  path(7);
  ctx.fillStyle = 'rgb(190, 140, 215)';
  ctx.fill();
  path(0);
  ctx.fillStyle = 'rgb(255, 246, 252)';
  ctx.fill();
}

// Золотая монета со звездой.
function drawCoin(ctx, S) {
  const c = S / 2;
  const r = S / 2 - 4;
  ctx.fillStyle = '#b86e12';
  ctx.beginPath();
  ctx.arc(c, c + 3, r, 0, Math.PI * 2);
  ctx.fill();
  const face = ctx.createLinearGradient(0, 0, 0, S);
  face.addColorStop(0, '#fff2a8');
  face.addColorStop(0.5, '#ffc93a');
  face.addColorStop(1, '#f09a16');
  ctx.fillStyle = face;
  ctx.beginPath();
  ctx.arc(c, c, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#d98010';
  ctx.lineWidth = S * 0.05;
  ctx.beginPath();
  ctx.arc(c, c, r * 0.74, 0, Math.PI * 2);
  ctx.stroke();
  drawIcon(ctx, 'star', c, c, r * 0.5, 0xf0a020);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.beginPath();
  ctx.ellipse(c - r * 0.45, c - r * 0.5, r * 0.18, r * 0.1, -0.7, 0, Math.PI * 2);
  ctx.fill();
}

// Круглая подложка для значков-кнопок.
function drawBadge(ctx, S) {
  const c = S / 2;
  ctx.fillStyle = THEME.css.boardBottom;
  ctx.beginPath();
  ctx.arc(c, c + 4, c - 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = THEME.css.frameLight;
  ctx.beginPath();
  ctx.arc(c, c, c - 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = THEME.css.boardTop;
  ctx.beginPath();
  ctx.arc(c, c, c - 12, 0, Math.PI * 2);
  ctx.fill();
}

// Динамик + волны или крестик.
function drawSoundIcon(ctx, S, on) {
  drawBadge(ctx, S);
  const c = S / 2;
  const u = S / 96;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(c - 22 * u, c - 9 * u);
  ctx.lineTo(c - 12 * u, c - 9 * u);
  ctx.lineTo(c + 2 * u, c - 22 * u);
  ctx.lineTo(c + 2 * u, c + 22 * u);
  ctx.lineTo(c - 12 * u, c + 9 * u);
  ctx.lineTo(c - 22 * u, c + 9 * u);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 5 * u;
  ctx.lineCap = 'round';
  if (on) {
    for (const r of [12, 22]) {
      ctx.beginPath();
      ctx.arc(c + 4 * u, c, r * u, -0.8, 0.8);
      ctx.stroke();
    }
  } else {
    ctx.strokeStyle = '#ff6b7a';
    ctx.beginPath();
    ctx.moveTo(c + 10 * u, c - 10 * u);
    ctx.lineTo(c + 26 * u, c + 10 * u);
    ctx.moveTo(c + 26 * u, c - 10 * u);
    ctx.lineTo(c + 10 * u, c + 10 * u);
    ctx.stroke();
  }
}

function drawHomeIcon(ctx, S) {
  drawBadge(ctx, S);
  const c = S / 2;
  const u = S / 96;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(c, c - 22 * u);
  ctx.lineTo(c + 24 * u, c);
  ctx.lineTo(c + 16 * u, c);
  ctx.lineTo(c + 16 * u, c + 20 * u);
  ctx.lineTo(c - 16 * u, c + 20 * u);
  ctx.lineTo(c - 16 * u, c);
  ctx.lineTo(c - 24 * u, c);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = THEME.css.boardTop;
  roundRect(ctx, c - 5 * u, c + 6 * u, 10 * u, 14 * u, 3 * u);
  ctx.fill();
}

// Большие значки для кнопок меню (без подложки).
function drawTasksIcon(ctx, S) {
  const u = S / 96;
  ctx.fillStyle = '#fff4e0';
  roundRect(ctx, 18 * u, 10 * u, 60 * u, 76 * u, 12 * u);
  ctx.fill();
  ctx.fillStyle = '#e0a060';
  roundRect(ctx, 34 * u, 4 * u, 28 * u, 14 * u, 6 * u);
  ctx.fill();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let i = 0; i < 3; i++) {
    const y = (32 + i * 18) * u;
    ctx.strokeStyle = '#46cf3c';
    ctx.lineWidth = 6 * u;
    ctx.beginPath();
    ctx.moveTo(26 * u, y);
    ctx.lineTo(31 * u, y + 5 * u);
    ctx.lineTo(39 * u, y - 5 * u);
    ctx.stroke();
    ctx.strokeStyle = '#b89a86';
    ctx.lineWidth = 5 * u;
    ctx.beginPath();
    ctx.moveTo(47 * u, y);
    ctx.lineTo(68 * u, y);
    ctx.stroke();
  }
}

function drawCollectionIcon(ctx, S) {
  const u = S / 96;
  const colors = [0xf5333f, 0xffd21a, 0x14c8c4, 0xff55c8];
  colors.forEach((color, i) => {
    const x = (i % 2) * 40 * u + 8 * u;
    const y = Math.floor(i / 2) * 40 * u + 8 * u;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale((40 * u) / 128, (40 * u) / 128);
    drawBlock(ctx, 128, color, BLOCK_ICONS[[0, 2, 4, 6][i]]);
    ctx.restore();
  });
}

// ---------- Частицы ----------

function drawSpark(ctx, S) {
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(255, 255, 255, 1)');
  g.addColorStop(0.4, 'rgba(255, 255, 255, 0.6)');
  g.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
}

function drawStar(ctx, S) {
  iconPath(ctx, 'star', S / 2, S / 2 - S * 0.04, S * 0.46);
  ctx.lineJoin = 'round';
  ctx.lineWidth = S * 0.08;
  ctx.strokeStyle = '#ffffff';
  ctx.fillStyle = '#ffffff';
  ctx.stroke();
  ctx.fill();
}

// ---------- Публичное API ----------

export function generateTextures(scene, boardPx) {
  for (const [skin, draw] of Object.entries(BLOCK_DRAWERS)) {
    THEME.blocks.forEach((color, i) => {
      makeCanvas(scene, TEX.blockOf(skin, i), BLOCK_PX, BLOCK_PX, (ctx, S) =>
        draw(ctx, S, color, BLOCK_ICONS[i]),
      );
    });
  }
  makeCanvas(scene, TEX.blockShadow, BLOCK_PX, BLOCK_PX, (ctx, S) => drawBlockShadow(ctx, S));
  makeCanvas(scene, TEX.ghostFrame, BLOCK_PX, BLOCK_PX, (ctx, S) => drawGhostFrame(ctx, S));
  makeCanvas(scene, TEX.cell, BLOCK_PX, BLOCK_PX, (ctx, S) => drawCell(ctx, S));
  const boardSize = boardPx + (BOARD_TEX_PADDING + BOARD_TEX_MARGIN) * 2;
  makeCanvas(scene, TEX.board, boardSize, boardSize, drawBoard);
  makeCanvas(scene, TEX.shelf, SHELF_SIZE.width, SHELF_SIZE.height, drawShelf);
  makeCanvas(scene, TEX.background, GAME_WIDTH, GAME_HEIGHT, drawBackground);
  makeCanvas(scene, TEX.cloud, 260, 150, drawCloud);
  makeCanvas(scene, TEX.coin, 96, 96, (ctx, S) => drawCoin(ctx, S));
  makeCanvas(scene, TEX.soundOn, 96, 96, (ctx, S) => drawSoundIcon(ctx, S, true));
  makeCanvas(scene, TEX.soundOff, 96, 96, (ctx, S) => drawSoundIcon(ctx, S, false));
  makeCanvas(scene, TEX.home, 96, 96, (ctx, S) => drawHomeIcon(ctx, S));
  makeCanvas(scene, TEX.tasks, 96, 96, (ctx, S) => drawTasksIcon(ctx, S));
  makeCanvas(scene, TEX.collection, 96, 96, (ctx, S) => drawCollectionIcon(ctx, S));
  makeCanvas(scene, TEX.spark, 48, 48, (ctx, S) => drawSpark(ctx, S));
  makeCanvas(scene, TEX.star, 48, 48, (ctx, S) => drawStar(ctx, S));
}

// Блок-картинка заданного экранного размера с центром в (x, y). skin — по умолчанию текущая тема.
export function addBlock(scene, x, y, size, color, skin = currentSkin) {
  return scene.add.image(x, y, TEX.blockOf(skin, color)).setDisplaySize(size, size);
}
