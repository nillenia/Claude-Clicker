import { StatEngine } from '../../engine/engine';
import { entityTags, targetContext } from '../../engine/machineStats';
import { STAT_NAMES, type StatId } from '../../engine/types';
import type { Runtime } from '../../sim/world';
import { useTip } from '../components/Tooltip';
import { useGame } from '../useGame';

const nf = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 });

interface StatLine {
  stat: StatId;
  /** Anzeige des Endwerts. */
  format: (v: number) => string;
}

const PERCENT = (v: number) => `${nf.format(v)} %`;
const MULT = (v: number) => `×${nf.format(v)}`;

function linesFor(rt: Runtime): StatLine[] {
  const c = rt.def.category;
  const lines: StatLine[] = [];
  if (['drill', 'pump', 'furnace', 'assembler', 'chemical', 'lab'].includes(c)) {
    lines.push({ stat: 'speed', format: MULT }, { stat: 'productivity', format: PERCENT }, { stat: 'critChance', format: PERCENT }, { stat: 'critMulti', format: PERCENT });
  }
  if (c === 'belt' || c === 'splitter' || c === 'terminal') lines.push({ stat: 'throughput', format: MULT });
  if (rt.def.power > 0) lines.push({ stat: 'power', format: MULT });
  if (rt.def.powerGen) lines.push({ stat: 'powerGen', format: MULT });
  if (rt.def.fuel) lines.push({ stat: 'fuelUse', format: MULT });
  if (rt.def.turret) lines.push({ stat: 'damage', format: MULT }, { stat: 'fireRate', format: MULT }, { stat: 'range', format: MULT });
  return lines;
}

export function StatsSection({ rt }: { rt: Runtime }) {
  const lines = linesFor(rt);
  if (lines.length === 0) return null;
  return (
    <div>
      <h2>Werte</h2>
      <dl className="kv">
        {lines.map((l) => (
          <StatRow key={l.stat} rt={rt} line={l} />
        ))}
      </dl>
      <div className="muted small" style={{ marginTop: 4 }}>
        Fahre über einen Wert für die Aufschlüsselung.
      </div>
    </div>
  );
}

function StatRow({ rt, line }: { rt: Runtime; line: StatLine }) {
  const game = useGame();
  const compute = () => {
    const { mods, emptySockets } = game.moduleModifiers(rt);
    return game.engine.breakdown(line.stat, entityTags(game.world, rt), StatEngine.baseOf(line.stat), mods, targetContext(game.world, rt, emptySockets, game.engine.flags));
  };
  const tip = useTip(() => {
    const b = compute();
    return (
      <>
        <div className="tip-title">{STAT_NAMES[line.stat]}</div>
        <div className="tip-muted">Basis {nf.format(b.base)}</div>
        {b.lines.length === 0 && <div className="tip-muted">Keine Modifikatoren.</div>}
        {b.lines.map((l, i) => (
          <div key={i} className="row between small">
            <span className="muted">{l.source}</span>
            <span className="mono">
              {l.kind === 'flat' ? `${l.value >= 0 ? '+' : ''}${nf.format(l.value)}` : l.kind === 'inc' ? `${l.value >= 0 ? '+' : ''}${nf.format(l.value)} % erhöht` : `${nf.format(l.value)} % mehr`}
            </span>
          </div>
        ))}
        <div className="tip-section small mono">
          ({nf.format(b.base)} {b.flat >= 0 ? '+' : '−'} {nf.format(Math.abs(b.flat))}) × {nf.format(1 + b.inc / 100)} × {nf.format(b.more)} = {nf.format(b.total)}
        </div>
      </>
    );
  });
  const value = compute().total;
  return (
    <>
      <dt {...tip} style={{ cursor: 'help' }}>
        {STAT_NAMES[line.stat]}
      </dt>
      <dd {...tip}>{line.format(value)}</dd>
    </>
  );
}
