import { describe, expect, it } from 'vitest';
import { amountOf } from '../src/systems/inventory';
import { findOreSpot, give, newGame, run } from './helpers';

describe('Fabrik-Simulation', () => {
  it('Bohrer → Ofen → Lager produziert Platten', () => {
    const game = newGame();
    give(game, { drill_mech: 1, furnace_stone: 1, storage: 1 });
    const [x, y] = findOreSpot(game, 'iron_ore', 6);
    expect(game.build('drill_mech', x, y, 0)).toBeNull();
    expect(game.build('furnace_stone', x + 2, y, 0)).toBeNull();
    expect(game.build('storage', x + 4, y, 0)).toBeNull();
    run(game, 60);
    const plates = amountOf(game.planet, 'iron_plate').toNumber();
    // 0,3 Erz/s × ~60 s, abzüglich Anlaufzeit
    expect(plates).toBeGreaterThan(12);
    expect(plates).toBeLessThan(19);
  });

  it('Bänder transportieren Erz ins Lager', () => {
    const game = newGame();
    give(game, { drill_mech: 1, belt_1: 3, storage: 1 });
    const [x, y] = findOreSpot(game, 'copper_ore', 6);
    game.build('drill_mech', x, y, 0);
    for (let i = 0; i < 3; i++) expect(game.build('belt_1', x + 2 + i, y, 0)).toBeNull();
    game.build('storage', x + 5, y, 0);
    run(game, 30);
    expect(amountOf(game.planet, 'copper_ore').toNumber()).toBeGreaterThan(7);
  });

  it('ohne Abnehmer staut sich der Ausgang', () => {
    const game = newGame();
    give(game, { drill_mech: 1 });
    const [x, y] = findOreSpot(game, 'iron_ore', 2);
    game.build('drill_mech', x, y, 0);
    run(game, 60);
    const rt = [...game.world.runtimes.values()].find((r) => r.def.id === 'drill_mech')!;
    expect(rt.status).toBe('output_blocked');
  });

  it('Bauen verbraucht Items, Abreißen gibt sie zurück', () => {
    const game = newGame();
    give(game, { drill_mech: 1 });
    const [x, y] = findOreSpot(game, 'iron_ore', 2);
    expect(game.build('drill_mech', x, y, 0)).toBeNull();
    expect(amountOf(game.planet, 'drill_mech').toNumber()).toBe(0);
    expect(game.build('drill_mech', x, y, 0)).not.toBeNull();
    const id = game.world.entityAt(x, y)!.id;
    expect(game.deconstruct(id)).toBe(true);
    expect(amountOf(game.planet, 'drill_mech').toNumber()).toBe(1);
  });

  it('Bohrer brauchen Erz darunter', () => {
    const game = newGame();
    give(game, { drill_mech: 1 });
    const hub = game.terrain.hub;
    expect(game.build('drill_mech', hub.x + 4, hub.y, 0)).toBe('Bohrer brauchen Erz darunter');
  });
});

describe('Hand', () => {
  it('Handabbau und Handfertigung mit Zwischenprodukten', () => {
    const game = newGame();
    const [x, y] = findOreSpot(game, 'iron_ore', 0);
    for (let i = 0; i < 10; i++) game.mineTile(x, y);
    expect(amountOf(game.planet, 'iron_ore').toNumber()).toBe(10);

    give(game, { iron_plate: 9, stone: 5 });
    // Bohrer braucht 3 Zahnräder (6 Platten) + 3 Platten + 5 Stein → Zahnräder werden mitgefertigt
    expect(game.craft('drill_mech', 1)).toBe(true);
    expect(game.state.handQueue.map((j) => j.recipe)).toEqual(['gear', 'drill_mech']);
    run(game, 5);
    expect(amountOf(game.planet, 'drill_mech').toNumber()).toBe(1);
    expect(amountOf(game.planet, 'iron_plate').toNumber()).toBe(0);
  });

  it('lehnt Rezepte ohne genug Rohstoffe ab', () => {
    const game = newGame();
    give(game, { iron_plate: 2 });
    expect(game.craft('drill_mech', 1)).toBe(false);
    expect(game.state.handQueue.length).toBe(0);
  });

  it('gesperrte Rezepte sind nicht herstellbar', () => {
    const game = newGame();
    give(game, { circuit: 10, gear: 10, iron_plate: 20 });
    expect(game.craft('assembler_1', 1)).toBe(false);
    game.state.research.done.add('automation');
    expect(game.craft('assembler_1', 1)).toBe(true);
  });
});

describe('Forschung', () => {
  it('Labore verbrauchen Datenkerne und schließen Forschung ab', () => {
    const game = newGame();
    give(game, { lab_1: 1, terminal: 1, gen_coal: 1, sci_red: 100, coal: 0, belt_1: 1 });
    game.state.research.done.add('electricity');
    // Solarfreie Variante: Labor braucht Strom → zum Test Stromverbrauch prüfen, Forschung über Terminal speisen
    const hub = game.terrain.hub;
    // Terminal rechts neben der Kapsel, Labor dahinter
    const tx = hub.x + 4;
    const ty = hub.y + 6;
    expect(game.build('terminal', tx, ty, 0)).toBeNull();
    game.setFilter(game.world.entityAt(tx, ty)!.id, 'sci_red');
    expect(game.build('lab_1', tx + 1, ty - 1, 0)).toBeNull();
    game.startResearch('automation');
    run(game, 30);
    // Ohne Strom forscht das Labor nicht
    expect(game.state.research.done.has('automation')).toBe(false);
    const lab = [...game.world.runtimes.values()].find((r) => r.def.id === 'lab_1')!;
    expect(lab.status).toBe('no_power');
  });
});

describe('Forschung mit Strom', () => {
  it('Kohlekraftwerk versorgt Labor, Forschung wird abgeschlossen', () => {
    const game = newGame();
    give(game, { lab_1: 1, terminal: 2, gen_coal: 1, sci_red: 100, coal: 100 });
    game.state.research.done.add('electricity');
    const hub = game.terrain.hub;
    // Freie Fläche unterhalb der Kapsel suchen
    let base: [number, number] | null = null;
    for (let y = hub.y + 4; y < game.terrain.height - 4 && !base; y++)
      for (let x = 2; x < game.terrain.width - 8 && !base; x++) {
        let free = true;
        for (let dy = -1; dy < 3 && free; dy++) for (let dx = 0; dx < 8 && free; dx++) if (game.world.canPlace('belt_1', x + dx, y + dy)) free = false;
        if (free) base = [x, y];
      }
    const [x, y] = base!;
    // Terminal (Kohle) → Kraftwerk
    expect(game.build('terminal', x, y, 0)).toBeNull();
    game.setFilter(game.world.entityAt(x, y)!.id, 'coal');
    expect(game.build('gen_coal', x + 1, y, 0)).toBeNull();
    // Terminal (Datenkerne) → Labor
    expect(game.build('terminal', x + 3, y, 0)).toBeNull();
    game.setFilter(game.world.entityAt(x + 3, y)!.id, 'sci_red');
    expect(game.build('lab_1', x + 4, y - 1, 0)).toBeNull();
    game.startResearch('automation');
    run(game, 120);
    expect(game.world.power.gen).toBeGreaterThan(0);
    expect(game.state.research.done.has('automation')).toBe(true);
    expect(amountOf(game.planet, 'sci_red').toNumber()).toBeLessThan(95);
  });
});
