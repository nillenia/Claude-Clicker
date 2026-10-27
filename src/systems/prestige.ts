import { D } from '../core/bignum';
import { createInitialState, type GameState } from '../core/state';
import type { Rng } from '../core/rng';
import type { SourcedModifier } from '../engine/types';
import { ARCHIVED_RESEARCH, DARK_BY_ID, DARK_UPGRADES, darkEnergyFor, SYSTEM_MODS } from '../data/prestige';

export function darkEnergyGain(state: GameState): number {
  return darkEnergyFor(state.run.value);
}

/** Imperiumswert, der für den nächsten Punkt Dunkle Energie nötig ist. */
export function nextDarkThreshold(state: GameState): number {
  const next = darkEnergyGain(state) + 1;
  return next * next * 50_000;
}

export function darkRank(state: GameState, id: string): number {
  return state.prestige.upgrades[id] ?? 0;
}

export function buyDarkUpgrade(state: GameState, id: string): string | null {
  const def = DARK_BY_ID[id];
  if (!def) return 'Unbekannt';
  const rank = darkRank(state, id);
  if (rank >= def.maxRank) return 'Maximaler Rang';
  if (def.requires && darkRank(state, def.requires) < 1) return `Benötigt ${DARK_BY_ID[def.requires].name}`;
  const cost = def.cost(rank);
  if (state.prestige.darkEnergy < cost) return 'Zu wenig Dunkle Energie';
  state.prestige.darkEnergy -= cost;
  state.prestige.upgrades[id] = rank + 1;
  return null;
}

export function prestigeModifiers(state: GameState): SourcedModifier[] {
  const mods: SourcedModifier[] = [];
  for (const def of DARK_UPGRADES) {
    const rank = darkRank(state, def.id);
    if (!rank || !def.mods) continue;
    for (const m of def.mods) {
      const value = m.kind === 'more' ? ((1 + m.value / 100) ** rank - 1) * 100 : m.value * rank;
      mods.push({ ...m, value, source: `Dunkle Energie: ${def.name}` });
    }
  }
  for (const id of state.prestige.systemMods) {
    const sm = SYSTEM_MODS.find((s) => s.id === id);
    if (sm) for (const m of sm.mods) mods.push({ ...m, source: `Sternensystem: ${sm.name.split(':')[0]}` });
  }
  return mods;
}

/** Startausrüstung je Rang von „Vorräte im Frachtraum“. */
const KIT_BY_RANK: Record<string, number>[] = [
  { drill_mech: 4, furnace_stone: 3, belt_1: 40, iron_plate: 60, stone: 50 },
  { assembler_1: 2, gen_coal: 2, lab_1: 2, terminal: 4, storage: 2, circuit: 40, gear: 40 },
  { drill_elec: 6, splitter: 4, belt_1: 100, sci_red: 100 },
  { furnace_elec: 4, assembler_2: 2, gen_solar: 4, steel: 100 },
  { silo: 1, rocket_part: 25, sci_green: 200 },
];

/** Neuer Zustand nach einem Sternensprung. Kommandant, Maschinen, Beute und Meta-Fortschritt bleiben. */
export function starJump(old: GameState, rng: Rng, now: number): GameState {
  const gain = darkEnergyGain(old);
  const next = createInitialState(now);

  next.commander = old.commander;
  next.machines = old.machines;
  next.paragon = old.paragon;
  next.settings = old.settings;
  next.counters = old.counters;
  next.startedAt = old.startedAt;
  next.playTime = old.playTime;
  next.skills = { ...old.skills, energy: 0, cooldowns: {} };

  // Beute bleibt, aber Module kehren aus den alten Maschinen ins Lager zurück
  next.loot = { ...old.loot, meteor: null, meteorTimer: 120 };
  for (const item of Object.values(next.loot.items)) if (item.location?.kind === 'machine') item.location = undefined;

  next.prestige = {
    ...old.prestige,
    darkEnergy: old.prestige.darkEnergy + gain,
    totalDark: old.prestige.totalDark + gain,
    jumps: old.prestige.jumps + 1,
  };
  // Zwei zufällige Systemmodifikatoren
  const pool = [...SYSTEM_MODS];
  next.prestige.systemMods = [];
  for (let i = 0; i < 2 && pool.length; i++) next.prestige.systemMods.push(pool.splice(Math.floor(rng.next() * pool.length), 1)[0].id);

  // Startausrüstung
  const kitRank = darkRank(next, 'd_kit');
  const inv = next.planets.kepler.inventory;
  for (let r = 0; r < kitRank; r++) {
    for (const [res, n] of Object.entries(KIT_BY_RANK[r])) inv[res] = (inv[res] ?? D(0)).add(n);
  }
  // Archivierte Forschung
  const researchRank = darkRank(next, 'd_research');
  for (let r = 0; r < researchRank; r++) for (const id of ARCHIVED_RESEARCH[r]) next.research.done.add(id);

  return next;
}
