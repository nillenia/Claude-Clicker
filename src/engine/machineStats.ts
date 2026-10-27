import type { EntityStats, PlanetWorld, Runtime } from '../sim/world';
import { StatEngine, type TargetContext } from './engine';
import type { SourcedModifier, StatId } from './types';

const PRODUCTION_GROUPS = new Set(['drill', 'furnace', 'assembler', 'lab']);

/** Tags einer Maschine – bestimmen, welche Modifier auf sie wirken. */
export function entityTags(world: PlanetWorld, rt: Runtime): Set<string> {
  const def = rt.def;
  const tags = new Set<string>([def.category, def.id, `tier:${def.tier}`, `planet:${world.state.id}`]);
  if (def.tree) tags.add(def.tree);
  if (def.power > 0) tags.add('electric');
  if (['furnace', 'assembler', 'chemical'].includes(def.category)) tags.add('crafter');
  if (def.category === 'drill' || def.category === 'pump') tags.add('extractor');
  if (rt.ore) tags.add(`res:${rt.ore}`);
  const recipe = rt.recipe;
  if (recipe) for (const out of Object.keys(recipe.outputs)) tags.add(`res:${out}`);
  if (def.turret) tags.add(`dmg:${def.turret.damageType}`);
  return tags;
}

const SINGULARITY_TAGS = ['any', '$same', 'drill', 'pump', 'furnace', 'assembler', 'chemical', 'lab', 'generator', 'storage', 'turret', 'silo', 'terminal'];

export function targetContext(world: PlanetWorld, rt: Runtime, emptySockets = 0, flags?: ReadonlySet<string>): TargetContext {
  let adjacency = rt.adjacency;
  if (flags?.has('singularity')) {
    // Singularität: jede Maschine hat 2 zusätzliche Nachbarn jeder Art
    adjacency = new Map(adjacency);
    for (const t of SINGULARITY_TAGS) adjacency.set(t, (adjacency.get(t) ?? 0) + 2);
  }
  return {
    adjacency,
    emptySockets,
    adjacencyScale: (world.state.id === 'prisma' ? 2 : 1) * (flags?.has('prismShard') ? 2 : 1),
  };
}

export interface MachineStatsInput {
  engine: StatEngine;
  world: PlanetWorld;
  rt: Runtime;
  /** Modifier aus eingesetzten Modulen. */
  moduleMods: SourcedModifier[];
  emptySockets: number;
}

/** Berechnet die effektiven Werte einer Maschine aus allen Modifiern. */
export function computeMachineStats({ engine, world, rt, moduleMods, emptySockets }: MachineStatsInput): EntityStats {
  const tags = entityTags(world, rt);
  const ctx = targetContext(world, rt, emptySockets, engine.flags);
  const v = (stat: StatId) => engine.value(stat, tags, StatEngine.baseOf(stat), moduleMods, ctx);

  let speed = v('speed');
  let productivity = v('productivity') / 100;
  let critMulti = v('critMulti') / 100;
  const group = rt.def.tree ?? '';

  // Sonderregeln der Keystones
  if (engine.has('monoculture') && PRODUCTION_GROUPS.has(group) && world.dominantGroup && group !== world.dominantGroup) speed = 0;
  if (engine.has('swarmLogic') && PRODUCTION_GROUPS.has(group) && (rt.adjacency.get('$same') ?? 0) === 0) speed = 0;
  if (engine.has('noWaste')) {
    productivity = 0;
    critMulti += 1;
  }

  return {
    speed,
    productivity,
    critChance: Math.min(1, v('critChance') / 100),
    critMulti: Math.max(1, critMulti),
    power: v('power'),
    powerGen: v('powerGen'),
    fuelUse: v('fuelUse'),
    throughput: v('throughput'),
    damage: v('damage'),
    fireRate: v('fireRate'),
    range: v('range'),
    penetration: v('penetration'),
    ammoUse: v('ammoUse'),
    hp: v('machineHp'),
  };
}
