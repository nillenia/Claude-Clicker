import type { GameState } from '../core/state';
import type { SourcedModifier } from '../engine/types';
import { RESEARCH, RESEARCH_LIST, type ResearchDef } from '../data/research';
import type { RecipeDef } from '../data/recipes';

export function isResearched(state: GameState, id: string): boolean {
  return state.research.done.has(id) || (state.research.levels[id] ?? 0) > 0;
}

export function researchLevel(state: GameState, id: string): number {
  return state.research.levels[id] ?? 0;
}

export function isRecipeUnlocked(state: GameState, recipe: RecipeDef): boolean {
  return !recipe.unlock || state.research.done.has(recipe.unlock);
}

export function researchCost(state: GameState, def: ResearchDef): number {
  const level = researchLevel(state, def.id);
  return def.repeatable ? Math.ceil(def.units * def.repeatable.growth ** level) : def.units;
}

export function isAvailable(state: GameState, def: ResearchDef): boolean {
  if (!def.repeatable && state.research.done.has(def.id)) return false;
  if (def.repeatable?.max !== undefined && researchLevel(state, def.id) >= def.repeatable.max) return false;
  return def.prereqs.every((p) => state.research.done.has(p));
}

export function availableResearch(state: GameState): ResearchDef[] {
  return RESEARCH_LIST.filter((r) => isAvailable(state, r));
}

export function startResearch(state: GameState, id: string): boolean {
  const def = RESEARCH[id];
  if (!def || !isAvailable(state, def)) return false;
  state.research.current = id;
  return true;
}

/** Fügt Forschungseinheiten hinzu. Gibt die abgeschlossene Forschung zurück, falls fertig. */
export function addResearchProgress(state: GameState, units: number): ResearchDef | null {
  const id = state.research.current;
  if (!id) return null;
  const def = RESEARCH[id];
  const progress = (state.research.progress[id] ?? 0) + units;
  const cost = researchCost(state, def);
  if (progress < cost) {
    state.research.progress[id] = progress;
    return null;
  }
  state.research.progress[id] = 0;
  if (def.repeatable) {
    state.research.levels[id] = researchLevel(state, id) + 1;
  } else {
    state.research.done.add(id);
    state.research.current = null;
  }
  return def;
}

export function researchModifiers(state: GameState): SourcedModifier[] {
  const mods: SourcedModifier[] = [];
  for (const def of RESEARCH_LIST) {
    if (!def.modifiers) continue;
    const times = def.repeatable ? researchLevel(state, def.id) : state.research.done.has(def.id) ? 1 : 0;
    if (times <= 0) continue;
    for (const m of def.modifiers) {
      if (m.kind === 'more') {
        // „more“ pro Stufe multipliziert sich: (1+v)^n als ein Modifier
        mods.push({ ...m, value: ((1 + m.value / 100) ** times - 1) * 100, source: `Forschung: ${def.name}` });
      } else {
        mods.push({ ...m, value: m.value * times, source: `Forschung: ${def.name}` });
      }
    }
  }
  return mods;
}

/** Aktueller Laborauftrag für die Simulation. */
export function currentResearchJob(state: GameState): { packs: Record<string, number>; unitTime: number } | null {
  const id = state.research.current;
  if (!id) return null;
  const def = RESEARCH[id];
  return { packs: def.packs, unitTime: def.unitTime };
}
