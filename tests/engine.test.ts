import { describe, expect, it } from 'vitest';
import { StatEngine } from '../src/engine/engine';
import type { SourcedModifier } from '../src/engine/types';
import { researchModifiers } from '../src/systems/research';
import { amountOf } from '../src/systems/inventory';
import { findOreSpot, give, newGame, run } from './helpers';

function engineWith(mods: SourcedModifier[]): StatEngine {
  const e = new StatEngine();
  e.addProvider(() => mods);
  e.refresh();
  return e;
}

const tags = (...t: string[]) => new Set(t);

describe('StatEngine', () => {
  it('rechnet (Basis + flat) × (1 + Σinc) × Π more', () => {
    const e = engineWith([
      { stat: 'speed', kind: 'flat', value: 1, source: 'a' },
      { stat: 'speed', kind: 'inc', value: 50, source: 'b' },
      { stat: 'speed', kind: 'inc', value: 50, source: 'c' },
      { stat: 'speed', kind: 'more', value: 100, source: 'd' },
      { stat: 'speed', kind: 'more', value: 50, source: 'e' },
    ]);
    // (1 + 1) × 2 × 2 × 1,5 = 12
    expect(e.value('speed', tags(), 1)).toBeCloseTo(12);
  });

  it('wendet Modifier nur bei passenden Tags an', () => {
    const e = engineWith([
      { stat: 'speed', kind: 'inc', value: 100, tags: ['drill'], source: 'a' },
      { stat: 'speed', kind: 'inc', value: 10, tags: ['drill', 'planet:ignis'], source: 'b' },
    ]);
    expect(e.value('speed', tags('furnace'), 1)).toBe(1);
    expect(e.value('speed', tags('drill', 'planet:kepler'), 1)).toBe(2);
    expect(e.value('speed', tags('drill', 'planet:ignis'), 1)).toBeCloseTo(2.1);
  });

  it('Nachbarschafts-Bedingungen skalieren mit der Anzahl', () => {
    const e = engineWith([{ stat: 'speed', kind: 'inc', value: 12, condition: { kind: 'perAdjacent', tag: 'drill', max: 4 }, source: 'a' }]);
    const ctx = (n: number) => ({ adjacency: new Map([['drill', n]]) });
    expect(e.value('speed', tags(), 1, undefined, ctx(0))).toBe(1);
    expect(e.value('speed', tags(), 1, undefined, ctx(2))).toBeCloseTo(1.24);
    expect(e.value('speed', tags(), 1, undefined, ctx(9))).toBeCloseTo(1.48);
    expect(e.value('speed', tags(), 1, undefined, { ...ctx(2), adjacencyScale: 2 })).toBeCloseTo(1.48);
  });

  it('Aufschlüsselung nennt die Quellen', () => {
    const e = engineWith([
      { stat: 'power', kind: 'inc', value: 30, source: 'Umwelt' },
      { stat: 'power', kind: 'more', value: -50, source: 'Modul' },
    ]);
    const b = e.breakdown('power', tags(), 1);
    expect(b.lines.map((l) => l.source)).toEqual(['Umwelt', 'Modul']);
    expect(b.total).toBeCloseTo(0.65);
  });
});

describe('Engine im Spiel', () => {
  it('wiederholbare Forschung stapelt „more“ multiplikativ', () => {
    const game = newGame();
    game.state.research.levels.rep_stacking = 3;
    const mod = researchModifiers(game.state).find((m) => m.source.includes('Band-Stapelung'))!;
    expect(mod.value).toBeCloseTo(700); // 2³ − 1
  });

  it('Bergbau-Produktivität erhöht die Förderung', () => {
    const base = newGame();
    const boosted = newGame();
    boosted.state.research.levels.rep_mining = 5; // +50 % Produktivität
    boosted.refreshStats();
    for (const game of [base, boosted]) {
      give(game, { drill_mech: 1, storage: 1 });
      const [x, y] = findOreSpot(game, 'iron_ore', 4);
      game.build('drill_mech', x, y, 0);
      game.build('storage', x + 2, y, 0);
      run(game, 100);
    }
    const a = amountOf(base.planet, 'iron_ore').toNumber();
    const b = amountOf(boosted.planet, 'iron_ore').toNumber();
    expect(b / a).toBeCloseTo(1.5, 1);
  });

  it('Keystone „Schwarmlogik“ stoppt Maschinen ohne gleiche Nachbarn', () => {
    const game = newGame();
    game.engine.addFlagProvider(() => ['swarmLogic']);
    game.refreshStats();
    give(game, { drill_mech: 1, storage: 1 });
    const [x, y] = findOreSpot(game, 'iron_ore', 4);
    game.build('drill_mech', x, y, 0);
    game.build('storage', x + 2, y, 0);
    run(game, 20);
    expect(amountOf(game.planet, 'iron_ore').toNumber()).toBe(0);
  });
});
