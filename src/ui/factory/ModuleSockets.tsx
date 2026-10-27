import { useState } from 'react';
import { BASES } from '../../data/items';
import type { Runtime } from '../../sim/world';
import { ItemTile } from '../items/ItemView';
import { useGame } from '../useGame';

export function ModuleSockets({ rt }: { rt: Runtime }) {
  const game = useGame();
  const [picking, setPicking] = useState(false);
  const [message, setMessage] = useState('');
  const slots = game.moduleSlots(game.world, rt);
  if (slots <= 0) return null;
  const equipped = game.modulesOf(rt);
  const iron = game.engine.has('ironDiscipline');
  const available = Object.values(game.state.loot.items).filter((i) => !i.location && BASES[i.base].slot === 'module');

  return (
    <div>
      <div className="row between">
        <h2 style={{ margin: 0 }}>Modulsockel</h2>
        <span className="muted small">
          {equipped.length} / {slots}
        </span>
      </div>
      {iron && <div className="small warn">Eiserne Disziplin: Module wirken nicht, leere Sockel geben Produktivität.</div>}
      <div className="socket-row">
        {equipped.map((item) => (
          <ItemTile key={item.id} item={item} small onClick={() => game.unequipItem(item.id)} />
        ))}
        {Array.from({ length: Math.max(0, slots - equipped.length) }, (_, i) => (
          <button key={i} className="item-tile small empty-socket" onClick={() => setPicking(!picking)} disabled={iron} title="Modul einsetzen">
            +
          </button>
        ))}
      </div>
      {equipped.length > 0 && <div className="muted small">Klick auf ein Modul baut es aus.</div>}
      {picking && (
        <div className="socket-picker">
          {available.length === 0 && <div className="muted small">Keine freien Module. Meteoriten, Bosse und Forschung bringen Beute.</div>}
          {available.map((item) => (
            <ItemTile
              key={item.id}
              item={item}
              onClick={() => {
                const r = game.equipModule(item.id, rt.entity.id);
                setMessage(r.ok ? '' : r.message);
                if (r.ok) setPicking(false);
              }}
            />
          ))}
        </div>
      )}
      {message && <div className="small bad">{message}</div>}
    </div>
  );
}
