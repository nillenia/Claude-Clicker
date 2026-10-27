import { describe, expect, it } from 'vitest';
import * as cmd from '../src/systems/commander';
import { rotateBlueprint } from '../src/systems/blueprints';
import { amountOf } from '../src/systems/inventory';
import { findOreSpot, give, newGame, run } from './helpers';

describe('Blaupausen', () => {
  it('kopieren, drehen, einfügen mit Rezepten', async () => {
    const game = newGame();
    game.state.research.done.add('automation');
    give(game, { assembler_1: 4, belt_1: 10 });
    const t = game.terrain;
    let spot: [number, number] | null = null;
    for (let y = 2; y < t.height - 12 && !spot; y++)
      for (let x = 2; x < t.width - 12 && !spot; x++) {
        let free = true;
        for (let dy = 0; dy < 10 && free; dy++) for (let dx = 0; dx < 10 && free; dx++) if (game.world.canPlace('belt_1', x + dx, y + dy)) free = false;
        if (free) spot = [x, y];
      }
    const [x, y] = spot!;
    game.build('assembler_1', x, y, 0);
    game.setRecipe(game.world.entityAt(x, y)!.id, 'gear');
    game.build('belt_1', x + 3, y + 1, 0);
    const b = game.createBlueprint(x, y, x + 3, y + 2)!;
    expect(b.entities.length).toBe(2);
    expect(b.w).toBe(4);
    const r = rotateBlueprint(b, 1);
    expect(r.w).toBe(3);
    expect(r.h).toBe(4);
    const res = game.pasteBlueprint(b.id, x + 5, y, 0);
    expect(res).toEqual({ placed: 2, skipped: 0 });
    expect(game.world.entityAt(x + 5, y)!.recipe).toBe('gear');
    expect(amountOf(game.planet, 'assembler_1').toNumber()).toBe(2);
    // Code-Rundreise
    const code = (await import('../src/systems/blueprints')).encodeBlueprint(b);
    expect(game.importBlueprint(code).entities.length).toBe(2);
  });
});

describe('Loadouts', () => {
  it('speichern, wechseln und Punkte prüfen', () => {
    const game = newGame();
    game.commander((s) => cmd.chooseClass(s, 'engineer'));
    game.state.commander.xp = 1e6;
    game.commander((s) => cmd.allocateCommanderNode(s, 'engineer:in2'));
    game.saveLoadout('A');
    game.commander((s) => {
      cmd.resetCommanderTree(s);
      return true;
    });
    expect(game.state.commander.allocated.length).toBe(1);
    expect(game.applyLoadout(game.state.loadouts[0])).toBeNull();
    expect(game.state.commander.allocated).toContain('engineer:in2');
    const code = game.exportLoadout(game.state.loadouts[0]);
    game.deleteLoadout('A');
    expect(game.importLoadout(code).name).toBe('A');
    // Zu wenig Level
    game.state.commander.xp = 0;
    expect(game.applyLoadout(game.state.loadouts[0])).toMatch(/Level/);
  });
});

describe('Ziele', () => {
  it('werden der Reihe nach erkannt und belohnt', () => {
    const game = newGame();
    const [x, y] = findOreSpot(game, 'iron_ore', 0);
    for (let i = 0; i < 10; i++) game.mineTile(x, y);
    run(game, 1.1);
    expect(game.state.objectives).toContain('mine');
    expect(game.state.commander.xp).toBeGreaterThanOrEqual(50);
  });
});

describe('Produktionsverlauf', () => {
  it('wird alle 10 Sekunden aufgezeichnet', () => {
    const game = newGame();
    give(game, { drill_mech: 1, storage: 1 });
    const [x, y] = findOreSpot(game, 'iron_ore', 4);
    game.build('drill_mech', x, y, 0);
    game.build('storage', x + 2, y, 0);
    run(game, 31);
    expect(game.history.length).toBe(3);
    expect(game.history[2].rates.iron_ore).toBeGreaterThan(0);
  });
});
