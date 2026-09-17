import Phaser from 'phaser';
import { GAME_WIDTH } from '../config.js';
import { BOARD_SIZE, place, findFullLines, findDropTarget } from '../core/board.js';
import { pieceSize } from '../core/pieces.js';
import { playSound } from '../platform/audio.js';
import { THEME } from './theme.js';
import {
  TEX,
  BOARD_TEX_PADDING,
  BOARD_TEX_MARGIN,
  SHELF_SIZE,
  SHELF_PANEL_CENTER_Y,
  SHELF_INNER,
  addBlock,
} from './textures.js';
import { addText, addIconButton, showToast } from './ui.js';
import { getProgress, setProgress } from '../meta/store.js';
import { boosterCount, useBooster } from '../meta/progress.js';
import { loopTween, reducedMotion } from './motion.js';

// Общая часть игровых экранов: поле, лоток, перетаскивание, подсветка, анимации.
// Правила («Классика», «Приключение») задаются наследниками через хуки:
//   canDrag(slot) — можно ли взять фигуру;
//   constrainTarget(row, col, current) — куда её пустить;
//   onPlaced(slot, piece, row, col) — ход сделан;
//   onDragCancelled(slot) — фигура вернулась в лоток.

// Раскладка экрана 720×1280.
export const CELL = 80;
export const BOARD_PX = CELL * BOARD_SIZE;
export const BOARD_X = (GAME_WIDTH - BOARD_PX) / 2;
export const BOARD_Y = 224;

export const TRAY_Y = 1108; // центр лотка с фигурами
export const BOOSTER_Y = 934; // полоса бустеров между полем и лотком
// Три слота делят внутреннюю часть полки поровну.
const TRAY_SLOT_W = SHELF_INNER.width / 3;
const TRAY_LEFT = (GAME_WIDTH - SHELF_INNER.width) / 2;
const TRAY_SLOT_H = 280; // зона захвата фигуры — крупнее самой фигуры
const TRAY_CELL = 44; // размер клетки фигуры в лотке (крупные фигуры — мельче)
// Запас от края слота: фигура не должна вылезать за полку даже при покачивании и «выпрыгивании».
const TRAY_PAD = 14;

// Насколько фигура поднята над точкой касания, чтобы палец её не закрывал.
const LIFT_TOUCH = 140;
const LIFT_MOUSE = 20;

// Плавность следования за пальцем: чем больше, тем плотнее фигура «прилипает».
const FOLLOW_SHARPNESS = 28;

export const cellCenter = (row, col) => ({
  x: BOARD_X + col * CELL + CELL / 2,
  y: BOARD_Y + row * CELL + CELL / 2,
});

const slotCenter = (slot) => ({ x: TRAY_LEFT + TRAY_SLOT_W * slot + TRAY_SLOT_W / 2, y: TRAY_Y });

// Размер клетки фигуры в лотке: 44 px, но не больше, чем позволяет слот.
function trayCellFor(piece) {
  const { rows, cols } = pieceSize(piece.cells);
  const maxW = TRAY_SLOT_W - 2 * TRAY_PAD;
  const maxH = SHELF_INNER.height - 2 * TRAY_PAD;
  return Math.min(TRAY_CELL, Math.floor(maxW / cols), Math.floor(maxH / rows));
}

export class BoardScene extends Phaser.Scene {
  // Готовит поле, лоток, частицы и перетаскивание. Вызывается из create() наследника.
  buildBoard() {
    this.drag = null;
    this.placing = false; // фигура доезжает до клеток — новый захват ждёт
    this.returning = new Set(); // слоты, чьи фигуры летят обратно в лоток

    this.createBoardView();
    this.add
      .image(GAME_WIDTH / 2, TRAY_Y + SHELF_SIZE.height / 2 - SHELF_PANEL_CENTER_Y, TEX.shelf)
      .setOrigin(0.5);
    this.createTray();
    this.createParticles();
    this.createPopups();

    this.input.on('pointerdown', (pointer) => this.tapBoardCell(pointer));
    this.input.on('pointermove', (pointer) => this.moveDrag(pointer));
    this.input.on('pointerup', (pointer) => this.endDrag(pointer));
    this.input.on('pointerupoutside', (pointer) => this.endDrag(pointer));
  }

  // ---------- Бустеры ----------

  // Полоса с молотком и обменом. Наследник задаёт, что они делают:
  // useHammer(row, col) и useSwap().
  createBoosterBar() {
    this.hammerMode = false;
    this.boosterViews = {};
    const ids = ['hammer', 'swap'];
    ids.forEach((id, i) => {
      const x = GAME_WIDTH / 2 + (i - (ids.length - 1) / 2) * 150;
      const icon = addIconButton(this, x, BOOSTER_Y, TEX[id], () => this.tapBooster(id), 88);
      const badge = this.add.circle(x + 32, BOOSTER_Y - 30, 21, 0xff3b4e).setStrokeStyle(4, 0xffffff);
      const count = addText(this, badge.x, badge.y - 1, '0', 26, { stroke: null });
      this.boosterViews[id] = { icon, badge, count };
    });
    this.updateBoosters();
  }

  updateBoosters() {
    if (!this.boosterViews) return;
    const progress = getProgress();
    for (const [id, view] of Object.entries(this.boosterViews)) {
      const n = boosterCount(progress, id);
      view.count.setText(n > 0 ? String(n) : '+');
      view.badge.setFillStyle(n > 0 ? 0xff3b4e : 0x4fd06a);
      const active = id === 'hammer' && this.hammerMode;
      view.icon.setTint(active ? 0xffe08a : 0xffffff);
    }
  }

  setBoostersVisible(visible) {
    if (!this.boosterViews) return;
    for (const view of Object.values(this.boosterViews)) {
      view.icon.setVisible(visible);
      view.badge.setVisible(visible);
      view.count.setVisible(visible);
    }
  }

  tapBooster(id) {
    if (!this.canUseBoosters()) return;
    if (boosterCount(getProgress(), id) <= 0) {
      this.scene.launch('BoosterShop', {
        boosterId: id,
        onDone: () => this.updateBoosters(),
      });
      return;
    }
    if (id === 'hammer') {
      this.hammerMode = !this.hammerMode;
      this.updateBoosters();
      if (this.hammerMode) showToast(this, 'Выбери блок на поле', BOARD_Y + 46);
      return;
    }
    const { progress, ok } = useBooster(getProgress(), 'swap');
    if (!ok) return;
    setProgress(progress);
    this.updateBoosters();
    this.useSwap();
  }

  // Молоток: нажатие по занятой клетке поля.
  tapBoardCell(pointer) {
    if (!this.hammerMode) return false;
    const col = Math.floor((pointer.x - BOARD_X) / CELL);
    const row = Math.floor((pointer.y - BOARD_Y) / CELL);
    const inside = row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
    if (!inside || this.board[row][col] === null) return false;

    const { progress, ok } = useBooster(getProgress(), 'hammer');
    if (!ok) return false;
    setProgress(progress);
    this.hammerMode = false;
    this.updateBoosters();
    this.useHammer(row, col);
    return true;
  }

  canUseBoosters() {
    return true;
  }

  useHammer() {}

  useSwap() {}

  // ---------- Хуки правил ----------

  canDrag() {
    return true;
  }

  constrainTarget(row, col, current) {
    return findDropTarget(this.board, this.drag.piece.cells, row, col, current);
  }

  onPlaced() {}

  onDragCancelled() {}

  get cellSize() {
    return CELL;
  }

  slotCenter(slot) {
    return slotCenter(slot);
  }

  cellCenter(row, col) {
    return cellCenter(row, col);
  }

  pieceCenterOnBoard(piece, { row, col }) {
    const { rows, cols } = pieceSize(piece.cells);
    return { x: BOARD_X + (col + cols / 2) * CELL, y: BOARD_Y + (row + rows / 2) * CELL };
  }

  createBoardView() {
    const offset = BOARD_TEX_PADDING + BOARD_TEX_MARGIN;
    this.boardImage = this.add.image(BOARD_X - offset, BOARD_Y - offset, TEX.board).setOrigin(0);

    this.blockViews = [];
    this.previewViews = [];
    this.ghostFrames = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      this.blockViews.push([]);
      this.previewViews.push([]);
      this.ghostFrames.push([]);
      for (let c = 0; c < BOARD_SIZE; c++) {
        const { x, y } = cellCenter(r, c);
        this.add.image(x, y, TEX.cell).setDisplaySize(CELL, CELL);
        this.blockViews[r].push(addBlock(this, x, y, CELL, 0).setVisible(false).setDepth(1));
        this.previewViews[r].push(addBlock(this, x, y, CELL, 0).setVisible(false).setDepth(2));
        this.ghostFrames[r].push(
          this.add.image(x, y, TEX.ghostFrame).setDisplaySize(CELL, CELL).setVisible(false).setDepth(3),
        );
      }
    }
    this.blockScale = this.blockViews[0][0].scaleX;
  }

  // Слот лотка: внешний контейнер (выпрыгивание) → body (покачивание) → блоки.
  createTray() {
    this.trayViews = [0, 1, 2].map((slot) => {
      const { x, y } = slotCenter(slot);
      const body = this.add.container(0, 0);
      const outer = this.add.container(x, y, [body]).setDepth(5);
      // Едва заметное «дыхание» — сильное покачивание рядом с пальцем выглядит как дрожание.
      loopTween(this, {
        targets: body,
        y: -2,
        duration: 1800,
        delay: slot * 250,
        ease: 'Sine.easeInOut',
      });
      this.add
        .zone(x, y, TRAY_SLOT_W, TRAY_SLOT_H)
        .setInteractive()
        .on('pointerdown', (pointer) => this.startDrag(slot, pointer));
      return { outer, body };
    });
  }

  createParticles() {
    this.particleTint = 0xffffff;
    const tint = { onEmit: () => this.particleTint };
    this.sparks = this.add
      .particles(0, 0, TEX.spark, {
        emitting: false,
        speed: { min: 120, max: 340 },
        angle: { min: 0, max: 360 },
        scale: { start: 0.9, end: 0 },
        alpha: { start: 1, end: 0 },
        lifespan: { min: 350, max: 600 },
        gravityY: 500,
        tint,
        blendMode: 'ADD',
      })
      .setDepth(12);
    this.stars = this.add
      .particles(0, 0, TEX.star, {
        emitting: false,
        speed: { min: 180, max: 420 },
        angle: { min: 200, max: 340 }, // в основном вверх
        scale: { start: 0.75, end: 0.15 },
        alpha: { start: 1, end: 0 },
        rotate: { min: -180, max: 180 },
        lifespan: { min: 550, max: 850 },
        gravityY: 900,
        tint,
      })
      .setDepth(12);
  }

  // Надписи «+N», «Комбо», «Серия», «Чистое поле» создаются один раз и переиспользуются:
  // создание текста на каждом ходу даёт микрозадержки на слабых телефонах.
  createPopups() {
    const make = (size, color) => addText(this, 0, 0, '', size, { color }).setDepth(15).setVisible(false);
    this.popups = {
      points: make(60, THEME.text),
      combo: make(48, THEME.gold),
      streak: make(44, THEME.green),
      clearBoard: make(52, THEME.cyan),
    };
    this.popups.clearBoard.setText('Чистое поле!');
  }

  // Плавное следование фигуры за пальцем (экспоненциальное сглаживание).
  update(_time, delta) {
    const drag = this.drag;
    if (!drag) return;
    const k = 1 - Math.exp((-FOLLOW_SHARPNESS * delta) / 1000);
    const { sprite } = drag;
    sprite.x += (drag.goalX - sprite.x) * k;
    sprite.y += (drag.goalY - drag.liftNow - sprite.y) * k;
  }

  burst(x, y, color, stars = 1) {
    this.particleTint = THEME.blocks[color];
    this.sparks.explode(5, x, y);
    if (stars > 0) this.stars.explode(stars, x, y);
  }

  // ---------- Перетаскивание ----------

  startDrag(slot, pointer) {
    const piece = this.pieces[slot];
    if (this.drag || this.placing || !piece || this.returning.has(slot)) return;
    if (this.hammerMode) return;
    if (!this.canDrag(slot)) return;

    const { rows, cols } = pieceSize(piece.cells);
    const sprite = this.makePieceView(piece, CELL, true).setDepth(10);
    playSound('pick');

    this.drag = {
      slot,
      piece,
      sprite,
      rows,
      cols,
      pointerId: pointer.id,
      lift: pointer.wasTouch ? LIFT_TOUCH : LIFT_MOUSE,
      liftNow: 0, // подъём над пальцем нарастает плавно
      goalX: 0,
      goalY: 0,
      target: null,
    };

    // Фигура плавно вырастает из лотка до размера клеток поля и поднимается над пальцем.
    const from = slotCenter(slot);
    sprite.setPosition(from.x, from.y).setScale(trayCellFor(piece) / CELL);
    this.tweens.add({
      targets: sprite,
      scale: 1,
      duration: 200,
      ease: 'Back.easeOut',
      easeParams: [1.1],
    });
    this.tweens.add({
      targets: this.drag,
      liftNow: this.drag.lift,
      duration: 180,
      ease: 'Cubic.easeOut',
    });

    this.drawTray();
    this.moveDrag(pointer);
  }

  moveDrag(pointer) {
    const drag = this.drag;
    if (!drag || pointer.id !== drag.pointerId) return;

    // Цель — под пальцем; сама фигура догоняет её в update().
    // Клетку считаем по полному подъёму, чтобы подсветка не прыгала, пока фигура поднимается.
    drag.goalX = pointer.x;
    drag.goalY = pointer.y - (drag.rows * CELL) / 2;
    const cx = drag.goalX;
    const cy = drag.goalY - drag.lift;

    const left = cx - (drag.cols * CELL) / 2;
    const top = cy - (drag.rows * CELL) / 2;
    const row = (top - BOARD_Y) / CELL;
    const col = (left - BOARD_X) / CELL;
    const target = this.constrainTarget(row, col, drag.target);

    const same = target?.row === drag.target?.row && target?.col === drag.target?.col;
    if (!same) {
      drag.target = target;
      this.drawPreview();
    }
  }

  endDrag(pointer) {
    const drag = this.drag;
    if (!drag || pointer.id !== drag.pointerId) return;
    this.drag = null;
    this.drawPreview();

    this.tweens.killTweensOf(drag);
    this.tweens.killTweensOf(drag.sprite);

    if (drag.target) {
      // Фигура мягко доезжает до своих клеток и только потом ставится.
      const { row, col } = drag.target;
      this.placing = true;
      this.tweens.add({
        targets: drag.sprite,
        x: BOARD_X + (col + drag.cols / 2) * CELL,
        y: BOARD_Y + (row + drag.rows / 2) * CELL,
        scale: 1,
        duration: 90,
        ease: 'Quad.easeOut',
        onComplete: () => {
          drag.sprite.destroy();
          this.placing = false;
          this.onPlaced(drag.slot, drag.piece, row, col);
        },
      });
      return;
    }

    // Мимо — фигура возвращается в лоток.
    const home = slotCenter(drag.slot);
    this.returning.add(drag.slot);
    this.onDragCancelled(drag.slot);
    playSound('back');
    this.tweens.add({
      targets: drag.sprite,
      x: home.x,
      y: home.y,
      scale: trayCellFor(drag.piece) / CELL,
      duration: 260,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        drag.sprite.destroy();
        this.returning.delete(drag.slot);
        this.drawTray();
      },
    });
  }

  // ---------- Анимации ----------

  // Поставленные блоки сплющиваются и пружинят (squash & stretch).
  animateLanding(piece, row, col) {
    const base = this.blockScale;
    for (const [dr, dc] of piece.cells) {
      const view = this.blockViews[row + dr][col + dc];
      if (!view.visible) continue; // блок сразу ушёл в очищенную линию
      this.tweens.killTweensOf(view);
      view.setScale(base * 1.12, base * 0.88);
      this.tweens.add({
        targets: view,
        scaleX: base,
        scaleY: base,
        duration: 260,
        ease: 'Back.easeOut',
        easeParams: [2],
      });
    }
  }

  // Блок подпрыгивает и лопается с искрами (и звёздочкой, если withStar).
  popBlock(r, c, color, delay, withStar) {
    const { x, y } = cellCenter(r, c);
    const base = this.blockScale;
    const block = addBlock(this, x, y, CELL, color).setDepth(6);
    this.tweens.chain({
      targets: block,
      tweens: [
        {
          y: y - 16,
          scaleX: base * 1.18,
          scaleY: base * 1.18,
          duration: 130,
          delay,
          ease: 'Quad.easeOut',
        },
        {
          y,
          scaleX: 0,
          scaleY: 0,
          alpha: 0.4,
          duration: 150,
          ease: 'Back.easeIn',
          onStart: () => this.burst(x, y - 10, color, withStar ? 1 : 0),
          onComplete: () => block.destroy(),
        },
      ],
    });
  }

  flashLine(x, y, width, height) {
    const flash = this.add
      .rectangle(x, y, width, height, 0xfff4d6, 0.38)
      .setDepth(7)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      scaleX: width > height ? 1.04 : 1.3,
      scaleY: width > height ? 1.3 : 1.04,
      duration: 320,
      ease: 'Quad.easeOut',
      onComplete: () => flash.destroy(),
    });
  }

  // Мягкий «вдох» камеры на комбо вместо тряски.
  pulseCamera(lines) {
    if (reducedMotion) return;
    const camera = this.cameras.main;
    this.tweens.killTweensOf(camera);
    camera.setZoom(1);
    this.tweens.add({
      targets: camera,
      zoom: 1.012 + Math.min(lines, 4) * 0.004,
      duration: 140,
      yoyo: true,
      ease: 'Sine.easeInOut',
    });
  }

  // ---------- Отрисовка ----------

  // Фигура из блоков; (0, 0) контейнера — центр фигуры.
  makePieceView(piece, size, withShadow = false) {
    const { rows, cols } = pieceSize(piece.cells);
    const ox = (cols * size) / 2;
    const oy = (rows * size) / 2;
    const container = this.add.container(0, 0);
    if (withShadow) {
      for (const [r, c] of piece.cells) {
        const shadow = this.add.image(c * size + size / 2 - ox + 8, r * size + size / 2 - oy + 16, TEX.blockShadow);
        container.add(shadow.setDisplaySize(size, size));
      }
    }
    for (const [r, c] of piece.cells) {
      container.add(addBlock(this, c * size + size / 2 - ox, r * size + size / 2 - oy, size, piece.color));
    }
    return container;
  }

  drawBoard() {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const value = this.board[r][c];
        const view = this.blockViews[r][c];
        view.setVisible(value !== null);
        if (value !== null) view.setTexture(TEX.block(value));
      }
    }
  }

  // Подсветка места под фигурой и линий, которые исчезнут после хода.
  drawPreview() {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        this.previewViews[r][c].setVisible(false);
        this.ghostFrames[r][c].setVisible(false);
      }
    }
    const drag = this.drag;
    if (!drag?.target) return;

    const { row, col } = drag.target;
    const texture = TEX.block(drag.piece.color);
    const placed = place(this.board, drag.piece.cells, row, col, drag.piece.color);

    const shown = [];
    for (const [r, c] of lineCells(findFullLines(placed))) {
      shown.push([this.previewViews[r][c].setTexture(texture).setVisible(true), 1]);
    }
    for (const [dr, dc] of drag.piece.cells) {
      const view = this.previewViews[row + dr][col + dc];
      if (!view.visible) shown.push([view.setTexture(texture).setVisible(true), 0.45]);
      shown.push([this.ghostFrames[row + dr][col + dc].setVisible(true), 1]);
    }
    // Подсветка проявляется плавно, а не вспыхивает.
    for (const [view, alpha] of shown) {
      this.tweens.killTweensOf(view);
      view.setAlpha(0);
      this.tweens.add({ targets: view, alpha, duration: 110, ease: 'Sine.easeOut' });
    }
  }

  // popSlots — слоты, где фигура новая: она выпрыгивает.
  drawTray(popSlots = []) {
    this.pieces.forEach((piece, slot) => {
      const { outer, body } = this.trayViews[slot];
      body.removeAll(true);
      if (!piece || this.drag?.slot === slot || this.returning.has(slot)) return;
      body.add(this.makePieceView(piece, trayCellFor(piece)));
      const order = popSlots.indexOf(slot);
      if (order >= 0) {
        this.tweens.killTweensOf(outer);
        outer.setScale(0);
        this.tweens.add({
          targets: outer,
          scale: 1,
          duration: 360,
          delay: 120 + order * 110,
          ease: 'Back.easeOut',
          easeParams: [1.5],
        });
      }
    });
  }
}

// Клетки очищаемых строк и столбцов без повторов: [[row, col], ...].
export function lineCells({ rows, cols }) {
  const cells = new Map();
  for (const r of rows) {
    for (let c = 0; c < BOARD_SIZE; c++) cells.set(r * BOARD_SIZE + c, [r, c]);
  }
  for (const c of cols) {
    for (let r = 0; r < BOARD_SIZE; r++) cells.set(r * BOARD_SIZE + c, [r, c]);
  }
  return cells.values();
}
