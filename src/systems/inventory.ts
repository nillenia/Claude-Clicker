import { D, Decimal, ZERO } from '../core/bignum';
import type { PlanetState } from '../core/state';
import type { Amounts } from '../data/recipes';

export function amountOf(planet: PlanetState, resource: string): Decimal {
  return planet.inventory[resource] ?? ZERO;
}

export function addItem(planet: PlanetState, resource: string, amount: Decimal | number): void {
  planet.inventory[resource] = amountOf(planet, resource).add(amount);
}

export function hasItems(planet: PlanetState, items: Amounts, times = 1): boolean {
  return Object.entries(items).every(([res, n]) => amountOf(planet, res).gte(n * times));
}

/** Entfernt Items, falls genug vorhanden sind. Gibt false zurück, ohne etwas zu ändern, wenn nicht. */
export function takeItems(planet: PlanetState, items: Amounts, times = 1): boolean {
  if (!hasItems(planet, items, times)) return false;
  for (const [res, n] of Object.entries(items)) {
    planet.inventory[res] = amountOf(planet, res).sub(n * times);
  }
  return true;
}

export function giveItems(planet: PlanetState, items: Amounts, times = 1): void {
  for (const [res, n] of Object.entries(items)) addItem(planet, res, D(n * times));
}

/** Wie oft die Items aus dem Inventar bezahlt werden können. */
export function affordableTimes(planet: PlanetState, items: Amounts): number {
  let times = Infinity;
  for (const [res, n] of Object.entries(items)) {
    times = Math.min(times, Math.floor(amountOf(planet, res).div(n).toNumber()));
  }
  return times === Infinity ? 0 : times;
}
