import { describe, expect, it } from 'vitest';
import { D } from '../src/core/bignum';
import { deserialize, exportSave, importSave, serialize } from '../src/core/save';
import { newGame } from './helpers';

describe('Spielstand', () => {
  it('Export und Import ergeben denselben Zustand', () => {
    const game = newGame();
    game.planet.inventory.iron_plate = D('1.5e42');
    game.state.research.done.add('automation');
    game.state.settings.notation = 'scientific';
    const loaded = importSave(exportSave(game.state));
    expect(loaded.planets.kepler.inventory.iron_plate.eq(D('1.5e42'))).toBe(true);
    expect(loaded.research.done.has('automation')).toBe(true);
    expect(loaded.settings.notation).toBe('scientific');
    expect(loaded.planets.kepler.entities.some((e) => e.type === 'hub')).toBe(true);
  });

  it('ergänzt fehlende Felder aus den Standardwerten', () => {
    const game = newGame();
    const raw = serialize(game.state);
    delete (raw.state as Record<string, unknown>).counters;
    const loaded = deserialize(raw);
    expect(loaded.counters.clicks).toBe(0);
  });

  it('lehnt alte Keks-Spielstände und ungültige Codes ab', () => {
    expect(() => deserialize({ v: 1, state: {} })).toThrow();
    expect(() => importSave('kein-gültiger-code')).toThrow();
  });
});
