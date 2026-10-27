import { countProduced, type CraftJob, type GameState, type PlanetState } from '../core/state';
import { RECIPES, recipesFor, type RecipeDef } from '../data/recipes';
import { amountOf, giveItems, takeItems } from './inventory';

export const MAX_QUEUE = 20;

export type UnlockCheck = (recipe: RecipeDef) => boolean;

export interface CraftPlan {
  /** Durchläufe in Reihenfolge: Zwischenprodukte zuerst. */
  steps: { recipe: string; count: number }[];
  /** Rohstoffe, die insgesamt verbraucht werden. */
  consumed: Record<string, number>;
}

/**
 * Plant `count` Durchläufe eines Hand-Rezepts. Fehlende Zutaten werden – falls möglich –
 * über weitere Hand-Rezepte hergestellt. Gibt null zurück, wenn es nicht reicht.
 */
export function planCraft(planet: PlanetState, recipeId: string, count: number, unlocked: UnlockCheck): CraftPlan | null {
  const inv = new Map<string, number>();
  const original = new Map<string, number>();
  const get = (res: string) => {
    if (!inv.has(res)) {
      const n = amountOf(planet, res).toNumber();
      inv.set(res, n);
      original.set(res, n);
    }
    return inv.get(res)!;
  };
  const steps: CraftPlan['steps'] = [];

  const plan = (recipe: RecipeDef, times: number, depth: number): boolean => {
    if (depth > 6) return false;
    for (const [res, n] of Object.entries(recipe.inputs)) {
      const need = n * times;
      const have = get(res);
      if (have >= need) {
        inv.set(res, have - need);
        continue;
      }
      const missing = need - have;
      const sub = recipesFor(res).find((r) => r.hand && unlocked(r));
      if (!sub) return false;
      const perRun = sub.outputs[res];
      const runs = Math.ceil(missing / perRun);
      if (!plan(sub, runs, depth + 1)) return false;
      // Zwischenprodukt entsteht und wird sofort wieder verbraucht
      inv.set(res, get(res) + runs * perRun - need);
      for (const [out, k] of Object.entries(sub.outputs)) if (out !== res) inv.set(out, get(out) + k * runs);
    }
    steps.push({ recipe: recipe.id, count: times });
    return true;
  };

  const recipe = RECIPES[recipeId];
  if (!recipe || !recipe.hand || !unlocked(recipe) || count < 1) return null;
  if (!plan(recipe, count, 0)) return null;

  const consumed: Record<string, number> = {};
  for (const [res, before] of original) {
    const after = inv.get(res)!;
    if (after < before) consumed[res] = before - after;
  }
  return { steps, consumed };
}

/** Hängt einen Plan an die Warteschlange an. */
export function enqueueCraft(state: GameState, recipeId: string, count: number, unlocked: UnlockCheck): boolean {
  const planet = state.planets[state.activePlanet];
  const plan = planCraft(planet, recipeId, count, unlocked);
  if (!plan || state.handQueue.length + plan.steps.length > MAX_QUEUE) return false;
  for (const step of plan.steps) {
    const last = state.handQueue[state.handQueue.length - 1];
    if (last && last.recipe === step.recipe && last.planet === planet.id && !last.started) {
      last.count += step.count;
    } else {
      state.handQueue.push({ recipe: step.recipe, planet: planet.id, count: step.count, progress: 0, started: false });
    }
  }
  return true;
}

export function cancelCraft(state: GameState, index: number): void {
  const job = state.handQueue[index];
  if (!job) return;
  if (job.started) giveItems(state.planets[job.planet], RECIPES[job.recipe].inputs);
  state.handQueue.splice(index, 1);
}

/** Fortschritt der Handfertigung. Gibt die fertiggestellten Rezepte zurück. */
export function tickHandcraft(state: GameState, dt: number, speed: number): string[] {
  const finished: string[] = [];
  let budget = dt * speed;
  while (budget > 0 && state.handQueue.length > 0) {
    const job = state.handQueue[0];
    const recipe = RECIPES[job.recipe];
    const planet = state.planets[job.planet];
    if (!job.started) {
      if (!takeItems(planet, recipe.inputs)) break; // wartet auf Zutaten
      job.started = true;
    }
    const needed = recipe.time - job.progress;
    if (budget < needed) {
      job.progress += budget;
      break;
    }
    budget -= needed;
    giveItems(planet, recipe.outputs);
    for (const [res, n] of Object.entries(recipe.outputs)) countProduced(state, res, n);
    state.counters.handCrafted++;
    finished.push(recipe.id);
    job.count--;
    job.progress = 0;
    job.started = false;
    if (job.count <= 0) state.handQueue.shift();
  }
  return finished;
}

export function currentJob(state: GameState): CraftJob | undefined {
  return state.handQueue[0];
}
