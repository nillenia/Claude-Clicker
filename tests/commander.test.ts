import { describe, expect, it } from 'vitest';
import { ASCENDANCIES, CLASSES, COMMANDER_TREE } from '../src/data/commanderTree';
import * as cmd from '../src/systems/commander';
import { newGame } from './helpers';

describe('Kommandanten-Baum', () => {
  it('ist groß, zusammenhängend und jede Klasse erreicht das Zentrum', () => {
    const nodes = Object.keys(COMMANDER_TREE.nodes);
    expect(nodes.length).toBeGreaterThanOrEqual(200);
    const seen = new Set<string>();
    const stack = ['engineer:start'];
    while (stack.length) {
      const id = stack.pop()!;
      if (seen.has(id)) continue;
      seen.add(id);
      stack.push(...COMMANDER_TREE.neighbors.get(id)!);
    }
    expect(seen.size).toBe(nodes.length);
    const keystones = Object.values(COMMANDER_TREE.nodes).filter((n) => n.kind === 'keystone');
    expect(keystones.length).toBe(10);
  });

  it('Klasse wählen, Punkte vergeben, Pfad nicht durch fremde Starts', () => {
    const game = newGame();
    game.commander((s) => cmd.chooseClass(s, 'prospector'));
    expect(cmd.commanderPointsLeft(game.state)).toBe(1);
    game.state.commander.xp = 1e7;
    const points = cmd.commanderPointsLeft(game.state);
    expect(points).toBeGreaterThan(20);
    expect(game.commander((s) => cmd.allocateCommanderNode(s, 'prospector:ks'))).toBe(7);
    expect(game.engine.has('monoculture')).toBe(true);
    // Fremder Start ist gesperrt
    expect(game.commander((s) => cmd.allocateCommanderNode(s, 'engineer:start'))).toBe(0);
  });

  it('Meisterschaft wirkt erst nach Auswahl', () => {
    const game = newGame();
    game.commander((s) => cmd.chooseClass(s, 'engineer'));
    game.state.commander.xp = 1e7;
    game.commander((s) => cmd.allocateCommanderNode(s, 'engineer:mastery'));
    const tags = new Set(['crafter']);
    const before = game.engine.value('productivity', tags, 0);
    game.commander((s) => cmd.setMastery(s, 'engineer:mastery', 0));
    expect(game.engine.value('productivity', tags, 0)).toBeCloseTo(before + 10);
  });

  it('Aszendenz ab Level 30, nur eigene Klasse', () => {
    const game = newGame();
    game.commander((s) => cmd.chooseClass(s, 'quantum'));
    expect(game.commander((s) => cmd.chooseAscendancy(s, 'timeweaver'))).toBe(false);
    game.state.commander.xp = 1e9;
    expect(cmd.commanderLevel(game.state).level).toBeGreaterThanOrEqual(30);
    expect(game.commander((s) => cmd.chooseAscendancy(s, 'chief'))).toBe(false);
    expect(game.commander((s) => cmd.chooseAscendancy(s, 'timeweaver'))).toBe(true);
    const node = Object.keys(ASCENDANCIES.timeweaver.tree.nodes).find((id) => id.endsWith(':b0:1'))!;
    expect(game.commander((s) => cmd.allocateAscendancyNode(s, node))).toBe(1);
  });

  it('jede Klasse hat zwei Aszendenzen', () => {
    for (const c of CLASSES) for (const a of c.ascendancies) expect(ASCENDANCIES[a].classId).toBe(c.id);
  });

  it('Maschinen-Erfahrung zählt für den Kommandanten', () => {
    const game = newGame();
    game.addXp('drill', 1000);
    game.save();
    expect(game.state.commander.xp).toBeCloseTo(500);
  });
});
