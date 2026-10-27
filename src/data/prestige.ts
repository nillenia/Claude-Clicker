import type { Modifier } from '../engine/types';
import { flat, inc, more } from './machineTrees';

export interface DarkUpgrade {
  id: string;
  name: string;
  icon: string;
  description: string;
  maxRank: number;
  /** Kosten in Dunkler Energie für den nächsten Rang. */
  cost: (rank: number) => number;
  /** Modifier pro Rang. */
  mods?: Modifier[];
  requires?: string;
}

export const DARK_UPGRADES: DarkUpgrade[] = [
  { id: 'd_speed', name: 'Kosmische Beschleunigung', icon: '🌠', description: '+10 % mehr Geschwindigkeit aller Maschinen pro Rang.', maxRank: 50, cost: (r) => Math.ceil(2 * 1.5 ** r), mods: [more('speed', 10)] },
  { id: 'd_prod', name: 'Sternenstaub-Ertrag', icon: '✨', description: '+5 % Produktivität aller Maschinen pro Rang.', maxRank: 30, cost: (r) => Math.ceil(3 * 1.6 ** r), mods: [flat('productivity', 5)] },
  { id: 'd_xp', name: 'Erinnerung der Sterne', icon: '📜', description: '+20 % Erfahrung pro Rang.', maxRank: 20, cost: (r) => Math.ceil(2 * 1.5 ** r), mods: [inc('xpGain', 20)] },
  { id: 'd_kit', name: 'Vorräte im Frachtraum', icon: '📦', description: 'Starte jedes System mit mehr Gebäuden und Material (pro Rang).', maxRank: 5, cost: (r) => 3 + r * 4 },
  { id: 'd_research', name: 'Archivierte Baupläne', icon: '🗄️', description: 'Grundlegende Forschungen sind nach dem Sprung sofort erforscht (mehr pro Rang).', maxRank: 3, cost: (r) => 5 + r * 10, requires: 'd_kit' },
  { id: 'd_offline', name: 'Ewiger Schichtbetrieb', icon: '🌙', description: '+15 % Offline-Effizienz und +1 Stunde Offline-Zeit pro Rang.', maxRank: 5, cost: (r) => Math.ceil(4 * 1.7 ** r), mods: [inc('offlineEfficiency', 15), inc('offlineCap', 25)] },
  { id: 'd_loot', name: 'Glück der Leere', icon: '🍀', description: '+10 % Beutemenge und Beuteseltenheit pro Rang.', maxRank: 10, cost: (r) => Math.ceil(4 * 1.6 ** r), mods: [flat('lootQuantity', 10), flat('lootRarity', 10)] },
  { id: 'd_energy', name: 'Leerenreaktor', icon: '🔋', description: '+25 % Energie-Reserve und Regeneration pro Rang.', maxRank: 10, cost: (r) => Math.ceil(3 * 1.5 ** r), mods: [inc('energyMax', 25), inc('energyRegen', 25)] },
  { id: 'd_meteor', name: 'Gravitationsanker', icon: '☄️', description: '+20 % Meteoritenhäufigkeit pro Rang.', maxRank: 10, cost: (r) => Math.ceil(3 * 1.5 ** r), mods: [inc('meteorFrequency', 20)] },
  { id: 'd_slots', name: 'Erweiterte Baupläne', icon: '🔩', description: '+1 Modulsockel für alle Fertiger und Bohrer.', maxRank: 1, cost: () => 60, mods: [flat('moduleSlots', 1, ['crafter']), flat('moduleSlots', 1, ['extractor'])], requires: 'd_prod' },
];

export const DARK_BY_ID: Record<string, DarkUpgrade> = Object.fromEntries(DARK_UPGRADES.map((u) => [u.id, u]));

/** Forschungen, die „Archivierte Baupläne“ je Rang mitnimmt. */
export const ARCHIVED_RESEARCH: string[][] = [
  ['automation', 'electricity', 'optics', 'defense'],
  ['logistics', 'electric_mining', 'steel', 'automation_2', 'advanced_smelting', 'logistics_2'],
  ['motors', 'solar', 'fluid_handling', 'lasers', 'threat_analysis', 'rocketry', 'ignis_expedition'],
];

// ---------- Systemmodifikatoren (jedes neue Sternensystem ist anders) ----------

export interface SystemMod {
  id: string;
  name: string;
  mods: Modifier[];
}

export const SYSTEM_MODS: SystemMod[] = [
  { id: 'rich', name: 'Reiche Erzadern: +30 % Bergbau-Produktivität', mods: [flat('productivity', 30, ['extractor'])] },
  { id: 'hot_star', name: 'Heißer Stern: +40 % Solarstrom', mods: [more('powerGen', 40, ['gen_solar'])] },
  { id: 'dense', name: 'Dichte Atmosphäre: −15 % Banddurchsatz', mods: [more('throughput', -15, ['logistics'])] },
  { id: 'hostile', name: 'Feindselige Fauna: Türme +25 % Schaden, Gebäude −20 % Struktur', mods: [inc('damage', 25, ['turret']), more('machineHp', -20)] },
  { id: 'stable', name: 'Stabile Raumzeit: +20 % Laborgeschwindigkeit', mods: [inc('speed', 20, ['lab'])] },
  { id: 'cold', name: 'Kalter Zwergstern: +25 % Stromverbrauch', mods: [inc('power', 25)] },
  { id: 'lucky', name: 'Kometenschauer: +60 % Meteoritenhäufigkeit', mods: [inc('meteorFrequency', 60)] },
  { id: 'ancient', name: 'Uralte Ruinen: +20 % Beutemenge', mods: [flat('lootQuantity', 20)] },
  { id: 'fast', name: 'Hohe Rotation: +15 % Geschwindigkeit, +15 % Stromverbrauch', mods: [inc('speed', 15), inc('power', 15)] },
];

/** Dunkle Energie aus dem Imperiumswert eines Laufs. */
export function darkEnergyFor(value: number): number {
  return Math.floor(Math.sqrt(Math.max(0, value) / 50_000));
}
