import { useState } from 'react';
import { fmt } from '../../core/format';
import { describeModifier } from '../../engine/describe';
import { ASCENDANCIES, CLASS_BY_ID, CLASSES, COMMANDER_TREE } from '../../data/commanderTree';
import * as cmd from '../../systems/commander';
import { useGame } from '../useGame';
import { TreeView } from './TreeView';
import { LoadoutPanel } from './LoadoutPanel';

export function CommanderTab() {
  const game = useGame();
  const c = game.state.commander;
  const [search, setSearch] = useState('');
  const [confirmClass, setConfirmClass] = useState(false);

  if (!c.classId || confirmClass) {
    return <ClassSelection onDone={() => setConfirmClass(false)} />;
  }

  const cls = CLASS_BY_ID[c.classId];
  const info = cmd.commanderLevel(game.state);
  const points = cmd.commanderPointsLeft(game.state);
  const allocated = cmd.commanderAllocated(game.state);
  const masteries = c.allocated.filter((id) => COMMANDER_TREE.nodes[id]?.choices);

  return (
    <div className="tree-page">
      <aside className="tree-side">
        <div className="commander-card" style={{ borderColor: cls.color }}>
          <div className="commander-icon">{cls.icon}</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{cls.name}</div>
            <div className="muted small">{c.ascendancy ? ASCENDANCIES[c.ascendancy].name : cls.description}</div>
          </div>
        </div>
        <div className="row between">
          <span>Level {info.level}</span>
          <span className="mono small muted">
            {fmt(info.current)} / {fmt(info.needed)} EP
          </span>
        </div>
        <div className="meter">
          <div style={{ width: `${Math.min(100, (info.current / info.needed) * 100)}%` }} />
        </div>
        <div className="muted small">Der Kommandant erhält die Hälfte aller Maschinen-Erfahrung sowie Erfahrung für Forschung und Bosse.</div>

        {masteries.length > 0 && (
          <section>
            <h2>Meisterschaften</h2>
            {masteries.map((id) => {
              const node = COMMANDER_TREE.nodes[id];
              const chosen = c.masteries[id];
              return (
                <div key={id} className="mastery-box">
                  <div className="small muted">{node.name}</div>
                  {node.choices!.map((choice, i) => (
                    <button key={i} className={`mastery-choice ${chosen === i ? 'active' : ''}`} onClick={() => game.commander((s) => cmd.setMastery(s, id, i))}>
                      <strong>{choice.name}</strong>
                      <span className="small">{choice.mods.map(describeModifier).join(' · ')}</span>
                    </button>
                  ))}
                </div>
              );
            })}
          </section>
        )}

        <AscendancySection />
        <LoadoutPanel />

        <div className="button-row" style={{ marginTop: 'auto' }}>
          <button onClick={() => setConfirmClass(true)}>Klasse wechseln</button>
        </div>
      </aside>
      <section className="tree-main">
        <div className="tree-toolbar">
          <strong>Kommandanten-Baum</strong>
          <div className="row">
            <span className={points > 0 ? 'good' : 'muted'}>{points} Punkte frei</span>
            <input type="search" placeholder="Suchen …" value={search} onChange={(e) => setSearch(e.target.value)} />
            <button
              onClick={() =>
                game.commander((s) => {
                  cmd.resetCommanderTree(s);
                  return true;
                })
              }
              disabled={allocated.size <= 1}
            >
              Zurücksetzen
            </button>
          </div>
        </div>
        <TreeView
          tree={COMMANDER_TREE}
          allocated={allocated}
          pointsLeft={points}
          blocked={cmd.blockedForClass(c.classId)}
          onAllocate={(id) => game.commander((s) => cmd.allocateCommanderNode(s, id))}
          onRefund={(id) => game.commander((s) => cmd.refundCommanderNode(s, id))}
          search={search}
          accent={cls.color}
          extraTooltip={(node) =>
            node.choices ? (
              <div className="tip-section small">
                <div className="muted">Wähle nach dem Vergeben einen Effekt:</div>
                {node.choices.map((ch, i) => (
                  <div key={i}>
                    • <strong>{ch.name}</strong>: {ch.mods.map(describeModifier).join(', ')}
                  </div>
                ))}
              </div>
            ) : node.kind === 'socket' ? (
              <div className="tip-section small muted">Nimmt ein Juwel auf (im Tab „Module“).</div>
            ) : node.classStart ? (
              <div className="tip-section small muted">Startpunkt: {CLASS_BY_ID[node.classStart].name}</div>
            ) : null
          }
        />
      </section>
    </div>
  );
}

function ClassSelection({ onDone }: { onDone: () => void }) {
  const game = useGame();
  const current = game.state.commander.classId;
  return (
    <div className="tab-page">
      <section className="card wide">
        <h2>Wähle deine Klasse</h2>
        <p className="muted">
          Die Klasse bestimmt deinen Startpunkt im Kommandanten-Baum und deine Aszendenzen ab Level {cmd.ASCENDANCY_UNLOCK}.
          {current && ' Ein Wechsel setzt den Baum und die Aszendenz zurück.'}
        </p>
      </section>
      {CLASSES.map((cls) => (
        <section key={cls.id} className="card class-card" style={{ borderColor: cls.color }}>
          <div className="row">
            <span style={{ fontSize: 28 }}>{cls.icon}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: cls.color }}>{cls.name}</div>
              <div className="muted small">{cls.description}</div>
            </div>
          </div>
          <div className="small">
            Aszendenzen: {cls.ascendancies.map((a) => ASCENDANCIES[a].name).join(' oder ')}
          </div>
          <button
            className="primary"
            disabled={current === cls.id}
            onClick={() => {
              game.commander((s) => cmd.chooseClass(s, cls.id));
              onDone();
            }}
          >
            {current === cls.id ? 'Aktuelle Klasse' : `${cls.name} wählen`}
          </button>
        </section>
      ))}
      {current && (
        <section className="card wide">
          <button onClick={onDone}>Abbrechen</button>
        </section>
      )}
    </div>
  );
}

function AscendancySection() {
  const game = useGame();
  const c = game.state.commander;
  const level = cmd.commanderLevel(game.state).level;
  const cls = CLASS_BY_ID[c.classId!];

  if (!c.ascendancy) {
    return (
      <section>
        <h2>Aszendenz</h2>
        {level < cmd.ASCENDANCY_UNLOCK ? (
          <div className="muted small">Ab Kommandanten-Level {cmd.ASCENDANCY_UNLOCK} wählbar.</div>
        ) : (
          cls.ascendancies.map((id) => (
            <button key={id} className="mastery-choice" onClick={() => game.commander((s) => cmd.chooseAscendancy(s, id))}>
              <strong>{ASCENDANCIES[id].name}</strong>
              <span className="small">{ASCENDANCIES[id].description}</span>
            </button>
          ))
        )}
      </section>
    );
  }

  const asc = ASCENDANCIES[c.ascendancy];
  const points = cmd.ascendancyPointsLeft(game.state);
  return (
    <section>
      <div className="row between">
        <h2 style={{ margin: 0 }}>{asc.name}</h2>
        <span className={`small ${points > 0 ? 'good' : 'muted'}`}>{points} Punkte</span>
      </div>
      <div className="asc-tree">
        <TreeView
          tree={asc.tree}
          allocated={new Set(c.ascAllocated)}
          pointsLeft={points}
          onAllocate={(id) => game.commander((s) => cmd.allocateAscendancyNode(s, id))}
          onRefund={(id) => game.commander((s) => cmd.refundAscendancyNode(s, id))}
          accent={cls.color}
        />
      </div>
      <div className="muted small">Je 2 Punkte bei Level {cmd.ASCENDANCY_LEVELS.join(', ')}.</div>
    </section>
  );
}
