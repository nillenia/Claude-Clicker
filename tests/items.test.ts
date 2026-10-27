import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { createInitialState } from '../src/core/state';
import { AFFIX_BY_ID } from '../src/data/items';
import * as items from '../src/systems/items';
import * as cmd from '../src/systems/commander';
import { findOreSpot, give, newGame } from './helpers';

function setup() {
  const state = createInitialState();
  const rng = new Rng(42);
  return { state, rng };
}

describe('Items', () => {
  it('Seltenheiten haben passende Affixzahlen', () => {
    const { state, rng } = setup();
    for (let i = 0; i < 50; i++) {
      const magic = items.createItem(state, rng, { ilvl: 50, rarity: 'magic' });
      expect(magic.affixes.length).toBeGreaterThanOrEqual(1);
      expect(magic.affixes.length).toBeLessThanOrEqual(2);
      const rare = items.createItem(state, rng, { ilvl: 50, rarity: 'rare' });
      expect(rare.affixes.length).toBeGreaterThanOrEqual(3);
      expect(rare.affixes.length).toBeLessThanOrEqual(6);
      const prefixes = rare.affixes.filter((a) => AFFIX_BY_ID[a.id].kind === 'prefix').length;
      expect(prefixes).toBeLessThanOrEqual(3);
      expect(new Set(rare.affixes.map((a) => a.id)).size).toBe(rare.affixes.length);
    }
  });

  it('Item-Level begrenzt die Affixstufe', () => {
    const { state, rng } = setup();
    for (let i = 0; i < 50; i++) {
      const low = items.createItem(state, rng, { ilvl: 5, rarity: 'rare' });
      expect(low.affixes.every((a) => a.tier === 0)).toBe(true);
    }
  });

  it('Währungen: Transmutation, Augmentation, Alchemie, Annullierung, Neutralisator', () => {
    const { state, rng } = setup();
    state.loot.currency = { c_transmute: 1, c_augment: 5, c_alchemy: 1, c_annul: 1, c_scour: 1 };
    const item = items.createItem(state, rng, { ilvl: 30, rarity: 'normal', base: 'mod_speed' });
    expect(items.applyCurrency(state, rng, item.id, 'c_augment').ok).toBe(false);
    expect(items.applyCurrency(state, rng, item.id, 'c_transmute').ok).toBe(true);
    expect(item.rarity).toBe('magic');
    items.applyCurrency(state, rng, item.id, 'c_augment');
    expect(item.affixes.length).toBe(2);
    expect(items.applyCurrency(state, rng, item.id, 'c_augment').ok).toBe(false);
    expect(state.loot.currency.c_augment).toBe(4);
    expect(items.applyCurrency(state, rng, item.id, 'c_annul').ok).toBe(true);
    expect(item.affixes.length).toBe(1);
    expect(items.applyCurrency(state, rng, item.id, 'c_scour').ok).toBe(true);
    expect(item.rarity).toBe('normal');
    expect(items.applyCurrency(state, rng, item.id, 'c_alchemy').ok).toBe(true);
    expect(item.rarity).toBe('rare');
  });

  it('Härtung max. 2, Meisterkalibrierung verstärkt Werte', () => {
    const { state, rng } = setup();
    state.loot.currency = { c_temper: 5, c_masterwork: 10 };
    const item = items.createItem(state, rng, { ilvl: 60, rarity: 'rare', base: 'mod_speed' });
    expect(items.applyCurrency(state, rng, item.id, 'c_temper', 'production').ok).toBe(true);
    expect(items.applyCurrency(state, rng, item.id, 'c_temper', 'efficiency').ok).toBe(true);
    expect(items.applyCurrency(state, rng, item.id, 'c_temper', 'warfare').ok).toBe(false);
    const sum = () => items.itemMods(item).reduce((s, m) => s + Math.abs(m.value), 0);
    const before = sum();
    items.applyCurrency(state, rng, item.id, 'c_masterwork');
    expect(sum()).toBeGreaterThan(before);
    for (let i = 0; i < 6; i++) items.applyCurrency(state, rng, item.id, 'c_masterwork');
    expect(item.masterwork).toBe(5);
  });

  it('Einzigartige Items sind unveränderlich', () => {
    const { state, rng } = setup();
    state.loot.currency = { c_chaos: 1 };
    const u = items.createItem(state, rng, { ilvl: 50, unique: 'u_pioneer_oil' });
    expect(items.applyCurrency(state, rng, u.id, 'c_chaos').ok).toBe(false);
  });

  it('Aspekt extrahieren und aufprägen', () => {
    const { state, rng } = setup();
    const leg = items.createItem(state, rng, { ilvl: 50, rarity: 'legendary', aspect: 'a_greed' });
    expect(items.extractAspect(state, leg.id).ok).toBe(true);
    expect(state.loot.codex).toContain('a_greed');
    const rare = items.createItem(state, rng, { ilvl: 50, rarity: 'rare', base: 'mod_prod' });
    expect(items.imprintAspect(state, rare.id, 'a_greed').ok).toBe(false); // zu wenig Essenz
    state.loot.currency.c_essence = 5;
    expect(items.imprintAspect(state, rare.id, 'a_greed').ok).toBe(true);
    expect(rare.rarity).toBe('legendary');
  });
});

describe('Ausrüsten', () => {
  it('Modul in Maschine erhöht ihre Werte, Abriss gibt es zurück', () => {
    const game = newGame();
    game.state.research.done.add('electric_mining');
    give(game, { drill_elec: 1 });
    const [x, y] = findOreSpot(game, 'iron_ore', 2);
    game.build('drill_elec', x, y, 0);
    const id = game.world.entityAt(x, y)!.id;
    const rt = game.world.runtimes.get(id)!;
    const item = items.createItem(game.state, game.rng, { ilvl: 50, unique: 'u_pioneer_oil' });
    const before = game.statsFor(game.world, rt).speed;
    expect(game.equipModule(item.id, id).ok).toBe(true);
    expect(game.statsFor(game.world, rt).speed).toBeGreaterThan(before);
    // Nur ein Sockel
    const second = items.createItem(game.state, game.rng, { ilvl: 50, rarity: 'normal' });
    expect(game.equipModule(second.id, id).ok).toBe(false);
    game.deconstruct(id);
    expect(item.location).toBeUndefined();
  });

  it('Lebende Legierung gibt zusätzliche Sockel', () => {
    const game = newGame();
    game.state.research.done.add('electric_mining');
    give(game, { drill_elec: 1 });
    const [x, y] = findOreSpot(game, 'iron_ore', 2);
    game.build('drill_elec', x, y, 0);
    const id = game.world.entityAt(x, y)!.id;
    const rt = game.world.runtimes.get(id)!;
    expect(game.moduleSlots(game.world, rt)).toBe(1);
    const alloy = items.createItem(game.state, game.rng, { ilvl: 50, unique: 'u_living_alloy' });
    game.equipModule(alloy.id, id);
    expect(game.moduleSlots(game.world, rt)).toBe(3);
  });

  it('Juwel wirkt nur in vergebenem Sockel, Artefakt-Flag aktiv', () => {
    const game = newGame();
    game.commander((s) => cmd.chooseClass(s, 'engineer'));
    game.state.commander.xp = 1e7;
    const jewel = items.createItem(game.state, game.rng, { ilvl: 50, unique: 'u_prism_shard' });
    expect(game.socketJewel(jewel.id, 'engineer:socket').ok).toBe(true);
    expect(game.engine.has('prismShard')).toBe(false);
    game.commander((s) => cmd.allocateCommanderNode(s, 'engineer:socket'));
    expect(game.engine.has('prismShard')).toBe(true);
    const art = items.createItem(game.state, game.rng, { ilvl: 50, unique: 'u_singularity' });
    game.setArtifact(art.id, 0);
    expect(game.engine.has('singularity')).toBe(true);
  });

  it('Meteorit gibt Erz und Beute', () => {
    const game = newGame();
    game.state.loot.meteorTimer = 0;
    game.step(0.05);
    expect(game.state.loot.meteor).not.toBeNull();
    expect(game.clickMeteor()).toBe(true);
    expect(game.state.loot.meteor).toBeNull();
    expect(game.planet.inventory.iron_ore.toNumber()).toBeGreaterThanOrEqual(25);
  });
});
