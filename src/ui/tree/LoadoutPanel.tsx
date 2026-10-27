import { useState } from 'react';
import { CLASS_BY_ID } from '../../data/commanderTree';
import { useGame } from '../useGame';

export function LoadoutPanel() {
  const game = useGame();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');

  return (
    <section>
      <h2>Loadouts &amp; Build-Codes</h2>
      <div className="row">
        <input type="text" placeholder="Name, z. B. Boss-Setup" value={name} onChange={(e) => setName(e.target.value)} style={{ flex: 1, minWidth: 0 }} />
        <button
          onClick={() => {
            game.saveLoadout(name);
            setName('');
            setMessage('Gespeichert.');
          }}
        >
          Speichern
        </button>
      </div>
      {game.state.loadouts.map((l) => (
        <div key={l.name} className="row" style={{ gap: 4, margin: '4px 0' }}>
          <span className="small" style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {l.commander.classId ? CLASS_BY_ID[l.commander.classId].icon : '–'} {l.name}
          </span>
          <button onClick={() => setMessage(game.applyLoadout(l) ?? `„${l.name}“ geladen.`)}>Laden</button>
          <button onClick={() => setCode(game.exportLoadout(l))} title="Build-Code">
            ⇪
          </button>
          <button onClick={() => game.deleteLoadout(l.name)} title="Löschen">
            ✕
          </button>
        </div>
      ))}
      <textarea rows={2} value={code} onChange={(e) => setCode(e.target.value)} placeholder="Build-Code einfügen oder exportieren" onFocus={(e) => e.target.select()} />
      <button
        disabled={!code.trim()}
        onClick={() => {
          try {
            const l = game.importLoadout(code);
            setMessage(`„${l.name}“ importiert.`);
            setCode('');
          } catch {
            setMessage('Ungültiger Build-Code.');
          }
        }}
      >
        Importieren
      </button>
      {message && <div className="small message">{message}</div>}
    </section>
  );
}
