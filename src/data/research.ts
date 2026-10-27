import type { Modifier } from '../engine/types';
import type { Amounts } from './recipes';

export interface ResearchDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  /** Datenkerne pro Einheit. */
  packs: Amounts;
  units: number;
  /** Sekunden pro Einheit bei Laborgeschwindigkeit 1. */
  unitTime: number;
  prereqs: string[];
  modifiers?: Modifier[];
  /** Wiederholbar: Kosten steigen pro Stufe um diesen Faktor. */
  repeatable?: { growth: number; max?: number };
  /** Spalte im Forschungsbaum (Stufe). */
  column: number;
}

const RED = { sci_red: 1 };
const RG = { sci_red: 1, sci_green: 1 };
const RGB = { sci_red: 1, sci_green: 1, sci_blue: 1 };
const RGBP = { sci_red: 1, sci_green: 1, sci_blue: 1, sci_purple: 1 };
const ALL = { sci_red: 1, sci_green: 1, sci_blue: 1, sci_purple: 1, sci_gold: 1 };

const L: ResearchDef[] = [
  // ---------- Rot ----------
  { id: 'automation', name: 'Automatisierung', icon: '⚙️', description: 'Schaltet den Assembler Mk I frei.', packs: RED, units: 10, unitTime: 10, prereqs: [], column: 0 },
  {
    id: 'electricity', name: 'Elektrizität', icon: '⚡', description: 'Effizientere Stromnetze: +15 % Stromerzeugung.', packs: RED, units: 10, unitTime: 10, prereqs: [], column: 0,
    modifiers: [{ stat: 'powerGen', kind: 'inc', value: 15 }],
  },
  { id: 'logistics', name: 'Logistik', icon: '🔀', description: 'Weichen und grüne Datenkerne.', packs: RED, units: 30, unitTime: 15, prereqs: ['automation'], column: 1 },
  { id: 'electric_mining', name: 'Elektrischer Bergbau', icon: '⛏️', description: 'Schaltet den Elektrobohrer frei.', packs: RED, units: 30, unitTime: 15, prereqs: ['electricity'], column: 1 },
  { id: 'steel', name: 'Stahlverarbeitung', icon: '🔩', description: 'Stahl aus Eisenplatten schmelzen.', packs: RED, units: 40, unitTime: 15, prereqs: ['automation'], column: 1 },
  { id: 'optics', name: 'Optik', icon: '🔍', description: 'Quarzglas aus Stein schmelzen.', packs: RED, units: 20, unitTime: 10, prereqs: [], column: 0 },
  { id: 'defense', name: 'Verteidigung', icon: '🔫', description: 'Geschütztürme und Munition.', packs: RED, units: 25, unitTime: 15, prereqs: ['automation'], column: 1 },
  // ---------- Rot + Grün ----------
  { id: 'automation_2', name: 'Automatisierung II', icon: '⚙️', description: 'Assembler Mk II.', packs: RG, units: 50, unitTime: 20, prereqs: ['logistics', 'steel', 'electricity'], column: 2 },
  { id: 'advanced_smelting', name: 'Elektrische Verhüttung', icon: '🔥', description: 'Elektroofen.', packs: RG, units: 60, unitTime: 20, prereqs: ['logistics', 'steel', 'electricity'], column: 2 },
  { id: 'logistics_2', name: 'Logistik II', icon: '➡️', description: 'Schnellband.', packs: RG, units: 60, unitTime: 20, prereqs: ['logistics'], column: 2 },
  { id: 'motors', name: 'Motoren', icon: '🔧', description: 'Motoren aus Stahl, Zahnrädern und Kabeln.', packs: RG, units: 75, unitTime: 20, prereqs: ['steel', 'logistics'], column: 2 },
  { id: 'solar', name: 'Solarenergie', icon: '☀️', description: 'Solarfelder.', packs: RG, units: 80, unitTime: 20, prereqs: ['optics', 'electricity', 'steel'], column: 2 },
  { id: 'fluid_handling', name: 'Flüssigkeiten', icon: '🛢️', description: 'Förderpumpen.', packs: RG, units: 50, unitTime: 20, prereqs: ['steel', 'logistics'], column: 2 },
  { id: 'lasers', name: 'Laser', icon: '🔆', description: 'Lasertürme.', packs: RG, units: 100, unitTime: 25, prereqs: ['defense', 'optics', 'logistics'], column: 2 },
  { id: 'threat_analysis', name: 'Bedrohungsanalyse', icon: '📡', description: 'Signalbaken: Bosse und Bedrohungsstufen herausfordern.', packs: RG, units: 80, unitTime: 25, prereqs: ['defense', 'logistics'], column: 2 },
  { id: 'rocketry', name: 'Raketentechnik', icon: '🚀', description: 'Raketensilo und Raketenteile.', packs: RG, units: 200, unitTime: 30, prereqs: ['motors', 'automation_2', 'fluid_handling'], column: 3 },
  { id: 'ignis_expedition', name: 'Expedition: Ignis', icon: '🌋', description: 'Kurs auf den Vulkanmond Ignis.', packs: RG, units: 150, unitTime: 30, prereqs: ['rocketry'], column: 4 },
  { id: 'ignis_metallurgy', name: 'Ignis-Metallurgie', icon: '🌋', description: 'Wolfram, Kunststoff, Fortschrittliche Schaltkreise, Kühlrippen, Chemiewerk und blaue Datenkerne.', packs: RG, units: 150, unitTime: 30, prereqs: ['ignis_expedition'], column: 5 },
  // ---------- Blau ----------
  { id: 'deep_mining', name: 'Tiefenbergbau', icon: '⛏️', description: 'Tiefenbohrer.', packs: RGB, units: 150, unitTime: 30, prereqs: ['ignis_metallurgy', 'electric_mining'], column: 6 },
  { id: 'arc_smelting', name: 'Lichtbogenverhüttung', icon: '🔥', description: 'Lichtbogenofen.', packs: RGB, units: 150, unitTime: 30, prereqs: ['ignis_metallurgy', 'advanced_smelting'], column: 6 },
  { id: 'automation_3', name: 'Automatisierung III', icon: '⚙️', description: 'Assembler Mk III.', packs: RGB, units: 200, unitTime: 30, prereqs: ['ignis_metallurgy', 'automation_2'], column: 6 },
  { id: 'logistics_3', name: 'Logistik III', icon: '➡️', description: 'Expressband.', packs: RGB, units: 200, unitTime: 30, prereqs: ['ignis_metallurgy', 'logistics_2'], column: 6 },
  { id: 'geothermal', name: 'Geothermie', icon: '🌋', description: 'Geothermie-Kraftwerke auf Lavafeldern.', packs: RGB, units: 150, unitTime: 30, prereqs: ['ignis_metallurgy'], column: 6 },
  { id: 'cryon_expedition', name: 'Expedition: Cryon', icon: '🧊', description: 'Kurs auf die Eiswelt Cryon.', packs: RGB, units: 300, unitTime: 40, prereqs: ['ignis_metallurgy'], column: 6 },
  { id: 'cryon_chemistry', name: 'Kryochemie', icon: '🧊', description: 'Lithium, Wasser und Batterien.', packs: RGB, units: 250, unitTime: 40, prereqs: ['cryon_expedition'], column: 7 },
  { id: 'processors', name: 'Prozessoren', icon: '🖥️', description: 'Prozessoren und Quantenlabor.', packs: RGB, units: 300, unitTime: 40, prereqs: ['ignis_metallurgy', 'optics'], column: 7 },
  { id: 'tesla', name: 'Tesla-Technik', icon: '🌩️', description: 'Teslatürme.', packs: RGB, units: 300, unitTime: 40, prereqs: ['cryon_chemistry', 'lasers'], column: 8 },
  { id: 'robotics', name: 'Robotik', icon: '🤖', description: 'Robotik-Rahmen und violette Datenkerne.', packs: RGB, units: 400, unitTime: 45, prereqs: ['cryon_chemistry', 'processors', 'motors'], column: 8 },
  // ---------- Violett ----------
  { id: 'fusion', name: 'Kernfusion', icon: '⚛️', description: 'Fusionszellen und Fusionsreaktor.', packs: RGBP, units: 500, unitTime: 50, prereqs: ['robotics'], column: 9 },
  { id: 'plasma_tech', name: 'Plasmatechnik', icon: '☄️', description: 'Plasmabohrer und Sternenschmiede.', packs: RGBP, units: 500, unitTime: 50, prereqs: ['fusion', 'deep_mining', 'arc_smelting'], column: 10 },
  { id: 'nanofabrication', name: 'Nanofertigung', icon: '🧬', description: 'Assembler Mk IV, Magnetband, Molekularreaktor.', packs: RGBP, units: 600, unitTime: 50, prereqs: ['robotics', 'automation_3', 'logistics_3'], column: 9 },
  { id: 'zephyr_expedition', name: 'Expedition: Zephyr', icon: '🌀', description: 'Kurs auf den Gasriesen Zephyr.', packs: RGBP, units: 600, unitTime: 50, prereqs: ['robotics'], column: 9 },
  { id: 'plasma_weapons', name: 'Plasmawaffen', icon: '☄️', description: 'Plasmaladungen und Plasmakanonen.', packs: RGBP, units: 600, unitTime: 50, prereqs: ['zephyr_expedition', 'tesla'], column: 10 },
  { id: 'prisma_expedition', name: 'Expedition: Prisma', icon: '💎', description: 'Kurs auf die Kristallwelt Prisma.', packs: RGBP, units: 800, unitTime: 60, prereqs: ['fusion'], column: 10 },
  { id: 'prisma_resonance', name: 'Kristallresonanz', icon: '💎', description: 'Kristallraffination.', packs: RGBP, units: 600, unitTime: 60, prereqs: ['prisma_expedition'], column: 11 },
  { id: 'quantum', name: 'Quantentechnik', icon: '🌌', description: 'Quantenchips und goldene Datenkerne.', packs: RGBP, units: 1000, unitTime: 60, prereqs: ['prisma_expedition', 'fusion'], column: 11 },
  // ---------- Gold ----------
  { id: 'verdant_expedition', name: 'Expedition: Verdant', icon: '🌿', description: 'Kurs auf den Xeno-Dschungel Verdant.', packs: ALL, units: 1000, unitTime: 60, prereqs: ['quantum'], column: 12 },
  { id: 'void_expedition', name: 'Expedition: Die Leere', icon: '🕳️', description: 'Kurs in den Riss zwischen den Sternen.', packs: ALL, units: 2000, unitTime: 60, prereqs: ['quantum', 'plasma_weapons'], column: 12 },
  { id: 'void_tech', name: 'Leerentechnik', icon: '🕳️', description: 'Warp-Kerne, Antimaterie und Leerenprojektoren.', packs: ALL, units: 2500, unitTime: 60, prereqs: ['void_expedition'], column: 13 },

  // ---------- Wiederholbar (unendliche Skalierung) ----------
  {
    id: 'rep_mining', name: 'Bergbau-Produktivität', icon: '⛏️', description: '+10 % Produktivität für Bohrer und Pumpen pro Stufe.',
    packs: RED, units: 50, unitTime: 20, prereqs: ['electric_mining'], column: 2, repeatable: { growth: 1.6 },
    modifiers: [{ stat: 'productivity', kind: 'flat', value: 10, tags: ['drill'] }],
  },
  {
    id: 'rep_crafting', name: 'Fertigungsgeschwindigkeit', icon: '⚙️', description: '+15 % Geschwindigkeit für Öfen und Fertiger pro Stufe.',
    packs: RG, units: 80, unitTime: 25, prereqs: ['automation_2'], column: 3, repeatable: { growth: 1.6 },
    modifiers: [
      { stat: 'speed', kind: 'inc', value: 15, tags: ['furnace'] },
      { stat: 'speed', kind: 'inc', value: 15, tags: ['assembler'] },
    ],
  },
  {
    id: 'rep_stacking', name: 'Band-Stapelung', icon: '📚', description: 'Verdoppelt den Durchsatz von Bändern, Weichen und Terminals pro Stufe.',
    packs: RG, units: 100, unitTime: 30, prereqs: ['logistics_2'], column: 3, repeatable: { growth: 2.2 },
    modifiers: [{ stat: 'throughput', kind: 'more', value: 100, tags: ['logistics'] }],
  },
  {
    id: 'rep_lab', name: 'Forschungseffizienz', icon: '🔬', description: '+20 % Laborgeschwindigkeit pro Stufe.',
    packs: RG, units: 100, unitTime: 30, prereqs: ['logistics'], column: 2, repeatable: { growth: 1.7 },
    modifiers: [{ stat: 'speed', kind: 'inc', value: 20, tags: ['lab'] }],
  },
  {
    id: 'rep_damage', name: 'Waffenkalibrierung', icon: '🎯', description: '+20 % Schaden für Türme pro Stufe.',
    packs: RG, units: 60, unitTime: 25, prereqs: ['defense'], column: 2, repeatable: { growth: 1.6 },
    modifiers: [{ stat: 'damage', kind: 'inc', value: 20, tags: ['turret'] }],
  },
  {
    id: 'rep_energy', name: 'Energiedichte', icon: '🔋', description: '+15 % Stromerzeugung pro Stufe.',
    packs: RGB, units: 150, unitTime: 30, prereqs: ['geothermal'], column: 7, repeatable: { growth: 1.6 },
    modifiers: [{ stat: 'powerGen', kind: 'inc', value: 15 }],
  },
  {
    id: 'rep_overclock', name: 'Übertaktung', icon: '🚀', description: '+10 % more Geschwindigkeit für alle Maschinen pro Stufe.',
    packs: RGBP, units: 400, unitTime: 50, prereqs: ['nanofabrication'], column: 10, repeatable: { growth: 1.8 },
    modifiers: [{ stat: 'speed', kind: 'more', value: 10 }],
  },
];

export const RESEARCH: Record<string, ResearchDef> = Object.fromEntries(L.map((r) => [r.id, r]));
export const RESEARCH_LIST: readonly ResearchDef[] = L;
