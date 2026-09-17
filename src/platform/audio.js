// Синтезированные звуки (Web Audio API) — без аудиофайлов и лицензий.
//
// Браузеры разрешают звук только после касания экрана: unlock() вызывается
// на каждый pointerdown. Когда вкладка скрыта, звук ставится на паузу
// (требование модерации Яндекс Игр).

import { loadValue, saveValue } from './storage.js';

let ctx = null;
let master = null;
let noise = null;
let muted = loadValue('muted', false);
let pausedByHost = false; // пауза извне: реклама, скрытая вкладка

const VOLUME = 0.55;

function ensureContext() {
  if (ctx) return ctx;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  ctx = new AudioContext();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : VOLUME;
  master.connect(ctx.destination);

  // Белый шум для щелчков.
  noise = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return ctx;
}

export function unlockAudio() {
  const context = ensureContext();
  if (context && context.state === 'suspended' && !pausedByHost) context.resume();
}

// Для отладки: 'none' | 'suspended' | 'running' | 'closed'.
export function audioState() {
  return ctx?.state ?? 'none';
}

export function isMuted() {
  return muted;
}

export function setMuted(value) {
  muted = value;
  saveValue('muted', value);
  if (master) master.gain.setTargetAtTime(value ? 0 : VOLUME, ctx.currentTime, 0.02);
}

// Пауза всего звука (реклама, скрытая вкладка).
export function pauseAudio(paused) {
  pausedByHost = paused;
  if (!ctx) return;
  if (paused) ctx.suspend();
  else ctx.resume();
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => pauseAudio(document.hidden));
}

// ---------- Синтез ----------

const semitone = (base, steps) => base * 2 ** (steps / 12);
const PENTATONIC = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];

function tone({
  type = 'sine',
  freq,
  freqEnd = freq,
  at = 0,
  dur = 0.15,
  gain = 0.3,
  attack = 0.005,
  filter = null,
  vibrato = 0,
}) {
  const t0 = ctx.currentTime + at;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (freqEnd !== freq) osc.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur);

  if (vibrato) {
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    lfo.frequency.value = 6;
    depth.gain.value = vibrato;
    lfo.connect(depth).connect(osc.frequency);
    lfo.start(t0);
    lfo.stop(t0 + dur + 0.05);
  }

  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.exponentialRampToValueAtTime(gain, t0 + attack);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  let node = osc.connect(amp);
  if (filter) {
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = filter;
    node = node.connect(f);
  }
  node.connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function click({ at = 0, dur = 0.04, gain = 0.2, freq = 2000 }) {
  const t0 = ctx.currentTime + at;
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  f.Q.value = 1.5;
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(gain, t0);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(amp).connect(master);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

const SOUNDS = {
  // Взяли фигуру — мягкий «хлоп» вверх.
  pick() {
    tone({ freq: 420, freqEnd: 760, dur: 0.09, gain: 0.18 });
    click({ dur: 0.02, gain: 0.08, freq: 3000 });
  },

  // Поставили — глухой «тук».
  place() {
    tone({ type: 'triangle', freq: 260, freqEnd: 120, dur: 0.14, gain: 0.35 });
    click({ dur: 0.05, gain: 0.25, freq: 900 });
  },

  // Фигура вернулась в лоток.
  back() {
    tone({ freq: 520, freqEnd: 300, dur: 0.14, gain: 0.12 });
  },

  // Очистка линий: пузырьковые «попы», тон растёт с серией.
  pop({ lines = 1, streak = 1 } = {}) {
    const base = semitone(523, Math.min(streak - 1, 6) * 2);
    for (let i = 0; i < lines; i++) {
      const f = semitone(base, PENTATONIC[i % PENTATONIC.length]);
      tone({ freq: f * 1.8, freqEnd: f, at: i * 0.07, dur: 0.12, gain: 0.3 });
      tone({ type: 'triangle', freq: f * 2, at: i * 0.07 + 0.02, dur: 0.2, gain: 0.08 });
    }
  },

  // Комбо — аккорд-арпеджио.
  combo({ lines = 2 } = {}) {
    const notes = [0, 4, 7, 12, 16].slice(0, Math.min(lines + 1, 5));
    notes.forEach((n, i) => {
      tone({ type: 'triangle', freq: semitone(659, n), at: 0.12 + i * 0.06, dur: 0.3, gain: 0.16 });
    });
  },

  // Серия — колокольчики.
  streak() {
    [0, 7, 12].forEach((n, i) => {
      tone({ freq: semitone(1319, n), at: 0.2 + i * 0.05, dur: 0.35, gain: 0.08 });
    });
  },

  // Чистое поле — восходящий перелив.
  clearBoard() {
    [0, 4, 7, 12, 16, 19, 24].forEach((n, i) => {
      tone({ type: 'triangle', freq: semitone(523, n), at: 0.25 + i * 0.05, dur: 0.3, gain: 0.14 });
    });
  },

  // Новый набор фигур — три лёгких «блупа».
  deal() {
    [0, 4, 7].forEach((n, i) => {
      tone({ freq: semitone(440, n), freqEnd: semitone(440, n + 5), at: 0.12 + i * 0.11, dur: 0.08, gain: 0.1 });
    });
  },

  // Новая фигура на место поставленной — один «блуп».
  refill() {
    tone({ freq: 523, freqEnd: 784, at: 0.14, dur: 0.08, gain: 0.08 });
  },

  // Прежний рекорд побит.
  record() {
    [0, 4, 7, 12].forEach((n, i) => {
      tone({ type: 'square', freq: semitone(784, n), at: i * 0.07, dur: 0.18, gain: 0.07, filter: 2500 });
    });
  },

  // Проигрыш — грустное «уа-уа-уаа».
  gameOver() {
    [[392, 0], [370, 0.28], [349, 0.56]].forEach(([f, at], i) => {
      tone({
        type: 'triangle',
        freq: f,
        freqEnd: i === 2 ? f * 0.85 : f,
        at,
        dur: i === 2 ? 0.7 : 0.26,
        gain: 0.22,
        vibrato: i === 2 ? 6 : 0,
      });
    });
  },

  // Фанфары в окне «Новый рекорд».
  fanfare() {
    const seq = [[0, 0, 0.14], [4, 0.14, 0.14], [7, 0.28, 0.14], [12, 0.42, 0.5]];
    for (const [n, at, dur] of seq) {
      tone({ type: 'square', freq: semitone(523, n), at, dur, gain: 0.08, filter: 3000 });
      tone({ type: 'triangle', freq: semitone(523, n - 12), at, dur, gain: 0.14 });
    }
  },

  // Нажатие кнопки.
  button() {
    click({ dur: 0.03, gain: 0.2, freq: 2500 });
    tone({ freq: 880, dur: 0.06, gain: 0.1 });
  },
};

export function playSound(name, options) {
  // Пока контекст включается (suspended), звук ставится в очередь и прозвучит сразу после.
  if (muted || pausedByHost || !ctx || ctx.state === 'closed') return;
  SOUNDS[name]?.(options);
}
