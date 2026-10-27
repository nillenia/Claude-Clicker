import { useEffect } from 'react';
import { fmt } from '../../core/format';
import { SKILLS, type SkillId } from '../../data/skills';
import { useTip } from '../components/Tooltip';
import { useGame } from '../useGame';

export function SkillBar({ targeting, setTargeting }: { targeting: SkillId | null; setTargeting: (s: SkillId | null) => void }) {
  const game = useGame();
  const sk = game.state.skills;
  const max = game.energyMax();

  const activate = (skill: SkillId) => {
    if (game.skillBlocked(skill)) return;
    if (SKILLS[skill].targeted) setTargeting(targeting === skill ? null : skill);
    else game.castSkill(skill);
  };

  // Shift + 1–6
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.shiftKey || !e.code.startsWith('Digit')) return;
      const slot = Number(e.code.slice(5)) - 1;
      const skill = sk.hotbar[slot] as SkillId | null;
      if (skill) {
        activate(skill);
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="skill-bar">
      <div className="energy">
        <div className="energy-fill" style={{ width: `${(sk.energy / max) * 100}%` }} />
        <span className="energy-text mono">
          ⚡ {fmt(sk.energy)} / {fmt(max)}
        </span>
      </div>
      <div className="skill-slots">
        {sk.hotbar.map((id, i) => (
          <SkillSlot key={i} slot={i} skill={id as SkillId | null} active={targeting === id} onClick={() => id && activate(id as SkillId)} />
        ))}
      </div>
    </div>
  );
}

function SkillSlot({ slot, skill, active, onClick }: { slot: number; skill: SkillId | null; active: boolean; onClick: () => void }) {
  const game = useGame();
  const tip = useTip(() => {
    if (!skill) return <span className="tip-muted">Leerer Slot – belegen im Tab „Skills“.</span>;
    const def = SKILLS[skill];
    const p = game.skillParams(skill);
    const blocked = game.skillBlocked(skill);
    return (
      <>
        <div className="tip-header">
          <span className="tip-title">
            {def.icon} {def.name}
          </span>
          <span className="tip-muted">Shift+{slot + 1}</span>
        </div>
        <div className="tip-muted">{def.description}</div>
        <div className="tip-section small mono">
          Kosten {fmt(p.cost)} · Abklingzeit {fmt(p.cooldown, true)} s{p.radius > 0 && ` · Radius ${fmt(p.radius, true)}`}
          {p.duration > 0 && ` · Dauer ${fmt(p.duration, true)} s`} · Wirkung ×{fmt(p.effect, true)}
        </div>
        {blocked && <div className="tip-section bad small">{blocked}</div>}
      </>
    );
  });
  if (!skill) {
    return (
      <button className="skill-slot empty" {...tip}>
        <span className="key">⇧{slot + 1}</span>
      </button>
    );
  }
  const cd = game.state.skills.cooldowns[skill] ?? 0;
  const total = game.skillParams(skill).cooldown;
  const locked = !game.skillUnlocked(skill);
  const poor = game.state.skills.energy < game.skillParams(skill).cost;
  return (
    <button className={`skill-slot ${active ? 'active' : ''} ${locked ? 'locked' : ''} ${poor ? 'poor' : ''}`} onClick={onClick} {...tip}>
      <span className="key">⇧{slot + 1}</span>
      <span className="skill-icon">{locked ? '🔒' : SKILLS[skill].icon}</span>
      {cd > 0 && <span className="cooldown" style={{ height: `${(cd / total) * 100}%` }} />}
      {cd > 0 && <span className="cd-text mono">{Math.ceil(cd)}</span>}
    </button>
  );
}
