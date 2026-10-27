import type { Modifier } from '../engine/types';
import { flat, inc } from './machineTrees';

export type ParagonKind = 'start' | 'normal' | 'magic' | 'rare' | 'glyph' | 'gate';

export interface ParagonTile {
  id: string;
  board: number;
  x: number;
  y: number;
  kind: ParagonKind;
  mods: Modifier[];
}

export interface ParagonBoard {
  index: number;
  name: string;
  icon: string;
  tiles: ParagonTile[];
}

export interface GlyphDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  /** Verstärkung vergebener Felder im Radius (Prozent). */
  amplify: number;
  /** Bonus, wenn mindestens 5 Felder im Radius vergeben sind. */
  bonus: Modifier[];
}

export const BOARD_SIZE = 7;
export const GLYPH_RADIUS = 3;

interface Theme {
  name: string;
  icon: string;
  normal: Modifier[][];
  magic: Modifier[][];
  rare: Modifier[][];
}

const THEMES: Theme[] = [
  {
    name: 'Grundlagen',
    icon: '⬡',
    normal: [[inc('speed', 2)], [flat('productivity', 1)], [inc('xpGain', 3)], [inc('power', -2)]],
    magic: [[inc('speed', 5), inc('power', -3)], [flat('productivity', 3)]],
    rare: [[inc('speed', 12), flat('productivity', 5)], [inc('xpGain', 20), inc('handCraft', 30, ['hand'])]],
  },
  {
    name: 'Fabrikherr',
    icon: '🏭',
    normal: [[inc('speed', 3, ['crafter'])], [inc('speed', 3, ['extractor'])], [flat('productivity', 1, ['crafter'])], [inc('throughput', 4, ['logistics'])]],
    magic: [[inc('speed', 7, ['crafter']), flat('critChance', 1, ['crafter'])], [inc('speed', 7, ['extractor']), flat('productivity', 2, ['extractor'])]],
    rare: [[flat('productivity', 10, ['crafter']), flat('critMulti', 50)], [inc('throughput', 40, ['logistics']), inc('cargoCapacity', 30)]],
  },
  {
    name: 'Kriegsherr',
    icon: '⚔️',
    normal: [[inc('damage', 4, ['turret'])], [inc('fireRate', 3, ['turret'])], [inc('machineHp', 5)], [flat('lootRarity', 2)]],
    magic: [[inc('damage', 10, ['turret']), flat('penetration', 2, ['turret'])], [inc('machineHp', 12), inc('range', 4, ['turret'])]],
    rare: [[inc('damage', 30, ['turret']), flat('critChance', 5, ['turret'])], [flat('lootQuantity', 15), flat('lootRarity', 15)]],
  },
  {
    name: 'Quantenadept',
    icon: '🌌',
    normal: [[inc('skillEffect', 3)], [inc('energyRegen', 4)], [inc('powerGen', 3)], [inc('speed', 3, ['lab'])]],
    magic: [[inc('skillEffect', 7), inc('energyMax', 8)], [inc('cooldownRecovery', 6)]],
    rare: [[inc('skillEffect', 20), inc('skillDuration', 15)], [inc('powerGen', 25), inc('offlineEfficiency', 10)]],
  },
];

function buildBoard(index: number, last: boolean): ParagonBoard {
  const theme = THEMES[index];
  const tiles: ParagonTile[] = [];
  const c = Math.floor(BOARD_SIZE / 2);
  let n = 0;
  let m = 0;
  let r = 0;
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      const dist = Math.abs(x - c) + Math.abs(y - c);
      if (dist > 4) continue;
      let kind: ParagonKind = 'normal';
      if (x === c && y === c) kind = 'glyph';
      else if (index === 0 && x === c && y === BOARD_SIZE - 1) kind = 'start';
      else if (index > 0 && x === 0 && y === c) kind = 'start';
      else if (!last && x === BOARD_SIZE - 1 && y === c) kind = 'gate';
      else if ((x === c && y === 1) || (x === 1 && y === c) || (x === c && y === BOARD_SIZE - 2 && index > 0)) kind = 'rare';
      else if (dist === 2 && (x + y) % 2 === 0) kind = 'magic';
      const mods =
        kind === 'normal'
          ? theme.normal[n++ % theme.normal.length]
          : kind === 'magic'
            ? theme.magic[m++ % theme.magic.length]
            : kind === 'rare'
              ? theme.rare[r++ % theme.rare.length]
              : [];
      tiles.push({ id: `p${index}:${x}:${y}`, board: index, x, y, kind, mods });
    }
  }
  return { index, name: theme.name, icon: theme.icon, tiles };
}

export const PARAGON_BOARDS: ParagonBoard[] = THEMES.map((_, i) => buildBoard(i, i === THEMES.length - 1));
export const PARAGON_TILES: Record<string, ParagonTile> = Object.fromEntries(PARAGON_BOARDS.flatMap((b) => b.tiles).map((t) => [t.id, t]));

export const GLYPHS: GlyphDef[] = [
  { id: 'g_industry', name: 'Glyphe der Industrie', icon: '⚙', description: 'Felder im Radius 3 sind 50 % stärker.', amplify: 50, bonus: [inc('speed', 15, ['crafter'])] },
  { id: 'g_earth', name: 'Glyphe der Erde', icon: '⛰', description: 'Felder im Radius 3 sind 50 % stärker.', amplify: 50, bonus: [flat('productivity', 8, ['extractor'])] },
  { id: 'g_war', name: 'Glyphe des Krieges', icon: '⚔', description: 'Felder im Radius 3 sind 50 % stärker.', amplify: 50, bonus: [inc('damage', 40, ['turret'])] },
  { id: 'g_mind', name: 'Glyphe des Geistes', icon: '✧', description: 'Felder im Radius 3 sind 50 % stärker.', amplify: 50, bonus: [inc('skillEffect', 20), inc('xpGain', 20)] },
];

export const GLYPH_BY_ID: Record<string, GlyphDef> = Object.fromEntries(GLYPHS.map((g) => [g.id, g]));

/** Nachbarfelder (4er-Nachbarschaft, über Tore hinweg zum nächsten Brett). */
export function paragonNeighbors(tile: ParagonTile): string[] {
  const out: string[] = [];
  for (const [dx, dy] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]) {
    const id = `p${tile.board}:${tile.x + dx}:${tile.y + dy}`;
    if (PARAGON_TILES[id]) out.push(id);
  }
  if (tile.kind === 'gate') {
    const next = PARAGON_BOARDS[tile.board + 1];
    const entry = next?.tiles.find((t) => t.kind === 'start');
    if (entry) out.push(entry.id);
  }
  if (tile.kind === 'start' && tile.board > 0) {
    const gate = PARAGON_BOARDS[tile.board - 1].tiles.find((t) => t.kind === 'gate');
    if (gate) out.push(gate.id);
  }
  return out;
}
