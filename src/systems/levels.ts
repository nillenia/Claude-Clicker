/** Erfahrungskurven für Maschinen und Kommandant. */

export interface LevelInfo {
  level: number;
  /** Erfahrung innerhalb des aktuellen Levels. */
  current: number;
  /** Benötigte Erfahrung bis zum nächsten Level (Infinity am Maximum). */
  needed: number;
}

export interface Curve {
  base: number;
  growth: number;
  max: number;
}

export const MACHINE_CURVE: Curve = { base: 40, growth: 1.28, max: 100 };
export const COMMANDER_CURVE: Curve = { base: 150, growth: 1.22, max: 100 };

export function xpForLevel(curve: Curve, level: number): number {
  return curve.base * curve.growth ** (level - 1);
}

export function levelInfo(curve: Curve, xp: number): LevelInfo {
  let level = 1;
  let rest = Math.max(0, xp);
  while (level < curve.max) {
    const need = xpForLevel(curve, level);
    if (rest < need) return { level, current: rest, needed: need };
    rest -= need;
    level++;
  }
  return { level, current: rest, needed: Infinity };
}

/** Erfahrungswert eines Items nach seiner Stufe. */
export function xpValue(tier: number): number {
  return [1, 2, 4, 10, 30, 100][Math.min(5, Math.max(0, tier))];
}
