import type { Dir } from '../core/state';
import type { MachineDef } from '../data/machines';

export const DIRS: readonly [number, number][] = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
];

export function rotateCW(d: Dir): Dir {
  return ((d + 1) % 4) as Dir;
}

export function opposite(d: Dir): Dir {
  return ((d + 2) % 4) as Dir;
}

/** Feld direkt vor der Ausgangsseite einer Maschine. */
export function outputCell(def: MachineDef, x: number, y: number, rot: Dir): [number, number] {
  const midW = Math.floor((def.w - 1) / 2);
  const midH = Math.floor((def.h - 1) / 2);
  switch (rot) {
    case 0:
      return [x + def.w, y + midH];
    case 1:
      return [x + midW, y + def.h];
    case 2:
      return [x - 1, y + midH];
    case 3:
      return [x + midW, y - 1];
  }
}

/** Ausgangsfelder einer Weiche: vorne, rechts, links (relativ zur Richtung). */
export function splitterCells(x: number, y: number, rot: Dir): [number, number][] {
  const dirs: Dir[] = [rot, rotateCW(rot), opposite(rotateCW(rot))];
  return dirs.map((d) => [x + DIRS[d][0], y + DIRS[d][1]]);
}

export function cellsOf(def: MachineDef, x: number, y: number): [number, number][] {
  const cells: [number, number][] = [];
  for (let dy = 0; dy < def.h; dy++) for (let dx = 0; dx < def.w; dx++) cells.push([x + dx, y + dy]);
  return cells;
}

/** Richtung von a nach b für benachbarte Felder (für Bänder beim Ziehen). */
export function dirBetween(ax: number, ay: number, bx: number, by: number): Dir | null {
  const dx = bx - ax;
  const dy = by - ay;
  if (Math.abs(dx) >= Math.abs(dy) && dx !== 0) return dx > 0 ? 0 : 2;
  if (dy !== 0) return dy > 0 ? 1 : 3;
  return null;
}
