import { D } from '../core/bignum';
import type { GameState } from '../core/state';
import { createPlanetState } from '../core/state';
import { PLANETS } from '../data/planets';
import type { PlanetWorld } from '../sim/world';
import { addItem, amountOf } from './inventory';

/** Items pro Sekunde, die ein arbeitendes Silo verschicken kann (vor Modifikatoren). */
export const SILO_RATE = 5;
/** Ein Raketenteil reicht für so viele verschickte Items. */
export const ITEMS_PER_PART = 100;
/** Kosten einer Kolonie (Raketenteile vom Startplaneten). */
export const COLONY_COST = 25;

/** Was eine Kolonierakete mitbringt. */
export const COLONY_KIT: Record<string, number> = {
  drill_mech: 4,
  furnace_stone: 2,
  belt_1: 40,
  storage: 2,
  terminal: 2,
  iron_plate: 50,
  gear: 20,
  circuit: 20,
};

export function planetUnlocked(state: GameState, planetId: string): boolean {
  const unlock = PLANETS[planetId]?.unlock;
  return !unlock || state.research.done.has(unlock);
}

/** Planeten mit Silo und genug Raketenteilen für eine Kolonie. */
export function colonyLaunchSites(state: GameState, worlds: Map<string, PlanetWorld>): string[] {
  return [...worlds.entries()]
    .filter(([id, w]) => w.entities.some((rt) => rt.def.category === 'silo') && amountOf(state.planets[id], 'rocket_part').gte(COLONY_COST))
    .map(([id]) => id);
}

export function foundColony(state: GameState, planetId: string, from: string, seed: number): boolean {
  if (state.planets[planetId] || !planetUnlocked(state, planetId)) return false;
  const source = state.planets[from];
  if (!source || amountOf(source, 'rocket_part').lt(COLONY_COST)) return false;
  source.inventory.rocket_part = amountOf(source, 'rocket_part').sub(COLONY_COST);
  const planet = createPlanetState(planetId, seed);
  for (const [res, n] of Object.entries(COLONY_KIT)) planet.inventory[res] = D(n);
  state.planets[planetId] = planet;
  return true;
}

/** Frachtkapazität eines Planeten in Items pro Sekunde. */
export function cargoCapacity(world: PlanetWorld, multiplier: number): number {
  let silos = 0;
  for (const rt of world.entities) if (rt.def.category === 'silo' && rt.status === 'working') silos++;
  return silos * SILO_RATE * multiplier;
}

export interface RouteFlow {
  /** Tatsächlich verschickte Items pro Sekunde (geglättet). */
  actual: Map<number, number>;
}

/** Verschickt Fracht über alle Routen. Kapazität wird proportional auf die Routen eines Planeten verteilt. */
export function tickRoutes(state: GameState, worlds: Map<string, PlanetWorld>, dt: number, multiplier: number, flow: RouteFlow): void {
  const bySource = new Map<string, typeof state.routes>();
  for (const r of state.routes) {
    if (!bySource.has(r.from)) bySource.set(r.from, []);
    bySource.get(r.from)!.push(r);
  }
  for (const [from, routes] of bySource) {
    const world = worlds.get(from);
    const source = state.planets[from];
    if (!world || !source) continue;
    const capacity = cargoCapacity(world, multiplier);
    const requested = routes.reduce((s, r) => s + r.rate, 0);
    const scale = requested > 0 ? Math.min(1, capacity / requested) : 0;
    for (const r of routes) {
      const target = state.planets[r.to];
      const targetWorld = worlds.get(r.to);
      let amount = r.rate * scale * dt;
      if (target && targetWorld && amount > 0) {
        amount = Math.min(amount, amountOf(source, r.resource).toNumber());
        const partsAvailable = amountOf(source, 'rocket_part').toNumber() - (r.resource === 'rocket_part' ? amount : 0);
        amount = Math.max(0, Math.min(amount, partsAvailable * ITEMS_PER_PART));
        if (amount > 0) {
          const parts = amount / ITEMS_PER_PART;
          source.inventory[r.resource] = amountOf(source, r.resource).sub(amount);
          source.inventory.rocket_part = amountOf(source, 'rocket_part').sub(parts);
          addItem(target, r.resource, D(amount));
          world.recordNet(r.resource, -amount);
          world.recordNet('rocket_part', -parts);
          targetWorld.recordNet(r.resource, amount);
        }
      } else {
        amount = 0;
      }
      const prev = flow.actual.get(r.id) ?? 0;
      flow.actual.set(r.id, prev + (amount / dt - prev) * Math.min(1, dt / 5));
    }
  }
}
