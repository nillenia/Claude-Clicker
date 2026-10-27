import { fmt, fmtTime } from '../../core/format';
import { MACHINES } from '../../data/machines';
import { PLANETS } from '../../data/planets';
import { RESOURCES } from '../../data/resources';
import { useGame } from '../useGame';
import { ResourceIcon } from './ResourceIcon';
import { ProductionChart } from './ProductionChart';

export function StatsTab() {
  const game = useGame();
  const { state } = game;
  const produced = Object.entries(state.counters.produced)
    .filter(([id, n]) => RESOURCES[id] && n.gt(0))
    .sort(([, a], [, b]) => (b.gt(a) ? 1 : -1));

  return (
    <div className="tab-page">
      <section className="card">
        <h2>Allgemein</h2>
        <dl className="stat-list">
          <dt>Spielzeit</dt>
          <dd>{fmtTime(state.playTime)}</dd>
          <dt>Angefangen am</dt>
          <dd>{new Date(state.startedAt).toLocaleString('de-DE')}</dd>
          <dt>Klicks (Handabbau)</dt>
          <dd>{fmt(state.counters.clicks)}</dd>
          <dt>Von Hand abgebaut</dt>
          <dd>{fmt(state.counters.handMined)}</dd>
          <dt>Von Hand gefertigt</dt>
          <dd>{fmt(state.counters.handCrafted)}</dd>
          <dt>Forschungen abgeschlossen</dt>
          <dd>{state.research.done.size}</dd>
          <dt>Planeten</dt>
          <dd>{Object.keys(state.planets).length}</dd>
        </dl>
      </section>

      <section className="card">
        <h2>Planeten</h2>
        <table className="stat-table">
          <thead>
            <tr>
              <th>Planet</th>
              <th>Gebäude</th>
              <th>Strom</th>
            </tr>
          </thead>
          <tbody>
            {[...game.worlds.entries()].map(([id, world]) => (
              <tr key={id}>
                <td>
                  {PLANETS[id].icon} {PLANETS[id].name}
                </td>
                <td>{world.state.entities.length - 1}</td>
                <td>
                  {fmt(world.power.demand)} / {fmt(world.power.gen)} kW
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <h3>Gebäude auf {PLANETS[state.activePlanet].name}</h3>
        <dl className="stat-list">
          {Object.entries(
            game.planet.entities.reduce<Record<string, number>>((acc, e) => {
              if (e.type !== 'hub') acc[e.type] = (acc[e.type] ?? 0) + 1;
              return acc;
            }, {}),
          ).map(([type, n]) => (
            <Pair key={type} k={`${MACHINES[type].icon} ${MACHINES[type].name}`} v={String(n)} />
          ))}
        </dl>
      </section>

      <section className="card wide">
        <h2>Produktionsverlauf (Items pro Sekunde, alle Planeten)</h2>
        <ProductionChart />
      </section>

      <section className="card wide">
        <h2>Gesamtproduktion</h2>
        {produced.length === 0 && <div className="muted small">Noch nichts produziert.</div>}
        <table className="stat-table">
          <tbody>
            {produced.map(([id, n]) => (
              <tr key={id}>
                <td>
                  <span className="row">
                    <ResourceIcon id={id} /> {RESOURCES[id].name}
                  </span>
                </td>
                <td>{fmt(n)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Pair({ k, v }: { k: string; v: string }) {
  return (
    <>
      <dt>{k}</dt>
      <dd>{v}</dd>
    </>
  );
}
