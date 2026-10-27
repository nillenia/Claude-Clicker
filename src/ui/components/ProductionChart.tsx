import { useRef, useState } from 'react';
import { fmt } from '../../core/format';
import { RESOURCES } from '../../data/resources';
import { useGame } from '../useGame';

/** Kategoriefarben (dunkles Theme), gegen die Diagrammfläche validiert – feste Reihenfolge, nie zyklisch. */
const SLOTS = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181'];
const MAX_SERIES = SLOTS.length;

/** Farbe folgt der Ressource, nicht ihrem Rang: belegte Slots bleiben, solange die Ressource gewählt ist. */
const slotOf = new Map<string, number>();

function assignSlots(selected: string[]): void {
  for (const res of [...slotOf.keys()]) if (!selected.includes(res)) slotOf.delete(res);
  for (const res of selected) {
    if (slotOf.has(res)) continue;
    const used = new Set(slotOf.values());
    const free = SLOTS.findIndex((_, i) => !used.has(i));
    if (free >= 0) slotOf.set(res, free);
  }
}

const W = 720;
const H = 260;
const PAD = { l: 56, r: 16, t: 12, b: 28 };

export function ProductionChart() {
  const game = useGame();
  const history = game.history;
  const available = [...new Set(history.flatMap((h) => Object.keys(h.rates)))].filter((r) => RESOURCES[r]).sort((a, b) => RESOURCES[a].tier - RESOURCES[b].tier || RESOURCES[a].name.localeCompare(RESOURCES[b].name));
  const [chosen, setChosen] = useState<string[] | null>(null);
  const [table, setTable] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const selected = (chosen ?? available.slice(0, 3)).filter((r) => available.includes(r)).slice(0, MAX_SERIES);
  assignSlots(selected);

  if (history.length < 2) {
    return <div className="muted small">Der Verlauf wird alle 10 Sekunden aufgezeichnet – gleich geht es los.</div>;
  }

  const t0 = history[0].t;
  const t1 = history[history.length - 1].t;
  const maxY = Math.max(0.001, ...history.flatMap((h) => selected.map((r) => h.rates[r] ?? 0))) * 1.1;
  const x = (t: number) => PAD.l + ((t - t0) / Math.max(1, t1 - t0)) * (W - PAD.l - PAD.r);
  const y = (v: number) => H - PAD.b - (v / maxY) * (H - PAD.t - PAD.b);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * maxY);

  const toggle = (res: string) => {
    const base = chosen ?? selected;
    setChosen(base.includes(res) ? base.filter((r) => r !== res) : base.length < MAX_SERIES ? [...base, res] : base);
  };

  const onMove = (e: React.PointerEvent) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0;
    for (let i = 0; i < history.length; i++) if (Math.abs(x(history[i].t) - px) < Math.abs(x(history[best].t) - px)) best = i;
    setHover(best);
  };

  const h = hover !== null ? history[hover] : null;

  return (
    <div className="chart">
      <div className="chart-filters">
        {available.map((res) => {
          const on = selected.includes(res);
          return (
            <button key={res} className={`chart-chip ${on ? 'on' : ''}`} onClick={() => toggle(res)} disabled={!on && selected.length >= MAX_SERIES}>
              <span className="swatch" style={{ background: on ? SLOTS[slotOf.get(res)!] : 'transparent' }} />
              {RESOURCES[res].name}
            </button>
          );
        })}
        <button className="chart-chip" onClick={() => setTable(!table)} style={{ marginLeft: 'auto' }}>
          {table ? 'Diagramm' : 'Tabelle'}
        </button>
      </div>

      {table ? (
        <table className="stat-table">
          <thead>
            <tr>
              <th>Spielzeit</th>
              {selected.map((r) => (
                <th key={r}>{RESOURCES[r].name} /s</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...history].reverse().slice(0, 30).map((row) => (
              <tr key={row.t}>
                <td>{fmtClock(row.t)}</td>
                {selected.map((r) => (
                  <td key={r}>{fmt(row.rates[r] ?? 0, true)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="chart-plot">
          <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="chart-svg" onPointerMove={onMove} onPointerLeave={() => setHover(null)} role="img" aria-label="Produktionsraten über die Zeit">
            {ticks.map((v, i) => (
              <g key={i}>
                <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} className="chart-grid" />
                <text x={PAD.l - 6} y={y(v)} className="chart-axis" textAnchor="end" dominantBaseline="middle">
                  {fmt(v, true)}
                </text>
              </g>
            ))}
            <text x={PAD.l} y={H - 8} className="chart-axis">
              vor {Math.round((t1 - t0) / 60)} Min.
            </text>
            <text x={W - PAD.r} y={H - 8} className="chart-axis" textAnchor="end">
              jetzt
            </text>
            {selected.map((res) => (
              <polyline
                key={res}
                fill="none"
                stroke={SLOTS[slotOf.get(res)!]}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                points={history.map((p) => `${x(p.t)},${y(p.rates[res] ?? 0)}`).join(' ')}
              />
            ))}
            {h && (
              <g>
                <line x1={x(h.t)} x2={x(h.t)} y1={PAD.t} y2={H - PAD.b} className="chart-crosshair" />
                {selected.map((res) => (
                  <circle key={res} cx={x(h.t)} cy={y(h.rates[res] ?? 0)} r={4} fill={SLOTS[slotOf.get(res)!]} stroke="#121a27" strokeWidth={2} />
                ))}
              </g>
            )}
          </svg>
          {h && (
            <div className="chart-tooltip" style={{ left: `${(x(h.t) / W) * 100}%` }}>
              <div className="muted small">Spielzeit {fmtClock(h.t)}</div>
              {selected.map((res) => (
                <div key={res} className="row small">
                  <span className="swatch" style={{ background: SLOTS[slotOf.get(res)!] }} />
                  <span style={{ flex: 1 }}>{RESOURCES[res].name}</span>
                  <span className="mono">{fmt(h.rates[res] ?? 0, true)}/s</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {selected.length >= 2 && !table && (
        <div className="chart-legend">
          {selected.map((res) => (
            <span key={res} className="row small">
              <span className="swatch line" style={{ background: SLOTS[slotOf.get(res)!] }} />
              {RESOURCES[res].name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function fmtClock(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}
