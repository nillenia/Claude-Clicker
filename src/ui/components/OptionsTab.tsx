import { useState } from 'react';
import { useGame } from '../useGame';

const CONTROLS: [string, string][] = [
  ['Linksklick auf Erz', 'Von Hand abbauen'],
  ['Linksklick auf Gebäude', 'Auswählen'],
  ['Ziehen auf freier Fläche', 'Karte verschieben'],
  ['Mausrad', 'Zoomen'],
  ['1–9', 'Gebäude aus der Leiste wählen'],
  ['Linksklick / Ziehen', 'Bauen (Bänder folgen der Maus)'],
  ['R / Shift+R', 'Drehen'],
  ['Q', 'Gebäude unter der Maus kopieren'],
  ['Rechtsklick / X', 'Abreißen'],
  ['Esc', 'Werkzeug abwählen'],
  ['B', 'Blaupause: Bereich kopieren'],
  ['Shift+1–6', 'Aktive Skills'],
];

export function OptionsTab() {
  const game = useGame();
  const { settings } = game.state;
  const [exportCode, setExportCode] = useState('');
  const [importCode, setImportCode] = useState('');
  const [message, setMessage] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

  const doImport = () => {
    try {
      game.importCode(importCode);
      setImportCode('');
      setMessage('Spielstand geladen.');
    } catch {
      setMessage('Ungültiger Spielstand-Code.');
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(exportCode);
      setMessage('Code in die Zwischenablage kopiert.');
    } catch {
      setMessage('Kopieren nicht möglich – bitte manuell markieren.');
    }
  };

  return (
    <div className="tab-page">
      <section className="card">
        <h2>Anzeige</h2>
        <label className="option-row">
          <span>Zahlenformat</span>
          <select value={settings.notation} onChange={(e) => game.setNotation(e.target.value as 'short' | 'scientific')}>
            <option value="short">Kurz (1,234 Mio.)</option>
            <option value="scientific">Wissenschaftlich (1,23e6)</option>
          </select>
        </label>
        <label className="option-row">
          <span>Friedlicher Modus (keine Angriffswellen)</span>
          <input type="checkbox" checked={settings.peaceful} onChange={(e) => game.setSetting('peaceful', e.target.checked)} />
        </label>
        <label className="option-row">
          <span>Sound</span>
          <input type="checkbox" checked={settings.sound} onChange={(e) => game.setSetting('sound', e.target.checked)} />
        </label>
        <label className="option-row">
          <span>Lautstärke</span>
          <input type="range" min={0} max={1} step={0.05} value={settings.volume} onChange={(e) => game.setSetting('volume', Number(e.target.value))} />
        </label>
        <label className="option-row">
          <span>Rasterlinien anzeigen</span>
          <input type="checkbox" checked={settings.showGrid} onChange={(e) => game.setSetting('showGrid', e.target.checked)} />
        </label>
        <h3>Steuerung</h3>
        <dl className="stat-list">
          {CONTROLS.map(([k, v]) => (
            <Pair key={k} k={k} v={v} />
          ))}
        </dl>
      </section>

      <section className="card">
        <h2>Spielstand</h2>
        <p className="muted small">Das Spiel speichert automatisch alle 30 Sekunden und beim Schließen.</p>
        <div className="button-row">
          <button
            onClick={() => {
              game.save();
              setMessage('Gespeichert.');
            }}
          >
            Jetzt speichern
          </button>
          <button onClick={() => setExportCode(game.exportCode())}>Exportieren</button>
        </div>
        {exportCode && (
          <>
            <textarea readOnly value={exportCode} rows={4} onFocus={(e) => e.target.select()} />
            <button onClick={copy}>Kopieren</button>
          </>
        )}
        <h3>Importieren</h3>
        <textarea value={importCode} onChange={(e) => setImportCode(e.target.value)} rows={4} placeholder="Spielstand-Code einfügen" />
        <button onClick={doImport} disabled={!importCode.trim()}>
          Laden
        </button>
        {message && <p className="message">{message}</p>}
      </section>

      <section className="card danger">
        <h2>Zurücksetzen</h2>
        <p className="muted small">Löscht den kompletten Fortschritt. Das kann nicht rückgängig gemacht werden.</p>
        {!confirmReset ? (
          <button className="danger-button" onClick={() => setConfirmReset(true)}>
            Spiel zurücksetzen
          </button>
        ) : (
          <div className="button-row">
            <button
              className="danger-button"
              onClick={() => {
                game.hardReset();
                setConfirmReset(false);
                setMessage('Spiel zurückgesetzt.');
              }}
            >
              Ja, alles löschen
            </button>
            <button onClick={() => setConfirmReset(false)}>Abbrechen</button>
          </div>
        )}
      </section>
    </div>
  );
}

function Pair({ k, v }: { k: string; v: string }) {
  return (
    <>
      <dt>{k}</dt>
      <dd style={{ fontFamily: 'inherit' }}>{v}</dd>
    </>
  );
}
