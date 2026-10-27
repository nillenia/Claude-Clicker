import { useState } from 'react';
import { fmt, fmtPercent, fmtTime } from '../../core/format';
import { RECIPE_LIST } from '../../data/recipes';
import { RESEARCH, RESEARCH_LIST, type ResearchDef } from '../../data/research';
import { RESOURCES } from '../../data/resources';
import { PLANET_LIST } from '../../data/planets';
import { isAvailable, researchCost, researchLevel } from '../../systems/research';
import { describeModifier } from '../../engine/describe';
import { Amounts, ResourceIcon } from '../components/ResourceIcon';
import { useGame } from '../useGame';

const PACK_COLUMNS = ['Rot', 'Rot', 'Rot + Grün', 'Rot + Grün', 'Ignis', 'Ignis', 'Blau', 'Blau', 'Blau', 'Violett', 'Violett', 'Violett', 'Gold', 'Gold'];

export function ResearchTab() {
  const game = useGame();
  const [selectedId, setSelectedId] = useState<string | null>(game.state.research.current);
  const columns = new Map<number, ResearchDef[]>();
  for (const r of RESEARCH_LIST) {
    if (!columns.has(r.column)) columns.set(r.column, []);
    columns.get(r.column)!.push(r);
  }
  const selected = selectedId ? RESEARCH[selectedId] : null;

  return (
    <div className="research-page">
      <div className="research-tree">
        <div className="research-columns">
          {[...columns.entries()]
            .sort(([a], [b]) => a - b)
            .map(([col, list]) => (
              <div key={col} className="research-col">
                <div className="research-col-title">{PACK_COLUMNS[col] ?? ''}</div>
                {list.map((r) => (
                  <ResearchNode key={r.id} def={r} selected={selectedId === r.id} onSelect={() => setSelectedId(r.id)} />
                ))}
              </div>
            ))}
        </div>
      </div>
      <aside className="research-side">
        <CurrentResearch />
        {selected && <ResearchDetails def={selected} />}
      </aside>
    </div>
  );
}

function ResearchNode({ def, selected, onSelect }: { def: ResearchDef; selected: boolean; onSelect: () => void }) {
  const game = useGame();
  const done = !def.repeatable && game.state.research.done.has(def.id);
  const available = isAvailable(game.state, def);
  const current = game.state.research.current === def.id;
  const progress = (game.state.research.progress[def.id] ?? 0) / researchCost(game.state, def);
  const level = researchLevel(game.state, def.id);
  const cls = ['research-node', done ? 'done' : '', !done && !available ? 'locked' : '', current ? 'current' : '', selected ? 'active' : ''].join(' ');
  return (
    <button className={cls} onClick={onSelect} onDoubleClick={() => available && game.startResearch(def.id)}>
      <span className="name">
        {def.icon} {def.name}
        {def.repeatable && <span className="muted"> {level + 1}</span>}
      </span>
      <span className="packs">
        {Object.keys(def.packs).map((p) => (
          <ResourceIcon key={p} id={p} tip={false} />
        ))}
        <span className="muted small mono" style={{ marginLeft: 4 }}>
          ×{fmt(researchCost(game.state, def))}
        </span>
      </span>
      {progress > 0 && !done && (
        <div className="meter">
          <div style={{ width: `${progress * 100}%` }} />
        </div>
      )}
    </button>
  );
}

function CurrentResearch() {
  const game = useGame();
  const id = game.state.research.current;
  if (!id) {
    return (
      <section className="card">
        <h2>Aktuelle Forschung</h2>
        <div className="muted small">Keine. Wähle links eine Forschung und starte sie. Labore brauchen Datenkerne und Strom.</div>
      </section>
    );
  }
  const def = RESEARCH[id];
  const cost = researchCost(game.state, def);
  const progress = game.state.research.progress[id] ?? 0;
  const rate = game.researchRate;
  const eta = rate > 0.0001 ? (cost - progress) / rate : Infinity;
  return (
    <section className="card">
      <h2>Aktuelle Forschung</h2>
      <div style={{ fontWeight: 600 }}>
        {def.icon} {def.name}
      </div>
      <div className="meter">
        <div style={{ width: `${(progress / cost) * 100}%` }} />
      </div>
      <div className="row between small">
        <span className="mono">
          {fmt(progress)} / {fmt(cost)}
        </span>
        <span className="muted">{eta < Infinity ? `noch ${fmtTime(eta)}` : 'Labore stehen still'}</span>
      </div>
    </section>
  );
}

function ResearchDetails({ def }: { def: ResearchDef }) {
  const game = useGame();
  const done = !def.repeatable && game.state.research.done.has(def.id);
  const available = isAvailable(game.state, def);
  const current = game.state.research.current === def.id;
  const unlocks = RECIPE_LIST.filter((r) => r.unlock === def.id);
  const planets = PLANET_LIST.filter((p) => p.unlock === def.id);
  const cost = researchCost(game.state, def);

  return (
    <section className="card">
      <h2>{def.repeatable ? `Stufe ${researchLevel(game.state, def.id) + 1}` : done ? 'Erforscht' : 'Forschung'}</h2>
      <div style={{ fontWeight: 600, fontSize: 14 }}>
        {def.icon} {def.name}
      </div>
      <div className="muted">{def.description}</div>
      <div className="small io-line">
        Kosten pro Einheit: <Amounts items={def.packs} />
      </div>
      <div className="small muted">
        {fmt(cost)} Einheiten · {def.unitTime} s pro Einheit
      </div>
      {def.prereqs.length > 0 && (
        <div className="small">
          Voraussetzungen:{' '}
          {def.prereqs.map((p, i) => (
            <span key={p} className={game.state.research.done.has(p) ? 'good' : 'bad'}>
              {i > 0 ? ', ' : ''}
              {RESEARCH[p].name}
            </span>
          ))}
        </div>
      )}
      {unlocks.length > 0 && (
        <div className="small">
          <div className="muted">Schaltet frei:</div>
          <div className="io-line">
            {unlocks.map((r) => {
              const out = Object.keys(r.outputs)[0];
              return (
                <span key={r.id} className="amount-chip">
                  <ResourceIcon id={out} /> {RESOURCES[out].name}
                </span>
              );
            })}
          </div>
        </div>
      )}
      {planets.map((p) => (
        <div key={p.id} className="small good">
          Neuer Planet: {p.icon} {p.name}
        </div>
      ))}
      {def.modifiers && (
        <ul className="tip-effects small">
          {def.modifiers.map((m, i) => (
            <li key={i}>{describeModifier(m)}</li>
          ))}
        </ul>
      )}
      {!done && (
        <button className="primary" disabled={!available || current} onClick={() => game.startResearch(def.id)}>
          {current ? 'Wird erforscht' : available ? 'Forschung starten' : 'Gesperrt'}
        </button>
      )}
      {current && <span className="muted small">{fmtPercent((game.state.research.progress[def.id] ?? 0) / cost)} abgeschlossen</span>}
    </section>
  );
}
