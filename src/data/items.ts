import type { Flag, Modifier, ModKind, StatId } from '../engine/types';

export type ItemSlot = 'module' | 'jewel' | 'artifact';
export type Rarity = 'normal' | 'magic' | 'rare' | 'legendary' | 'unique';

export const RARITY_NAMES: Record<Rarity, string> = {
  normal: 'Normal',
  magic: 'Verbessert',
  rare: 'Selten',
  legendary: 'Legendär',
  unique: 'Einzigartig',
};

export const RARITY_COLORS: Record<Rarity, string> = {
  normal: '#c8d2de',
  magic: '#6aa8ff',
  rare: '#ffd24d',
  legendary: '#ff8a3d',
  unique: '#c58bff',
};

// ---------- Grundtypen ----------

export interface ItemBase {
  id: string;
  name: string;
  slot: ItemSlot;
  icon: string;
  /** Eingebauter Effekt, skaliert mit der Modulstufe. */
  implicit: { stat: StatId; kind: ModKind; value: number; tags?: string[] }[];
}

export const BASES: Record<string, ItemBase> = Object.fromEntries(
  (
    [
      { id: 'mod_speed', name: 'Geschwindigkeitsmodul', slot: 'module', icon: '⏩', implicit: [{ stat: 'speed', kind: 'inc', value: 10 }] },
      { id: 'mod_prod', name: 'Produktivitätsmodul', slot: 'module', icon: '➕', implicit: [{ stat: 'productivity', kind: 'flat', value: 4 }] },
      { id: 'mod_eff', name: 'Effizienzmodul', slot: 'module', icon: '🔋', implicit: [{ stat: 'power', kind: 'inc', value: -15 }] },
      { id: 'mod_crit', name: 'Krit-Modul', slot: 'module', icon: '✴️', implicit: [{ stat: 'critChance', kind: 'flat', value: 4 }] },
      { id: 'mod_def', name: 'Verteidigungsmodul', slot: 'module', icon: '🛡️', implicit: [{ stat: 'damage', kind: 'inc', value: 12 }, { stat: 'machineHp', kind: 'inc', value: 15 }] },
      { id: 'jewel', name: 'Juwel', slot: 'jewel', icon: '💠', implicit: [] },
      { id: 'artifact', name: 'Artefakt', slot: 'artifact', icon: '🏺', implicit: [] },
    ] as ItemBase[]
  ).map((b) => [b.id, b]),
);

export const MODULE_BASES = ['mod_speed', 'mod_prod', 'mod_eff', 'mod_crit', 'mod_def'];

/** Modulstufe (Mk I–V) aus dem Item-Level. */
export function moduleTier(ilvl: number): number {
  return ilvl >= 70 ? 5 : ilvl >= 45 ? 4 : ilvl >= 25 ? 3 : ilvl >= 10 ? 2 : 1;
}

// ---------- Affixe ----------

export interface AffixDef {
  id: string;
  kind: 'prefix' | 'suffix';
  name: string;
  stat: StatId;
  modKind: ModKind;
  /** Wertebereich der schlechtesten Stufe; höhere Stufen skalieren. */
  range: [number, number];
  tags?: string[];
  condition?: Modifier['condition'];
  /** Für welche Grundtypen das Affix rollen kann. */
  slots: ItemSlot[];
  weight: number;
}

/** Stufen-Skalierung (T6 schlecht … T1 gut) und benötigtes Item-Level. */
export const TIER_SCALE = [1, 1.6, 2.4, 3.4, 4.6, 6];
export const TIER_ILVL = [1, 8, 18, 32, 50, 75];

const affix = (
  id: string,
  kind: 'prefix' | 'suffix',
  name: string,
  stat: StatId,
  modKind: ModKind,
  range: [number, number],
  slots: ItemSlot[],
  extra: Partial<AffixDef> = {},
): AffixDef => ({ id, kind, name, stat, modKind, range, slots, weight: 100, ...extra });

const MJ: ItemSlot[] = ['module', 'jewel'];
const M: ItemSlot[] = ['module'];
const J: ItemSlot[] = ['jewel'];

export const AFFIXES: AffixDef[] = [
  // Präfixe (Module + Juwelen)
  affix('p_speed', 'prefix', 'Schnelles', 'speed', 'inc', [5, 8], MJ),
  affix('p_prod', 'prefix', 'Ertragreiches', 'productivity', 'flat', [2, 3], MJ, { weight: 70 }),
  affix('p_critmulti', 'prefix', 'Präzises', 'critMulti', 'flat', [15, 25], MJ),
  affix('p_power', 'prefix', 'Sparsames', 'power', 'inc', [-8, -5], MJ),
  affix('p_hp', 'prefix', 'Robustes', 'machineHp', 'inc', [10, 16], MJ),
  affix('p_dmg', 'prefix', 'Verheerendes', 'damage', 'inc', [8, 12], MJ, { tags: ['turret'] }),
  affix('p_gen', 'prefix', 'Geladenes', 'powerGen', 'inc', [5, 8], MJ, { tags: ['generator'] }),
  affix('p_more_speed', 'prefix', 'Übertaktetes', 'speed', 'more', [3, 5], M, { weight: 30 }),
  // Suffixe
  affix('s_crit', 'suffix', 'des Glücks', 'critChance', 'flat', [2, 3], MJ),
  affix('s_res', 'suffix', 'der Resonanz', 'speed', 'inc', [2, 3], M, { condition: { kind: 'perAdjacent', tag: '$same', max: 4 } }),
  affix('s_abund', 'suffix', 'des Überflusses', 'productivity', 'flat', [1, 1.5], M, { condition: { kind: 'perAdjacent', tag: 'any', max: 4 }, weight: 60 }),
  affix('s_range', 'suffix', 'der Reichweite', 'range', 'inc', [6, 10], MJ, { tags: ['turret'] }),
  affix('s_rate', 'suffix', 'des Feuers', 'fireRate', 'inc', [5, 8], MJ, { tags: ['turret'] }),
  affix('s_pen', 'suffix', 'der Durchdringung', 'penetration', 'flat', [3, 5], MJ, { tags: ['turret'] }),
  affix('s_fuel', 'suffix', 'der Ausdauer', 'fuelUse', 'inc', [-8, -5], MJ, { tags: ['generator'] }),
  affix('s_throughput', 'suffix', 'des Flusses', 'throughput', 'inc', [6, 10], J, { tags: ['logistics'] }),
  // Juwel-exklusiv (wirken global auf Maschinentypen)
  affix('j_drill', 'prefix', 'Bohrendes', 'speed', 'inc', [4, 6], J, { tags: ['drill'] }),
  affix('j_furnace', 'prefix', 'Glühendes', 'speed', 'inc', [4, 6], J, { tags: ['furnace'] }),
  affix('j_assembler', 'prefix', 'Montierendes', 'speed', 'inc', [4, 6], J, { tags: ['assembler'] }),
  affix('j_lab', 'prefix', 'Forschendes', 'speed', 'inc', [5, 8], J, { tags: ['lab'] }),
  affix('j_xp', 'suffix', 'der Lehre', 'xpGain', 'inc', [4, 6], J),
  affix('j_skill', 'suffix', 'der Macht', 'skillEffect', 'inc', [4, 6], J),
  affix('j_loot', 'suffix', 'des Plünderers', 'lootQuantity', 'flat', [3, 5], J),
  affix('j_rarity', 'suffix', 'des Sammlers', 'lootRarity', 'flat', [3, 5], J),
];

export const AFFIX_BY_ID: Record<string, AffixDef> = Object.fromEntries(AFFIXES.map((a) => [a.id, a]));

/** Härtung (D4 Tempering): gezielte Kategorie, zusätzliches Affix außerhalb der Grenzen. */
export const TEMPER_CATEGORIES: { id: string; name: string; affixes: string[] }[] = [
  { id: 'production', name: 'Produktion', affixes: ['p_speed', 'p_prod', 's_crit'] },
  { id: 'efficiency', name: 'Effizienz', affixes: ['p_power', 's_fuel', 'p_gen'] },
  { id: 'warfare', name: 'Kriegsführung', affixes: ['p_dmg', 's_rate', 's_pen', 's_range'] },
  { id: 'synergy', name: 'Synergie', affixes: ['s_res', 's_abund'] },
];

// ---------- Aspekte (legendäre Kräfte) ----------

export interface AspectDef {
  id: string;
  name: string;
  mods: Modifier[];
  flags?: Flag[];
  description?: string;
}

const mod = (stat: StatId, kind: ModKind, value: number, tags?: string[], condition?: Modifier['condition']): Modifier => ({ stat, kind, value, tags, condition });

export const ASPECTS: Record<string, AspectDef> = Object.fromEntries(
  (
    [
      { id: 'a_chain', name: 'Aspekt der Kettenfertigung', mods: [mod('productivity', 'flat', 6, undefined, { kind: 'perAdjacent', tag: '$same', max: 4 })] },
      { id: 'a_storm', name: 'Aspekt des Sturmlaufs', mods: [mod('speed', 'more', 40), mod('power', 'more', 40)] },
      { id: 'a_greed', name: 'Aspekt der Gier', mods: [mod('critChance', 'flat', 15), mod('critMulti', 'flat', 100)] },
      { id: 'a_guard', name: 'Aspekt des Wächters', mods: [mod('damage', 'more', 50, ['turret']), mod('machineHp', 'more', 30)] },
      { id: 'a_eff', name: 'Aspekt der Effizienz', mods: [mod('power', 'more', -50)] },
      { id: 'a_abund', name: 'Aspekt des Überflusses', mods: [mod('productivity', 'flat', 25)] },
      { id: 'a_solitude', name: 'Aspekt der Einsamkeit', mods: [mod('speed', 'more', 80, undefined, { kind: 'noAdjacent', tag: 'any' })] },
      { id: 'a_hive', name: 'Aspekt des Bienenstocks', mods: [mod('speed', 'inc', 15, undefined, { kind: 'perAdjacent', tag: 'any', max: 6 })] },
    ] as AspectDef[]
  ).map((a) => [a.id, a]),
);

// ---------- Einzigartige Items ----------

export interface UniqueDef {
  id: string;
  name: string;
  base: string;
  flavor: string;
  mods: Modifier[];
  flags?: Flag[];
  description?: string;
  /** Boss, bei dem das Item fällt (sonst Meteoriten). */
  boss?: string;
}

export const UNIQUES: Record<string, UniqueDef> = Object.fromEntries(
  (
    [
      {
        id: 'u_borer_tooth', name: 'Zahn des Bohrwurms', base: 'mod_prod', boss: 'borer',
        flavor: 'Er fraß sich durch Berge. Jetzt frisst er für dich.',
        mods: [mod('productivity', 'flat', 100, ['extractor']), mod('power', 'more', 100)],
        description: 'Bohrer fördern doppelt, verbrauchen aber doppelt Strom.',
      },
      {
        id: 'u_magma_heart', name: 'Herz der Magmakönigin', base: 'artifact', boss: 'magma_queen',
        flavor: 'Es schlägt noch.',
        mods: [mod('power', 'more', -100, ['furnace', 'planet:ignis']), mod('speed', 'inc', 25, ['furnace'])],
        description: 'Öfen auf Ignis brauchen keinen Strom.',
      },
      {
        id: 'u_eternal_ice', name: 'Ewiges Eis', base: 'mod_eff', boss: 'glacier_colossus',
        flavor: 'Kälter als der Raum zwischen den Sternen.',
        mods: [mod('speed', 'more', 50, undefined, { kind: 'minAdjacent', tag: 'furnace', count: 1 }), mod('power', 'inc', -30), mod('machineHp', 'more', 100)],
        description: '+50 % mehr Geschwindigkeit, wenn ein Ofen angrenzt.',
      },
      {
        id: 'u_storm_core', name: 'Sturmkern', base: 'artifact', boss: 'storm_eye',
        flavor: 'Im Auge des Sturms ist es nie still.',
        mods: [mod('throughput', 'more', 100, ['logistics']), mod('cargoCapacity', 'more', 50)],
      },
      {
        id: 'u_prism_shard', name: 'Prismensplitter', base: 'jewel', boss: 'shard_lord',
        flavor: 'Er singt in allen Farben.',
        mods: [mod('speed', 'inc', 5)],
        flags: ['prismShard'],
        description: 'Nachbarschafts-Boni sind überall doppelt so stark.',
      },
      {
        id: 'u_living_alloy', name: 'Lebende Legierung', base: 'mod_def', boss: 'brood_mother',
        flavor: 'Sie wächst. Sie lernt.',
        mods: [mod('moduleSlots', 'flat', 2), mod('productivity', 'flat', 30), mod('machineHp', 'more', 50)],
        description: 'Gibt der Maschine 2 zusätzliche Modulsockel.',
      },
      {
        id: 'u_singularity', name: 'Singularität', base: 'artifact', boss: 'event_horizon',
        flavor: 'Alles ist mit allem verbunden.',
        mods: [mod('speed', 'more', 20)],
        flags: ['singularity'],
        description: 'Jede Maschine zählt 2 zusätzliche angrenzende Gebäude jeder Art.',
      },
      {
        id: 'u_pioneer_oil', name: 'Ölkännchen des Pioniers', base: 'mod_speed',
        flavor: 'Ein Tropfen, und alles läuft wie geschmiert.',
        mods: [mod('speed', 'inc', 30), mod('productivity', 'flat', 10)],
      },
      {
        id: 'u_quantum_clock', name: 'Quantenuhr', base: 'artifact',
        flavor: 'Sie geht immer richtig – nur nicht hier.',
        mods: [mod('cooldownRecovery', 'inc', 30), mod('offlineEfficiency', 'inc', 20), mod('offlineCap', 'inc', 50)],
      },
      {
        id: 'u_void_compass', name: 'Kompass der Leere', base: 'jewel',
        flavor: 'Er zeigt immer dorthin, wo nichts ist.',
        mods: [mod('speed', 'inc', 10), mod('power', 'inc', 10), mod('lootRarity', 'flat', 10)],
      },
    ] as UniqueDef[]
  ).map((u) => [u.id, u]),
);

// ---------- Crafting-Währung ----------

export interface CurrencyDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  /** Relative Häufigkeit beim Drop. */
  weight: number;
}

export const CURRENCIES: CurrencyDef[] = [
  { id: 'c_transmute', name: 'Kalibrierchip', icon: '🔹', description: 'Verwandelt ein normales Modul in ein verbessertes.', weight: 100 },
  { id: 'c_augment', name: 'Erweiterungskern', icon: '🔸', description: 'Fügt einem verbesserten Modul ein Affix hinzu.', weight: 80 },
  { id: 'c_alchemy', name: 'Fusionskatalysator', icon: '⚗️', description: 'Verwandelt ein normales Modul in ein seltenes.', weight: 40 },
  { id: 'c_chaos', name: 'Chaos-Plasma', icon: '🌀', description: 'Würfelt alle Affixe eines seltenen Moduls neu.', weight: 30 },
  { id: 'c_divine', name: 'Quanten-Feinjustierung', icon: '✨', description: 'Würfelt die Werte aller Affixe innerhalb ihrer Stufen neu.', weight: 10 },
  { id: 'c_annul', name: 'Annullierungsfeld', icon: '⛔', description: 'Entfernt ein zufälliges Affix.', weight: 25 },
  { id: 'c_exalt', name: 'Singularitätskern', icon: '🌟', description: 'Fügt einem seltenen Modul ein Affix hinzu.', weight: 8 },
  { id: 'c_temper', name: 'Härtungsmittel', icon: '🔥', description: 'Fügt ein gehärtetes Affix einer gewählten Kategorie hinzu (max. 2).', weight: 20 },
  { id: 'c_masterwork', name: 'Meisterkalibrierung', icon: '🛠️', description: 'Verstärkt alle Affixwerte um weitere 10 % (max. 5 Stufen).', weight: 15 },
  { id: 'c_scour', name: 'Neutralisator', icon: '🧽', description: 'Entfernt alle Affixe – das Modul wird wieder normal.', weight: 30 },
  { id: 'c_essence', name: 'Aspekt-Essenz', icon: '🧪', description: 'Wird benötigt, um einen Aspekt aus dem Kodex aufzuprägen.', weight: 20 },
];

export const CURRENCY_BY_ID: Record<string, CurrencyDef> = Object.fromEntries(CURRENCIES.map((c) => [c.id, c]));

/** Essenz-Kosten zum Aufprägen eines Aspekts. */
export const IMPRINT_COST = 3;
