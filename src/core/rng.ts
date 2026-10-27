/** Seedbarer Zufallsgenerator (mulberry32). Der Zustand ist eine Zahl und wird mitgespeichert. */
export class Rng {
  constructor(public state: number) {}

  next(): number {
    let t = (this.state = (this.state + 0x6d2b79f5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  /** Wählt einen Eintrag nach Gewicht. */
  weighted<T>(entries: readonly { weight: number; value: T }[]): T {
    const total = entries.reduce((s, e) => s + e.weight, 0);
    let roll = this.next() * total;
    for (const e of entries) {
      roll -= e.weight;
      if (roll < 0) return e.value;
    }
    return entries[entries.length - 1].value;
  }
}

export function randomSeed(): number {
  return (Math.random() * 2 ** 32) >>> 0;
}
