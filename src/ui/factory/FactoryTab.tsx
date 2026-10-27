import { useState } from 'react';
import { fmt, fmtPercent } from '../../core/format';
import { RESEARCH } from '../../data/research';
import { researchCost } from '../../systems/research';
import { GridView, type BlueprintMode, type Tool } from '../grid/GridView';
import { BlueprintPanel } from './BlueprintPanel';
import { useGame } from '../useGame';
import { BuildBar } from './BuildBar';
import { CraftPanel } from './CraftPanel';
import { EntityPanel } from './EntityPanel';
import { InventoryPanel } from './InventoryPanel';
import { ThreatPanel } from './ThreatPanel';
import { SkillBar } from './SkillBar';
import { ObjectivesPanel } from './ObjectivesPanel';
import { SKILLS, type SkillId } from '../../data/skills';

export function FactoryTab() {
  const [tool, setTool] = useState<Tool | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [skillTarget, setSkillTarget] = useState<SkillId | null>(null);
  const [blueprint, setBlueprint] = useState<BlueprintMode>(null);

  return (
    <div className="factory">
      <aside className="sidebar">
        <StatusStrip />
        <ObjectivesPanel />
        <ThreatPanel />
        <CraftPanel />
        <InventoryPanel />
        <BlueprintPanel onPaste={(id) => setBlueprint({ mode: 'paste', id, rot: 0 })} onSelect={() => setBlueprint({ mode: 'select' })} />
      </aside>
      <div className="grid-area">
        <GridView
          tool={tool}
          setTool={(t) => {
            setTool(t);
            if (t) setSelected(null);
          }}
          selected={selected}
          setSelected={setSelected}
          setHint={setHint}
          skillTarget={skillTarget}
          setSkillTarget={setSkillTarget}
          blueprint={blueprint}
          setBlueprint={setBlueprint}
        />
        {blueprint?.mode === 'select' ? (
          <div className="grid-hint">Blaupause: Bereich mit der Maus aufziehen · Esc bricht ab</div>
        ) : skillTarget ? (
          <div className="grid-hint">Ziel für {SKILLS[skillTarget].name} wählen · Rechtsklick/Esc bricht ab</div>
        ) : (
          hint && <div className={`grid-hint ${hint.startsWith('⚠') ? 'bad' : ''}`}>{hint}</div>
        )}
        <SkillBar targeting={skillTarget} setTargeting={setSkillTarget} />
        {selected !== null && <EntityPanel id={selected} onClose={() => setSelected(null)} />}
        <BuildBar tool={tool} setTool={setTool} />
      </div>
    </div>
  );
}

function StatusStrip() {
  const game = useGame();
  const { power } = game.world;
  const current = game.state.research.current;
  const def = current ? RESEARCH[current] : null;
  const progress = def ? (game.state.research.progress[def.id] ?? 0) / researchCost(game.state, def) : 0;
  const powerClass = power.satisfaction >= 0.999 ? 'good' : power.satisfaction > 0.5 ? 'warn' : 'bad';

  return (
    <section className="status-strip">
      <div className="row between">
        <h2 style={{ margin: 0 }}>
          {game.terrain.planet.icon} {game.terrain.planet.name}
        </h2>
      </div>
      <div className="row between small">
        <span className="muted">Strom</span>
        <span className="mono">
          {fmt(power.demand)} / {fmt(power.gen)} kW
        </span>
      </div>
      <div className={`meter ${powerClass}`}>
        <div style={{ width: `${power.demand > 0 ? Math.min(100, power.satisfaction * 100) : 0}%` }} />
      </div>
      <div className="row between small">
        <span className="muted">Forschung</span>
        <span className="mono">{def ? `${def.name} ${fmtPercent(progress)}` : '–'}</span>
      </div>
      <div className="meter">
        <div style={{ width: `${progress * 100}%` }} />
      </div>
    </section>
  );
}
