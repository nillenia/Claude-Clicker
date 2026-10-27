import type { Flag, Modifier } from '../engine/types';
import { flat, inc, more } from './machineTrees';
import { buildRadialTree, finalizeTree, type TreeDef, type TreeNode } from './treeTypes';

export interface ClassDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  angle: number;
  color: string;
  ascendancies: [string, string];
}

export const CLASSES: ClassDef[] = [
  { id: 'engineer', name: 'Ingenieur', icon: '🔧', description: 'Produktivität und Effizienz aller Fertiger.', angle: -90, color: '#4fd1ff', ascendancies: ['chief', 'purist'] },
  { id: 'prospector', name: 'Prospektor', icon: '⛏️', description: 'Abbau, Pumpen und Planeten.', angle: -18, color: '#e8a24f', ascendancies: ['deepminer', 'planetbreaker'] },
  { id: 'logistician', name: 'Logistiker', icon: '📦', description: 'Bänder, Terminals, Fracht und Handarbeit.', angle: 54, color: '#5be08a', ascendancies: ['architect', 'baron'] },
  { id: 'warlord', name: 'Kriegsherr', icon: '🛡️', description: 'Verteidigung, Bosse und Beute.', angle: 126, color: '#ff6b6b', ascendancies: ['fortress', 'orbital'] },
  { id: 'quantum', name: 'Quantentechniker', icon: '🌌', description: 'Aktive Skills, Energie und Forschung.', angle: 198, color: '#b388ff', ascendancies: ['timeweaver', 'voidcaller'] },
];

export const CLASS_BY_ID: Record<string, ClassDef> = Object.fromEntries(CLASSES.map((c) => [c.id, c]));

const CRAFT = ['crafter'];
const EXTR = ['extractor'];
const LG = ['logistics'];
const T = ['turret'];
const HAND = ['hand'];

interface Theme {
  small: Modifier[][];
  core: { name: string; mods: Modifier[] };
  notables: { name: string; mods: Modifier[] }[];
  keystone: { name: string; mods: Modifier[]; flags?: Flag[]; description: string };
  mastery: { name: string; mods: Modifier[] }[];
}

const THEMES: Record<string, Theme> = {
  engineer: {
    small: [[flat('productivity', 2, CRAFT)], [inc('speed', 5, CRAFT)], [inc('power', -4)], [flat('critChance', 1, CRAFT)]],
    core: { name: 'Ingenieursdiplom', mods: [flat('productivity', 6, CRAFT), inc('speed', 10, CRAFT)] },
    notables: [
      { name: 'Wartungsprotokolle', mods: [inc('speed', 20, CRAFT), inc('machineHp', 25)] },
      { name: 'Toleranzfreie Fertigung', mods: [flat('productivity', 12, CRAFT)] },
      { name: 'Sparschaltung', mods: [more('power', -15)] },
      { name: 'Nachbearbeitung', mods: [flat('critChance', 8, CRAFT), flat('critMulti', 60, CRAFT)] },
      { name: 'Generalüberholung', mods: [inc('speed', 15), inc('power', -10)] },
    ],
    keystone: { name: 'Kein Abfall', mods: [flat('critChance', 15)], flags: ['noWaste'], description: 'Produktivität ist immer 0. Krit-Produktion erhält +100 % Multiplikator.' },
    mastery: [
      { name: 'Präzision', mods: [flat('productivity', 10, CRAFT)] },
      { name: 'Tempo', mods: [inc('speed', 25, CRAFT)] },
      { name: 'Sparsamkeit', mods: [more('power', -20, CRAFT)] },
    ],
  },
  prospector: {
    small: [[inc('speed', 6, EXTR)], [flat('productivity', 3, EXTR)], [flat('handMine', 1, HAND)], [inc('speed', 8, ['pump'])]],
    core: { name: 'Geologenblick', mods: [inc('speed', 15, EXTR), flat('productivity', 5, EXTR)] },
    notables: [
      { name: 'Ader-Instinkt', mods: [flat('critChance', 10, EXTR), flat('critMulti', 50, EXTR)] },
      { name: 'Schwerlastbohrer', mods: [inc('speed', 30, EXTR), inc('power', 15, EXTR)] },
      { name: 'Spitzhacke des Pioniers', mods: [more('handMine', 200, HAND)] },
      { name: 'Planetenkartografie', mods: [flat('productivity', 12, EXTR)] },
      { name: 'Tiefendruck', mods: [inc('speed', 20, EXTR, { kind: 'perAdjacent', tag: '$same', max: 3 })] },
    ],
    keystone: { name: 'Monokultur', mods: [more('speed', 150, ['drill']), more('speed', 150, ['furnace']), more('speed', 150, ['assembler']), more('speed', 150, ['lab'])], flags: ['monoculture'], description: 'Auf jedem Planeten arbeitet nur der häufigste Produktionstyp – dieser aber mit 150 % mehr Geschwindigkeit.' },
    mastery: [
      { name: 'Ausbeute', mods: [flat('productivity', 10, EXTR)] },
      { name: 'Vortrieb', mods: [inc('speed', 25, EXTR)] },
      { name: 'Pioniergeist', mods: [more('handMine', 300, HAND), inc('handCraft', 30, HAND)] },
    ],
  },
  logistician: {
    small: [[inc('throughput', 8, LG)], [inc('handCraft', 8, HAND)], [inc('cargoCapacity', 8)], [inc('throughput', 12, ['terminal'])]],
    core: { name: 'Logistikzertifikat', mods: [inc('throughput', 20, LG), inc('handCraft', 20, HAND)] },
    notables: [
      { name: 'Fließgleichgewicht', mods: [more('throughput', 25, LG)] },
      { name: 'Frachtmeister', mods: [inc('cargoCapacity', 50)] },
      { name: 'Werkbank-Virtuose', mods: [more('handCraft', 100, HAND)] },
      { name: 'Puffermanagement', mods: [inc('offlineEfficiency', 20), inc('offlineCap', 25)] },
      { name: 'Hochregallager', mods: [more('throughput', 100, ['terminal'])] },
    ],
    keystone: { name: 'Schwarmlogik', mods: [more('speed', 25, undefined, { kind: 'perAdjacent', tag: '$same', max: 8 })], flags: ['swarmLogic'], description: 'Produktionsmaschinen ohne angrenzende Maschine des gleichen Typs arbeiten nicht.' },
    mastery: [
      { name: 'Durchsatz', mods: [inc('throughput', 40, LG)] },
      { name: 'Fernhandel', mods: [inc('cargoCapacity', 60)] },
      { name: 'Ruhephase', mods: [inc('offlineEfficiency', 30)] },
    ],
  },
  warlord: {
    small: [[inc('damage', 8, T)], [inc('machineHp', 8)], [inc('fireRate', 5, T)], [flat('lootRarity', 4)]],
    core: { name: 'Kriegsakademie', mods: [inc('damage', 20, T), inc('machineHp', 20)] },
    notables: [
      { name: 'Sperrfeuer', mods: [inc('fireRate', 25, T)] },
      { name: 'Trophäenjäger', mods: [flat('lootRarity', 20), flat('lootQuantity', 15)] },
      { name: 'Panzerplatten', mods: [inc('machineHp', 50)] },
      { name: 'Schwachstellenanalyse', mods: [flat('penetration', 12, T), flat('critChance', 8, T)] },
      { name: 'Artillerie', mods: [inc('range', 25, T), inc('damage', 15, T)] },
    ],
    keystone: { name: 'Festungsdoktrin', mods: [more('damage', 100, T), more('speed', -15, ['crafter'])], description: 'Türme richten doppelten Schaden an, Fertiger arbeiten langsamer.' },
    mastery: [
      { name: 'Vernichtung', mods: [inc('damage', 30, T)] },
      { name: 'Bollwerk', mods: [inc('machineHp', 60)] },
      { name: 'Beutezug', mods: [flat('lootQuantity', 25)] },
    ],
  },
  quantum: {
    small: [[inc('skillEffect', 6)], [inc('energyRegen', 8)], [inc('powerGen', 5)], [inc('speed', 6, ['lab'])]],
    core: { name: 'Quantenfeldtheorie', mods: [inc('skillEffect', 15), inc('energyMax', 20)] },
    notables: [
      { name: 'Verschränkte Reserven', mods: [inc('energyMax', 40), inc('energyRegen', 20)] },
      { name: 'Zeitschleife', mods: [inc('cooldownRecovery', 25)] },
      { name: 'Feldverstärker', mods: [inc('skillArea', 30), inc('skillEffect', 10)] },
      { name: 'Nullpunktenergie', mods: [inc('powerGen', 25)] },
      { name: 'Hyperforschung', mods: [inc('speed', 30, ['lab']), flat('productivity', 10, ['lab'])] },
    ],
    keystone: { name: 'Zeitkristall', mods: [more('cooldownRecovery', 100), more('energyMax', -50)], description: 'Skills laden doppelt so schnell nach, aber die Energie-Reserve halbiert sich.' },
    mastery: [
      { name: 'Ausdauer', mods: [inc('skillDuration', 30)] },
      { name: 'Wucht', mods: [inc('skillEffect', 25)] },
      { name: 'Reserve', mods: [inc('energyMax', 50)] },
    ],
  },
};

const RING_MODS: Modifier[][] = [[inc('speed', 4)], [flat('productivity', 2)], [inc('power', -3)], [inc('xpGain', 5)], [inc('machineHp', 6)]];

const CENTER_KEYSTONES: { name: string; mods: Modifier[]; flags?: Flag[]; description: string }[] = [
  { name: 'Eiserne Disziplin', mods: [flat('productivity', 30, undefined, { kind: 'perEmptySocket' })], flags: ['ironDiscipline'], description: 'Module können nicht mehr eingesetzt werden. Jeder leere Modulsockel gibt +30 % Produktivität.' },
  { name: 'Glaskanone', mods: [more('speed', 60), more('machineHp', -50)], description: 'Alles arbeitet viel schneller, ist aber halb so robust.' },
  { name: 'Wissensdurst', mods: [more('xpGain', 100), more('speed', -10)], description: 'Doppelte Erfahrung, aber Maschinen arbeiten etwas langsamer.' },
  { name: 'Energiehunger', mods: [more('speed', 40, ['electric']), more('power', 80)], description: 'Elektrische Maschinen sind schneller, verbrauchen aber viel mehr Strom.' },
  { name: 'Ruhender Riese', mods: [more('offlineEfficiency', 100), inc('offlineCap', 100), more('speed', -20)], description: 'Offline wird doppelt so viel produziert, online etwas weniger.' },
];

function polar(r: number, deg: number): { x: number; y: number } {
  const a = (deg * Math.PI) / 180;
  return { x: Math.cos(a) * r, y: Math.sin(a) * r };
}

function buildCommanderTree(): TreeDef {
  const nodes: TreeNode[] = [];
  const edges: [string, string][] = [];
  const add = (n: TreeNode) => nodes.push(n);
  const link = (a: string, b: string) => edges.push([a, b]);

  // Innerer Ring
  const RING = 20;
  for (let k = 0; k < RING; k++) {
    const p = polar(250, -90 + k * 18);
    add({ id: `ring:${k}`, kind: 'small', name: 'Kernsektor', ...p, mods: RING_MODS[k % RING_MODS.length] });
    if (k > 0) link(`ring:${k - 1}`, `ring:${k}`);
  }
  link(`ring:${RING - 1}`, 'ring:0');

  // Zentrale Keystones
  CENTER_KEYSTONES.forEach((ks, i) => {
    const angle = -54 + i * 72;
    const p = polar(120, angle);
    add({ id: `center:${i}`, kind: 'keystone', name: ks.name, ...p, mods: ks.mods, flags: ks.flags, description: ks.description });
    link(`center:${i}`, `ring:${(i * 4 + 2) % RING}`);
  });

  CLASSES.forEach((cls, ci) => {
    const th = THEMES[cls.id];
    const a = cls.angle;
    const c = cls.id;
    let small = 0;
    const nextSmall = () => th.small[small++ % th.small.length];

    // Start
    add({ id: `${c}:start`, kind: 'start', name: cls.name, ...polar(560, a), mods: [], classStart: c });

    // Pfad nach innen
    const inward = [490, 430, 370, 310];
    inward.forEach((r, i) => {
      const id = `${c}:in${i}`;
      const isCore = i === 2;
      add({ id, kind: isCore ? 'notable' : 'small', name: isCore ? th.core.name : cls.name, ...polar(r, a), mods: isCore ? th.core.mods : nextSmall() });
      link(i === 0 ? `${c}:start` : `${c}:in${i - 1}`, id);
    });
    link(`${c}:in3`, `ring:${(ci * 4) % RING}`);

    // Linker Ast mit Keystone
    for (let i = 0; i < 6; i++) {
      const id = `${c}:l${i}`;
      const isNotable = i === 2;
      add({ id, kind: isNotable ? 'notable' : 'small', name: isNotable ? th.notables[0].name : cls.name, ...polar(620 + i * 55, a - 13), mods: isNotable ? th.notables[0].mods : nextSmall() });
      link(i === 0 ? `${c}:start` : `${c}:l${i - 1}`, id);
    }
    add({ id: `${c}:ks`, kind: 'keystone', name: th.keystone.name, ...polar(985, a - 13), mods: th.keystone.mods, flags: th.keystone.flags, description: th.keystone.description });
    link(`${c}:l5`, `${c}:ks`);

    // Rechter Ast
    for (let i = 0; i < 6; i++) {
      const id = `${c}:r${i}`;
      const notableIdx = i === 2 ? 1 : i === 5 ? 2 : -1;
      add({
        id,
        kind: notableIdx >= 0 ? 'notable' : 'small',
        name: notableIdx >= 0 ? th.notables[notableIdx].name : cls.name,
        ...polar(620 + i * 55, a + 13),
        mods: notableIdx >= 0 ? th.notables[notableIdx].mods : nextSmall(),
      });
      link(i === 0 ? `${c}:start` : `${c}:r${i - 1}`, id);
    }

    // Querverbindung mit Meisterschaft
    add({ id: `${c}:mastery`, kind: 'mastery', name: `${cls.name}: Meisterschaft`, ...polar(780, a), mods: [], choices: th.mastery });
    link(`${c}:l3`, `${c}:mastery`);
    link(`${c}:r3`, `${c}:mastery`);

    // Satelliten-Cluster
    const satellites: [string, number, number, number][] = [
      [`${c}:l1`, a - 30, 700, 3],
      [`${c}:r4`, a + 30, 860, 4],
    ];
    satellites.forEach(([from, angle, r, notable], si) => {
      const ids: string[] = [];
      for (let k = 0; k < 4; k++) {
        const id = `${c}:sat${si}:${k}`;
        const p = polar(r + (k % 2) * 40, angle + (k - 1.5) * 4);
        const isNotable = k === 3;
        add({ id, kind: isNotable ? 'notable' : 'small', name: isNotable ? th.notables[notable].name : cls.name, ...p, mods: isNotable ? th.notables[notable].mods : nextSmall() });
        ids.push(id);
      }
      link(from, ids[0]);
      link(ids[0], ids[1]);
      link(ids[1], ids[2]);
      link(ids[2], ids[3]);
    });

    // Juwelsockel
    add({ id: `${c}:socket`, kind: 'socket', name: 'Juwelsockel', ...polar(700, a + 27), mods: [] });
    link(`${c}:r1`, `${c}:socket`);

    // Brücke zur nächsten Klasse
    const next = CLASSES[(ci + 1) % CLASSES.length];
    let prev = `${c}:start`;
    for (let k = 1; k <= 5; k++) {
      const id = `bridge:${c}:${k}`;
      const isNotable = k === 3;
      add({
        id,
        kind: isNotable ? 'notable' : 'small',
        name: isNotable ? 'Grenzgänger' : 'Übergang',
        ...polar(560, a + k * 12),
        mods: isNotable ? [...THEMES[c].small[0], ...THEMES[next.id].small[0]].map((m) => ({ ...m, value: m.value * 3 })) : RING_MODS[(k + ci) % RING_MODS.length],
      });
      link(prev, id);
      prev = id;
    }
    link(prev, `${next.id}:start`);
    add({ id: `bridge:${c}:socket`, kind: 'socket', name: 'Juwelsockel', ...polar(470, a + 36), mods: [] });
    link(`bridge:${c}:3`, `bridge:${c}:socket`);

    // Mittelring-Verbindungen zwischen den Klassen
    for (let k = 1; k <= 3; k++) {
      const id = `mid:${c}:${k}`;
      add({ id, kind: 'small', name: 'Verbindungssektor', ...polar(400, a + k * 18), mods: RING_MODS[(k + ci * 2) % RING_MODS.length] });
      link(k === 1 ? `${c}:in1` : `mid:${c}:${k - 1}`, id);
    }
    link(`mid:${c}:3`, `${next.id}:in1`);
  });

  return { ...finalizeTree('commander', 'Kommandant', nodes, edges), arcCenter: true };
}

export const COMMANDER_TREE = buildCommanderTree();

// ---------- Aszendenzen ----------

export interface AscendancyDef {
  id: string;
  name: string;
  classId: string;
  description: string;
  tree: TreeDef;
}

function asc(id: string, classId: string, name: string, description: string, branches: { name: string; nodes: { name: string; mods: Modifier[]; flags?: Flag[]; description?: string }[] }[]): AscendancyDef {
  const tree = buildRadialTree({
    id: `asc:${id}`,
    name,
    rings: [],
    step: 80,
    startName: name,
    branches: branches.map((b, i) => ({
      key: `b${i}`,
      name: b.name,
      angle: -90 + (i * 360) / branches.length,
      length: b.nodes.length,
      small: [[]],
      notables: b.nodes.map((n, k) => ({ at: k + 1, ...n })),
    })),
  });
  return { id, name, classId, description, tree };
}

export const ASCENDANCIES: Record<string, AscendancyDef> = Object.fromEntries(
  [
    asc('chief', 'engineer', 'Chefkonstrukteur', 'Mehr Modulsockel und gewaltige Produktivität für Fertiger.', [
      { name: 'Modularbau', nodes: [{ name: 'Erweiterte Sockel', mods: [flat('moduleSlots', 1, ['crafter'])] }, { name: 'Modulsynergie', mods: [flat('moduleSlots', 1, ['extractor']), flat('productivity', 10)] }] },
      { name: 'Serienfertigung', nodes: [{ name: 'Serienfertigung', mods: [more('speed', 25, ['crafter'])] }, { name: 'Perfektionismus', mods: [flat('productivity', 25, ['crafter'])] }] },
      { name: 'Prototypen', nodes: [{ name: 'Prototypenwerkstatt', mods: [flat('critChance', 15, ['crafter']), flat('critMulti', 100, ['crafter'])] }] },
    ]),
    asc('purist', 'engineer', 'Effizienz-Purist', 'Minimaler Verbrauch, maximale Leistung.', [
      { name: 'Verbrauch', nodes: [{ name: 'Nullverlust', mods: [more('power', -30)] }, { name: 'Supraleitung', mods: [more('power', -30), more('fuelUse', -30)] }] },
      { name: 'Netz', nodes: [{ name: 'Lastverteilung', mods: [inc('powerGen', 40)] }, { name: 'Effizienzrausch', mods: [more('speed', 30, ['electric'])] }] },
      { name: 'Wartung', nodes: [{ name: 'Präventive Wartung', mods: [inc('machineHp', 100), inc('speed', 15)] }] },
    ]),
    asc('deepminer', 'prospector', 'Tiefenschürfer', 'Bohrer finden reichere Adern und seltene Schätze.', [
      { name: 'Adern', nodes: [{ name: 'Muttergestein', mods: [flat('critChance', 20, ['extractor'])] }, { name: 'Mutterlode', mods: [flat('critMulti', 200, ['extractor'])] }] },
      { name: 'Ertrag', nodes: [{ name: 'Siebkaskade', mods: [flat('productivity', 30, ['extractor'])] }, { name: 'Edelsteinsucher', mods: [flat('lootQuantity', 25), inc('meteorFrequency', 50)] }] },
      { name: 'Tiefe', nodes: [{ name: 'Tiefenkartierung', mods: [more('speed', 30, ['extractor'])] }] },
    ]),
    asc('planetbreaker', 'prospector', 'Planetenbrecher', 'Rohe Gewalt gegen jeden Himmelskörper.', [
      { name: 'Gewalt', nodes: [{ name: 'Seismische Ladungen', mods: [more('speed', 50, ['drill'])] }, { name: 'Kernbohrung', mods: [more('speed', 50, ['drill']), more('power', 50, ['drill'])] }] },
      { name: 'Pumpen', nodes: [{ name: 'Mantelpumpen', mods: [more('speed', 60, ['pump'])] }] },
      { name: 'Hand', nodes: [{ name: 'Faust des Titanen', mods: [more('handMine', 1000, ['hand'])] }, { name: 'Erdbeben', mods: [inc('skillEffect', 30), inc('damage', 20)] }] },
    ]),
    asc('architect', 'logistician', 'Netzwerkarchitekt', 'Nachbarschaft ist alles.', [
      { name: 'Verbund', nodes: [{ name: 'Clusterbau', mods: [inc('speed', 8, undefined, { kind: 'perAdjacent', tag: 'any', max: 6 })] }, { name: 'Symbiose', mods: [flat('productivity', 4, undefined, { kind: 'perAdjacent', tag: 'any', max: 6 })] }] },
      { name: 'Bänder', nodes: [{ name: 'Hyperbänder', mods: [more('throughput', 150, ['logistics'])] }] },
      { name: 'Planung', nodes: [{ name: 'Masterplan', mods: [inc('speed', 15), inc('handCraft', 100, ['hand'])] }, { name: 'Taktgeber', mods: [more('speed', 15, ['crafter'])] }] },
    ]),
    asc('baron', 'logistician', 'Frachtbaron', 'Fracht und Lager im großen Stil.', [
      { name: 'Fracht', nodes: [{ name: 'Containerflotte', mods: [more('cargoCapacity', 100)] }, { name: 'Raumhafen', mods: [more('cargoCapacity', 100)] }] },
      { name: 'Lager', nodes: [{ name: 'Lagerimperium', mods: [more('throughput', 200, ['terminal'])] }] },
      { name: 'Zeit', nodes: [{ name: 'Schichtbetrieb', mods: [more('offlineEfficiency', 50), inc('offlineCap', 100)] }] },
    ]),
    asc('fortress', 'warlord', 'Festungsmeister', 'Unzerstörbare Anlagen.', [
      { name: 'Panzerung', nodes: [{ name: 'Titanbeton', mods: [more('machineHp', 100)] }, { name: 'Schildmatrix', mods: [more('machineHp', 50), inc('damage', 20, ['turret'])] }] },
      { name: 'Türme', nodes: [{ name: 'Wachtürme', mods: [inc('range', 30, ['turret']), inc('fireRate', 30, ['turret'])] }] },
      { name: 'Beute', nodes: [{ name: 'Kriegsbeute', mods: [flat('lootQuantity', 40)] }] },
    ]),
    asc('orbital', 'warlord', 'Orbitalkommandant', 'Vernichtung aus dem Orbit.', [
      { name: 'Orbit', nodes: [{ name: 'Orbitalbatterie', mods: [more('skillEffect', 50)] }, { name: 'Zielmarkierung', mods: [flat('penetration', 25, ['turret'])] }] },
      { name: 'Schaden', nodes: [{ name: 'Präzisionsschlag', mods: [more('damage', 40, ['turret'])] }] },
      { name: 'Beute', nodes: [{ name: 'Trümmerbergung', mods: [flat('lootRarity', 40)] }] },
    ]),
    asc('timeweaver', 'quantum', 'Zeitweber', 'Biegt die Zeit selbst.', [
      { name: 'Zeit', nodes: [{ name: 'Chronoschleife', mods: [more('cooldownRecovery', 50)] }, { name: 'Ewige Dauer', mods: [more('skillDuration', 60)] }] },
      { name: 'Offline', nodes: [{ name: 'Zeitblase', mods: [more('offlineEfficiency', 50), inc('offlineCap', 200)] }] },
      { name: 'Takt', nodes: [{ name: 'Beschleunigung', mods: [more('speed', 20)] }] },
    ]),
    asc('voidcaller', 'quantum', 'Leerenrufer', 'Die Kräfte der Leere gehorchen dir.', [
      { name: 'Leere', nodes: [{ name: 'Leerenresonanz', mods: [more('damage', 60, ['turret', 'dmg:void']), flat('productivity', 25, ['planet:void'])] }] },
      { name: 'Energie', nodes: [{ name: 'Leerenreserven', mods: [more('energyMax', 100)] }, { name: 'Ereignishorizont', mods: [more('skillEffect', 40)] }] },
      { name: 'Forschung', nodes: [{ name: 'Verbotenes Wissen', mods: [more('speed', 60, ['lab'])] }] },
    ]),
  ].map((a) => [a.id, a]),
);
