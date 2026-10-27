import { useState } from 'react';
import { fmt, fmtTime } from '../../core/format';
import { BOSSES, ENEMIES, THREAT_MODS, tierScale } from '../../data/enemies';
import { DAMAGE_TYPE_NAMES, type DamageType } from '../../data/machines';
import { PLANETS } from '../../data/planets';
import { amountOf } from '../../systems/inventory';
import { useGame } from '../useGame';

export function ThreatPanel() {
  const game = useGame();
  const [dialog, setDialog] = useState(false);
  const world = game.world;
  const planet = game.state.activePlanet;
  const t = game.threatOf(planet);
  const active = game.threatsActive(world);
  const boss = world.threat.enemies.find((e) => e.boss);
  const enemies = world.threat.enemies.length;
  const bossDef = Object.values(BOSSES).find((b) => b.planet === planet);

  return (
    <section>
      <h2>Bedrohung</h2>
      {game.state.settings.peaceful ? (
        <div className="muted small">Friedlicher Modus – keine Angriffswellen.</div>
      ) : !active ? (
        <div className="muted small">Noch ruhig. Angriffe beginnen ab 20 Gebäuden, sobald „Verteidigung“ erforscht ist oder 45 Minuten vergangen sind.</div>
      ) : enemies > 0 ? (
        <div className="small bad">⚠ {enemies} Gegner auf dem Planeten!</div>
      ) : (
        <div className="row between small">
          <span className="muted">Nächste Welle ({ENEMIES[PLANETS[planet].enemy].name}, Stufe {game.waveLevel(world)})</span>
          <span className="mono">{fmtTime(t.timer / (PLANETS[planet].threatRate ?? 1))}</span>
        </div>
      )}
      {boss && (
        <div style={{ marginTop: 6 }}>
          <div className="row between small">
            <strong>
              {boss.def.icon} {boss.def.name}
            </strong>
            <span className="mono">{fmt(Math.max(0, boss.hp))}</span>
          </div>
          <div className="meter bad">
            <div style={{ width: `${(Math.max(0, boss.hp) / boss.maxHp) * 100}%` }} />
          </div>
        </div>
      )}
      <div className="row between small" style={{ marginTop: 6 }}>
        <span className="muted">
          Besiegt: {t.kills} · Bosse: {t.bossKills}
        </span>
        {bossDef && (
          <button onClick={() => setDialog(true)} disabled={!!world.threat.fight}>
            {bossDef.icon} Boss
          </button>
        )}
      </div>
      {dialog && bossDef && <BossDialog onClose={() => setDialog(false)} />}
    </section>
  );
}

function BossDialog({ onClose }: { onClose: () => void }) {
  const game = useGame();
  const planet = game.state.activePlanet;
  const t = game.threatOf(planet);
  const boss = Object.values(BOSSES).find((b) => b.planet === planet)!;
  const [tier, setTier] = useState(t.maxTier);
  const [mods, setMods] = useState<string[]>([]);
  const [error, setError] = useState('');
  const beacons = amountOf(game.planet, 'signal_beacon').toNumber();
  const loot = mods.reduce((s, id) => s + (THREAT_MODS.find((m) => m.id === id)?.loot ?? 0), 0) + (tier - 1) * 10;
  const scale = tierScale(tier);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>
          {boss.icon} {boss.name}
        </h2>
        <p className="small">{boss.mechanicText}</p>
        <dl className="kv small">
          <dt>Leben</dt>
          <dd>{fmt(boss.hp * scale)}</dd>
          <dt>Resistenzen</dt>
          <dd>
            {Object.entries(boss.resists)
              .map(([k, v]) => `${DAMAGE_TYPE_NAMES[k as DamageType]} ${v}%`)
              .join(', ') || '–'}
          </dd>
        </dl>
        <label className="option-row small" style={{ marginTop: 10 }}>
          <span>Bedrohungsstufe (max. {t.maxTier})</span>
          <select value={tier} onChange={(e) => setTier(Number(e.target.value))}>
            {Array.from({ length: t.maxTier }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                Stufe {n}
              </option>
            ))}
          </select>
        </label>
        <div className="small" style={{ marginTop: 8 }}>
          <div className="muted">Modifikatoren (mehr Risiko, mehr Beute):</div>
          {THREAT_MODS.map((m) => (
            <label key={m.id} className="option-row">
              <span>
                {m.text} <span className="good">+{m.loot} % Beute</span>
              </span>
              <input type="checkbox" checked={mods.includes(m.id)} onChange={(e) => setMods(e.target.checked ? [...mods, m.id] : mods.filter((x) => x !== m.id))} />
            </label>
          ))}
        </div>
        <p className="small">
          Beutebonus: <strong className="good">+{loot} %</strong> · Signalbaken: {beacons}
        </p>
        {error && <p className="small bad">{error}</p>}
        <div className="button-row">
          <button
            className="primary"
            disabled={beacons < 1}
            onClick={() => {
              const err = game.summonBoss(tier, mods);
              if (err) setError(err);
              else onClose();
            }}
          >
            Signalbake zünden
          </button>
          <button onClick={onClose}>Abbrechen</button>
        </div>
        {beacons < 1 && <p className="muted small">Signalbaken stellst du nach der Forschung „Bedrohungsanalyse“ her.</p>}
      </div>
    </div>
  );
}
