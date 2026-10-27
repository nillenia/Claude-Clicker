import { D } from '../src/core/bignum';
import { Game } from '../src/core/game';
import { createInitialState } from '../src/core/state';
import { oreAt } from '../src/sim/terrain';

/** Seed für Zufall in Tests; per Umgebungsvariable variierbar, um Zufallsabhängigkeiten aufzudecken. */
const RNG_SEED = Number((globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env.TEST_RNG_SEED ?? 777);

export function newGame(seed = 12345): Game {
  const state = createInitialState(1_000_000);
  state.planets.kepler.seed = seed;
  state.rngState = RNG_SEED;
  state.planets.kepler.inventory = {};
  return new Game({ persist: false, state, now: () => 1_000_000 });
}

export function give(game: Game, items: Record<string, number>): void {
  for (const [res, n] of Object.entries(items)) game.planet.inventory[res] = D(n);
}

/** Sucht eine 2×2-Fläche mit dem Erz und genug freiem Platz rechts davon. */
export function findOreSpot(game: Game, ore: string, freeRight: number): [number, number] {
  const t = game.terrain;
  for (let y = 1; y < t.height - 3; y++) {
    for (let x = 1; x < t.width - 3 - freeRight; x++) {
      if (![0, 1].every((dy) => [0, 1].every((dx) => oreAt(t, x + dx, y + dy) === ore))) continue;
      let free = true;
      for (let dx = 2; dx < 2 + freeRight && free; dx++)
        for (const dy of [0, 1]) if (game.world.entityAt(x + dx, y + dy)) free = false;
      if (free) return [x, y];
    }
  }
  throw new Error(`Kein Platz für ${ore}`);
}

export function run(game: Game, seconds: number): void {
  for (let t = 0; t < seconds; t += 0.05) game.step(0.05);
}
