import type { GameState } from '../core/state';
import type { Flag, SourcedModifier } from '../engine/types';
import { ASCENDANCIES, CLASS_BY_ID, CLASSES, COMMANDER_TREE } from '../data/commanderTree';
import { canAllocate, canRefund, pathTo } from '../data/treeTypes';
import { COMMANDER_CURVE, levelInfo } from './levels';

/** Level, ab denen je 2 Aszendenzpunkte dazukommen. */
export const ASCENDANCY_LEVELS = [30, 40, 55, 70];
export const ASCENDANCY_UNLOCK = ASCENDANCY_LEVELS[0];

export function commanderLevel(state: GameState) {
  return levelInfo(COMMANDER_CURVE, state.commander.xp);
}

export function classStart(classId: string): string {
  return `${classId}:start`;
}

export function commanderAllocated(state: GameState): Set<string> {
  return new Set(state.commander.allocated);
}

export function commanderPointsLeft(state: GameState): number {
  if (!state.commander.classId) return 0;
  return commanderLevel(state).level - (state.commander.allocated.length - 1);
}

/** Fremde Klassenstarts dürfen nicht betreten werden. */
export function blockedForClass(classId: string | null): (id: string) => boolean {
  return (id) => id.endsWith(':start') && id !== (classId ? classStart(classId) : '');
}

export function chooseClass(state: GameState, classId: string): boolean {
  if (!CLASS_BY_ID[classId]) return false;
  const c = state.commander;
  c.classId = classId;
  c.allocated = [classStart(classId)];
  c.ascendancy = null;
  c.ascAllocated = [];
  c.masteries = {};
  return true;
}

export function allocateCommanderNode(state: GameState, nodeId: string): number {
  const c = state.commander;
  if (!c.classId) return 0;
  const allocated = commanderAllocated(state);
  const blocked = blockedForClass(c.classId);
  if (blocked(nodeId)) return 0;
  const path = canAllocate(COMMANDER_TREE, allocated, nodeId) ? [nodeId] : pathTo(COMMANDER_TREE, allocated, nodeId, blocked);
  if (!path || path.length === 0 || path.length > commanderPointsLeft(state)) return 0;
  c.allocated.push(...path);
  return path.length;
}

export function refundCommanderNode(state: GameState, nodeId: string): boolean {
  const c = state.commander;
  if (!c.classId) return false;
  const allocated = commanderAllocated(state);
  if (!canRefund(COMMANDER_TREE, allocated, nodeId, new Set([classStart(c.classId)]))) return false;
  c.allocated = c.allocated.filter((id) => id !== nodeId);
  delete c.masteries[nodeId];
  return true;
}

export function resetCommanderTree(state: GameState): void {
  const c = state.commander;
  if (!c.classId) return;
  c.allocated = [classStart(c.classId)];
  c.masteries = {};
}

export function setMastery(state: GameState, nodeId: string, choice: number): boolean {
  const node = COMMANDER_TREE.nodes[nodeId];
  if (!node?.choices || !state.commander.allocated.includes(nodeId) || !node.choices[choice]) return false;
  state.commander.masteries[nodeId] = choice;
  return true;
}

// ---------- Aszendenz ----------

export function ascendancyPoints(state: GameState): number {
  const level = commanderLevel(state).level;
  return ASCENDANCY_LEVELS.filter((l) => level >= l).length * 2;
}

export function ascendancyPointsLeft(state: GameState): number {
  return ascendancyPoints(state) - Math.max(0, state.commander.ascAllocated.length - 1);
}

export function chooseAscendancy(state: GameState, id: string): boolean {
  const asc = ASCENDANCIES[id];
  const c = state.commander;
  if (!asc || asc.classId !== c.classId || c.ascendancy || commanderLevel(state).level < ASCENDANCY_UNLOCK) return false;
  c.ascendancy = id;
  c.ascAllocated = [`asc:${id}:start`];
  return true;
}

export function allocateAscendancyNode(state: GameState, nodeId: string): number {
  const c = state.commander;
  if (!c.ascendancy) return 0;
  const tree = ASCENDANCIES[c.ascendancy].tree;
  const allocated = new Set(c.ascAllocated);
  const path = canAllocate(tree, allocated, nodeId) ? [nodeId] : pathTo(tree, allocated, nodeId);
  if (!path || path.length === 0 || path.length > ascendancyPointsLeft(state)) return 0;
  c.ascAllocated.push(...path);
  return path.length;
}

export function refundAscendancyNode(state: GameState, nodeId: string): boolean {
  const c = state.commander;
  if (!c.ascendancy) return false;
  const tree = ASCENDANCIES[c.ascendancy].tree;
  if (!canRefund(tree, new Set(c.ascAllocated), nodeId, new Set([`asc:${c.ascendancy}:start`]))) return false;
  c.ascAllocated = c.ascAllocated.filter((id) => id !== nodeId);
  return true;
}

// ---------- Modifier ----------

export function commanderModifiers(state: GameState): SourcedModifier[] {
  const mods: SourcedModifier[] = [];
  const c = state.commander;
  for (const id of c.allocated) {
    const node = COMMANDER_TREE.nodes[id];
    if (!node) continue;
    for (const m of node.mods) mods.push({ ...m, source: `Kommandant: ${node.name}` });
    if (node.choices) {
      const choice = node.choices[c.masteries[id] ?? -1];
      if (choice) for (const m of choice.mods) mods.push({ ...m, source: `Meisterschaft: ${choice.name}` });
    }
  }
  if (c.ascendancy) {
    const asc = ASCENDANCIES[c.ascendancy];
    for (const id of c.ascAllocated) {
      const node = asc.tree.nodes[id];
      if (!node) continue;
      for (const m of node.mods) mods.push({ ...m, source: `${asc.name}: ${node.name}` });
    }
  }
  return mods;
}

export function commanderFlags(state: GameState): Flag[] {
  const flags: Flag[] = [];
  for (const id of state.commander.allocated) flags.push(...(COMMANDER_TREE.nodes[id]?.flags ?? []));
  if (state.commander.ascendancy) {
    const tree = ASCENDANCIES[state.commander.ascendancy].tree;
    for (const id of state.commander.ascAllocated) flags.push(...(tree.nodes[id]?.flags ?? []));
  }
  return flags;
}

export { CLASSES };
