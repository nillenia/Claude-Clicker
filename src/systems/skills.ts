import type { GameState } from '../core/state';
import { CHIPS, MAX_CHIPS_PER_SKILL, SKILLS, type ChipId, type SkillId } from '../data/skills';

export interface SkillParams {
  cost: number;
  cooldown: number;
  radius: number;
  duration: number;
  /** Wirkungsmultiplikator (1 = Grundwert). */
  effect: number;
}

export interface CommanderValues {
  skillEffect: number;
  skillArea: number;
  skillDuration: number;
  cooldownRecovery: number;
}

export function chipsOf(state: GameState, skill: SkillId): ChipId[] {
  return (state.skills.sockets[skill] ?? []) as ChipId[];
}

export function skillParams(state: GameState, skill: SkillId, v: CommanderValues): SkillParams {
  const def = SKILLS[skill];
  const chips = chipsOf(state, skill);
  const has = (c: ChipId) => chips.includes(c);
  return {
    cost: def.cost * (has('efficiency') ? 0.6 : 1) * (has('power') ? 1.3 : 1),
    cooldown: (def.cooldown / Math.max(0.1, v.cooldownRecovery)) * (has('haste') ? 0.7 : 1),
    radius: (def.radius ?? 0) * v.skillArea * (has('area') ? 1.5 : 1),
    duration: (def.duration ?? 0) * v.skillDuration * (has('duration') ? 1.5 : 1),
    effect: v.skillEffect * (has('power') ? 1.4 : 1),
  };
}

export function chipFits(skill: SkillId, chip: ChipId): boolean {
  const req = CHIPS[chip].requires;
  const def = SKILLS[skill];
  if (req === 'targeted') return def.targeted && (def.radius ?? 0) > 1;
  if (req === 'duration') return !!def.duration;
  return true;
}

export function socketChip(state: GameState, skill: SkillId, chip: ChipId): string | null {
  const sockets = chipsOf(state, skill);
  if ((state.skills.chips[chip] ?? 0) < 1) return 'Kein Chip dieser Art vorhanden';
  if (sockets.length >= MAX_CHIPS_PER_SKILL) return 'Alle Sockel belegt';
  if (sockets.includes(chip)) return 'Dieser Chip steckt bereits';
  if (!chipFits(skill, chip)) return 'Passt nicht zu diesem Skill';
  state.skills.chips[chip]--;
  state.skills.sockets[skill] = [...sockets, chip];
  return null;
}

export function unsocketChip(state: GameState, skill: SkillId, chip: ChipId): void {
  const sockets = chipsOf(state, skill);
  if (!sockets.includes(chip)) return;
  state.skills.sockets[skill] = sockets.filter((c) => c !== chip);
  state.skills.chips[chip] = (state.skills.chips[chip] ?? 0) + 1;
}

export function setHotbar(state: GameState, slot: number, skill: SkillId | null): void {
  const bar = state.skills.hotbar;
  if (skill) for (let i = 0; i < bar.length; i++) if (bar[i] === skill) bar[i] = null;
  bar[slot] = skill;
}
