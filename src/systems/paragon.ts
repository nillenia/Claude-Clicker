import type { GameState } from '../core/state';
import type { SourcedModifier } from '../engine/types';
import { GLYPH_BY_ID, GLYPH_RADIUS, PARAGON_BOARDS, PARAGON_TILES, paragonNeighbors } from '../data/paragon';
import { COMMANDER_CURVE, levelInfo, xpForLevel, type Curve } from './levels';

export const PARAGON_CURVE: Curve = { base: 20_000, growth: 1.04, max: 400 };
export const PARAGON_START = 'p0:3:6';

/** Gesamte Erfahrung bis Kommandanten-Level 100. */
export function xpToMaxLevel(): number {
  let total = 0;
  for (let l = 1; l < COMMANDER_CURVE.max; l++) total += xpForLevel(COMMANDER_CURVE, l);
  return total;
}

export function paragonInfo(state: GameState) {
  const overflow = state.commander.xp - xpToMaxLevel();
  if (overflow < 0) return { unlocked: false, level: 0, current: 0, needed: Infinity };
  const info = levelInfo(PARAGON_CURVE, overflow);
  return { unlocked: true, ...info };
}

export function paragonAllocated(state: GameState): Set<string> {
  return new Set(state.paragon.allocated.length ? state.paragon.allocated : [PARAGON_START]);
}

export function paragonPointsLeft(state: GameState): number {
  const info = paragonInfo(state);
  if (!info.unlocked) return 0;
  return info.level - (paragonAllocated(state).size - 1);
}

/** Kürzester Pfad über freie Felder zu einem Ziel. */
function pathTo(allocated: Set<string>, target: string): string[] | null {
  const prev = new Map<string, string | null>();
  const queue = [...allocated];
  for (const a of allocated) prev.set(a, null);
  while (queue.length) {
    const id = queue.shift()!;
    for (const n of paragonNeighbors(PARAGON_TILES[id])) {
      if (prev.has(n)) continue;
      prev.set(n, id);
      if (n === target) {
        const path: string[] = [];
        let cur: string | null = n;
        while (cur && !allocated.has(cur)) {
          path.unshift(cur);
          cur = prev.get(cur) ?? null;
        }
        return path;
      }
      queue.push(n);
    }
  }
  return null;
}

export function allocateParagon(state: GameState, tileId: string): number {
  const allocated = paragonAllocated(state);
  if (!PARAGON_TILES[tileId] || allocated.has(tileId)) return 0;
  const path = pathTo(allocated, tileId);
  if (!path || path.length > paragonPointsLeft(state)) return 0;
  for (const id of path) allocated.add(id);
  state.paragon.allocated = [...allocated];
  return path.length;
}

export function resetParagon(state: GameState): void {
  state.paragon.allocated = [PARAGON_START];
  state.paragon.glyphs = {};
}

export function setGlyph(state: GameState, board: number, glyph: string | null): string | null {
  const socket = PARAGON_BOARDS[board]?.tiles.find((t) => t.kind === 'glyph');
  if (!socket) return 'Kein Glyphensockel';
  if (!paragonAllocated(state).has(socket.id)) return 'Glyphensockel erst freischalten';
  if (glyph && !GLYPH_BY_ID[glyph]) return 'Unbekannte Glyphe';
  // Jede Glyphe nur einmal
  for (const [b, g] of Object.entries(state.paragon.glyphs)) if (g === glyph) delete state.paragon.glyphs[b];
  if (glyph) state.paragon.glyphs[board] = glyph;
  else delete state.paragon.glyphs[board];
  return null;
}

export function paragonModifiers(state: GameState): SourcedModifier[] {
  const allocated = paragonAllocated(state);
  const mods: SourcedModifier[] = [];
  for (const board of PARAGON_BOARDS) {
    const glyphId = state.paragon.glyphs[board.index];
    const glyph = glyphId ? GLYPH_BY_ID[glyphId] : null;
    const socket = board.tiles.find((t) => t.kind === 'glyph')!;
    let inRange = 0;
    for (const tile of board.tiles) {
      if (!allocated.has(tile.id) || tile.mods.length === 0) continue;
      const near = Math.max(Math.abs(tile.x - socket.x), Math.abs(tile.y - socket.y)) <= GLYPH_RADIUS;
      const amp = glyph && near ? 1 + glyph.amplify / 100 : 1;
      if (near) inRange++;
      for (const m of tile.mods) mods.push({ ...m, value: m.value * amp, source: `Paragon: ${board.name}` });
    }
    if (glyph && inRange >= 5) for (const m of glyph.bonus) mods.push({ ...m, source: glyph.name });
  }
  return mods;
}
