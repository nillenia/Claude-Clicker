/**
 * Alle Werte im Spiel laufen über Modifier:
 *   Endwert = (Basis + Σ flat) × (1 + Σ inc / 100) × Π (1 + more / 100)
 */
export type StatId =
  // Maschinen
  | 'speed'
  | 'productivity'
  | 'critChance'
  | 'critMulti'
  | 'power'
  | 'powerGen'
  | 'fuelUse'
  | 'throughput'
  | 'moduleSlots'
  | 'machineHp'
  // Kommandant
  | 'handMine'
  | 'handCraft'
  | 'xpGain'
  | 'offlineEfficiency'
  | 'offlineCap'
  // Kampf
  | 'damage'
  | 'fireRate'
  | 'range'
  | 'penetration'
  | 'ammoUse'
  // Aktive Skills
  | 'energyMax'
  | 'energyRegen'
  | 'cooldownRecovery'
  | 'skillEffect'
  | 'skillDuration'
  | 'skillArea'
  // Beute
  | 'lootQuantity'
  | 'lootRarity'
  | 'meteorFrequency'
  // Fracht
  | 'cargoCapacity';

export type ModKind = 'flat' | 'inc' | 'more';

export type Condition =
  /** Wert × Anzahl angrenzender Gebäude der Gruppe/Kategorie (Tag). */
  | { kind: 'perAdjacent'; tag: string; max?: number }
  /** Nur wenn kein angrenzendes Gebäude mit diesem Tag existiert. */
  | { kind: 'noAdjacent'; tag: string }
  /** Nur wenn mindestens n angrenzende Gebäude mit diesem Tag existieren. */
  | { kind: 'minAdjacent'; tag: string; count: number }
  /** Pro leerem Modulsockel. */
  | { kind: 'perEmptySocket' };

export interface Modifier {
  stat: StatId;
  kind: ModKind;
  value: number;
  /** Alle Tags müssen auf das Ziel passen (leer = gilt überall). */
  tags?: string[];
  condition?: Condition;
}

/** Herkunft für die Aufschlüsselung im UI. */
export interface SourcedModifier extends Modifier {
  source: string;
}

/** Sonderregeln (Keystones und Uniques), die nicht als Zahl ausdrückbar sind. */
export type Flag =
  | 'monoculture'
  | 'overloadGrid'
  | 'swarmLogic'
  | 'noWaste'
  | 'ironDiscipline'
  | 'overloadDrill'
  | 'planetCore'
  | 'wasteHeat'
  | 'alloyMaster'
  | 'chainLightning'
  | 'prismShard'
  | 'singularity';

export const STAT_NAMES: Record<StatId, string> = {
  speed: 'Geschwindigkeit',
  productivity: 'Produktivität',
  critChance: 'Krit-Produktionschance',
  critMulti: 'Krit-Multiplikator',
  power: 'Stromverbrauch',
  powerGen: 'Stromerzeugung',
  fuelUse: 'Brennstoffverbrauch',
  throughput: 'Durchsatz',
  moduleSlots: 'Modulsockel',
  machineHp: 'Strukturpunkte',
  handMine: 'Handabbau',
  handCraft: 'Handfertigung',
  xpGain: 'Erfahrung',
  offlineEfficiency: 'Offline-Effizienz',
  offlineCap: 'Offline-Zeit',
  damage: 'Schaden',
  fireRate: 'Feuerrate',
  range: 'Reichweite',
  penetration: 'Resistenz-Durchdringung',
  ammoUse: 'Munitionsverbrauch',
  energyMax: 'Max. Energie-Reserve',
  energyRegen: 'Energie-Regeneration',
  cooldownRecovery: 'Abklingzeit-Erholung',
  skillEffect: 'Skill-Wirkung',
  skillDuration: 'Skill-Dauer',
  skillArea: 'Skill-Radius',
  lootQuantity: 'Beutemenge',
  lootRarity: 'Beuteseltenheit',
  meteorFrequency: 'Meteoritenhäufigkeit',
  cargoCapacity: 'Frachtkapazität',
};

/** Stats, deren Wert als Prozentpunkte geführt wird (Basis 0, flat = Prozentpunkte). */
export const PERCENT_POINT_STATS: ReadonlySet<StatId> = new Set(['productivity', 'critChance', 'critMulti', 'penetration', 'lootQuantity', 'lootRarity']);
