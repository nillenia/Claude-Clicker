import { D, Decimal } from './bignum';
import { randomSeed } from './rng';
import type { Notation } from './format';
import { PLANET_LIST } from '../data/planets';

/** Richtung: 0 = rechts, 1 = unten, 2 = links, 3 = oben. */
export type Dir = 0 | 1 | 2 | 3;

export interface Entity {
  id: number;
  type: string;
  x: number;
  y: number;
  rot: Dir;
  /** Gewähltes Rezept (Assembler, Chemiewerk). */
  recipe?: string;
  /** Gewähltes Item (Ausgabeterminal). */
  filter?: string;
  /** IDs eingesetzter Module. */
  modules?: string[];
  /** Aktuelle Lebenspunkte (fehlt = voll). */
  hp?: number;
}

export interface PlanetState {
  id: string;
  seed: number;
  entities: Entity[];
  nextEntityId: number;
  inventory: Record<string, Decimal>;
}

export interface CraftJob {
  recipe: string;
  planet: string;
  /** Verbleibende Durchläufe inkl. des aktuellen. */
  count: number;
  /** Fortschritt des aktuellen Durchlaufs in Sekunden. */
  progress: number;
  /** Zutaten des aktuellen Durchlaufs wurden bereits entnommen. */
  started: boolean;
}

export interface RolledAffix {
  id: string;
  /** 0 = schlechteste Stufe (T6) … 5 = beste (T1). */
  tier: number;
  value: number;
}

export type ItemLocation =
  | { kind: 'machine'; planet: string; entity: number }
  | { kind: 'jewel'; node: string }
  | { kind: 'artifact'; slot: number };

export interface Item {
  id: string;
  base: string;
  rarity: 'normal' | 'magic' | 'rare' | 'legendary' | 'unique';
  ilvl: number;
  name: string;
  affixes: RolledAffix[];
  tempered: RolledAffix[];
  masterwork: number;
  aspect?: string;
  unique?: string;
  location?: ItemLocation;
}

export interface Meteor {
  planet: string;
  x: number;
  y: number;
  ttl: number;
}

export interface PlanetThreat {
  /** Sekunden bis zur nächsten Welle. */
  timer: number;
  waves: number;
  kills: number;
  /** Höchste freigeschaltete Bedrohungsstufe für Bosse. */
  maxTier: number;
  bossKills: number;
}

export interface BlueprintEntity {
  type: string;
  dx: number;
  dy: number;
  rot: Dir;
  recipe?: string;
  filter?: string;
}

export interface Blueprint {
  id: number;
  name: string;
  w: number;
  h: number;
  entities: BlueprintEntity[];
}

export interface Loadout {
  name: string;
  commander: { classId: string | null; ascendancy: string | null; allocated: string[]; ascAllocated: string[]; masteries: Record<string, number> };
  machines: Record<string, string[]>;
}

export interface CargoRoute {
  id: number;
  from: string;
  to: string;
  resource: string;
  /** Gewünschte Menge pro Sekunde. */
  rate: number;
}

export interface Settings {
  notation: Notation;
  floatingText: boolean;
  showGrid: boolean;
  /** Keine Angriffswellen (Bosse bleiben möglich). */
  peaceful: boolean;
  sound: boolean;
  /** Lautstärke 0–1. */
  volume: number;
}

export interface GameState {
  planets: Record<string, PlanetState>;
  activePlanet: string;
  handQueue: CraftJob[];
  research: {
    done: Set<string>;
    current: string | null;
    /** Bereits investierte Einheiten pro Forschung. */
    progress: Record<string, number>;
    /** Stufen wiederholbarer Forschungen. */
    levels: Record<string, number>;
  };
  counters: {
    clicks: number;
    handMined: number;
    handCrafted: number;
    /** Gesamtproduktion pro Ressource (über Maschinen und Hand). */
    produced: Record<string, Decimal>;
  };
  /** Maschinen-Erfahrung und vergebene Knoten pro Maschinenbaum. */
  machines: {
    xp: Record<string, number>;
    allocated: Record<string, string[]>;
  };
  commander: {
    xp: number;
    classId: string | null;
    ascendancy: string | null;
    allocated: string[];
    ascAllocated: string[];
    /** Gewählte Effekte von Meisterschaftsknoten. */
    masteries: Record<string, number>;
  };
  loot: {
    items: Record<string, Item>;
    nextItemId: number;
    currency: Record<string, number>;
    /** Freigeschaltete Aspekte (D4-Kodex). */
    codex: string[];
    meteor: Meteor | null;
    meteorTimer: number;
  };
  /** Bedrohung pro Planet. */
  threats: Record<string, PlanetThreat>;
  skills: {
    energy: number;
    cooldowns: Record<string, number>;
    hotbar: (string | null)[];
    /** Eingesetzte Erweiterungschips pro Skill. */
    sockets: Record<string, string[]>;
    /** Besessene, nicht eingesetzte Chips. */
    chips: Record<string, number>;
  };
  /** Imperiumswert des aktuellen Laufs (Grundlage für Dunkle Energie). */
  run: { value: number; startedAt: number };
  prestige: {
    darkEnergy: number;
    totalDark: number;
    jumps: number;
    upgrades: Record<string, number>;
    /** Modifikatoren des aktuellen Sternensystems. */
    systemMods: string[];
  };
  paragon: {
    allocated: string[];
    /** Glyphe pro Brett. */
    glyphs: Record<string, string>;
  };
  /** Abgeschlossene Ziele. */
  objectives: string[];
  blueprints: Blueprint[];
  loadouts: Loadout[];
  /** Interplanetare Frachtrouten. */
  routes: CargoRoute[];
  nextRouteId: number;
  /** Zuletzt gemessene Raten – Grundlage für den Offline-Fortschritt. */
  rates: {
    planets: Record<string, Record<string, number>>;
    research: number;
  };
  rngState: number;
  startedAt: number;
  savedAt: number;
  playTime: number;
  settings: Settings;
}

/** Was die Rettungskapsel beim Absturz noch an Bord hat. */
const STARTING_ITEMS = (): Record<string, Decimal> => ({
  drill_mech: D(2),
  furnace_stone: D(1),
  belt_1: D(12),
  iron_plate: D(8),
});

export function createPlanetState(id: string, seed: number): PlanetState {
  return { id, seed, entities: [], nextEntityId: 1, inventory: {} };
}

export function createInitialState(now = Date.now()): GameState {
  const seed = randomSeed();
  return {
    planets: { kepler: { ...createPlanetState('kepler', seed), inventory: { ...STARTING_ITEMS() } } },
    activePlanet: 'kepler',
    handQueue: [],
    research: { done: new Set(), current: null, progress: {}, levels: {} },
    counters: { clicks: 0, handMined: 0, handCrafted: 0, produced: {} },
    machines: { xp: {}, allocated: {} },
    commander: { xp: 0, classId: null, ascendancy: null, allocated: [], ascAllocated: [], masteries: {} },
    loot: { items: {}, nextItemId: 1, currency: {}, codex: [], meteor: null, meteorTimer: 120 },
    run: { value: 0, startedAt: now },
    prestige: { darkEnergy: 0, totalDark: 0, jumps: 0, upgrades: {}, systemMods: [] },
    paragon: { allocated: [], glyphs: {} },
    objectives: [],
    blueprints: [],
    loadouts: [],
    threats: {},
    skills: { energy: 100, cooldowns: {}, hotbar: ['orbital', 'overcharge', 'meteor_call', 'drone_swarm', 'emergency_power', 'time_dilation'], sockets: {}, chips: {} },
    routes: [],
    nextRouteId: 1,
    rates: { planets: {}, research: 0 },
    rngState: seed ^ 0x9e3779b9,
    startedAt: now,
    savedAt: now,
    playTime: 0,
    settings: { notation: 'short', floatingText: true, showGrid: true, peaceful: false, sound: true, volume: 0.6 },
  };
}

export function planetSeed(state: GameState, planetId: string): number {
  // Abgeleiteter, stabiler Seed pro Planet
  const index = PLANET_LIST.findIndex((p) => p.id === planetId);
  return (state.planets.kepler.seed + index * 7919) >>> 0;
}

export function countProduced(state: GameState, resource: string, amount: Decimal | number): void {
  const prev = state.counters.produced[resource] ?? D(0);
  state.counters.produced[resource] = prev.add(amount);
}

