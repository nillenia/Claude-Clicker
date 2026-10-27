import { useState } from 'react';
import { fmt } from '../../core/format';
import { CHIP_LIST, CHIPS, HOTBAR_SIZE, MAX_CHIPS_PER_SKILL, SKILL_LIST, type ChipId, type SkillId } from '../../data/skills';
import { chipFits, chipsOf } from '../../systems/skills';
import { useTip } from '../components/Tooltip';
import { useGame } from '../useGame';

export function SkillsTab() {
  const game = useGame();
  const [message, setMessage] = useState('');
  const sk = game.state.skills;

  return (
    <div className="tab-page">
      <section className="card wide">
        <h2>Aktive Skills</h2>
        <div className="muted small">
          Skills kosten Energie aus der Reserve ({fmt(sk.energy)} / {fmt(game.energyMax())}, +{fmt(game.energyRegen(), true)}/s). Lege sie auf die Hotbar (Shift+1–6) und
          verstärke sie mit Erweiterungschips – wie Support-Gems in Path of Exile. Chips findest du bei Bossen und Meteoriten.
        </div>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          <span className="muted small">Chips im Besitz:</span>
          {CHIP_LIST.map((c) => (
            <ChipBadge key={c.id} chip={c.id} count={sk.chips[c.id] ?? 0} />
          ))}
        </div>
        {message && <div className="small bad">{message}</div>}
      </section>
      {SKILL_LIST.map((def) => {
        const unlocked = game.skillUnlocked(def.id);
        const p = game.skillParams(def.id);
        const slot = sk.hotbar.indexOf(def.id);
        const sockets = chipsOf(game.state, def.id);
        return (
          <section key={def.id} className={`card ${unlocked ? '' : 'locked-card'}`}>
            <div className="row between">
              <strong style={{ fontSize: 14 }}>
                {def.icon} {def.name}
              </strong>
              {!unlocked && <span className="status-pill error">Ab Level {def.level}</span>}
            </div>
            <div className="small muted">{def.description}</div>
            <div className="small mono">
              ⚡{fmt(p.cost)} · ⏱ {fmt(p.cooldown, true)} s{p.radius > 0 && ` · ◎ ${fmt(p.radius, true)}`}
              {p.duration > 0 && ` · ⌛ ${fmt(p.duration, true)} s`} · ×{fmt(p.effect, true)}
            </div>
            <label className="option-row small">
              <span>Hotbar</span>
              <select value={slot} onChange={(e) => game.setHotbar(Number(e.target.value), Number(e.target.value) >= 0 ? def.id : null)}>
                <option value={-1}>–</option>
                {Array.from({ length: HOTBAR_SIZE }, (_, i) => (
                  <option key={i} value={i}>
                    Slot {i + 1}
                  </option>
                ))}
              </select>
            </label>
            <div className="small">
              <span className="muted">
                Chips ({sockets.length}/{MAX_CHIPS_PER_SKILL}):
              </span>
              <div className="row" style={{ flexWrap: 'wrap', marginTop: 4 }}>
                {sockets.map((c) => (
                  <button key={c} className="chip-btn active" onClick={() => game.unsocketChip(def.id, c)} title="Herausnehmen">
                    {CHIPS[c].icon} {CHIPS[c].name}
                  </button>
                ))}
                {sockets.length < MAX_CHIPS_PER_SKILL &&
                  CHIP_LIST.filter((c) => (sk.chips[c.id] ?? 0) > 0 && !sockets.includes(c.id) && chipFits(def.id, c.id)).map((c) => (
                    <button key={c.id} className="chip-btn" onClick={() => setMessage(game.socketChip(def.id, c.id) ?? '')}>
                      + {c.icon} {c.name}
                    </button>
                  ))}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}

function ChipBadge({ chip, count }: { chip: ChipId; count: number }) {
  const def = CHIPS[chip];
  const tip = useTip(() => (
    <>
      <div className="tip-title">
        {def.icon} {def.name}
      </div>
      <div className="tip-muted">{def.description}</div>
    </>
  ));
  return (
    <span className={`currency-chip ${count === 0 ? 'empty' : ''}`} {...tip}>
      {def.icon} <span className="mono">{count}</span>
    </span>
  );
}

export type { SkillId };
