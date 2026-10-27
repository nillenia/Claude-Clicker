import { useState } from 'react';
import { blueprintCost, encodeBlueprint } from '../../systems/blueprints';
import { amountOf } from '../../systems/inventory';
import { Amounts } from '../components/ResourceIcon';
import { useTip } from '../components/Tooltip';
import { useGame } from '../useGame';
import type { Blueprint } from '../../core/state';

export function BlueprintPanel({ onPaste, onSelect }: { onPaste: (id: number) => void; onSelect: () => void }) {
  const game = useGame();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const list = game.state.blueprints;

  return (
    <section>
      <div className="row between">
        <h2 style={{ margin: 0, cursor: 'pointer' }} onClick={() => setOpen(!open)}>
          {open ? '▾' : '▸'} Blaupausen ({list.length})
        </h2>
        <button onClick={onSelect} title="Taste B">
          + Bereich
        </button>
      </div>
      {open && (
        <>
          {list.length === 0 && <div className="muted small">Taste B: Bereich aufziehen, um Gebäude samt Rezepten zu kopieren.</div>}
          {list.map((b) => (
            <BlueprintRow key={b.id} blueprint={b} onPaste={() => onPaste(b.id)} onExport={() => setCode(encodeBlueprint(b))} />
          ))}
          <textarea rows={2} value={code} onChange={(e) => setCode(e.target.value)} placeholder="Blaupausen-Code einfügen oder exportieren" onFocus={(e) => e.target.select()} />
          <button
            disabled={!code.trim()}
            onClick={() => {
              try {
                const b = game.importBlueprint(code);
                setMessage(`${b.name} importiert.`);
                setCode('');
              } catch {
                setMessage('Ungültiger Code.');
              }
            }}
          >
            Importieren
          </button>
          {message && <div className="small message">{message}</div>}
        </>
      )}
    </section>
  );
}

function BlueprintRow({ blueprint, onPaste, onExport }: { blueprint: Blueprint; onPaste: () => void; onExport: () => void }) {
  const game = useGame();
  const cost = blueprintCost(blueprint);
  const tip = useTip(() => (
    <>
      <div className="tip-title">{blueprint.name}</div>
      <div className="tip-muted">
        {blueprint.w}×{blueprint.h} Felder · {blueprint.entities.length} Gebäude
      </div>
      <div className="tip-section io-line">
        <Amounts items={cost} have={(id) => amountOf(game.planet, id).toNumber()} />
      </div>
    </>
  ));
  return (
    <div className="row" style={{ gap: 4, margin: '4px 0' }}>
      <input
        type="text"
        defaultValue={blueprint.name}
        onBlur={(e) => game.renameBlueprint(blueprint.id, e.target.value)}
        style={{ flex: 1, minWidth: 0 }}
        {...tip}
      />
      <button onClick={onPaste} title="Einfügen">
        📋
      </button>
      <button onClick={onExport} title="Code exportieren">
        ⇪
      </button>
      <button onClick={() => game.deleteBlueprint(blueprint.id)} title="Löschen">
        ✕
      </button>
    </div>
  );
}
