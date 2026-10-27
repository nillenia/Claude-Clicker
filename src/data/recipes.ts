import type { RecipeCategory } from './machines';

export type Amounts = Record<string, number>;

export interface RecipeDef {
  id: string;
  category: RecipeCategory;
  /** Sekunden bei Fertigungsgeschwindigkeit 1. */
  time: number;
  inputs: Amounts;
  outputs: Amounts;
  /** In der Landekapsel per Hand herstellbar. */
  hand?: boolean;
  /** Forschung, die das Rezept freischaltet (ohne Angabe: von Beginn an). */
  unlock?: string;
}

const R: RecipeDef[] = [];
const add = (
  id: string,
  category: RecipeCategory,
  time: number,
  inputs: Amounts,
  outputs: Amounts,
  opts: { hand?: boolean; unlock?: string } = {},
) => R.push({ id, category, time, inputs, outputs, ...opts });

// ---------- Verhüttung ----------
add('iron_plate', 'smelting', 1.6, { iron_ore: 1 }, { iron_plate: 1 }, { hand: true });
add('copper_plate', 'smelting', 1.6, { copper_ore: 1 }, { copper_plate: 1 }, { hand: true });
add('brick', 'smelting', 1.6, { stone: 2 }, { brick: 1 }, { hand: true });
add('glass', 'smelting', 3.2, { stone: 3 }, { glass: 1 }, { unlock: 'optics' });
add('steel', 'smelting', 8, { iron_plate: 5 }, { steel: 1 }, { unlock: 'steel' });
add('tungsten_plate', 'smelting', 4, { tungsten_ore: 2 }, { tungsten_plate: 1 }, { unlock: 'ignis_metallurgy' });
add('lithium', 'smelting', 4, { lithium_ore: 2 }, { lithium: 1 }, { unlock: 'cryon_chemistry' });
add('water', 'smelting', 1, { ice: 1 }, { water: 5 }, { unlock: 'cryon_chemistry' });

// ---------- Chemie ----------
add('plastic', 'chemistry', 2, { coal: 1, sulfur: 1 }, { plastic: 2 }, { unlock: 'ignis_metallurgy' });
add('crystal_refining', 'chemistry', 6, { crystal: 3, water: 10 }, { glass: 6 }, { unlock: 'prisma_resonance' });
add('bio_plastic', 'chemistry', 3, { biomass: 5 }, { plastic: 4 }, { unlock: 'verdant_expedition' });
add('hydrogen_fusion', 'chemistry', 8, { hydrogen: 20, lithium: 2, tungsten_plate: 2 }, { fusion_cell: 2 }, { unlock: 'zephyr_expedition' });

// ---------- Bauteile ----------
add('gear', 'assembling', 0.5, { iron_plate: 2 }, { gear: 1 }, { hand: true });
add('cable', 'assembling', 0.5, { copper_plate: 1 }, { cable: 2 }, { hand: true });
add('circuit', 'assembling', 0.5, { iron_plate: 1, cable: 3 }, { circuit: 1 }, { hand: true });
add('motor', 'assembling', 5, { steel: 1, gear: 2, cable: 2 }, { motor: 1 }, { unlock: 'motors' });
add('adv_circuit', 'assembling', 6, { circuit: 2, plastic: 2, cable: 4 }, { adv_circuit: 1 }, { unlock: 'ignis_metallurgy' });
add('cooling_fin', 'assembling', 3, { tungsten_plate: 2, copper_plate: 2 }, { cooling_fin: 1 }, { unlock: 'ignis_metallurgy' });
add('battery', 'assembling', 4, { lithium: 1, copper_plate: 1, plastic: 1 }, { battery: 1 }, { unlock: 'cryon_chemistry' });
add('processor', 'assembling', 10, { adv_circuit: 2, circuit: 4, glass: 2 }, { processor: 1 }, { unlock: 'processors' });
add('robot_frame', 'assembling', 15, { motor: 1, battery: 2, steel: 1, adv_circuit: 2 }, { robot_frame: 1 }, { unlock: 'robotics' });
add('rocket_part', 'assembling', 10, { steel: 5, circuit: 5, motor: 2 }, { rocket_part: 1 }, { unlock: 'rocketry' });
add('fusion_cell', 'assembling', 10, { helium3: 10, lithium: 2, tungsten_plate: 2 }, { fusion_cell: 1 }, { unlock: 'fusion' });
add('quantum_chip', 'assembling', 20, { processor: 1, crystal: 4, rare_earth: 2 }, { quantum_chip: 1 }, { unlock: 'quantum' });
add('warp_core', 'assembling', 30, { fusion_cell: 2, dark_matter: 10, quantum_chip: 2 }, { warp_core: 1 }, { unlock: 'void_tech' });
add('antimatter', 'assembling', 40, { exotic_matter: 10, warp_core: 1 }, { antimatter: 1 }, { unlock: 'void_tech' });

// ---------- Datenkerne ----------
add('sci_red', 'assembling', 5, { copper_plate: 1, gear: 1 }, { sci_red: 1 }, { hand: true });
add('sci_green', 'assembling', 6, { circuit: 1, belt_1: 1 }, { sci_green: 1 }, { unlock: 'logistics' });
add('sci_blue', 'assembling', 12, { adv_circuit: 1, motor: 1, cooling_fin: 1 }, { sci_blue: 2 }, { unlock: 'ignis_metallurgy' });
add('sci_purple', 'assembling', 20, { processor: 1, battery: 2, robot_frame: 1 }, { sci_purple: 3 }, { unlock: 'robotics' });
add('sci_gold', 'assembling', 30, { quantum_chip: 1, fusion_cell: 2 }, { sci_gold: 3 }, { unlock: 'quantum' });
add('xeno_science', 'assembling', 30, { xeno_sample: 5, quantum_chip: 1 }, { sci_gold: 6 }, { unlock: 'verdant_expedition' });

// ---------- Militär ----------
add('ammo', 'assembling', 1, { iron_plate: 2 }, { ammo: 1 }, { hand: true, unlock: 'defense' });
add('ammo_plasma', 'assembling', 4, { plasma: 5, tungsten_plate: 1 }, { ammo_plasma: 1 }, { unlock: 'plasma_weapons' });
add('signal_beacon', 'assembling', 5, { circuit: 5, steel: 5, copper_plate: 10 }, { signal_beacon: 1 }, { hand: true, unlock: 'threat_analysis' });

// ---------- Gebäude ----------
add('furnace_stone', 'assembling', 0.5, { stone: 5 }, { furnace_stone: 1 }, { hand: true });
add('drill_mech', 'assembling', 2, { gear: 3, iron_plate: 3, stone: 5 }, { drill_mech: 1 }, { hand: true });
add('belt_1', 'assembling', 0.5, { gear: 1, iron_plate: 1 }, { belt_1: 2 }, { hand: true });
add('storage', 'assembling', 1, { iron_plate: 10, brick: 10 }, { storage: 1 }, { hand: true });
add('terminal', 'assembling', 1, { circuit: 3, iron_plate: 5 }, { terminal: 1 }, { hand: true });
add('gen_coal', 'assembling', 2, { iron_plate: 10, brick: 10, gear: 5 }, { gen_coal: 1 }, { hand: true });
add('assembler_1', 'assembling', 1, { circuit: 3, gear: 5, iron_plate: 9 }, { assembler_1: 1 }, { hand: true, unlock: 'automation' });
add('lab_1', 'assembling', 2, { circuit: 10, gear: 10, belt_1: 4 }, { lab_1: 1 }, { hand: true });
add('splitter', 'assembling', 1, { circuit: 4, iron_plate: 5, belt_1: 2 }, { splitter: 1 }, { hand: true, unlock: 'logistics' });
add('drill_elec', 'assembling', 2, { circuit: 3, gear: 5, iron_plate: 10 }, { drill_elec: 1 }, { hand: true, unlock: 'electric_mining' });
add('furnace_elec', 'assembling', 5, { steel: 10, circuit: 5, brick: 10 }, { furnace_elec: 1 }, { hand: true, unlock: 'advanced_smelting' });
add('assembler_2', 'assembling', 2, { assembler_1: 1, circuit: 5, gear: 5, steel: 2 }, { assembler_2: 1 }, { hand: true, unlock: 'automation_2' });
add('belt_2', 'assembling', 1, { belt_1: 1, gear: 5 }, { belt_2: 1 }, { hand: true, unlock: 'logistics_2' });
add('gen_solar', 'assembling', 10, { steel: 5, circuit: 15, copper_plate: 5, glass: 5 }, { gen_solar: 1 }, { hand: true, unlock: 'solar' });
add('pump', 'assembling', 2, { steel: 2, gear: 2, circuit: 2 }, { pump: 1 }, { hand: true, unlock: 'fluid_handling' });
add('chem_1', 'assembling', 5, { steel: 5, gear: 5, circuit: 5, glass: 5 }, { chem_1: 1 }, { hand: true, unlock: 'ignis_metallurgy' });
add('turret_gun', 'assembling', 8, { gear: 10, copper_plate: 10, iron_plate: 20 }, { turret_gun: 1 }, { hand: true, unlock: 'defense' });
add('turret_laser', 'assembling', 10, { steel: 20, circuit: 20, glass: 10 }, { turret_laser: 1 }, { hand: true, unlock: 'lasers' });
add('silo', 'assembling', 30, { steel: 100, circuit: 100, motor: 20, brick: 100 }, { silo: 1 }, { hand: true, unlock: 'rocketry' });
add('drill_deep', 'assembling', 5, { drill_elec: 1, steel: 10, motor: 2, adv_circuit: 2 }, { drill_deep: 1 }, { unlock: 'deep_mining' });
add('furnace_arc', 'assembling', 5, { furnace_elec: 1, tungsten_plate: 10, adv_circuit: 4 }, { furnace_arc: 1 }, { unlock: 'arc_smelting' });
add('assembler_3', 'assembling', 5, { assembler_2: 2, adv_circuit: 5, motor: 2 }, { assembler_3: 1 }, { unlock: 'automation_3' });
add('belt_3', 'assembling', 1, { belt_2: 1, adv_circuit: 1, motor: 1 }, { belt_3: 1 }, { unlock: 'logistics_3' });
add('lab_2', 'assembling', 10, { lab_1: 1, processor: 5, cooling_fin: 5 }, { lab_2: 1 }, { unlock: 'processors' });
add('gen_geo', 'assembling', 10, { tungsten_plate: 20, steel: 20, cooling_fin: 10 }, { gen_geo: 1 }, { unlock: 'geothermal' });
add('turret_tesla', 'assembling', 10, { battery: 10, adv_circuit: 10, cooling_fin: 5 }, { turret_tesla: 1 }, { unlock: 'tesla' });
add('drill_plasma', 'assembling', 10, { drill_deep: 1, processor: 4, robot_frame: 1 }, { drill_plasma: 1 }, { unlock: 'plasma_tech' });
add('furnace_star', 'assembling', 10, { furnace_arc: 1, processor: 4, fusion_cell: 2 }, { furnace_star: 1 }, { unlock: 'plasma_tech' });
add('assembler_4', 'assembling', 10, { assembler_3: 1, processor: 5, robot_frame: 2 }, { assembler_4: 1 }, { unlock: 'nanofabrication' });
add('belt_4', 'assembling', 1, { belt_3: 1, processor: 1 }, { belt_4: 1 }, { unlock: 'nanofabrication' });
add('chem_2', 'assembling', 10, { chem_1: 1, processor: 5, robot_frame: 1 }, { chem_2: 1 }, { unlock: 'nanofabrication' });
add('gen_fusion', 'assembling', 30, { processor: 20, tungsten_plate: 50, robot_frame: 5 }, { gen_fusion: 1 }, { unlock: 'fusion' });
add('turret_plasma', 'assembling', 15, { processor: 5, tungsten_plate: 20, cooling_fin: 10 }, { turret_plasma: 1 }, { unlock: 'plasma_weapons' });
add('turret_void', 'assembling', 30, { quantum_chip: 5, warp_core: 1 }, { turret_void: 1 }, { unlock: 'void_tech' });

export const RECIPES: Record<string, RecipeDef> = Object.fromEntries(R.map((x) => [x.id, x]));
export const RECIPE_LIST: readonly RecipeDef[] = R;

/** Rezepte, die ein bestimmtes Item herstellen. */
export function recipesFor(resource: string): RecipeDef[] {
  return R.filter((x) => resource in x.outputs);
}

/** Zum Schmelzen: Rezept, das genau dieses Erz als einzigen Eingang hat. */
export function smeltingRecipeFor(input: string): RecipeDef | undefined {
  return R.find((x) => x.category === 'smelting' && Object.keys(x.inputs).length === 1 && input in x.inputs);
}
