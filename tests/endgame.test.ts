import { describe, expect, it } from 'vitest';
import { PARAGON_BOARDS } from '../src/data/paragon';
import * as cmd from '../src/systems/commander';
import * as items from '../src/systems/items';
import { amountOf } from '../src/systems/inventory';
import * as paragon from '../src/systems/paragon';
import * as prestige from '../src/systems/prestige';
import { findOreSpot, give, newGame } from './helpers';

describe('Sternensprung', () => {
  it('braucht genug Imperiumswert und behält den Meta-Fortschritt', () => {
    const game = newGame();
    expect(game.starJump()).not.toBeNull();
    game.commander((s) => cmd.chooseClass(s, 'engineer'));
    game.state.commander.xp = 12345;
    game.state.machines.xp.drill = 999;
    const item = items.createItem(game.state, game.rng, { ilvl: 10, unique: 'u_pioneer_oil' });
    game.state.research.done.add('automation');
    game.state.run.value = 50_000 * 9; // 3 Dunkle Energie
    expect(prestige.darkEnergyGain(game.state)).toBe(3);
    expect(game.starJump()).toBeNull();
    expect(game.state.prestige.darkEnergy).toBe(3);
    expect(game.state.prestige.jumps).toBe(1);
    expect(game.state.prestige.systemMods.length).toBe(2);
    expect(game.state.commander.xp).toBe(12345);
    expect(game.state.commander.classId).toBe('engineer');
    expect(game.state.machines.xp.drill).toBe(999);
    expect(game.state.loot.items[item.id]).toBeDefined();
    expect(game.state.research.done.has('automation')).toBe(false);
    expect(game.state.run.value).toBe(0);
  });

  it('Dunkle-Energie-Upgrades: Kosten, Voraussetzungen, Startausrüstung', () => {
    const game = newGame();
    game.state.prestige.darkEnergy = 100;
    expect(game.buyDarkUpgrade('d_research')).toBe('Benötigt Vorräte im Frachtraum');
    expect(game.buyDarkUpgrade('d_kit')).toBeNull();
    expect(game.buyDarkUpgrade('d_research')).toBeNull();
    expect(game.buyDarkUpgrade('d_speed')).toBeNull();
    // Startknoten des Ofen-Baums (+5 %) × 10 % mehr
    expect(game.engine.value('speed', new Set(['furnace']), 1)).toBeCloseTo(1.05 * 1.1);
    game.state.run.value = 50_000;
    game.starJump();
    expect(amountOf(game.planet, 'drill_mech').toNumber()).toBeGreaterThanOrEqual(4);
    expect(game.state.research.done.has('automation')).toBe(true);
  });

  it('Module in Maschinen kommen beim Sprung ins Lager zurück', () => {
    const game = newGame();
    game.state.research.done.add('electric_mining');
    give(game, { drill_elec: 1 });
    const [x, y] = findOreSpot(game, 'iron_ore', 2);
    game.build('drill_elec', x, y, 0);
    const item = items.createItem(game.state, game.rng, { ilvl: 10, rarity: 'normal', base: 'mod_speed' });
    game.equipModule(item.id, game.world.entityAt(x, y)!.id);
    game.state.run.value = 50_000;
    game.starJump();
    expect(game.state.loot.items[item.id].location).toBeUndefined();
  });
});

describe('Paragon', () => {
  it('erst ab Level 100, Felder angrenzend, Tore verbinden Bretter', () => {
    const game = newGame();
    expect(paragon.paragonInfo(game.state).unlocked).toBe(false);
    game.state.commander.xp = paragon.xpToMaxLevel() + 1e9;
    const info = paragon.paragonInfo(game.state);
    expect(info.unlocked).toBe(true);
    expect(paragon.paragonPointsLeft(game.state)).toBe(info.level);
    // Glyphensockel in der Mitte von Brett 0 (3 Schritte vom Start)
    expect(game.allocateParagon('p0:3:3')).toBe(3);
    expect(game.setGlyph(0, 'g_industry')).toBeNull();
    // Nächstes Brett über das Tor
    const entry = PARAGON_BOARDS[1].tiles.find((t) => t.kind === 'start')!;
    expect(game.allocateParagon(entry.id)).toBeGreaterThan(0);
  });

  it('Glyphe verstärkt Felder im Radius', () => {
    const game = newGame();
    game.state.commander.xp = paragon.xpToMaxLevel() + 1e12;
    for (const t of PARAGON_BOARDS[0].tiles) game.allocateParagon(t.id);
    const tags = new Set(['furnace', 'crafter']);
    const before = game.engine.value('speed', tags, 1);
    game.setGlyph(0, 'g_industry');
    // Verstärkte Felder + Bonus „+15 % Fertiger-Geschwindigkeit“ (≥ 5 Felder im Radius)
    expect(game.engine.value('speed', tags, 1)).toBeGreaterThan(before + 0.15);
  });
});
