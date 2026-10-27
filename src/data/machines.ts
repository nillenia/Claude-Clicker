import { registerResource } from './resources';

export type MachineCategory =
  | 'hub'
  | 'drill'
  | 'pump'
  | 'furnace'
  | 'assembler'
  | 'chemical'
  | 'lab'
  | 'generator'
  | 'belt'
  | 'splitter'
  | 'storage'
  | 'terminal'
  | 'silo'
  | 'turret';

/** Maschinentypen mit eigenem Skilltree. */
export type TreeGroup = 'drill' | 'furnace' | 'assembler' | 'lab' | 'generator' | 'logistics' | 'turret';

export type RecipeCategory = 'smelting' | 'assembling' | 'chemistry';

export type DamageType = 'kinetic' | 'thermal' | 'em' | 'plasma' | 'void';

export interface TurretSpec {
  damage: number;
  damageType: DamageType;
  /** Reichweite in Feldern. */
  range: number;
  /** Schüsse pro Sekunde. */
  fireRate: number;
  /** Munition pro Schuss aus dem Planeteninventar; ohne Angabe nutzt der Turm Strom. */
  ammo?: string;
}

export interface MachineDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: MachineCategory;
  tree?: TreeGroup;
  tier: number;
  w: number;
  h: number;
  /** Bohrer/Pumpe: Einheiten pro Sekunde · Fertiger: Fertigungsgeschwindigkeit · Band: Items pro Sekunde. */
  speed: number;
  /** Stromverbrauch in kW. */
  power: number;
  /** Stromerzeugung in kW. */
  powerGen?: number;
  /** Brennstoff aus dem Eingang (pro Sekunde bei voller Leistung). */
  fuel?: { resource: string; perSecond: number };
  /** Nur auf bestimmten Feldern baubar (z. B. Geothermie auf Lava). */
  requiresTile?: string;
  recipeCategories?: RecipeCategory[];
  moduleSlots: number;
  hp: number;
  color: string;
  buildable: boolean;
  turret?: TurretSpec;
}

const M: MachineDef[] = [
  {
    id: 'hub', name: 'Landekapsel', icon: '🛸', category: 'hub', tier: 0, w: 3, h: 3, speed: 0, power: 0,
    description: 'Deine Rettungskapsel. Nimmt alles von Bändern an und lagert es im Planeteninventar.',
    moduleSlots: 0, hp: 2000, color: '#3a4a66', buildable: false,
  },
  // --- Abbau ---
  {
    id: 'drill_mech', name: 'Mechanischer Bohrer', icon: '⛏️', category: 'drill', tree: 'drill', tier: 1, w: 2, h: 2, speed: 0.3, power: 0,
    description: 'Fördert langsam Erz unter sich. Braucht keinen Strom.', moduleSlots: 0, hp: 150, color: '#6b5a48', buildable: true,
  },
  {
    id: 'drill_elec', name: 'Elektrobohrer', icon: '⛏️', category: 'drill', tree: 'drill', tier: 2, w: 2, h: 2, speed: 0.8, power: 90,
    description: 'Elektrischer Bohrer mit Modulsockel.', moduleSlots: 1, hp: 250, color: '#4d6a8a', buildable: true,
  },
  {
    id: 'drill_deep', name: 'Tiefenbohrer', icon: '⛏️', category: 'drill', tree: 'drill', tier: 3, w: 2, h: 2, speed: 2, power: 300,
    description: 'Bohrt tief in den Planetenmantel.', moduleSlots: 2, hp: 400, color: '#5a5a9a', buildable: true,
  },
  {
    id: 'drill_plasma', name: 'Plasmabohrer', icon: '⛏️', category: 'drill', tree: 'drill', tier: 4, w: 2, h: 2, speed: 6, power: 1200,
    description: 'Schneidet mit Plasma durch jedes Gestein.', moduleSlots: 4, hp: 600, color: '#8a4d9a', buildable: true,
  },
  {
    id: 'pump', name: 'Förderpumpe', icon: '🛢️', category: 'pump', tree: 'drill', tier: 2, w: 2, h: 2, speed: 4, power: 60,
    description: 'Fördert Flüssigkeiten und Gase in Kanistern auf Bänder.', moduleSlots: 1, hp: 250, color: '#3d7a8a', buildable: true,
  },
  // --- Verhüttung ---
  {
    id: 'furnace_stone', name: 'Steinofen', icon: '🔥', category: 'furnace', tree: 'furnace', tier: 1, w: 2, h: 2, speed: 1, power: 0,
    description: 'Schmilzt Erz zu Platten. Braucht keinen Strom.', recipeCategories: ['smelting'], moduleSlots: 0, hp: 200, color: '#7a5040', buildable: true,
  },
  {
    id: 'furnace_elec', name: 'Elektroofen', icon: '🔥', category: 'furnace', tree: 'furnace', tier: 2, w: 2, h: 2, speed: 2, power: 180,
    description: 'Schneller elektrischer Ofen.', recipeCategories: ['smelting'], moduleSlots: 2, hp: 300, color: '#8a5a3a', buildable: true,
  },
  {
    id: 'furnace_arc', name: 'Lichtbogenofen', icon: '🔥', category: 'furnace', tree: 'furnace', tier: 3, w: 2, h: 2, speed: 4, power: 450,
    description: 'Schmilzt mit Lichtbögen bei extremer Hitze.', recipeCategories: ['smelting'], moduleSlots: 3, hp: 450, color: '#9a4a5a', buildable: true,
  },
  {
    id: 'furnace_star', name: 'Sternenschmiede', icon: '🔥', category: 'furnace', tree: 'furnace', tier: 4, w: 2, h: 2, speed: 10, power: 2000,
    description: 'Ein gezähmter Mini-Stern.', recipeCategories: ['smelting'], moduleSlots: 4, hp: 700, color: '#c06a2a', buildable: true,
  },
  // --- Fertigung ---
  {
    id: 'assembler_1', name: 'Assembler Mk I', icon: '⚙️', category: 'assembler', tree: 'assembler', tier: 1, w: 3, h: 3, speed: 0.75, power: 75,
    description: 'Fertigt Bauteile nach Rezept.', recipeCategories: ['assembling'], moduleSlots: 1, hp: 250, color: '#4a5a6a', buildable: true,
  },
  {
    id: 'assembler_2', name: 'Assembler Mk II', icon: '⚙️', category: 'assembler', tree: 'assembler', tier: 2, w: 3, h: 3, speed: 1.25, power: 150,
    description: 'Schnellere Fertigung.', recipeCategories: ['assembling'], moduleSlots: 2, hp: 350, color: '#4a6a7a', buildable: true,
  },
  {
    id: 'assembler_3', name: 'Assembler Mk III', icon: '⚙️', category: 'assembler', tree: 'assembler', tier: 3, w: 3, h: 3, speed: 2.5, power: 375,
    description: 'Präzisionsfertigung.', recipeCategories: ['assembling'], moduleSlots: 3, hp: 450, color: '#3a7a8a', buildable: true,
  },
  {
    id: 'assembler_4', name: 'Assembler Mk IV', icon: '⚙️', category: 'assembler', tree: 'assembler', tier: 4, w: 3, h: 3, speed: 6, power: 1500,
    description: 'Nanofabrik.', recipeCategories: ['assembling'], moduleSlots: 4, hp: 600, color: '#2a8a9a', buildable: true,
  },
  {
    id: 'chem_1', name: 'Chemiewerk', icon: '⚗️', category: 'chemical', tree: 'assembler', tier: 2, w: 3, h: 3, speed: 1, power: 210,
    description: 'Verarbeitet Flüssigkeiten und chemische Rezepte.', recipeCategories: ['chemistry'], moduleSlots: 2, hp: 350, color: '#5a7a4a', buildable: true,
  },
  {
    id: 'chem_2', name: 'Molekularreaktor', icon: '⚗️', category: 'chemical', tree: 'assembler', tier: 4, w: 3, h: 3, speed: 4, power: 1200,
    description: 'Baut Moleküle Atom für Atom.', recipeCategories: ['chemistry'], moduleSlots: 4, hp: 550, color: '#4a9a6a', buildable: true,
  },
  // --- Forschung ---
  {
    id: 'lab_1', name: 'Labor', icon: '🔬', category: 'lab', tree: 'lab', tier: 1, w: 3, h: 3, speed: 1, power: 60,
    description: 'Verbraucht Datenkerne für die aktuelle Forschung.', moduleSlots: 1, hp: 250, color: '#4a4a8a', buildable: true,
  },
  {
    id: 'lab_2', name: 'Quantenlabor', icon: '🔬', category: 'lab', tree: 'lab', tier: 3, w: 3, h: 3, speed: 3, power: 400,
    description: 'Forscht in Überlagerung.', moduleSlots: 3, hp: 400, color: '#6a4aaa', buildable: true,
  },
  // --- Energie ---
  {
    id: 'gen_coal', name: 'Kohlekraftwerk', icon: '🏭', category: 'generator', tree: 'generator', tier: 1, w: 2, h: 2, speed: 0, power: 0, powerGen: 900,
    fuel: { resource: 'coal', perSecond: 0.3 },
    description: 'Verbrennt Kohle aus dem Eingang zu Strom.', moduleSlots: 0, hp: 250, color: '#5a4a4a', buildable: true,
  },
  {
    id: 'gen_solar', name: 'Solarfeld', icon: '☀️', category: 'generator', tree: 'generator', tier: 2, w: 3, h: 3, speed: 0, power: 0, powerGen: 400,
    description: 'Erzeugt Strom aus Sternenlicht. Braucht keinen Brennstoff.', moduleSlots: 1, hp: 150, color: '#2a3a6a', buildable: true,
  },
  {
    id: 'gen_geo', name: 'Geothermie-Kraftwerk', icon: '🌋', category: 'generator', tree: 'generator', tier: 3, w: 2, h: 2, speed: 0, power: 0, powerGen: 5000,
    requiresTile: 'lava',
    description: 'Nutzt Lava als Wärmequelle. Nur auf Lavafeldern baubar.', moduleSlots: 2, hp: 400, color: '#8a3a2a', buildable: true,
  },
  {
    id: 'gen_fusion', name: 'Fusionsreaktor', icon: '⚛️', category: 'generator', tree: 'generator', tier: 4, w: 4, h: 4, speed: 0, power: 0, powerGen: 60000,
    fuel: { resource: 'fusion_cell', perSecond: 0.02 },
    description: 'Verschmilzt Helium-3 zu gewaltigen Strommengen.', moduleSlots: 3, hp: 800, color: '#2a6a7a', buildable: true,
  },
  // --- Logistik ---
  {
    id: 'belt_1', name: 'Förderband', icon: '➡️', category: 'belt', tree: 'logistics', tier: 1, w: 1, h: 1, speed: 8, power: 0,
    description: 'Transportiert Items in Pfeilrichtung.', moduleSlots: 0, hp: 50, color: '#8a7a3a', buildable: true,
  },
  {
    id: 'belt_2', name: 'Schnellband', icon: '➡️', category: 'belt', tree: 'logistics', tier: 2, w: 1, h: 1, speed: 16, power: 0,
    description: 'Doppelt so schnell.', moduleSlots: 0, hp: 70, color: '#9a4a3a', buildable: true,
  },
  {
    id: 'belt_3', name: 'Expressband', icon: '➡️', category: 'belt', tree: 'logistics', tier: 3, w: 1, h: 1, speed: 32, power: 0,
    description: 'Sehr schneller Transport.', moduleSlots: 0, hp: 90, color: '#3a6a9a', buildable: true,
  },
  {
    id: 'belt_4', name: 'Magnetband', icon: '➡️', category: 'belt', tree: 'logistics', tier: 4, w: 1, h: 1, speed: 64, power: 0,
    description: 'Magnetschwebe-Transport.', moduleSlots: 0, hp: 110, color: '#7a3a9a', buildable: true,
  },
  {
    id: 'splitter', name: 'Weiche', icon: '🔀', category: 'splitter', tree: 'logistics', tier: 1, w: 1, h: 1, speed: 32, power: 0,
    description: 'Verteilt Items von hinten gleichmäßig nach vorne, links und rechts.', moduleSlots: 0, hp: 60, color: '#6a6a3a', buildable: true,
  },
  {
    id: 'storage', name: 'Lager', icon: '📦', category: 'storage', tree: 'logistics', tier: 1, w: 2, h: 2, speed: 0, power: 0,
    description: 'Nimmt alles von Bändern an und legt es ins Planeteninventar.', moduleSlots: 0, hp: 300, color: '#5a5a5a', buildable: true,
  },
  {
    id: 'terminal', name: 'Ausgabeterminal', icon: '📤', category: 'terminal', tree: 'logistics', tier: 1, w: 1, h: 1, speed: 10, power: 0,
    description: 'Gibt ein gewähltes Item aus dem Planeteninventar auf ein Band aus.', moduleSlots: 0, hp: 80, color: '#3a5a5a', buildable: true,
  },
  {
    id: 'silo', name: 'Raketensilo', icon: '🚀', category: 'silo', tree: 'logistics', tier: 3, w: 4, h: 4, speed: 0, power: 500,
    description: 'Startet Frachtraketen zu anderen Planeten. Jeder Start verbraucht Raketenteile.', moduleSlots: 0, hp: 800, color: '#6a6a7a', buildable: true,
  },
  // --- Verteidigung ---
  {
    id: 'turret_gun', name: 'Geschützturm', icon: '🔫', category: 'turret', tree: 'turret', tier: 1, w: 2, h: 2, speed: 0, power: 0,
    turret: { damage: 12, damageType: 'kinetic', range: 8, fireRate: 3, ammo: 'ammo' },
    description: 'Feuert Munition aus dem Planeteninventar.', moduleSlots: 1, hp: 400, color: '#6a5a3a', buildable: true,
  },
  {
    id: 'turret_laser', name: 'Laserturm', icon: '🔆', category: 'turret', tree: 'turret', tier: 2, w: 2, h: 2, speed: 0, power: 400,
    turret: { damage: 25, damageType: 'thermal', range: 10, fireRate: 2 },
    description: 'Feuert mit Strom statt Munition.', moduleSlots: 2, hp: 450, color: '#7a3a3a', buildable: true,
  },
  {
    id: 'turret_tesla', name: 'Teslaturm', icon: '🌩️', category: 'turret', tree: 'turret', tier: 3, w: 2, h: 2, speed: 0, power: 900,
    turret: { damage: 60, damageType: 'em', range: 9, fireRate: 1.5 },
    description: 'Elektromagnetische Entladungen.', moduleSlots: 3, hp: 500, color: '#3a5a9a', buildable: true,
  },
  {
    id: 'turret_plasma', name: 'Plasmakanone', icon: '☄️', category: 'turret', tree: 'turret', tier: 4, w: 2, h: 2, speed: 0, power: 300,
    turret: { damage: 400, damageType: 'plasma', range: 13, fireRate: 0.8, ammo: 'ammo_plasma' },
    description: 'Schießt Plasmaladungen über große Distanz.', moduleSlots: 4, hp: 700, color: '#8a3a7a', buildable: true,
  },
  {
    id: 'turret_void', name: 'Leerenprojektor', icon: '🕳️', category: 'turret', tree: 'turret', tier: 5, w: 2, h: 2, speed: 0, power: 5000,
    turret: { damage: 2500, damageType: 'void', range: 12, fireRate: 0.5 },
    description: 'Reißt Löcher in die Realität.', moduleSlots: 4, hp: 900, color: '#3a2a6a', buildable: true,
  },
];

export const MACHINES: Record<string, MachineDef> = Object.fromEntries(M.map((m) => [m.id, m]));
export const MACHINE_LIST: readonly MachineDef[] = M;

// Jede baubare Maschine ist auch ein Item im Inventar
for (const m of M) {
  if (!m.buildable) continue;
  registerResource({ id: m.id, name: m.name, symbol: m.icon, icon: m.icon, color: m.color, category: 'building', tier: m.tier });
}

export const TREE_GROUP_NAMES: Record<TreeGroup, string> = {
  drill: 'Bohrer & Pumpen',
  furnace: 'Öfen',
  assembler: 'Fertigung',
  lab: 'Labore',
  generator: 'Energie',
  logistics: 'Logistik',
  turret: 'Verteidigung',
};

export const DAMAGE_TYPE_NAMES: Record<DamageType, string> = {
  kinetic: 'Kinetisch',
  thermal: 'Thermisch',
  em: 'EM',
  plasma: 'Plasma',
  void: 'Leere',
};
