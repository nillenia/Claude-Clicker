import type { GameState } from '../core/state';

export interface ObjectiveDef {
  id: string;
  title: string;
  hint: string;
  /** Fortschritt 0–1. */
  progress: (s: GameState) => number;
  reward: { currency?: number; items?: number; chips?: number; xp?: number };
}

const count = (s: GameState, type: string) => Object.values(s.planets).reduce((n, p) => n + p.entities.filter((e) => e.type === type).length, 0);
const anyCount = (s: GameState, types: string[]) => types.reduce((n, t) => n + count(s, t), 0);
const produced = (s: GameState, res: string) => s.counters.produced[res]?.toNumber() ?? 0;
const ratio = (value: number, target: number) => Math.min(1, value / target);

export const OBJECTIVES: ObjectiveDef[] = [
  { id: 'mine', title: 'Bau 10 Erz von Hand ab', hint: 'Klicke auf ein Erzfeld, z. B. das graublaue Eisenerz.', progress: (s) => ratio(s.counters.handMined, 10), reward: { xp: 50 } },
  { id: 'drill', title: 'Stelle einen Bohrer auf ein Erzfeld', hint: 'Taste 2 wählt den Bohrer, R dreht ihn. Der Pfeil zeigt den Ausgang.', progress: (s) => ratio(anyCount(s, ['drill_mech', 'drill_elec']), 1), reward: { xp: 50 } },
  { id: 'plates', title: 'Schmelze 30 Eisenplatten', hint: 'Bohrer → Band → Steinofen → Band → Landekapsel.', progress: (s) => ratio(produced(s, 'iron_plate'), 30), reward: { currency: 1 } },
  { id: 'science', title: 'Stelle 10 rote Datenkerne her', hint: 'Kupferplatte + Zahnrad in der Handfertigung.', progress: (s) => ratio(produced(s, 'sci_red'), 10), reward: { currency: 1 } },
  { id: 'power', title: 'Versorge ein Labor mit Strom', hint: 'Kohlekraftwerk mit Kohle füttern (Terminal oder Band), dann ein Labor bauen.', progress: (s) => (count(s, 'gen_coal') > 0 && count(s, 'lab_1') > 0 ? 1 : 0), reward: { xp: 150 } },
  { id: 'automation', title: 'Erforsche Automatisierung', hint: 'Im Tab „Forschung“ starten, Labore mit roten Datenkernen beliefern.', progress: (s) => (s.research.done.has('automation') ? 1 : 0), reward: { items: 1 } },
  { id: 'class', title: 'Wähle eine Kommandanten-Klasse', hint: 'Tab „Kommandant“.', progress: (s) => (s.commander.classId ? 1 : 0), reward: { currency: 2 } },
  { id: 'assembler', title: 'Lass 3 Assembler arbeiten', hint: 'Assembler brauchen Strom und ein Rezept.', progress: (s) => ratio(anyCount(s, ['assembler_1', 'assembler_2', 'assembler_3', 'assembler_4']), 3), reward: { items: 1 } },
  { id: 'tree', title: 'Vergib einen Punkt in einem Maschinenbaum', hint: 'Tab „Maschinen“ – Maschinen sammeln beim Arbeiten Erfahrung.', progress: (s) => (Object.values(s.machines.allocated).some((a) => a.length > 1) ? 1 : 0), reward: { currency: 2 } },
  { id: 'green', title: 'Stelle 50 grüne Datenkerne her', hint: 'Schaltkreis + Förderband, freigeschaltet durch Logistik.', progress: (s) => ratio(produced(s, 'sci_green'), 50), reward: { items: 1, currency: 2 } },
  { id: 'defense', title: 'Baue 3 Geschütztürme', hint: 'Angriffe beginnen ab 20 Gebäuden – Türme feuern Munition aus dem Inventar.', progress: (s) => ratio(anyCount(s, ['turret_gun', 'turret_laser', 'turret_tesla', 'turret_plasma', 'turret_void']), 3), reward: { chips: 1 } },
  { id: 'boss', title: 'Besiege den Bohrwurm', hint: 'Signalbake herstellen und im Bedrohungs-Panel zünden.', progress: (s) => ratio(s.threats.kepler?.bossKills ?? 0, 1), reward: { items: 2, chips: 1 } },
  { id: 'rocket', title: 'Erforsche Raketentechnik', hint: 'Braucht Motoren und Assembler Mk II.', progress: (s) => (s.research.done.has('rocketry') ? 1 : 0), reward: { currency: 3 } },
  { id: 'colony', title: 'Gründe eine Kolonie auf Ignis', hint: 'Raketensilo + 25 Raketenteile, dann in der Sternenkarte.', progress: (s) => (s.planets.ignis ? 1 : 0), reward: { items: 2, currency: 3 } },
  { id: 'route', title: 'Richte eine Frachtroute ein', hint: 'Sternenkarte → Frachtrouten.', progress: (s) => (s.routes.length > 0 ? 1 : 0), reward: { currency: 3 } },
  { id: 'blue', title: 'Stelle 100 blaue Datenkerne her', hint: 'Kunststoff und Kühlrippen kommen von Ignis.', progress: (s) => ratio(produced(s, 'sci_blue'), 100), reward: { items: 2, chips: 1 } },
  { id: 'cryon', title: 'Gründe eine Kolonie auf Cryon', hint: 'Lithium und Helium-3 für Batterien und Fusion.', progress: (s) => (s.planets.cryon ? 1 : 0), reward: { items: 2, currency: 4 } },
  { id: 'jump', title: 'Wage den ersten Sternensprung', hint: 'Tab „Endgame“ – sobald dein Imperiumswert reicht.', progress: (s) => (s.prestige.jumps > 0 ? 1 : 0), reward: { items: 3, chips: 2 } },
];

export const OBJECTIVE_BY_ID: Record<string, ObjectiveDef> = Object.fromEntries(OBJECTIVES.map((o) => [o.id, o]));
