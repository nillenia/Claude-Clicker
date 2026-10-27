import { PERCENT_POINT_STATS, type Condition, type Flag, type Modifier, type SourcedModifier, type StatId } from './types';

/** Kontext eines einzelnen Ziels (z. B. einer Maschine) für Bedingungen. */
export interface TargetContext {
  /** Anzahl angrenzender Gebäude pro Tag. */
  adjacency?: Map<string, number>;
  emptySockets?: number;
  /** Multiplikator für Nachbarschafts-Boni (z. B. Planet Prisma). */
  adjacencyScale?: number;
}

export interface BreakdownLine {
  source: string;
  kind: Modifier['kind'];
  value: number;
}

export interface Breakdown {
  base: number;
  flat: number;
  inc: number;
  more: number;
  total: number;
  lines: BreakdownLine[];
}

export type ModifierProvider = () => SourcedModifier[];
export type FlagProvider = () => Iterable<Flag>;

function conditionFactor(c: Condition | undefined, ctx: TargetContext | undefined): number {
  if (!c) return 1;
  const adj = ctx?.adjacency;
  const scale = ctx?.adjacencyScale ?? 1;
  switch (c.kind) {
    case 'perAdjacent': {
      const n = adj?.get(c.tag) ?? 0;
      return Math.min(n, c.max ?? Infinity) * scale;
    }
    case 'noAdjacent':
      return (adj?.get(c.tag) ?? 0) === 0 ? 1 : 0;
    case 'minAdjacent':
      return (adj?.get(c.tag) ?? 0) >= c.count ? scale : 0;
    case 'perEmptySocket':
      return ctx?.emptySockets ?? 0;
  }
}

function tagsMatch(m: Modifier, tags: ReadonlySet<string>): boolean {
  return !m.tags || m.tags.every((t) => tags.has(t));
}

/**
 * Sammelt alle Modifier aus registrierten Quellen und wertet sie aus:
 *   (Basis + Σ flat) × (1 + Σ inc / 100) × Π (1 + more / 100)
 */
export class StatEngine {
  /** Steigt bei jeder Änderung der Modifier – Caches vergleichen dagegen. */
  version = 0;
  private mods: SourcedModifier[] = [];
  private byStat = new Map<StatId, SourcedModifier[]>();
  private providers: ModifierProvider[] = [];
  private flagProviders: FlagProvider[] = [];
  flags = new Set<Flag>();

  addProvider(p: ModifierProvider): void {
    this.providers.push(p);
  }

  addFlagProvider(p: FlagProvider): void {
    this.flagProviders.push(p);
  }

  /** Alle Quellen neu einlesen. */
  refresh(): void {
    this.mods = this.providers.flatMap((p) => p());
    this.byStat.clear();
    for (const m of this.mods) {
      if (!this.byStat.has(m.stat)) this.byStat.set(m.stat, []);
      this.byStat.get(m.stat)!.push(m);
    }
    this.flags = new Set(this.flagProviders.flatMap((p) => [...p()]));
    this.version++;
  }

  has(flag: Flag): boolean {
    return this.flags.has(flag);
  }

  get all(): readonly SourcedModifier[] {
    return this.mods;
  }

  /** Wert eines Stats für ein Ziel mit den gegebenen Tags. */
  value(stat: StatId, tags: ReadonlySet<string>, base: number, extra?: readonly Modifier[], ctx?: TargetContext): number {
    let flat = 0;
    let inc = 0;
    let more = 1;
    const apply = (m: Modifier) => {
      if (!tagsMatch(m, tags)) return;
      const f = conditionFactor(m.condition, ctx);
      if (f === 0) return;
      const v = m.value * f;
      if (m.kind === 'flat') flat += v;
      else if (m.kind === 'inc') inc += v;
      else more *= 1 + v / 100;
    };
    const list = this.byStat.get(stat);
    if (list) for (const m of list) apply(m);
    if (extra) for (const m of extra) if (m.stat === stat) apply(m);
    return Math.max(0, (base + flat) * Math.max(0, 1 + inc / 100) * more);
  }

  /** Aufschlüsselung für die Anzeige (woher kommt welcher Anteil). */
  breakdown(stat: StatId, tags: ReadonlySet<string>, base: number, extra?: readonly SourcedModifier[], ctx?: TargetContext): Breakdown {
    const lines: BreakdownLine[] = [];
    let flat = 0;
    let inc = 0;
    let more = 1;
    const all = [...(this.byStat.get(stat) ?? []), ...(extra ?? []).filter((m) => m.stat === stat)];
    for (const m of all) {
      if (!tagsMatch(m, tags)) continue;
      const f = conditionFactor(m.condition, ctx);
      if (f === 0) continue;
      const v = m.value * f;
      lines.push({ source: m.source, kind: m.kind, value: v });
      if (m.kind === 'flat') flat += v;
      else if (m.kind === 'inc') inc += v;
      else more *= 1 + v / 100;
    }
    const total = Math.max(0, (base + flat) * Math.max(0, 1 + inc / 100) * more);
    return { base, flat, inc, more, total, lines };
  }

  /** Standardbasis eines Stats. */
  static baseOf(stat: StatId): number {
    if (stat === 'critMulti') return 200;
    return PERCENT_POINT_STATS.has(stat) ? 0 : 1;
  }
}
