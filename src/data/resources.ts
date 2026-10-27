export type ResourceCategory = 'ore' | 'fluid' | 'material' | 'component' | 'science' | 'military' | 'building' | 'currency';

export interface ResourceDef {
  id: string;
  name: string;
  /** Kurzzeichen für Symbole (wie im Periodensystem). */
  symbol: string;
  color: string;
  category: ResourceCategory;
  tier: number;
  /** Optionales Emoji statt Kurzzeichen (z. B. für Gebäude). */
  icon?: string;
}

const r = (id: string, name: string, symbol: string, color: string, category: ResourceCategory, tier: number): ResourceDef => ({
  id,
  name,
  symbol,
  color,
  category,
  tier,
});

const LIST: ResourceDef[] = [
  // --- Rohstoffe ---
  r('iron_ore', 'Eisenerz', 'Fe', '#8fa3b8', 'ore', 0),
  r('copper_ore', 'Kupfererz', 'Cu', '#e08a4f', 'ore', 0),
  r('stone', 'Stein', 'St', '#a8998a', 'ore', 0),
  r('coal', 'Kohle', 'C', '#55555f', 'ore', 0),
  r('sulfur', 'Schwefel', 'S', '#e8d44d', 'ore', 0),
  r('tungsten_ore', 'Wolframerz', 'W', '#6f7fa8', 'ore', 0),
  r('lava', 'Lava', 'Lv', '#ff5a1f', 'fluid', 0),
  r('ice', 'Eis', 'Ei', '#a6dcff', 'ore', 0),
  r('lithium_ore', 'Lithiumerz', 'Li', '#c9b6ff', 'ore', 0),
  r('helium3', 'Helium-3', 'He', '#7fffd4', 'fluid', 0),
  r('hydrogen', 'Wasserstoff', 'H', '#9ee6ff', 'fluid', 0),
  r('plasma', 'Plasma', 'Pl', '#ff7ad9', 'fluid', 0),
  r('crystal', 'Kristall', 'Kr', '#b388ff', 'ore', 0),
  r('rare_earth', 'Seltene Erden', 'SE', '#59d6a3', 'ore', 0),
  r('biomass', 'Biomasse', 'Bi', '#6cc644', 'ore', 0),
  r('xeno_sample', 'Xeno-Probe', 'Xe', '#c6ff3d', 'ore', 0),
  r('dark_matter', 'Dunkle Materie', 'DM', '#7a4dff', 'ore', 0),
  r('exotic_matter', 'Exotische Materie', 'EM', '#ff3d8b', 'ore', 0),

  // --- Verhüttung ---
  r('iron_plate', 'Eisenplatte', 'Fe', '#c3d0de', 'material', 1),
  r('copper_plate', 'Kupferplatte', 'Cu', '#f2a46e', 'material', 1),
  r('brick', 'Ziegel', 'Zi', '#c0654a', 'material', 1),
  r('steel', 'Stahl', 'Sl', '#dfe6ee', 'material', 1),
  r('tungsten_plate', 'Wolframplatte', 'W', '#8d9ccc', 'material', 1),
  r('lithium', 'Lithiumbarren', 'Li', '#ddd0ff', 'material', 1),
  r('water', 'Wasser', 'Wa', '#4fa8ff', 'fluid', 1),
  r('plastic', 'Kunststoff', 'Ks', '#f0f0f0', 'material', 2),
  r('glass', 'Quarzglas', 'Gl', '#cdeeff', 'material', 1),

  // --- Bauteile & Komponenten ---
  r('gear', 'Zahnrad', 'Zr', '#b0bccb', 'component', 2),
  r('cable', 'Kupferkabel', 'Kb', '#f7b27a', 'component', 2),
  r('circuit', 'Schaltkreis', 'SK', '#4fd36a', 'component', 2),
  r('motor', 'Motor', 'Mo', '#9aa7b8', 'component', 3),
  r('battery', 'Batterie', 'Ba', '#7de3ff', 'component', 3),
  r('adv_circuit', 'Fortschr. Schaltkreis', 'FS', '#ff5d5d', 'component', 3),
  r('cooling_fin', 'Kühlrippe', 'Kü', '#9fd3ff', 'component', 3),
  r('processor', 'Prozessor', 'Pz', '#5d8bff', 'component', 4),
  r('robot_frame', 'Robotik-Rahmen', 'RR', '#c8ced6', 'component', 4),
  r('rocket_part', 'Raketenteil', 'RT', '#ffffff', 'component', 4),
  r('fusion_cell', 'Fusionszelle', 'FZ', '#7fffd4', 'component', 4),
  r('quantum_chip', 'Quantenchip', 'QC', '#d08bff', 'component', 5),
  r('warp_core', 'Warp-Kern', 'WK', '#8f6bff', 'component', 5),
  r('antimatter', 'Antimaterie-Kapsel', 'AM', '#ff4fa0', 'component', 5),

  // --- Forschung ---
  r('sci_red', 'Datenkern Rot', 'R', '#ff4d4d', 'science', 2),
  r('sci_green', 'Datenkern Grün', 'G', '#4dff88', 'science', 2),
  r('sci_blue', 'Datenkern Blau', 'B', '#4d9cff', 'science', 3),
  r('sci_purple', 'Datenkern Violett', 'V', '#b54dff', 'science', 4),
  r('sci_gold', 'Datenkern Gold', 'Au', '#ffd24d', 'science', 5),

  // --- Militär ---
  r('ammo', 'Munition', 'Mu', '#d9b26f', 'military', 1),
  r('ammo_plasma', 'Plasmaladung', 'PL', '#ff7ad9', 'military', 3),
  r('signal_beacon', 'Signalbake', 'SB', '#ff9d3d', 'military', 3),
];

export const RESOURCES: Record<string, ResourceDef> = Object.fromEntries(LIST.map((d) => [d.id, d]));
export const RESOURCE_LIST: readonly ResourceDef[] = LIST;

/** Gebäude-Items werden aus den Maschinendefinitionen ergänzt (siehe machines.ts). */
export function registerResource(def: ResourceDef): void {
  if (RESOURCES[def.id]) return;
  RESOURCES[def.id] = def;
  LIST.push(def);
}

export const CATEGORY_NAMES: Record<ResourceCategory, string> = {
  ore: 'Rohstoffe',
  fluid: 'Flüssigkeiten & Gase',
  material: 'Materialien',
  component: 'Bauteile',
  science: 'Forschung',
  military: 'Militär',
  building: 'Gebäude',
  currency: 'Crafting-Währung',
};

export function resName(id: string): string {
  return RESOURCES[id]?.name ?? id;
}
