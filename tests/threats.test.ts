import { describe, expect, it } from 'vitest';
import { mitigate } from '../src/sim/threats';
import { amountOf } from '../src/systems/inventory';
import { give, newGame, run } from './helpers';

function freeSpot(game: ReturnType<typeof newGame>, type: string): [number, number] {
  const t = game.terrain;
  for (let y = 4; y < t.height - 4; y++) for (let x = 4; x < t.width - 4; x++) if (!game.world.canPlace(type, x, y)) return [x, y];
  throw new Error('kein Platz');
}

describe('Kampf', () => {
  it('Resistenzen und Durchdringung', () => {
    expect(mitigate(100, 'kinetic', { kinetic: 50 }, 0, false)).toBe(50);
    expect(mitigate(100, 'kinetic', { kinetic: 50 }, 20, false)).toBe(70);
    expect(mitigate(100, 'thermal', { thermal: -30 }, 0, false)).toBe(130);
    expect(mitigate(100, 'kinetic', { kinetic: 200 }, 0, false)).toBeCloseTo(10);
    expect(mitigate(100, 'void', { void: 60 }, 0, false)).toBe(70);
    expect(mitigate(100, 'kinetic', {}, 0, true)).toBeCloseTo(115);
  });

  it('Geschützturm verbraucht Munition und besiegt Gegner', () => {
    const game = newGame();
    give(game, { turret_gun: 1, ammo: 200 });
    const [x, y] = freeSpot(game, 'turret_gun');
    expect(game.build('turret_gun', x, y, 0)).toBeNull();
    for (let i = 0; i < 3; i++) game.world.threat.spawn(game.world, 'sandcrawler', 1, game.rng, { x: x + 5, y: y + 1 });
    run(game, 20);
    expect(game.world.threat.enemies.length).toBe(0);
    expect(amountOf(game.planet, 'ammo').toNumber()).toBeLessThan(200);
    expect(game.threatOf('kepler').kills).toBe(3);
  });

  it('ohne Munition schießt der Turm nicht, Gegner beschädigen Gebäude, danach Reparatur', () => {
    const game = newGame();
    give(game, { turret_gun: 1 });
    const [x, y] = freeSpot(game, 'turret_gun');
    game.build('turret_gun', x, y, 0);
    const id = game.world.entityAt(x, y)!.id;
    const e = game.world.threat.spawn(game.world, 'sandcrawler', 1, game.rng, { x: x + 3, y: y + 1 });
    run(game, 10);
    const rt = game.world.runtimes.get(id)!;
    expect(rt.status).toBe('no_input');
    expect(rt.entity.hp!).toBeLessThan(rt.def.hp);
    // Gegner entfernen → Reparatur nach Ruhephase
    e.hp = 0;
    run(game, 40);
    expect(rt.entity.hp).toBeUndefined();
  });

  it('Boss braucht Signalbake, besiegter Boss schaltet nächste Stufe frei und gibt Beute', () => {
    const game = newGame();
    expect(game.summonBoss(1, [])).toBe('Keine Signalbake im Inventar');
    give(game, { signal_beacon: 1 });
    expect(game.summonBoss(2, [])).toBe('Diese Bedrohungsstufe ist noch gesperrt');
    expect(game.summonBoss(1, ['hp'])).toBeNull();
    const boss = game.world.threat.enemies.find((e) => e.boss)!;
    expect(boss.maxHp).toBeCloseTo(6000 * 1.4);
    const itemsBefore = Object.keys(game.state.loot.items).length;
    boss.hp = 0;
    run(game, 0.1);
    expect(game.threatOf('kepler').maxTier).toBe(2);
    expect(Object.keys(game.state.loot.items).length).toBeGreaterThan(itemsBefore);
  });

  it('Wellen kommen erst ab einer gewissen Fabrikgröße, friedlicher Modus stoppt sie', () => {
    const game = newGame();
    expect(game.threatsActive(game.world)).toBe(false);
    game.state.research.done.add('defense');
    give(game, { storage: 25 });
    let placed = 0;
    for (let y = 2; y < game.terrain.height - 2 && placed < 22; y += 2)
      for (let x = 2; x < game.terrain.width - 2 && placed < 22; x += 2) if (!game.build('storage', x, y, 0)) placed++;
    expect(game.threatsActive(game.world)).toBe(true);
    game.threatOf('kepler').timer = 0;
    run(game, 0.1);
    expect(game.world.threat.enemies.length).toBeGreaterThan(0);
    game.setSetting('peaceful', true);
    expect(game.threatsActive(game.world)).toBe(false);
  });
});
