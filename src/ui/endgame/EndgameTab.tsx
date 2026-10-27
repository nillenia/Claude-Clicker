import { useState } from 'react';
import { fmt } from '../../core/format';
import { describeModifier } from '../../engine/describe';
import { DARK_UPGRADES, SYSTEM_MODS } from '../../data/prestige';
import { BOARD_SIZE, GLYPH_BY_ID, GLYPHS, PARAGON_BOARDS, paragonNeighbors, type ParagonTile } from '../../data/paragon';
import * as paragon from '../../systems/paragon';
import * as prestige from '../../systems/prestige';
import { useTip } from '../components/Tooltip';
import { useGame } from '../useGame';

export function EndgameTab() {
  return (
    <div className="tab-page">
      <StarJumpCard />
      <DarkUpgrades />
      <ParagonSection />
    </div>
  );
}

function StarJumpCard() {
  const game = useGame();
  const [confirm, setConfirm] = useState(false);
  const p = game.state.prestige;
  const gain = prestige.darkEnergyGain(game.state);

  return (
    <section className="card">
      <h2>Sternensprung</h2>
      <div className="small">
        Springe in ein neues Sternensystem: Planeten, Fabriken, Inventar und Forschung beginnen von vorn. <strong>Kommandant, Maschinenbäume, Beute, Skills und Paragon bleiben.</strong> Du erhältst Dunkle Energie für permanente Verbesserungen.
      </div>
      <dl className="kv">
        <dt>Imperiumswert dieses Laufs</dt>
        <dd>{fmt(game.state.run.value)}</dd>
        <dt>Dunkle Energie beim Sprung</dt>
        <dd className={gain > 0 ? 'good' : ''}>+{fmt(gain)}</dd>
        <dt>Nächster Punkt bei</dt>
        <dd>{fmt(prestige.nextDarkThreshold(game.state))}</dd>
        <dt>Sprünge bisher</dt>
        <dd>{p.jumps}</dd>
      </dl>
      <div className="muted small">Der Imperiumswert steigt mit allem, was deine Maschinen herstellen – höhere Stufen zählen viel mehr.</div>
      {p.systemMods.length > 0 && (
        <div className="small">
          <div className="muted">Aktuelles Sternensystem:</div>
          {p.systemMods.map((id) => (
            <div key={id}>• {SYSTEM_MODS.find((m) => m.id === id)?.name}</div>
          ))}
        </div>
      )}
      {!confirm ? (
        <button className="primary" disabled={gain < 1} onClick={() => setConfirm(true)}>
          {gain < 1 ? 'Noch nicht genug Imperiumswert' : `Sternensprung (+${fmt(gain)} Dunkle Energie)`}
        </button>
      ) : (
        <div className="button-row">
          <button className="danger-button" onClick={() => game.starJump()}>
            Ja, springen
          </button>
          <button onClick={() => setConfirm(false)}>Abbrechen</button>
        </div>
      )}
    </section>
  );
}

function DarkUpgrades() {
  const game = useGame();
  const [message, setMessage] = useState('');
  const p = game.state.prestige;
  return (
    <section className="card">
      <div className="row between">
        <h2 style={{ margin: 0 }}>Dunkle Energie</h2>
        <span className="mono" style={{ color: '#b388ff' }}>
          ◆ {fmt(p.darkEnergy)}
        </span>
      </div>
      {DARK_UPGRADES.map((u) => {
        const rank = prestige.darkRank(game.state, u.id);
        const maxed = rank >= u.maxRank;
        const locked = !!u.requires && prestige.darkRank(game.state, u.requires) < 1;
        return (
          <div key={u.id} className={`dark-upgrade ${locked ? 'locked-card' : ''}`}>
            <span style={{ fontSize: 18 }}>{u.icon}</span>
            <div style={{ flex: 1 }}>
              <div className="row between">
                <strong className="small">{u.name}</strong>
                <span className="mono small muted">
                  {rank}/{u.maxRank}
                </span>
              </div>
              <div className="muted small">{u.description}</div>
            </div>
            <button disabled={maxed || locked || p.darkEnergy < u.cost(rank)} onClick={() => setMessage(game.buyDarkUpgrade(u.id) ?? '')}>
              {maxed ? 'Max' : `◆ ${fmt(u.cost(rank))}`}
            </button>
          </div>
        );
      })}
      {message && <div className="small bad">{message}</div>}
    </section>
  );
}

function ParagonSection() {
  const game = useGame();
  const info = paragon.paragonInfo(game.state);
  const points = paragon.paragonPointsLeft(game.state);
  const allocated = paragon.paragonAllocated(game.state);

  return (
    <section className="card wide">
      <div className="row between">
        <h2 style={{ margin: 0 }}>Paragon</h2>
        {info.unlocked ? (
          <span className="small">
            Paragon {info.level} · <span className={points > 0 ? 'good' : 'muted'}>{points} Punkte frei</span>
          </span>
        ) : (
          <span className="muted small">Ab Kommandanten-Level 100</span>
        )}
      </div>
      {info.unlocked && (
        <div className="meter">
          <div style={{ width: `${(info.current / info.needed) * 100}%` }} />
        </div>
      )}
      <div className="muted small">
        Wie in Diablo 4: Vergib Felder angrenzend an bereits vergebene. Glyphen im Zentrum eines Bretts verstärken Felder im Umkreis von 3 um 50 % und geben einen Bonus, wenn dort mindestens 5 Felder vergeben sind. Tore am rechten Rand führen zum nächsten Brett.
      </div>
      <div className="paragon-boards">
        {PARAGON_BOARDS.map((board) => (
          <div key={board.index} className="paragon-board-wrap">
            <div className="small" style={{ fontWeight: 600 }}>
              {board.icon} {board.name}
            </div>
            <div className="paragon-board" style={{ gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)` }}>
              {Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, i) => {
                const x = i % BOARD_SIZE;
                const y = Math.floor(i / BOARD_SIZE);
                const tile = board.tiles.find((t) => t.x === x && t.y === y);
                if (!tile) return <span key={i} />;
                return <ParagonCell key={i} tile={tile} allocated={allocated} points={points} glyph={game.state.paragon.glyphs[board.index]} />;
              })}
            </div>
            <select
              value={game.state.paragon.glyphs[board.index] ?? ''}
              disabled={!allocated.has(board.tiles.find((t) => t.kind === 'glyph')!.id)}
              onChange={(e) => game.setGlyph(board.index, e.target.value || null)}
            >
              <option value="">Keine Glyphe</option>
              {GLYPHS.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.icon} {g.name}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
      {info.unlocked && (
        <button onClick={() => game.resetParagon()} style={{ alignSelf: 'flex-start' }}>
          Paragon zurücksetzen
        </button>
      )}
    </section>
  );
}

const KIND_LABEL: Record<ParagonTile['kind'], string> = {
  start: 'Start',
  normal: 'Normal',
  magic: 'Magisch',
  rare: 'Selten',
  glyph: 'Glyphensockel',
  gate: 'Tor',
};

function ParagonCell({ tile, allocated, points, glyph }: { tile: ParagonTile; allocated: Set<string>; points: number; glyph?: string }) {
  const game = useGame();
  const isAlloc = allocated.has(tile.id);
  const reachable = !isAlloc && paragonNeighbors(tile).some((n) => allocated.has(n));
  const tip = useTip(() => (
    <>
      <div className="tip-header">
        <span className="tip-title">{KIND_LABEL[tile.kind]}</span>
      </div>
      {tile.mods.map((m, i) => (
        <div key={i} className="small">
          {describeModifier(m)}
        </div>
      ))}
      {tile.kind === 'glyph' && <div className="small muted">{glyph ? GLYPH_BY_ID[glyph].name : 'Glyphe unter dem Brett wählen'}</div>}
      {!isAlloc && <div className="tip-muted">{points > 0 ? 'Klicken zum Vergeben (Pfad wird automatisch gewählt)' : 'Keine Paragon-Punkte'}</div>}
    </>
  ));
  return (
    <button className={`paragon-cell ${tile.kind} ${isAlloc ? 'alloc' : ''} ${reachable ? 'reach' : ''}`} onClick={() => game.allocateParagon(tile.id)} {...tip}>
      {tile.kind === 'glyph' ? (glyph ? GLYPH_BY_ID[glyph].icon : '◇') : tile.kind === 'gate' ? '⇢' : ''}
    </button>
  );
}
