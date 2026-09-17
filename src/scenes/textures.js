// Процедурная графика в «мультяшном 3D» стиле: рисуется на canvas при запуске.
// Без файлов картинок — быстрее загрузка и нет вопросов с лицензиями.

import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { THEME } from './theme.js';

export const TEX = {
  block: (color) => `block-${color}`,
  cell: 'cell',
  tray: 'tray',
  background: 'background',
  spark: 'spark',
  star: 'star',
};

const BLOCK_PX = 128; // текстура крупнее экранного размера — чётче при уменьшении
export const TRAY_TEX_PADDING = 18; // рамка лотка вокруг клеток
export const TRAY_TEX_MARGIN = 28; // место под тень

// ---------- Цвета ----------

function toRgb(hex) {
  return { r: (hex >> 16) & 255, g: (hex >> 8) & 255, b: hex & 255 };
}

// amount > 0 — светлее (к белому), < 0 — темнее (к чёрному).
function shade(hex, amount) {
  const { r, g, b } = toRgb(hex);
  const target = amount > 0 ? 255 : 0;
  const k = Math.abs(amount);
  const mix = (v) => Math.round(v + (target - v) * k);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

function rgba(hex, alpha) {
  const { r, g, b } = toRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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

// ---------- Блок: глянцевая пластиковая игрушка ----------

function drawBlock(ctx, S, base) {
  const inset = 5;
  const w = S - inset * 2;
  const radius = S * 0.26;
  const depth = S * 0.09; // высота «бортика» снизу

  // Мягкая тень на поверхности
  ctx.fillStyle = 'rgba(40, 10, 50, 0.28)';
  roundRect(ctx, inset + 2, inset + depth + 3, w - 4, w - depth, radius);
  ctx.fill();

  // Боковина (объём)
  ctx.fillStyle = shade(base, -0.38);
  roundRect(ctx, inset, inset + depth, w, w - depth, radius);
  ctx.fill();

  // Лицевая грань с вертикальным градиентом
  const faceH = w - depth;
  const face = ctx.createLinearGradient(0, inset, 0, inset + faceH);
  face.addColorStop(0, shade(base, 0.35));
  face.addColorStop(0.45, shade(base, 0.05));
  face.addColorStop(1, shade(base, -0.12));
  ctx.fillStyle = face;
  roundRect(ctx, inset, inset, w, faceH, radius);
  ctx.fill();

  // Мягкое свечение изнутри (подповерхностное рассеяние)
  ctx.save();
  roundRect(ctx, inset, inset, w, faceH, radius);
  ctx.clip();
  const glow = ctx.createRadialGradient(S * 0.4, S * 0.35, 0, S * 0.4, S * 0.35, S * 0.55);
  glow.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
  glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, S, S);

  // Нижний отражённый свет
  const rim = ctx.createLinearGradient(0, inset + faceH * 0.7, 0, inset + faceH);
  rim.addColorStop(0, 'rgba(255, 255, 255, 0)');
  rim.addColorStop(1, 'rgba(255, 240, 220, 0.22)');
  ctx.fillStyle = rim;
  ctx.fillRect(0, 0, S, S);
  ctx.restore();

  // Крупный блик сверху
  const hl = ctx.createLinearGradient(0, inset + 6, 0, inset + faceH * 0.42);
  hl.addColorStop(0, 'rgba(255, 255, 255, 0.75)');
  hl.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = hl;
  roundRect(ctx, inset + S * 0.12, inset + S * 0.06, w - S * 0.24, faceH * 0.36, S * 0.16);
  ctx.fill();

  // Точечный блик
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.beginPath();
  ctx.ellipse(S * 0.27, S * 0.2, S * 0.055, S * 0.04, -0.5, 0, Math.PI * 2);
  ctx.fill();

  // Тонкий контур для читаемости на поле
  ctx.strokeStyle = rgba(0x2a0f3a, 0.35);
  ctx.lineWidth = 2;
  roundRect(ctx, inset + 1, inset + 1, w - 2, w - 2, radius);
  ctx.stroke();
}

// ---------- Пустая клетка: углубление в лотке ----------

function drawCell(ctx, S) {
  const inset = 7;
  const w = S - inset * 2;
  const radius = S * 0.22;

  ctx.fillStyle = THEME.css.cellHole;
  roundRect(ctx, inset, inset, w, w, radius);
  ctx.fill();

  // Внутренняя тень сверху
  ctx.save();
  roundRect(ctx, inset, inset, w, w, radius);
  ctx.clip();
  const inner = ctx.createLinearGradient(0, inset, 0, inset + w * 0.45);
  inner.addColorStop(0, 'rgba(20, 5, 35, 0.45)');
  inner.addColorStop(1, 'rgba(20, 5, 35, 0)');
  ctx.fillStyle = inner;
  ctx.fillRect(0, 0, S, S);
  ctx.restore();

  // Светлый нижний край
  ctx.strokeStyle = 'rgba(255, 220, 255, 0.16)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(inset + radius, inset + w - 1.5);
  ctx.lineTo(inset + w - radius, inset + w - 1.5);
  ctx.stroke();
}

// ---------- Лоток под поле ----------

function drawTray(ctx, W, H) {
  const m = TRAY_TEX_MARGIN;
  const w = W - m * 2;
  const h = H - m * 2;
  const radius = 44;

  // Тень
  ctx.save();
  ctx.shadowColor = 'rgba(70, 20, 70, 0.45)';
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 14;
  ctx.fillStyle = THEME.css.trayEdge;
  roundRect(ctx, m, m + 10, w, h, radius);
  ctx.fill();
  ctx.restore();

  // Верх лотка
  const top = ctx.createLinearGradient(0, m, 0, m + h);
  top.addColorStop(0, THEME.css.trayTop);
  top.addColorStop(1, THEME.css.trayBottom);
  ctx.fillStyle = top;
  roundRect(ctx, m, m, w, h, radius);
  ctx.fill();

  // Блик по верхнему краю
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.lineWidth = 4;
  roundRect(ctx, m + 3, m + 3, w - 6, h - 6, radius - 3);
  ctx.stroke();
}

// ---------- Фон: тёплый закат, облака, холмы ----------

function drawBackground(ctx, W, H) {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#6d5fd0');
  sky.addColorStop(0.32, '#b57fd6');
  sky.addColorStop(0.6, '#f79bb8');
  sky.addColorStop(0.85, '#ffbf8f');
  sky.addColorStop(1, '#ffd9a3');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Солнце за полем — тёплое свечение
  const sun = ctx.createRadialGradient(W * 0.5, H * 0.62, 0, W * 0.5, H * 0.62, W * 0.9);
  sun.addColorStop(0, 'rgba(255, 236, 190, 0.85)');
  sun.addColorStop(0.35, 'rgba(255, 200, 160, 0.35)');
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

  // Пушистые облака
  const cloud = (cx, cy, scale, alpha) => {
    ctx.fillStyle = `rgba(255, 240, 250, ${alpha})`;
    const puffs = [
      [-60, 10, 34], [-25, -12, 42], [18, -20, 48], [58, -2, 38], [85, 14, 26], [0, 16, 40],
    ];
    ctx.beginPath();
    for (const [dx, dy, r] of puffs) {
      ctx.moveTo(cx + dx * scale + r * scale, cy + dy * scale);
      ctx.arc(cx + dx * scale, cy + dy * scale, r * scale, 0, Math.PI * 2);
    }
    ctx.fill();
  };
  cloud(120, 190, 0.9, 0.35);
  cloud(610, 110, 0.7, 0.3);
  cloud(560, 250, 0.55, 0.22);

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
  hills(H * 0.76, 26, 'rgba(214, 120, 170, 0.55)', 0.6);
  hills(H * 0.82, 20, 'rgba(160, 84, 160, 0.75)', 2.1);

  const ground = ctx.createLinearGradient(0, H * 0.84, 0, H);
  ground.addColorStop(0, 'rgba(120, 60, 140, 0.6)');
  ground.addColorStop(1, 'rgba(80, 40, 110, 0.85)');
  ctx.fillStyle = ground;
  ctx.fillRect(0, H * 0.86, W, H * 0.14);
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
  const cx = S / 2;
  const cy = S / 2;
  const outer = S * 0.46;
  const inner = S * 0.2;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? inner : outer;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.lineJoin = 'round';
  ctx.lineWidth = S * 0.08;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
  ctx.fill();
}

// ---------- Публичное API ----------

export function generateTextures(scene, boardPx) {
  THEME.blocks.forEach((color, i) => {
    makeCanvas(scene, TEX.block(i), BLOCK_PX, BLOCK_PX, (ctx, S) => drawBlock(ctx, S, color));
  });
  makeCanvas(scene, TEX.cell, BLOCK_PX, BLOCK_PX, (ctx, S) => drawCell(ctx, S));
  const traySize = boardPx + (TRAY_TEX_PADDING + TRAY_TEX_MARGIN) * 2;
  makeCanvas(scene, TEX.tray, traySize, traySize, drawTray);
  makeCanvas(scene, TEX.background, GAME_WIDTH, GAME_HEIGHT, drawBackground);
  makeCanvas(scene, TEX.spark, 48, 48, (ctx, S) => drawSpark(ctx, S));
  makeCanvas(scene, TEX.star, 48, 48, (ctx, S) => drawStar(ctx, S));
}

// Блок-картинка заданного экранного размера с центром в (x, y).
export function addBlock(scene, x, y, size, color) {
  return scene.add.image(x, y, TEX.block(color)).setDisplaySize(size, size);
}
