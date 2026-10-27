import type { Blueprint, BlueprintEntity, Dir, GameState } from '../core/state';
import { MACHINES } from '../data/machines';
import type { PlanetWorld } from '../sim/world';

/** Erstellt eine Blaupause aus allen Gebäuden, die vollständig im Rechteck liegen. */
export function captureBlueprint(world: PlanetWorld, x0: number, y0: number, x1: number, y1: number): Omit<Blueprint, 'id' | 'name'> | null {
  const minX = Math.min(x0, x1);
  const minY = Math.min(y0, y1);
  const maxX = Math.max(x0, x1);
  const maxY = Math.max(y0, y1);
  const inside = world.state.entities.filter((e) => {
    const def = MACHINES[e.type];
    return def.buildable && e.x >= minX && e.y >= minY && e.x + def.w - 1 <= maxX && e.y + def.h - 1 <= maxY;
  });
  if (inside.length === 0) return null;
  const ox = Math.min(...inside.map((e) => e.x));
  const oy = Math.min(...inside.map((e) => e.y));
  const entities: BlueprintEntity[] = inside.map((e) => ({ type: e.type, dx: e.x - ox, dy: e.y - oy, rot: e.rot, recipe: e.recipe, filter: e.filter }));
  const w = Math.max(...entities.map((e) => e.dx + MACHINES[e.type].w));
  const h = Math.max(...entities.map((e) => e.dy + MACHINES[e.type].h));
  return { w, h, entities };
}

/** Dreht eine Blaupause um `steps` × 90° im Uhrzeigersinn. */
export function rotateBlueprint(bp: Pick<Blueprint, 'w' | 'h' | 'entities'>, steps: number): Pick<Blueprint, 'w' | 'h' | 'entities'> {
  let cur = bp;
  for (let s = 0; s < ((steps % 4) + 4) % 4; s++) {
    cur = {
      w: cur.h,
      h: cur.w,
      entities: cur.entities.map((e) => {
        const size = MACHINES[e.type].h;
        return { ...e, dx: cur.h - e.dy - size, dy: e.dx, rot: ((e.rot + 1) % 4) as Dir };
      }),
    };
  }
  return cur;
}

export function blueprintCost(bp: Pick<Blueprint, 'entities'>): Record<string, number> {
  const cost: Record<string, number> = {};
  for (const e of bp.entities) cost[e.type] = (cost[e.type] ?? 0) + 1;
  return cost;
}

export function encodeBlueprint(bp: Blueprint): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify({ n: bp.name, w: bp.w, h: bp.h, e: bp.entities }))));
}

export function decodeBlueprint(state: GameState, code: string): Blueprint {
  const raw = JSON.parse(decodeURIComponent(escape(atob(code.trim())))) as { n: string; w: number; h: number; e: BlueprintEntity[] };
  if (!Array.isArray(raw.e) || raw.e.some((e) => !MACHINES[e.type]?.buildable)) throw new Error('Ungültige Blaupause');
  return { id: nextBlueprintId(state), name: String(raw.n ?? 'Importiert'), w: raw.w, h: raw.h, entities: raw.e };
}

export function nextBlueprintId(state: GameState): number {
  return Math.max(0, ...state.blueprints.map((b) => b.id)) + 1;
}
