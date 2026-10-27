import { useState } from 'react';
import { fmt } from '../../core/format';
import { MACHINE_TREES, MACHINE_TREE_ORDER } from '../../data/machineTrees';
import { MACHINE_LIST, TREE_GROUP_NAMES, type TreeGroup } from '../../data/machines';
import { allocatedSet, machineLevel, pointsLeft } from '../../systems/machineTrees';
import { useGame } from '../useGame';
import { TreeView } from './TreeView';

const GROUP_ICONS: Record<TreeGroup, string> = {
  drill: '⛏️',
  furnace: '🔥',
  assembler: '⚙️',
  lab: '🔬',
  generator: '⚡',
  logistics: '➡️',
  turret: '🔫',
};

export function MachinesTab() {
  const game = useGame();
  const [group, setGroup] = useState<TreeGroup>('drill');
  const [search, setSearch] = useState('');
  const tree = MACHINE_TREES[group];
  const allocated = allocatedSet(game.state, group);
  const points = pointsLeft(game.state, group);

  return (
    <div className="tree-page">
      <aside className="tree-side">
        <h2>Maschinentypen</h2>
        {MACHINE_TREE_ORDER.map((g) => {
          const info = machineLevel(game.state, g);
          const free = pointsLeft(game.state, g);
          return (
            <button key={g} className={`tree-group ${g === group ? 'active' : ''}`} onClick={() => setGroup(g)}>
              <span className="tree-group-icon">{GROUP_ICONS[g]}</span>
              <span className="tree-group-main">
                <span className="row between">
                  <span>{TREE_GROUP_NAMES[g]}</span>
                  <span className="mono small">Lv {info.level}</span>
                </span>
                <span className="meter">
                  <div style={{ width: `${Math.min(100, (info.current / info.needed) * 100)}%` }} />
                </span>
                {free > 0 && <span className="small good">{free === 1 ? '1 freier Punkt' : `${free} freie Punkte`}</span>}
              </span>
            </button>
          );
        })}
        <div className="muted small">
          Maschinen sammeln Erfahrung, während sie arbeiten. Jedes Level gibt einen Punkt. Die Knoten wirken auf alle Maschinen des Typs auf allen Planeten.
        </div>
      </aside>
      <section className="tree-main">
        <div className="tree-toolbar">
          <div>
            <strong>
              {GROUP_ICONS[group]} {tree.name}
            </strong>
            <span className="muted small">
              {' '}
              · gilt für {MACHINE_LIST.filter((m) => m.tree === group).map((m) => m.name).join(', ')}
            </span>
          </div>
          <div className="row">
            <span className={points > 0 ? 'good' : 'muted'}>{points} Punkte frei</span>
            <span className="muted small mono">
              {fmt(machineLevel(game.state, group).current)} / {fmt(machineLevel(game.state, group).needed)} EP
            </span>
            <input type="search" placeholder="Suchen …" value={search} onChange={(e) => setSearch(e.target.value)} />
            <button onClick={() => game.resetMachineTree(group)} disabled={allocated.size <= 1}>
              Zurücksetzen
            </button>
          </div>
        </div>
        <TreeView
          tree={tree}
          allocated={allocated}
          pointsLeft={points}
          onAllocate={(id) => game.allocateMachineNode(group, id)}
          onRefund={(id) => game.refundMachineNode(group, id)}
          search={search}
        />
      </section>
    </div>
  );
}
