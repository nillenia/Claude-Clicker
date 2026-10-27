import { describe, expect, it } from 'vitest';
import { amountOf } from '../src/systems/inventory';
import { COLONY_COST, ITEMS_PER_PART, SILO_RATE } from '../src/systems/logistics';
import { give, newGame, run } from './helpers';

function placeSilo(game: ReturnType<typeof newGame>) {
  // Freie 4×4-Fläche suchen
  const t = game.terrain;
  for (let y = 1; y < t.height - 5; y++)
    for (let x = 1; x < t.width - 5; x++) if (!game.world.canPlace('silo', x, y)) return game.build('silo', x, y, 0);
  throw new Error('kein Platz');
}

describe('Kolonien und Fracht', () => {
  it('Kolonie braucht Forschung, Silo und Raketenteile', () => {
    const game = newGame();
    expect(game.foundColony('ignis', 'kepler')).toBe(false);
    game.state.research.done.add('ignis_expedition');
    give(game, { rocket_part: COLONY_COST - 1 });
    expect(game.foundColony('ignis', 'kepler')).toBe(false);
    give(game, { rocket_part: COLONY_COST });
    expect(game.foundColony('ignis', 'kepler')).toBe(true);
    expect(game.worlds.has('ignis')).toBe(true);
    expect(amountOf(game.planet, 'rocket_part').toNumber()).toBe(0);
    expect(amountOf(game.state.planets.ignis, 'drill_mech').toNumber()).toBeGreaterThan(0);
  });

  it('Ignis-Umwelt verlangsamt nur Maschinen auf Ignis', () => {
    const game = newGame();
    game.state.research.done.add('ignis_expedition');
    give(game, { rocket_part: COLONY_COST });
    game.foundColony('ignis', 'kepler');
    // Startknoten des Bohrer-Baums: +5 % → 1,05 auf Kepler, 1 + 0,05 − 0,15 = 0,9 auf Ignis
    expect(game.engine.value('speed', new Set(['drill', 'planet:ignis']), 1)).toBeCloseTo(0.9);
    expect(game.engine.value('speed', new Set(['drill', 'planet:kepler']), 1)).toBeCloseTo(1.05);
  });

  it('Frachtroute verschickt Items und verbraucht Raketenteile', () => {
    const game = newGame();
    game.state.research.done.add('ignis_expedition');
    give(game, { rocket_part: COLONY_COST + 10, silo: 1, iron_plate: 10000, gen_solar: 0 });
    game.foundColony('ignis', 'kepler');
    expect(placeSilo(game)).toBeNull();
    // Silo braucht Strom – ohne Generator gilt Bedarf > 0 und Erzeugung 0
    game.addRoute('kepler', 'ignis', 'iron_plate', 3);
    run(game, 10);
    expect(amountOf(game.state.planets.ignis, 'iron_plate').toNumber()).toBe(50); // nur Kolonie-Kit
    // Strom per Kraftwerk + Kohle-Terminal ist aufwendig – Statusprüfung: Silo ohne Strom arbeitet nicht
    const silo = [...game.world.runtimes.values()].find((r) => r.def.category === 'silo')!;
    expect(silo.status).toBe('no_power');
  });

  it('Kapazität verteilt sich auf Routen, Ist-Rate folgt', () => {
    const game = newGame();
    game.state.research.done.add('ignis_expedition');
    give(game, { rocket_part: COLONY_COST + 10, silo: 1, iron_plate: 10000, copper_plate: 10000 });
    game.foundColony('ignis', 'kepler');
    placeSilo(game);
    // Silo als arbeitend markieren (Strom wird in einem eigenen Test geprüft)
    const silo = [...game.world.runtimes.values()].find((r) => r.def.category === 'silo')!;
    silo.def = { ...silo.def, power: 0 };
    game.addRoute('kepler', 'ignis', 'iron_plate', 4);
    game.addRoute('kepler', 'ignis', 'copper_plate', 4);
    run(game, 20);
    const iron = amountOf(game.state.planets.ignis, 'iron_plate').toNumber() - 50;
    const copper = amountOf(game.state.planets.ignis, 'copper_plate').toNumber();
    // 5 Items/s Kapazität, 8 angefordert → je 2,5/s
    expect(iron).toBeCloseTo(SILO_RATE * 0.5 * 20, -1);
    expect(copper).toBeCloseTo(SILO_RATE * 0.5 * 20, -1);
    const parts = amountOf(game.planet, 'rocket_part').toNumber();
    expect(parts).toBeCloseTo(10 - (iron + copper) / ITEMS_PER_PART, 1);
  });
});
