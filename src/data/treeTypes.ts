import type { Flag, Modifier } from '../engine/types';

export type NodeKind = 'start' | 'small' | 'notable' | 'keystone' | 'mastery' | 'socket' | 'ascendancy';

export interface TreeNode {
  id: string;
  kind: NodeKind;
  name: string;
  x: number;
  y: number;
  mods: Modifier[];
  flags?: Flag[];
  /** Zusätzlicher Text (z. B. Nachteile von Keystones). */
  description?: string;
  /** Startknoten einer Klasse (Kommandanten-Baum). */
  classStart?: string;
  /** Aszendenz-Knoten gehören zu einer Unterklasse. */
  ascendancy?: string;
  /** Mastery: Auswahl aus mehreren Effekten. */
  choices?: { name: string; mods: Modifier[] }[];
}

export interface TreeDef {
  id: string;
  name: string;
  nodes: Record<string, TreeNode>;
  edges: [string, string][];
  neighbors: Map<string, string[]>;
  /** Kanten zwischen Knoten gleichen Radius als Bögen um (0,0) zeichnen. */
  arcCenter?: boolean;
}

export function finalizeTree(id: string, name: string, nodes: TreeNode[], edges: [string, string][]): TreeDef {
  const map = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const neighbors = new Map<string, string[]>();
  for (const n of nodes) neighbors.set(n.id, []);
  for (const [a, b] of edges) {
    if (!map[a] || !map[b]) throw new Error(`Kante ${a}–${b} in Baum ${id} zeigt ins Leere`);
    neighbors.get(a)!.push(b);
    neighbors.get(b)!.push(a);
  }
  return { id, name, nodes: map, edges, neighbors };
}

/** Kann der Knoten vergeben werden (grenzt an einen vergebenen Knoten)? */
export function canAllocate(tree: TreeDef, allocated: ReadonlySet<string>, nodeId: string): boolean {
  if (allocated.has(nodeId)) return false;
  return (tree.neighbors.get(nodeId) ?? []).some((n) => allocated.has(n));
}

/** Kann der Knoten entfernt werden, ohne andere vom Start abzuschneiden? */
export function canRefund(tree: TreeDef, allocated: ReadonlySet<string>, nodeId: string, roots: ReadonlySet<string>): boolean {
  if (!allocated.has(nodeId) || roots.has(nodeId)) return false;
  const remaining = new Set(allocated);
  remaining.delete(nodeId);
  const seen = new Set<string>();
  const stack = [...roots].filter((r) => remaining.has(r));
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const n of tree.neighbors.get(id) ?? []) if (remaining.has(n) && !seen.has(n)) stack.push(n);
  }
  return seen.size === remaining.size;
}

/** Kürzester Pfad (nur über nicht vergebene Knoten) zu einem Zielknoten. */
export function pathTo(tree: TreeDef, allocated: ReadonlySet<string>, target: string, blocked?: (id: string) => boolean): string[] | null {
  if (allocated.has(target)) return [];
  const prev = new Map<string, string | null>();
  const queue: string[] = [];
  for (const a of allocated) {
    prev.set(a, null);
    queue.push(a);
  }
  while (queue.length) {
    const id = queue.shift()!;
    for (const n of tree.neighbors.get(id) ?? []) {
      if (prev.has(n) || blocked?.(n)) continue;
      prev.set(n, id);
      if (n === target) {
        const path: string[] = [];
        let cur: string | null = n;
        while (cur && !allocated.has(cur)) {
          path.unshift(cur);
          cur = prev.get(cur) ?? null;
        }
        return path;
      }
      queue.push(n);
    }
  }
  return null;
}

// ---------- Baukasten für strahlenförmige Bäume ----------

export interface BranchSpec {
  key: string;
  name: string;
  /** Winkel in Grad (0 = rechts, im Uhrzeigersinn). */
  angle: number;
  /** Kleine Knoten wechseln reihum durch diese Modifier. */
  small: Modifier[][];
  /** Notables an bestimmten Schritten des Hauptpfads. */
  notables: { at: number; name: string; mods: Modifier[]; flags?: Flag[]; description?: string }[];
  keystone?: { name: string; mods: Modifier[]; flags?: Flag[]; description: string };
  /** Seitenast: 2 kleine Knoten + Notable, abzweigend vom angegebenen Schritt. */
  spur?: { from: number; side: 1 | -1; name: string; mods: Modifier[]; flags?: Flag[] };
  length: number;
}

export interface RadialSpec {
  id: string;
  name: string;
  branches: BranchSpec[];
  /** Ringverbindungen zwischen benachbarten Ästen an diesen Schritten. */
  rings: number[];
  /** Abstand zwischen Schritten. */
  step?: number;
  /** Startpunkt-Modifier (geschenkt). */
  startMods?: Modifier[];
  startName?: string;
}

/** Baut einen Baum mit einem Startknoten und strahlenförmigen Ästen. */
export function buildRadialTree(spec: RadialSpec): TreeDef {
  const step = spec.step ?? 70;
  const nodes: TreeNode[] = [];
  const edges: [string, string][] = [];
  const startId = `${spec.id}:start`;
  nodes.push({ id: startId, kind: 'start', name: spec.startName ?? spec.name, x: 0, y: 0, mods: spec.startMods ?? [] });

  const branchNodes = new Map<string, string[]>();
  for (const b of spec.branches) {
    const rad = (b.angle * Math.PI) / 180;
    const ids: string[] = [];
    let prev = startId;
    for (let i = 1; i <= b.length; i++) {
      const id = `${spec.id}:${b.key}:${i}`;
      const r = i * step;
      const notable = b.notables.find((n) => n.at === i);
      const isKeystone = i === b.length && b.keystone;
      const x = Math.cos(rad) * r;
      const y = Math.sin(rad) * r;
      if (isKeystone && b.keystone) {
        nodes.push({ id, kind: 'keystone', name: b.keystone.name, x, y, mods: b.keystone.mods, flags: b.keystone.flags, description: b.keystone.description });
      } else if (notable) {
        nodes.push({ id, kind: 'notable', name: notable.name, x, y, mods: notable.mods, flags: notable.flags, description: notable.description });
      } else {
        const mods = b.small[(i - 1) % b.small.length];
        nodes.push({ id, kind: 'small', name: b.name, x, y, mods });
      }
      edges.push([prev, id]);
      prev = id;
      ids.push(id);
    }
    branchNodes.set(b.key, ids);

    if (b.spur) {
      const from = ids[b.spur.from - 1];
      const perp = rad + (b.spur.side * Math.PI) / 2;
      const baseR = b.spur.from * step;
      let p = from;
      for (let k = 1; k <= 3; k++) {
        const id = `${spec.id}:${b.key}:s${k}`;
        const dist = k * step * 0.75;
        const x = Math.cos(rad) * (baseR + k * step * 0.25) + Math.cos(perp) * dist;
        const y = Math.sin(rad) * (baseR + k * step * 0.25) + Math.sin(perp) * dist;
        if (k === 3) nodes.push({ id, kind: 'notable', name: b.spur.name, x, y, mods: b.spur.mods, flags: b.spur.flags });
        else nodes.push({ id, kind: 'small', name: b.name, x, y, mods: b.small[k % b.small.length] });
        edges.push([p, id]);
        p = id;
      }
    }
  }

  // Ringe zwischen benachbarten Ästen
  const order = [...spec.branches].sort((a, b) => a.angle - b.angle);
  for (const ring of spec.rings) {
    for (let i = 0; i < order.length; i++) {
      const a = branchNodes.get(order[i].key)![ring - 1];
      const b = branchNodes.get(order[(i + 1) % order.length].key)![ring - 1];
      if (a && b && order.length > 2) edges.push([a, b]);
    }
  }
  return { ...finalizeTree(spec.id, spec.name, nodes, edges), arcCenter: true };
}
