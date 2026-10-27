import type { GameState } from '../core/state';
import type { Flag, SourcedModifier } from '../engine/types';
import { MACHINE_TREES, MACHINE_TREE_ORDER } from '../data/machineTrees';
import type { TreeGroup } from '../data/machines';
import { canAllocate, canRefund, pathTo } from '../data/treeTypes';
import { levelInfo, MACHINE_CURVE } from './levels';

export function startNode(group: TreeGroup): string {
  return `${group}:start`;
}

export function allocatedSet(state: GameState, group: TreeGroup): Set<string> {
  const list = state.machines.allocated[group];
  return new Set(list && list.length ? list : [startNode(group)]);
}

export function machineLevel(state: GameState, group: TreeGroup) {
  return levelInfo(MACHINE_CURVE, state.machines.xp[group] ?? 0);
}

/** Freie Punkte: ein Punkt pro Level, der Startknoten ist geschenkt. */
export function pointsLeft(state: GameState, group: TreeGroup): number {
  return machineLevel(state, group).level - (allocatedSet(state, group).size - 1);
}

/** Vergibt den Knoten samt Pfad dorthin. Gibt die Anzahl vergebener Knoten zurück. */
export function allocateNode(state: GameState, group: TreeGroup, nodeId: string): number {
  const tree = MACHINE_TREES[group];
  const allocated = allocatedSet(state, group);
  const path = canAllocate(tree, allocated, nodeId) ? [nodeId] : pathTo(tree, allocated, nodeId);
  if (!path || path.length === 0 || path.length > pointsLeft(state, group)) return 0;
  for (const id of path) allocated.add(id);
  state.machines.allocated[group] = [...allocated];
  return path.length;
}

export function refundNode(state: GameState, group: TreeGroup, nodeId: string): boolean {
  const tree = MACHINE_TREES[group];
  const allocated = allocatedSet(state, group);
  if (!canRefund(tree, allocated, nodeId, new Set([startNode(group)]))) return false;
  allocated.delete(nodeId);
  state.machines.allocated[group] = [...allocated];
  return true;
}

export function resetTree(state: GameState, group: TreeGroup): void {
  state.machines.allocated[group] = [startNode(group)];
}

export function machineTreeModifiers(state: GameState): SourcedModifier[] {
  const mods: SourcedModifier[] = [];
  for (const group of MACHINE_TREE_ORDER) {
    const tree = MACHINE_TREES[group];
    for (const id of allocatedSet(state, group)) {
      const node = tree.nodes[id];
      if (!node) continue;
      for (const m of node.mods) mods.push({ ...m, source: `${tree.name}: ${node.name}` });
    }
  }
  return mods;
}

export function machineTreeFlags(state: GameState): Flag[] {
  const flags: Flag[] = [];
  for (const group of MACHINE_TREE_ORDER) {
    const tree = MACHINE_TREES[group];
    for (const id of allocatedSet(state, group)) flags.push(...(tree.nodes[id]?.flags ?? []));
  }
  return flags;
}
