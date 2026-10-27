import { describe, expect, it } from 'vitest';
import type { Dir } from '../src/core/state';
import { give, newGame } from './helpers';

/** Sucht eine freie 5×5-Fläche ohne Erz. */
function area(game: ReturnType<typeof newGame>): [number, number] {
  const t = game.terrain;
  for (let y = 2; y < t.height - 7; y++)
    for (let x = 2; x < t.width - 7; x++) {
      let free = true;
      for (let dy = 0; dy < 5 && free; dy++) for (let dx = 0; dx < 5 && free; dx++) if (game.world.canPlace('belt_1', x + dx, y + dy)) free = false;
      if (free) return [x, y];
    }
  throw new Error('kein Platz');
}

function belt(game: ReturnType<typeof newGame>, x: number, y: number, rot: Dir) {
  expect(game.build('belt_1', x, y, rot)).toBeNull();
  return game.world.runtimes.get(game.world.entityAt(x, y)!.id)!;
}

describe('Bandkurven', () => {
  it('Ecke: Band von links in ein nach unten laufendes Band', () => {
    const game = newGame();
    give(game, { belt_1: 20 });
    const [x, y] = area(game);
    belt(game, x, y, 0); // nach rechts
    const corner = belt(game, x + 1, y, 1); // nach unten
    expect(corner.curveFrom).toBe(2); // Items kommen von links
  });

  it('gerade Strecke ist keine Kurve', () => {
    const game = newGame();
    give(game, { belt_1: 20 });
    const [x, y] = area(game);
    belt(game, x, y, 0);
    const next = belt(game, x + 1, y, 0);
    expect(next.curveFrom).toBeNull();
  });

  it('Zubringer von hinten und von der Seite: gerade (seitliches Einfädeln)', () => {
    const game = newGame();
    give(game, { belt_1: 20 });
    const [x, y] = area(game);
    belt(game, x, y + 1, 0); // von hinten
    belt(game, x + 1, y, 1); // von oben (Seite)
    const target = belt(game, x + 1, y + 1, 0);
    expect(target.curveFrom).toBeNull();
  });

  it('T-Kreuzung von beiden Seiten bleibt gerade', () => {
    const game = newGame();
    give(game, { belt_1: 20 });
    const [x, y] = area(game);
    belt(game, x + 1, y, 1); // von oben
    belt(game, x + 1, y + 2, 3); // von unten
    const target = belt(game, x + 1, y + 1, 0);
    expect(target.curveFrom).toBeNull();
  });

  it('Drehen des Zubringers aktualisiert die Kurve', () => {
    const game = newGame();
    give(game, { belt_1: 20 });
    const [x, y] = area(game);
    const feeder = belt(game, x, y, 0);
    const corner = belt(game, x + 1, y, 1);
    expect(corner.curveFrom).toBe(2);
    game.setRotation(feeder.entity.id, 1); // zeigt jetzt woanders hin
    expect(game.world.runtimes.get(corner.entity.id)!.curveFrom).toBeNull();
  });
});
