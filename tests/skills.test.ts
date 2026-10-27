import { describe, expect, it } from 'vitest';
import { amountOf } from '../src/systems/inventory';
import { findOreSpot, give, newGame, run } from './helpers';

describe('Aktive Skills', () => {
  it('Orbitalschlag kostet Energie, lädt nach und sprengt Erz ohne Gegner', () => {
    const game = newGame();
    const [x, y] = findOreSpot(game, 'iron_ore', 0);
    expect(game.castSkill('orbital', x + 1, y + 1)).toBeNull();
    expect(game.state.skills.energy).toBe(70);
    expect(amountOf(game.planet, 'iron_ore').toNumber()).toBeGreaterThan(10);
    expect(game.castSkill('orbital', x + 1, y + 1)).toBe('Lädt nach');
    run(game, 16);
    expect(game.skillBlocked('orbital')).toBeNull();
  });

  it('gesperrte Skills und zu wenig Energie', () => {
    const game = newGame();
    expect(game.castSkill('time_dilation')).toBe('Ab Kommandanten-Level 20');
    game.state.skills.energy = 5;
    expect(game.castSkill('orbital', 1, 1)).toBe('Zu wenig Energie');
  });

  it('Orbitalschlag trifft Gegner', () => {
    const game = newGame();
    const e = game.world.threat.spawn(game.world, 'sandcrawler', 1, game.rng, { x: 10, y: 10 });
    game.castSkill('orbital', e.x, e.y);
    run(game, 0.1);
    expect(game.world.threat.enemies.length).toBe(0);
  });

  it('Überladung beschleunigt Maschinen im Bereich', () => {
    const game = newGame();
    game.state.commander.xp = 1e5;
    give(game, { drill_mech: 1, storage: 1 });
    const [x, y] = findOreSpot(game, 'iron_ore', 4);
    game.build('drill_mech', x, y, 0);
    game.build('storage', x + 2, y, 0);
    run(game, 5);
    const before = amountOf(game.planet, 'iron_ore').toNumber();
    run(game, 5);
    const normal = amountOf(game.planet, 'iron_ore').toNumber() - before;
    expect(game.castSkill('overcharge', x + 1, y + 1)).toBeNull();
    const start = amountOf(game.planet, 'iron_ore').toNumber();
    run(game, 5);
    const boosted = amountOf(game.planet, 'iron_ore').toNumber() - start;
    expect(boosted / normal).toBeGreaterThan(2.5);
  });

  it('Chips: einsetzen verbraucht, Effizienz senkt Kosten, Echo wiederholt', () => {
    const game = newGame();
    game.state.skills.chips = { efficiency: 1, echo: 1, duration: 1 };
    expect(game.socketChip('orbital', 'duration')).toBe('Passt nicht zu diesem Skill');
    expect(game.socketChip('orbital', 'efficiency')).toBeNull();
    expect(game.state.skills.chips.efficiency).toBe(0);
    expect(game.skillParams('orbital').cost).toBeCloseTo(18);
    game.unsocketChip('orbital', 'efficiency');
    expect(game.state.skills.chips.efficiency).toBe(1);
    game.socketChip('orbital', 'echo');
    const [x, y] = findOreSpot(game, 'copper_ore', 0);
    game.castSkill('orbital', x + 1, y + 1);
    const once = amountOf(game.planet, 'copper_ore').toNumber();
    run(game, 3);
    expect(amountOf(game.planet, 'copper_ore').toNumber()).toBeGreaterThan(once);
  });
});
