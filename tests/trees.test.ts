import { describe, expect, it } from 'vitest';
import { MACHINE_TREES, MACHINE_TREE_ORDER } from '../src/data/machineTrees';
import { allocatedSet, machineLevel, pointsLeft } from '../src/systems/machineTrees';
import { levelInfo, MACHINE_CURVE } from '../src/systems/levels';
import { newGame } from './helpers';

describe('Maschinenbäume', () => {
  it('alle Bäume sind zusammenhängend und haben Keystones', () => {
    for (const g of MACHINE_TREE_ORDER) {
      const tree = MACHINE_TREES[g];
      const seen = new Set<string>();
      const stack = [`${g}:start`];
      while (stack.length) {
        const id = stack.pop()!;
        if (seen.has(id)) continue;
        seen.add(id);
        stack.push(...tree.neighbors.get(id)!);
      }
      expect(seen.size).toBe(Object.keys(tree.nodes).length);
      expect(Object.values(tree.nodes).filter((n) => n.kind === 'notable').length).toBeGreaterThanOrEqual(4);
    }
  });

  it('Level-Kurve', () => {
    expect(levelInfo(MACHINE_CURVE, 0).level).toBe(1);
    expect(levelInfo(MACHINE_CURVE, 40).level).toBe(2);
    expect(levelInfo(MACHINE_CURVE, 39.9).level).toBe(1);
  });

  it('Pfad wird automatisch vergeben, wenn genug Punkte da sind', () => {
    const game = newGame();
    game.state.machines.xp.drill = 1e6;
    const points = pointsLeft(game.state, 'drill');
    expect(points).toBe(machineLevel(game.state, 'drill').level);
    expect(game.allocateMachineNode('drill', 'drill:speed:4')).toBe(true);
    expect(allocatedSet(game.state, 'drill').size).toBe(5);
    expect(pointsLeft(game.state, 'drill')).toBe(points - 4);
  });

  it('ohne Punkte kann nichts vergeben werden', () => {
    const game = newGame();
    expect(pointsLeft(game.state, 'drill')).toBe(1);
    expect(game.allocateMachineNode('drill', 'drill:speed:2')).toBe(false);
    expect(game.allocateMachineNode('drill', 'drill:speed:1')).toBe(true);
    expect(game.allocateMachineNode('drill', 'drill:speed:2')).toBe(false);
  });

  it('Rücknahme nur, wenn nichts abgeschnitten wird', () => {
    const game = newGame();
    game.state.machines.xp.drill = 1e6;
    game.allocateMachineNode('drill', 'drill:speed:3');
    expect(game.refundMachineNode('drill', 'drill:speed:1')).toBe(false);
    expect(game.refundMachineNode('drill', 'drill:speed:3')).toBe(true);
    expect(game.refundMachineNode('drill', 'drill:start')).toBe(false);
  });

  it('vergebene Knoten wirken über die Engine', () => {
    const game = newGame();
    game.state.machines.xp.drill = 1e6;
    const before = game.engine.value('speed', new Set(['drill']), 1);
    game.allocateMachineNode('drill', 'drill:speed:1');
    const after = game.engine.value('speed', new Set(['drill']), 1);
    expect(after).toBeGreaterThan(before);
  });

  it('Keystone setzt Sonderregel', () => {
    const game = newGame();
    game.state.machines.xp.generator = 1e9;
    game.allocateMachineNode('generator', 'generator:out:9');
    expect(game.engine.has('overloadGrid')).toBe(true);
  });
});
