import type { Game } from '../core/game';

export type Sfx = 'mine' | 'build' | 'remove' | 'notify' | 'loot' | 'skill' | 'alarm' | 'boss';

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** Kurzer synthetischer Ton. */
function tone(freq: number, duration: number, type: OscillatorType, volume: number, slide = 0, delay = 0): void {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + delay;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + duration);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(gain).connect(a.destination);
  osc.start(t);
  osc.stop(t + duration + 0.02);
}

const SOUNDS: Record<Sfx, (v: number) => void> = {
  mine: (v) => tone(180 + Math.random() * 60, 0.08, 'square', 0.05 * v, -80),
  build: (v) => tone(320, 0.09, 'triangle', 0.08 * v, 120),
  remove: (v) => tone(260, 0.1, 'triangle', 0.07 * v, -140),
  notify: (v) => {
    tone(660, 0.1, 'sine', 0.06 * v);
    tone(880, 0.14, 'sine', 0.06 * v, 0, 0.08);
  },
  loot: (v) => {
    tone(880, 0.1, 'sine', 0.07 * v);
    tone(1175, 0.1, 'sine', 0.07 * v, 0, 0.07);
    tone(1568, 0.18, 'sine', 0.07 * v, 0, 0.14);
  },
  skill: (v) => tone(440, 0.3, 'sawtooth', 0.05 * v, 440),
  alarm: (v) => {
    tone(520, 0.2, 'square', 0.05 * v);
    tone(390, 0.25, 'square', 0.05 * v, 0, 0.22);
  },
  boss: (v) => tone(110, 0.8, 'sawtooth', 0.08 * v, -50),
};

export function playSfx(game: Game, sfx: Sfx): void {
  const { sound, volume } = game.state.settings;
  if (!sound || volume <= 0) return;
  SOUNDS[sfx](volume);
}

/** Verbindet Spielereignisse mit Sounds. */
export function attachSound(game: Game): void {
  game.bus.on('sfx', (s) => playSfx(game, s as Sfx));
}
