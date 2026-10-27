/** Zentrale Balancing- und Technik-Konstanten. */
export const CONFIG = {
  /** UI-/Logik-Ticks pro Sekunde. */
  tickRate: 20,
  /** Feste Schrittweite der Fabriksimulation in Sekunden. */
  simStep: 0.05,
  /** Abstände größer als dieser Wert (Sekunden) werden als Offline-Zeit behandelt. */
  offlineThreshold: 60,
  /** Anteil der Produktion, der offline anfällt. */
  offlineEfficiency: 0.5,
  /** Maximal angerechnete Offline-Zeit in Sekunden. */
  offlineCap: 4 * 60 * 60,
  /** Offline-Zeiten darunter werden nicht gemeldet. */
  offlineMinReport: 10,
  autosaveInterval: 30,
  /** Handabbau: Erz pro Klick (vor Modifikatoren). */
  handMine: 1,
  /** Handfertigung: Geschwindigkeit (vor Modifikatoren). */
  handCraft: 1,
} as const;
