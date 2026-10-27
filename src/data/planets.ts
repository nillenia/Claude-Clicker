export interface OreSpec {
  resource: string;
  /** Anzahl Erzfelder auf dem Planeten. */
  patches: number;
  /** Radius der Felder in Kacheln. */
  radius: [number, number];
  /** Garantiertes Feld nahe der Landekapsel. */
  nearStart?: boolean;
}

import type { Modifier } from '../engine/types';

export interface PlanetDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  environment: string;
  width: number;
  height: number;
  ground: [string, string];
  ores: OreSpec[];
  /** Forschung, die den Flug zum Planeten freischaltet. */
  unlock?: string;
  /** Umweltbedingungen (gelten nur auf diesem Planeten). */
  modifiers?: Modifier[];
  /** Häufigkeit von Angriffen (Faktor). */
  threatRate?: number;
  /** Gegner und Boss. */
  enemy: string;
  boss: string;
}

export const PLANET_LIST: readonly PlanetDef[] = [
  {
    id: 'kepler',
    name: 'Kepler-Ödland',
    icon: '🪐',
    description: 'Eine staubige Felswüste. Hier ist deine Rettungskapsel abgestürzt.',
    environment: 'Neutral – keine Besonderheiten.',
    width: 48,
    height: 48,
    ground: ['#2b2620', '#2f2a23'],
    ores: [
      { resource: 'iron_ore', patches: 4, radius: [3, 5], nearStart: true },
      { resource: 'copper_ore', patches: 3, radius: [3, 5], nearStart: true },
      { resource: 'stone', patches: 3, radius: [2, 4], nearStart: true },
      { resource: 'coal', patches: 3, radius: [2, 4], nearStart: true },
    ],
    enemy: 'sandcrawler',
    boss: 'borer',
  },
  {
    id: 'ignis',
    modifiers: [{ stat: 'speed', kind: 'inc', value: -15 }],
    name: 'Ignis',
    icon: '🌋',
    description: 'Ein Vulkanmond voller Lavaseen, Schwefel und Wolfram.',
    environment: 'Hitze: Maschinen arbeiten 15 % langsamer, Geothermie verfügbar.',
    width: 40,
    height: 40,
    ground: ['#2a1612', '#301a14'],
    ores: [
      { resource: 'sulfur', patches: 3, radius: [3, 4], nearStart: true },
      { resource: 'tungsten_ore', patches: 3, radius: [3, 4], nearStart: true },
      { resource: 'lava', patches: 4, radius: [2, 4], nearStart: true },
      { resource: 'coal', patches: 2, radius: [2, 3], nearStart: true },
      { resource: 'iron_ore', patches: 2, radius: [2, 4] },
    ],
    unlock: 'ignis_expedition',
    enemy: 'lavaworm',
    boss: 'magma_queen',
  },
  {
    id: 'cryon',
    modifiers: [{ stat: 'power', kind: 'inc', value: 30 }],
    name: 'Cryon',
    icon: '🧊',
    description: 'Eine gefrorene Welt mit Lithiumadern und Helium-3-Geysiren.',
    environment: 'Kälte: Maschinen verbrauchen 30 % mehr Strom.',
    width: 40,
    height: 40,
    ground: ['#1a2430', '#1d2836'],
    ores: [
      { resource: 'ice', patches: 4, radius: [3, 5], nearStart: true },
      { resource: 'lithium_ore', patches: 3, radius: [3, 4], nearStart: true },
      { resource: 'helium3', patches: 3, radius: [2, 3], nearStart: true },
      { resource: 'copper_ore', patches: 2, radius: [2, 4] },
      { resource: 'stone', patches: 2, radius: [2, 3], nearStart: true },
    ],
    unlock: 'cryon_expedition',
    enemy: 'frostswarm',
    boss: 'glacier_colossus',
  },
  {
    id: 'zephyr',
    modifiers: [{ stat: 'throughput', kind: 'inc', value: 25 }],
    name: 'Zephyr',
    icon: '🌀',
    description: 'Ein Gasriese. Gebaut wird auf schwebenden Plattformen in den Wolken.',
    environment: 'Wenig Platz, aber Stürme treiben die Bänder an: +25 % Bandgeschwindigkeit.',
    width: 28,
    height: 28,
    ground: ['#1c2238', '#202744'],
    ores: [
      { resource: 'hydrogen', patches: 3, radius: [2, 4], nearStart: true },
      { resource: 'plasma', patches: 2, radius: [2, 3], nearStart: true },
    ],
    unlock: 'zephyr_expedition',
    enemy: 'stormspirit',
    boss: 'storm_eye',
  },
  {
    id: 'prisma',
    name: 'Prisma',
    icon: '💎',
    description: 'Eine Welt aus singenden Kristallen.',
    environment: 'Resonanz: Nachbarschafts-Boni sind doppelt so stark.',
    width: 40,
    height: 40,
    ground: ['#221a30', '#271e36'],
    ores: [
      { resource: 'crystal', patches: 4, radius: [3, 4], nearStart: true },
      { resource: 'rare_earth', patches: 3, radius: [2, 4], nearStart: true },
      { resource: 'stone', patches: 2, radius: [2, 3], nearStart: true },
    ],
    unlock: 'prisma_expedition',
    enemy: 'crystal_construct',
    boss: 'shard_lord',
  },
  {
    id: 'verdant',
    threatRate: 2,
    modifiers: [{ stat: 'lootQuantity', kind: 'flat', value: 50 }],
    name: 'Verdant',
    icon: '🌿',
    description: 'Ein Dschungel voller fremdartigen Lebens.',
    environment: 'Wildwuchs: Gegner greifen doppelt so oft an, lassen aber mehr Beute fallen.',
    width: 44,
    height: 44,
    ground: ['#15241a', '#182a1e'],
    ores: [
      { resource: 'biomass', patches: 4, radius: [3, 5], nearStart: true },
      { resource: 'xeno_sample', patches: 3, radius: [2, 3], nearStart: true },
      { resource: 'iron_ore', patches: 2, radius: [2, 4], nearStart: true },
    ],
    unlock: 'verdant_expedition',
    enemy: 'brood',
    boss: 'brood_mother',
  },
  {
    id: 'void',
    modifiers: [
      { stat: 'productivity', kind: 'flat', value: 50 },
      { stat: 'power', kind: 'inc', value: 100 },
    ],
    name: 'Die Leere',
    icon: '🕳️',
    description: 'Ein Riss zwischen den Sternen. Die Physik gilt hier nur bedingt.',
    environment: 'Instabil: alle Maschinen +50 % Produktivität, aber doppelter Stromverbrauch.',
    width: 36,
    height: 36,
    ground: ['#0e0b18', '#120e1e'],
    ores: [
      { resource: 'dark_matter', patches: 3, radius: [2, 3], nearStart: true },
      { resource: 'exotic_matter', patches: 2, radius: [2, 3], nearStart: true },
    ],
    unlock: 'void_expedition',
    enemy: 'void_wraith',
    boss: 'event_horizon',
  },
];

export const PLANETS: Record<string, PlanetDef> = Object.fromEntries(PLANET_LIST.map((p) => [p.id, p]));
