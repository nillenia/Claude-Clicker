import type { Condition, Modifier, StatId } from '../engine/types';
import type { TreeGroup } from './machines';
import { buildRadialTree, type TreeDef } from './treeTypes';

export const inc = (stat: StatId, value: number, tags?: string[], condition?: Condition): Modifier => ({ stat, kind: 'inc', value, tags, condition });
export const flat = (stat: StatId, value: number, tags?: string[], condition?: Condition): Modifier => ({ stat, kind: 'flat', value, tags, condition });
export const more = (stat: StatId, value: number, tags?: string[], condition?: Condition): Modifier => ({ stat, kind: 'more', value, tags, condition });

const adj = (tag: string, max = 4): Condition => ({ kind: 'perAdjacent', tag, max });

const D = ['drill'];
const P = ['pump'];
const F = ['furnace'];
const A = ['assembler'];
const C = ['chemical'];
const L = ['lab'];
const G = ['generator'];
const LG = ['logistics'];
const BELT = ['belt'];
const TERM = ['terminal'];
const T = ['turret'];
const HAND = ['hand'];

export const MACHINE_TREES: Record<TreeGroup, TreeDef> = {
  drill: buildRadialTree({
    id: 'drill',
    name: 'Bohrer & Pumpen',
    rings: [3, 6],
    startMods: [inc('speed', 5, D)],
    branches: [
      {
        key: 'speed', name: 'Bohrgeschwindigkeit', angle: -90, length: 9,
        small: [[inc('speed', 8, D)], [inc('speed', 6, D), inc('power', 4, D)]],
        notables: [
          { at: 4, name: 'Resonanzbohrung', mods: [inc('speed', 12, D, adj('drill'))] },
          { at: 7, name: 'Diamantköpfe', mods: [inc('speed', 30, D), inc('machineHp', 20, D)] },
        ],
        keystone: { name: 'Überlastbohrer', mods: [more('speed', 100, D)], flags: ['overloadDrill'], description: 'Bohrer fallen alle 60 Sekunden für 5 Sekunden aus.' },
        spur: { from: 2, side: -1, name: 'Bohrkollektiv', mods: [inc('speed', 5, D, { kind: 'perAdjacent', tag: '$same', max: 8 })] },
      },
      {
        key: 'yield', name: 'Ertrag', angle: 0, length: 9,
        small: [[flat('productivity', 4, D)], [flat('critChance', 2, D)]],
        notables: [
          { at: 4, name: 'Tiefe Adern', mods: [flat('critChance', 10, D), flat('critMulti', 50, D)] },
          { at: 7, name: 'Erzsieb', mods: [flat('productivity', 15, D)] },
        ],
        keystone: { name: 'Planetenkern', mods: [more('speed', -40, D)], flags: ['planetCore'], description: 'Bohrer dürfen überall stehen und fördern das nächstgelegene Erz.' },
      },
      {
        key: 'eff', name: 'Effizienz', angle: 90, length: 8,
        small: [[inc('power', -6, D)], [inc('machineHp', 10, D)]],
        notables: [
          { at: 4, name: 'Sparsame Motoren', mods: [more('power', -25, D)] },
        ],
        keystone: { name: 'Erdwärmebohrer', mods: [more('power', -100, D), more('speed', -20, D)], description: 'Bohrer brauchen keinen Strom, arbeiten aber langsamer.' },
        spur: { from: 3, side: 1, name: 'Verstärkte Gehäuse', mods: [inc('machineHp', 60, D)] },
      },
      {
        key: 'pump', name: 'Pumpen', angle: 180, length: 7,
        small: [[inc('speed', 10, P)], [flat('productivity', 4, P)]],
        notables: [
          { at: 3, name: 'Druckkammern', mods: [flat('productivity', 25, P)] },
          { at: 7, name: 'Hochdruckpumpen', mods: [more('speed', 40, P), inc('power', 30, P)] },
        ],
      },
    ],
  }),

  furnace: buildRadialTree({
    id: 'furnace',
    name: 'Öfen',
    rings: [3, 6],
    startMods: [inc('speed', 5, F)],
    branches: [
      {
        key: 'speed', name: 'Schmelztempo', angle: -90, length: 9,
        small: [[inc('speed', 8, F)], [inc('speed', 5, F), flat('critChance', 1, F)]],
        notables: [
          { at: 4, name: 'Glutkern', mods: [inc('speed', 30, F), inc('power', 20, F)] },
          { at: 7, name: 'Schmelzverbund', mods: [inc('speed', 10, F, adj('furnace'))] },
        ],
        keystone: { name: 'Abwärmenutzung', mods: [more('speed', 15, F)], flags: ['wasteHeat'], description: 'Arbeitende Öfen speisen 150 kW × Stufe ins Stromnetz ein.' },
      },
      {
        key: 'yield', name: 'Ausbeute', angle: 0, length: 9,
        small: [[flat('productivity', 3, F)], [flat('critChance', 2, F)]],
        notables: [
          { at: 4, name: 'Legierungsmeister', mods: [flat('productivity', 100, ['furnace', 'res:steel'])] },
          { at: 7, name: 'Reine Schmelze', mods: [flat('productivity', 12, F), flat('critMulti', 50, F)] },
        ],
        keystone: { name: 'Schlackefrei', mods: [flat('productivity', 40, F), more('speed', -30, F)], description: 'Viel mehr Ausbeute, aber deutlich langsamer.' },
        spur: { from: 2, side: 1, name: 'Edelmetallabscheider', mods: [flat('critChance', 12, F)] },
      },
      {
        key: 'eff', name: 'Isolierung', angle: 90, length: 7,
        small: [[inc('power', -6, F)], [inc('speed', 4, F)]],
        notables: [{ at: 4, name: 'Doppelwandig', mods: [more('power', -20, F), inc('speed', 10, F)] }],
      },
      {
        key: 'tier', name: 'Hochöfen', angle: 180, length: 7,
        small: [[inc('speed', 10, ['furnace', 'electric'])]],
        notables: [
          { at: 3, name: 'Lichtbogenstabilisator', mods: [more('speed', 25, ['furnace_arc'])] },
          { at: 6, name: 'Sternenfeuer', mods: [more('speed', 40, ['furnace_star']), flat('productivity', 10, ['furnace_star'])] },
        ],
      },
    ],
  }),

  assembler: buildRadialTree({
    id: 'assembler',
    name: 'Fertigung',
    rings: [3, 6],
    startMods: [inc('speed', 5, A)],
    branches: [
      {
        key: 'speed', name: 'Taktung', angle: -90, length: 9,
        small: [[inc('speed', 8, A)], [inc('speed', 5, A), inc('speed', 5, C)]],
        notables: [
          { at: 4, name: 'Taktstraße', mods: [inc('speed', 15, A, adj('assembler'))] },
          { at: 7, name: 'Servomotoren', mods: [inc('speed', 35, A)] },
        ],
        keystone: { name: 'Fließband-Doktrin', mods: [more('speed', 80, A), more('power', 100, A)], description: 'Viel schneller, aber doppelter Stromverbrauch.' },
      },
      {
        key: 'quality', name: 'Präzision', angle: 0, length: 9,
        small: [[flat('productivity', 3, A)], [flat('critChance', 2, A)]],
        notables: [
          { at: 4, name: 'Präzisionswerkzeuge', mods: [flat('productivity', 15, A)] },
          { at: 7, name: 'Qualitätskontrolle', mods: [flat('critChance', 10, A), flat('critMulti', 75, A)] },
        ],
        keystone: { name: 'Meisterwerk', mods: [flat('critChance', 25, A), flat('critMulti', 200, A), more('speed', -30, A)], description: 'Seltene, aber gewaltige Krit-Produktion.' },
        spur: { from: 3, side: -1, name: 'Ausschussrecycling', mods: [flat('productivity', 10, A), flat('productivity', 10, C)] },
      },
      {
        key: 'chem', name: 'Chemie', angle: 90, length: 8,
        small: [[inc('speed', 12, C)], [flat('productivity', 4, C)]],
        notables: [
          { at: 4, name: 'Katalysatoren', mods: [flat('productivity', 25, C)] },
          { at: 8, name: 'Molekularsynthese', mods: [more('speed', 40, C)] },
        ],
      },
      {
        key: 'eff', name: 'Effizienz', angle: 180, length: 7,
        small: [[inc('power', -6, A)], [inc('power', -6, C)]],
        notables: [{ at: 4, name: 'Energierückgewinnung', mods: [more('power', -25, A), more('power', -25, C)] }],
      },
    ],
  }),

  lab: buildRadialTree({
    id: 'lab',
    name: 'Labore',
    rings: [3],
    startMods: [inc('speed', 5, L)],
    branches: [
      {
        key: 'speed', name: 'Rechenleistung', angle: -90, length: 8,
        small: [[inc('speed', 10, L)]],
        notables: [
          { at: 3, name: 'Parallelrechner', mods: [inc('speed', 15, L, adj('lab'))] },
          { at: 6, name: 'Supraleiter', mods: [inc('speed', 40, L)] },
        ],
        keystone: { name: 'Singularitätsforschung', mods: [more('speed', 150, L), more('power', 200, L)], description: 'Forschung rast, aber der Stromverbrauch verdreifacht sich.' },
      },
      {
        key: 'data', name: 'Datenkompression', angle: 30, length: 8,
        small: [[flat('productivity', 5, L)]],
        notables: [
          { at: 4, name: 'Datenkompression', mods: [flat('productivity', 25, L)] },
          { at: 8, name: 'Geniestreich', mods: [flat('critChance', 15, L), flat('critMulti', 100, L)] },
        ],
      },
      {
        key: 'mentor', name: 'Lehre', angle: 150, length: 7,
        small: [[inc('xpGain', 4)]],
        notables: [
          { at: 3, name: 'Lehrmeister', mods: [inc('xpGain', 15)] },
          { at: 7, name: 'Akademie', mods: [inc('xpGain', 30), inc('power', -20, L)] },
        ],
      },
    ],
  }),

  generator: buildRadialTree({
    id: 'generator',
    name: 'Energie',
    rings: [3, 6],
    startMods: [inc('powerGen', 5)],
    branches: [
      {
        key: 'out', name: 'Leistung', angle: -90, length: 9,
        small: [[inc('powerGen', 8)]],
        notables: [
          { at: 4, name: 'Hochspannung', mods: [inc('powerGen', 30)] },
          { at: 7, name: 'Kraftwerksverbund', mods: [inc('powerGen', 10, G, adj('generator'))] },
        ],
        keystone: { name: 'Überlastnetz', mods: [more('speed', 50, ['electric'])], flags: ['overloadGrid'], description: 'Strommangel bremst nicht mehr, sondern beschädigt elektrische Maschinen.' },
      },
      {
        key: 'fuel', name: 'Brennstoff', angle: 0, length: 7,
        small: [[inc('fuelUse', -8)]],
        notables: [
          { at: 3, name: 'Brennkammer', mods: [more('fuelUse', -30)] },
          { at: 7, name: 'Kohleverflüssigung', mods: [more('powerGen', 40, ['gen_coal'])] },
        ],
      },
      {
        key: 'solar', name: 'Sonnenenergie', angle: 90, length: 7,
        small: [[inc('powerGen', 15, ['gen_solar'])]],
        notables: [
          { at: 3, name: 'Sonnensegel', mods: [more('powerGen', 50, ['gen_solar'])] },
          { at: 7, name: 'Dyson-Fragment', mods: [more('powerGen', 100, ['gen_solar'])] },
        ],
      },
      {
        key: 'heavy', name: 'Schwerkraftwerke', angle: 180, length: 7,
        small: [[inc('powerGen', 12, ['gen_geo'])], [inc('powerGen', 12, ['gen_fusion'])]],
        notables: [
          { at: 4, name: 'Magmaturbinen', mods: [more('powerGen', 40, ['gen_geo'])] },
          { at: 7, name: 'Plasmaeinschluss', mods: [more('powerGen', 40, ['gen_fusion']), more('fuelUse', -25, ['gen_fusion'])] },
        ],
      },
    ],
  }),

  logistics: buildRadialTree({
    id: 'logistics',
    name: 'Logistik',
    rings: [3, 6],
    startMods: [inc('throughput', 5, LG)],
    branches: [
      {
        key: 'belt', name: 'Bandtechnik', angle: -90, length: 9,
        small: [[inc('throughput', 10, LG)]],
        notables: [
          { at: 4, name: 'Hochgeschwindigkeitsrollen', mods: [inc('throughput', 50, BELT)] },
          { at: 7, name: 'Stapelgreifer', mods: [more('throughput', 50, LG)] },
        ],
        keystone: { name: 'Quantenförderung', mods: [more('throughput', 200, LG), more('speed', -10, ['crafter'])], description: 'Bänder werden extrem schnell, Fertiger etwas langsamer.' },
      },
      {
        key: 'term', name: 'Terminals', angle: 0, length: 7,
        small: [[inc('throughput', 25, TERM)]],
        notables: [
          { at: 3, name: 'Lagerlogistik', mods: [more('throughput', 100, TERM)] },
          { at: 7, name: 'Hochregal', mods: [more('throughput', 200, TERM)] },
        ],
      },
      {
        key: 'hand', name: 'Feldausrüstung', angle: 90, length: 8,
        small: [[inc('handCraft', 10, HAND)], [flat('handMine', 1, HAND)]],
        notables: [
          { at: 4, name: 'Taschenfabrik', mods: [inc('handCraft', 50, HAND), flat('handMine', 2, HAND)] },
          { at: 8, name: 'Nanowerkzeug', mods: [more('handCraft', 100, HAND), more('handMine', 100, HAND)] },
        ],
      },
      {
        key: 'cargo', name: 'Fracht', angle: 180, length: 7,
        small: [[inc('cargoCapacity', 10)]],
        notables: [
          { at: 3, name: 'Frachtoptimierung', mods: [inc('cargoCapacity', 40)] },
          { at: 7, name: 'Hyperraumcontainer', mods: [more('cargoCapacity', 100)] },
        ],
      },
    ],
  }),

  turret: buildRadialTree({
    id: 'turret',
    name: 'Verteidigung',
    rings: [3, 6],
    startMods: [inc('damage', 5, T)],
    branches: [
      {
        key: 'dmg', name: 'Feuerkraft', angle: -90, length: 9,
        small: [[inc('damage', 10, T)]],
        notables: [
          { at: 4, name: 'Panzerbrechend', mods: [flat('penetration', 15, T)] },
          { at: 7, name: 'Überladene Kondensatoren', mods: [inc('damage', 40, T), inc('power', 30, T)] },
        ],
        keystone: { name: 'Kettenblitz', mods: [more('damage', 30, ['turret', 'dmg:em'])], flags: ['chainLightning'], description: 'EM-Treffer springen auf bis zu 3 weitere Gegner über.' },
      },
      {
        key: 'rate', name: 'Feuerrate', angle: 0, length: 8,
        small: [[inc('fireRate', 8, T)]],
        notables: [
          { at: 4, name: 'Schnellfeuer', mods: [inc('fireRate', 30, T), inc('ammoUse', 20, T)] },
          { at: 8, name: 'Gatling-Protokoll', mods: [more('fireRate', 50, T), more('damage', -15, T)] },
        ],
      },
      {
        key: 'range', name: 'Zielerfassung', angle: 90, length: 7,
        small: [[inc('range', 6, T)]],
        notables: [
          { at: 3, name: 'Weitblick', mods: [inc('range', 25, T)] },
          { at: 7, name: 'Orbitalzielerfassung', mods: [more('range', 30, T), more('damage', 10, T)] },
        ],
      },
      {
        key: 'armor', name: 'Panzerung', angle: 180, length: 7,
        small: [[inc('machineHp', 15, T)], [inc('machineHp', 8)]],
        notables: [
          { at: 3, name: 'Bollwerk', mods: [inc('machineHp', 50)] },
          { at: 7, name: 'Selbstreparatur', mods: [inc('machineHp', 30), flat('critChance', 5, T)] },
        ],
      },
    ],
  }),
};

export const MACHINE_TREE_ORDER: TreeGroup[] = ['drill', 'furnace', 'assembler', 'lab', 'generator', 'logistics', 'turret'];
