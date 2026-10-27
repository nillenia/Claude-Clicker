import { fmt } from '../../core/format';
import { CATEGORY_NAMES, RESOURCES, type ResourceCategory } from '../../data/resources';
import { ResourceIcon } from '../components/ResourceIcon';
import { useGame } from '../useGame';

const ORDER: ResourceCategory[] = ['ore', 'fluid', 'material', 'component', 'science', 'military', 'building', 'currency'];

export function InventoryPanel() {
  const game = useGame();
  const inv = game.planet.inventory;
  const rates = game.world.netRates;

  const groups = ORDER.map((cat) => ({
    cat,
    items: Object.entries(inv)
      .filter(([id, n]) => RESOURCES[id]?.category === cat && (n.gt(0.0001) || Math.abs(rates.get(id) ?? 0) > 0.001))
      .sort(([a], [b]) => RESOURCES[a].tier - RESOURCES[b].tier || RESOURCES[a].name.localeCompare(RESOURCES[b].name)),
  })).filter((g) => g.items.length > 0);

  return (
    <section>
      <h2>Inventar</h2>
      {groups.length === 0 && <div className="muted small">Leer. Klicke auf Erzfelder, um von Hand abzubauen.</div>}
      {groups.map((g) => (
        <div key={g.cat} className="inv-group">
          <div className="inv-group-title">{CATEGORY_NAMES[g.cat]}</div>
          {g.items.map(([id, n]) => {
            const rate = rates.get(id) ?? 0;
            return (
              <div key={id} className="inv-item">
                <ResourceIcon id={id} />
                <span className="inv-name">{RESOURCES[id].name}</span>
                <span className="inv-amount">{fmt(n)}</span>
                <span className={`inv-rate ${rate > 0.001 ? 'good' : rate < -0.001 ? 'bad' : 'muted'}`}>
                  {Math.abs(rate) > 0.001 ? `${rate > 0 ? '+' : ''}${fmt(rate, true)}/s` : ''}
                </span>
              </div>
            );
          })}
        </div>
      ))}
    </section>
  );
}
