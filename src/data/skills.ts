export type SkillId = 'orbital' | 'overcharge' | 'meteor_call' | 'drone_swarm' | 'emergency_power' | 'time_dilation' | 'stasis';

export interface SkillDef {
  id: SkillId;
  name: string;
  icon: string;
  description: string;
  /** Energiekosten. */
  cost: number;
  /** Abklingzeit in Sekunden. */
  cooldown: number;
  /** Wirkt auf eine Position auf dem Raster. */
  targeted: boolean;
  /** Radius in Feldern (falls zielgerichtet). */
  radius?: number;
  /** Dauer in Sekunden (falls zeitlich begrenzt). */
  duration?: number;
  /** Benötigtes Kommandanten-Level. */
  level: number;
}

export const SKILLS: Record<SkillId, SkillDef> = {
  orbital: {
    id: 'orbital', name: 'Orbitalschlag', icon: '💥', cost: 30, cooldown: 15, targeted: true, radius: 3, level: 1,
    description: 'Ein Strahl aus dem Orbit: verursacht hohen Schaden an Gegnern im Bereich. Ohne Gegner sprengt er Erz aus dem Boden.',
  },
  overcharge: {
    id: 'overcharge', name: 'Überladung', icon: '⚡', cost: 40, cooldown: 30, targeted: true, radius: 4, duration: 10, level: 3,
    description: 'Maschinen im Bereich arbeiten mit 200 % mehr Geschwindigkeit.',
  },
  meteor_call: {
    id: 'meteor_call', name: 'Meteoritenruf', icon: '☄️', cost: 60, cooldown: 120, targeted: true, radius: 1, level: 6,
    description: 'Ruft sofort einen Meteoriten an die Zielposition.',
  },
  drone_swarm: {
    id: 'drone_swarm', name: 'Drohnenschwarm', icon: '🛸', cost: 50, cooldown: 60, targeted: false, level: 10,
    description: 'Repariert alle Gebäude des Planeten um 50 % und birgt einen vorhandenen Meteoriten.',
  },
  emergency_power: {
    id: 'emergency_power', name: 'Notstrom', icon: '🔋', cost: 40, cooldown: 90, targeted: false, duration: 20, level: 15,
    description: 'Das Stromnetz des Planeten gilt als voll versorgt.',
  },
  time_dilation: {
    id: 'time_dilation', name: 'Zeitdilatation', icon: '⏳', cost: 80, cooldown: 180, targeted: false, duration: 30, level: 20,
    description: 'Alle Maschinen des Planeten arbeiten doppelt so schnell.',
  },
  stasis: {
    id: 'stasis', name: 'Stasisfeld', icon: '🧿', cost: 35, cooldown: 40, targeted: true, radius: 3.5, duration: 5, level: 25,
    description: 'Hält Gegner im Bereich fest. Sie erleiden 30 % mehr Schaden.',
  },
};

export const SKILL_LIST: SkillDef[] = Object.values(SKILLS);

export type ChipId = 'area' | 'duration' | 'efficiency' | 'echo' | 'auto' | 'power' | 'haste';

export interface ChipDef {
  id: ChipId;
  name: string;
  icon: string;
  description: string;
  /** Nur für bestimmte Skills sinnvoll. */
  requires?: 'targeted' | 'duration';
}

export const CHIPS: Record<ChipId, ChipDef> = {
  area: { id: 'area', name: 'Größerer Radius', icon: '◎', description: '+50 % Radius.', requires: 'targeted' },
  duration: { id: 'duration', name: 'Längere Dauer', icon: '⌛', description: '+50 % Dauer.', requires: 'duration' },
  efficiency: { id: 'efficiency', name: 'Effizienz', icon: '♻', description: '−40 % Energiekosten.' },
  echo: { id: 'echo', name: 'Echo', icon: '🔁', description: 'Der Skill wiederholt sich nach 2 s mit 60 % Wirkung.' },
  auto: { id: 'auto', name: 'Automatik-Auslöser', icon: '🤖', description: 'Wird automatisch gewirkt, sobald er bereit ist und die Energie voll ist (wie „Auslöser bei Krit“).' },
  power: { id: 'power', name: 'Verstärker', icon: '💪', description: '+40 % Wirkung, +30 % Energiekosten.' },
  haste: { id: 'haste', name: 'Schnellladung', icon: '⏩', description: '−30 % Abklingzeit.' },
};

export const CHIP_LIST: ChipDef[] = Object.values(CHIPS);
export const MAX_CHIPS_PER_SKILL = 3;
export const HOTBAR_SIZE = 6;
