// Обучение при первом запуске: два хода с подсказкой рукой, потом обычная игра.
// Работает поверх GameScene: подставляет поле и фигуры, ограничивает, что можно взять и куда поставить.

import { GAME_WIDTH } from '../config.js';
import { createBoard } from '../core/board.js';
import { generateSet } from '../core/pieces.js';
import { THEME } from './theme.js';
import { TEX, HAND_TIP } from './textures.js';
import { addText, addTextButton } from './ui.js';
import { getProgress, setProgress } from '../meta/store.js';
import { completeTutorial } from '../meta/progress.js';
import { playSound } from '../platform/audio.js';

const SLOT = 1; // фигуру для обучения кладём в средний слот

// Шаги: заготовка поля ('#' — блок), фигура и куда её поставить.
const STEPS = [
  {
    text: 'Перетащи фигуру на поле,\nчтобы заполнить линию',
    rows: { 7: '######..' },
    piece: { id: 'line2-0', family: 'line2', cells: [[0, 0], [0, 1]], color: 4 },
    target: { row: 7, col: 6 },
  },
  {
    text: 'Заполни две линии сразу —\nэто комбо, очков больше!',
    rows: { 5: '######..', 6: '######..' },
    piece: { id: 'square2-0', family: 'square2', cells: [[0, 0], [0, 1], [1, 0], [1, 1]], color: 1 },
    target: { row: 5, col: 6 },
  },
];

// Насколько близко (в клетках) к цели нужно отпустить фигуру.
const SNAP_RADIUS = 1.6;

export class Tutorial {
  constructor(scene) {
    this.scene = scene;
    this.stepIndex = -1;
    this.hand = null;
    this.finished = false;

    scene.scoreText.setVisible(false);
    scene.bestText.setVisible(false);

    this.banner = scene.add.container(GAME_WIDTH / 2, 125).setDepth(40);
    const bg = scene.add.graphics();
    bg.fillStyle(0x1e2958, 0.95);
    bg.fillRoundedRect(-260, -62, 520, 124, 30);
    bg.lineStyle(5, 0xffd9a0, 1);
    bg.strokeRoundedRect(-260, -62, 520, 124, 30);
    this.bannerText = addText(scene, 0, 0, '', 32, { lineSpacing: 2 });
    this.banner.add([bg, this.bannerText]);

    const skip = addTextButton(scene, GAME_WIDTH / 2, 1238, 'Пропустить обучение', 30, () =>
      this.finish(false),
    );
    skip.text.setColor(THEME.textMuted).setDepth(40);
    skip.zone.setDepth(40);
    this.skip = skip;

    this.nextStep();
  }

  get step() {
    return STEPS[this.stepIndex];
  }

  allowsSlot(slot) {
    return slot === SLOT;
  }

  // Во время обучения фигура встаёт только на своё место — зато «прилипает» к нему издалека.
  constrain(row, col) {
    const { target } = this.step;
    const near = Math.abs(row - target.row) < SNAP_RADIUS && Math.abs(col - target.col) < SNAP_RADIUS;
    return near ? target : null;
  }

  onDragStart() {
    this.stopHand();
  }

  onDragCancel() {
    this.playHand();
  }

  nextStep() {
    if (this.finished) return; // обучение пропустили, пока шла пауза между шагами
    this.stepIndex += 1;
    if (!this.step) {
      this.finish(true);
      return;
    }
    const { scene } = this;
    const { text, rows, piece } = this.step;

    // Заготовка поля: к текущему (пустому после очистки) полю добавляются блоки шага.
    const board = createBoard();
    const cells = [];
    for (const [r, line] of Object.entries(rows)) {
      [...line].forEach((ch, c) => {
        if (ch === '#') cells.push([Number(r), c]);
      });
    }
    for (const [r, c] of cells) board[r][c] = (r + c) % 7;
    scene.board = board;
    scene.drawBoard();
    cells.forEach(([r, c], i) => {
      const view = scene.blockViews[r][c];
      view.setScale(0);
      scene.tweens.add({
        targets: view,
        scale: scene.blockScale,
        duration: 260,
        delay: i * 35,
        ease: 'Back.easeOut',
      });
    });

    scene.pieces = [null, { ...piece }, null];
    scene.drawTray([SLOT]);

    this.setText(text);
    scene.time.delayedCall(700, () => this.playHand());
  }

  setText(text) {
    this.bannerText.setText(text);
    this.banner.setScale(0.8).setAlpha(0);
    this.scene.tweens.add({ targets: this.banner, scale: 1, alpha: 1, duration: 300, ease: 'Back.easeOut' });
  }

  // Рука «берёт» фигуру из лотка и ведёт к цели, по кругу.
  playHand() {
    this.stopHand();
    const { scene } = this;
    const step = this.step;
    if (!step) return;

    const from = scene.slotCenter(SLOT);
    const to = scene.pieceCenterOnBoard(step.piece, step.target);
    const ghost = scene.makePieceView(step.piece, scene.cellSize).setAlpha(0).setDepth(35);
    const hand = scene.add.image(0, 0, TEX.hand).setDisplaySize(110, 110).setDepth(36);
    hand.setOrigin(HAND_TIP.x, HAND_TIP.y).setAlpha(0);
    const base = hand.scale;
    this.hand = { hand, ghost };

    const loop = () => {
      if (this.hand?.hand !== hand) return;
      hand.setPosition(from.x, from.y).setAlpha(0).setScale(base);
      ghost.setPosition(from.x, from.y).setAlpha(0).setScale(0.55);
      scene.tweens.chain({
        targets: hand,
        tweens: [
          { alpha: 1, duration: 250 },
          { scale: base * 0.88, duration: 150 },
          {
            x: to.x,
            y: to.y,
            duration: 950,
            ease: 'Sine.easeInOut',
            onStart: () => {
              scene.tweens.add({ targets: ghost, alpha: 0.75, scale: 1, x: to.x, y: to.y, duration: 950, ease: 'Sine.easeInOut' });
            },
          },
          { scale: base, duration: 150 },
          {
            alpha: 0,
            duration: 300,
            delay: 250,
            onStart: () => scene.tweens.add({ targets: ghost, alpha: 0, duration: 300 }),
            onComplete: () => scene.time.delayedCall(350, loop),
          },
        ],
      });
    };
    loop();
  }

  stopHand() {
    if (!this.hand) return;
    const { hand, ghost } = this.hand;
    this.hand = null;
    this.scene.tweens.killTweensOf([hand, ghost]);
    hand.destroy();
    ghost.destroy();
  }

  // Ход сделан: следующий шаг после анимации очистки.
  afterMove() {
    this.stopHand();
    this.scene.pieces = [null, null, null];
    this.scene.drawTray();
    playSound('streak');
    this.setText(this.stepIndex === 0 ? 'Отлично!\nЛиния исчезла и дала очки' : 'Супер! Это комбо!');
    this.scene.time.delayedCall(1300, () => this.nextStep());
  }

  finish(completed) {
    if (this.finished) return;
    this.finished = true;
    const { scene } = this;
    this.stopHand();
    setProgress(completeTutorial(getProgress()));
    scene.tutorial = null;
    this.skip.text.destroy();
    this.skip.zone.destroy();

    // Счёт показываем только когда подсказка исчезнет, чтобы они не наложились.
    const showScore = () => {
      scene.scoreText.setVisible(true);
      scene.bestText.setVisible(true);
    };
    if (completed) {
      this.setText('Готово!\nДальше — без подсказок');
      scene.time.delayedCall(1400, () => {
        this.banner.destroy();
        showScore();
      });
    } else {
      this.banner.destroy();
      showScore();
    }

    if (!completed) scene.board = createBoard();
    scene.drawBoard();
    scene.pieces = generateSet(scene.board, scene.rng);
    scene.drawTray([0, 1, 2]);
    playSound('deal');
  }
}
