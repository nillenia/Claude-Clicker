import type { DamageType } from './machines';

export type Resists = Partial<Record<DamageType, number>>;

export interface EnemyDef {
  id: string;
  name: string;
  icon: string;
  hp: number;
  /** Felder pro Sekunde. */
  speed: number;
  /** Schaden pro Sekunde an Gebäuden. */
  dps: number;
  resists: Resists;
  /** Größe in Feldern (Radius). */
  size: number;
}

export type BossMechanic = 'burrow' | 'lava' | 'freeze' | 'storm' | 'split' | 'spawn' | 'void';

export interface BossDef extends EnemyDef {
  planet: string;
  mechanic: BossMechanic;
  mechanicText: string;
  /** Gegnertyp, den der Boss beschwört (spawn/split). */
  minion?: string;
}

export const ENEMIES: Record<string, EnemyDef> = Object.fromEntries(
  (
    [
      { id: 'sandcrawler', name: 'Sandkriecher', icon: '🦂', hp: 60, speed: 0.9, dps: 8, resists: { kinetic: 0, thermal: 10 }, size: 0.35 },
      { id: 'lavaworm', name: 'Lavawurm', icon: '🐛', hp: 220, speed: 0.7, dps: 18, resists: { thermal: 75, kinetic: 10 }, size: 0.4 },
      { id: 'frostswarm', name: 'Frostschwarm', icon: '❄️', hp: 140, speed: 1.4, dps: 12, resists: { thermal: -30, em: 40 }, size: 0.3 },
      { id: 'stormspirit', name: 'Sturmgeist', icon: '🌪️', hp: 380, speed: 1.8, dps: 20, resists: { em: 70, kinetic: 30 }, size: 0.35 },
      { id: 'crystal_construct', name: 'Kristallkonstrukt', icon: '🔷', hp: 900, speed: 0.6, dps: 35, resists: { kinetic: 60, plasma: -20 }, size: 0.45 },
      { id: 'brood', name: 'Schwarmbrut', icon: '🕷️', hp: 500, speed: 1.2, dps: 30, resists: { thermal: -20, em: 20 }, size: 0.35 },
      { id: 'void_wraith', name: 'Leerenwesen', icon: '👻', hp: 2500, speed: 1, dps: 80, resists: { kinetic: 50, thermal: 50, em: 50, plasma: 30, void: -50 }, size: 0.4 },
    ] as EnemyDef[]
  ).map((e) => [e.id, e]),
);

export const BOSSES: Record<string, BossDef> = Object.fromEntries(
  (
    [
      {
        id: 'borer', planet: 'kepler', name: 'Der Bohrwurm', icon: '🪱', hp: 6000, speed: 0.5, dps: 60, size: 1.2,
        resists: { kinetic: 20 }, mechanic: 'burrow', mechanicText: 'Gräbt sich regelmäßig ein (unverwundbar) und taucht an anderer Stelle wieder auf.',
      },
      {
        id: 'magma_queen', planet: 'ignis', name: 'Magmakönigin', icon: '🔥', hp: 25000, speed: 0.45, dps: 120, size: 1.3,
        resists: { thermal: 90, kinetic: 20 }, mechanic: 'lava', mechanicText: 'Hinterlässt Lavapfützen, die Gebäude beschädigen.',
      },
      {
        id: 'glacier_colossus', planet: 'cryon', name: 'Der Gletscherkoloss', icon: '🧊', hp: 60000, speed: 0.35, dps: 150, size: 1.5,
        resists: { kinetic: 50, em: 30, thermal: -25 }, mechanic: 'freeze', mechanicText: 'Friert Maschinen in seiner Nähe ein.',
      },
      {
        id: 'storm_eye', planet: 'zephyr', name: 'Auge des Sturms', icon: '🌀', hp: 120000, speed: 0.8, dps: 200, size: 1.4,
        resists: { em: 80, kinetic: 40 }, mechanic: 'storm', mechanicText: 'Ein Sturm senkt die Reichweite aller Türme um 30 %.',
      },
      {
        id: 'shard_lord', planet: 'prisma', name: 'Der Splitterfürst', icon: '💎', hp: 250000, speed: 0.4, dps: 300, size: 1.4,
        resists: { kinetic: 70, plasma: -10 }, mechanic: 'split', minion: 'crystal_construct', mechanicText: 'Zersplittert bei schwerem Schaden in Kristallkonstrukte.',
      },
      {
        id: 'brood_mother', planet: 'verdant', name: 'Brutmutter', icon: '🕸️', hp: 400000, speed: 0.4, dps: 350, size: 1.5,
        resists: { em: 30, thermal: -10 }, mechanic: 'spawn', minion: 'brood', mechanicText: 'Gebiert ständig neue Schwarmbrut.',
      },
      {
        id: 'event_horizon', planet: 'void', name: 'Der Ereignishorizont', icon: '⚫', hp: 1500000, speed: 0.3, dps: 800, size: 1.8,
        resists: { kinetic: 60, thermal: 60, em: 60, plasma: 60, void: 0 }, mechanic: 'void', mechanicText: 'Wechselt alle 10 Sekunden seine Resistenzen.',
      },
    ] as BossDef[]
  ).map((b) => [b.id, b]),
);

// ---------- Bedrohungsstufen (wie Waystones in PoE2) ----------

export interface ThreatModDef {
  id: string;
  text: string;
  /** Zusätzliche Beutemenge in Prozent. */
  loot: number;
  hp?: number;
  dps?: number;
  speed?: number;
  resist?: number;
  /** Bänder auf dem Planeten langsamer (Prozent). */
  beltSlow?: number;
}

export const THREAT_MODS: ThreatModDef[] = [
  { id: 'hp', text: 'Gegner haben 40 % mehr Leben', loot: 20, hp: 40 },
  { id: 'dps', text: 'Gegner verursachen 30 % mehr Schaden', loot: 20, dps: 30 },
  { id: 'speed', text: 'Gegner sind 25 % schneller', loot: 15, speed: 25 },
  { id: 'resist', text: 'Gegner haben +25 % alle Resistenzen', loot: 25, resist: 25 },
  { id: 'belts', text: 'Bänder auf dem Planeten sind 20 % langsamer', loot: 15, beltSlow: 20 },
  { id: 'horde', text: 'Der Boss bringt eine Horde mit', loot: 25 },
];

/** Leben- und Schadensskalierung pro Bedrohungsstufe. */
export function tierScale(tier: number): number {
  return 1.35 ** (tier - 1);
}

export const MAX_THREAT_TIER = 16;
