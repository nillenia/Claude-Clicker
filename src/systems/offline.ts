import { CONFIG } from '../data/config';

export interface OfflineResult {
  /** Tatsächlich vergangene Zeit in Sekunden. */
  elapsed: number;
  /** Angerechnete Zeit (gedeckelt). */
  counted: number;
  efficiency: number;
  /** Gewinne pro Planet und Ressource. */
  gains: Record<string, Record<string, number>>;
  researchUnits: number;
}

/** Offline-Zeit nach Deckelung. */
export function countedOfflineTime(elapsed: number, capSeconds: number = CONFIG.offlineCap): number {
  return Math.min(Math.max(0, elapsed), capSeconds);
}

/** Netto-Raten × Zeit × Effizienz; Verbrauch wird nur angerechnet, solange Vorrat da ist. */
export function offlineGains(rates: Map<string, number>, seconds: number, efficiency: number): Record<string, number> {
  const gains: Record<string, number> = {};
  for (const [res, rate] of rates) {
    const amount = rate * seconds * (rate > 0 ? efficiency : 1);
    if (Math.abs(amount) >= 1e-6) gains[res] = amount;
  }
  return gains;
}
