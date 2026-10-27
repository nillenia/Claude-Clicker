import { useState } from 'react';
import type { Item } from '../../core/state';
import { describeModifier } from '../../engine/describe';
import { COMMANDER_TREE } from '../../data/commanderTree';
import { ASPECTS, BASES, CURRENCIES, CURRENCY_BY_ID, IMPRINT_COST, RARITY_NAMES, TEMPER_CATEGORIES, type ItemSlot, type Rarity } from '../../data/items';
import { ARTIFACT_SLOTS, currencyApplicable } from '../../systems/items';
import { useTip } from '../components/Tooltip';
import { useGame } from '../useGame';
import { ItemDetails, ItemTile } from './ItemView';

const SLOT_FILTERS: { id: ItemSlot | 'all'; label: string }[] = [
  { id: 'all', label: 'Alle' },
  { id: 'module', label: 'Module' },
  { id: 'jewel', label: 'Juwelen' },
  { id: 'artifact', label: 'Artefakte' },
];

const RARITY_ORDER: Rarity[] = ['unique', 'legendary', 'rare', 'magic', 'normal'];

export function ArsenalTab() {
  const game = useGame();
  const [filter, setFilter] = useState<ItemSlot | 'all'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const items = Object.values(game.state.loot.items)
    .filter((i) => filter === 'all' || BASES[i.base].slot === filter)
    .sort((a, b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity) || b.ilvl - a.ilvl);
  const selected = selectedId ? game.state.loot.items[selectedId] : null;

  return (
    <div className="arsenal">
      <aside className="arsenal-side">
        <CurrencyPanel />
        <ArtifactPanel onSelect={setSelectedId} />
        <JewelPanel onSelect={setSelectedId} />
        <CodexPanel />
      </aside>
      <section className="arsenal-stash">
        <div className="row between">
          <h2 style={{ margin: 0 }}>Lager ({Object.keys(game.state.loot.items).length})</h2>
          <div className="row">
            {SLOT_FILTERS.map((f) => (
              <button key={f.id} className={filter === f.id ? 'active' : ''} onClick={() => setFilter(f.id)}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
        {items.length === 0 && (
          <div className="muted" style={{ marginTop: 20 }}>
            Noch keine Beute. Meteoriten (☄️ auf dem Raster), Forschung, Angriffswellen und Bosse lassen Module, Juwelen und Währung fallen.
          </div>
        )}
        <div className="stash-grid">
          {items.map((item) => (
            <ItemTile key={item.id} item={item} selected={item.id === selectedId} onClick={() => setSelectedId(item.id)} />
          ))}
        </div>
      </section>
      <aside className="arsenal-detail">{selected ? <CraftPanel item={selected} onGone={() => setSelectedId(null)} /> : <div className="muted">Wähle ein Item aus.</div>}</aside>
    </div>
  );
}

function CurrencyPanel() {
  const game = useGame();
  return (
    <section>
      <h2>Währung</h2>
      <div className="currency-grid">
        {CURRENCIES.map((c) => (
          <CurrencyChip key={c.id} id={c.id} count={game.state.loot.currency[c.id] ?? 0} />
        ))}
      </div>
    </section>
  );
}

function CurrencyChip({ id, count }: { id: string; count: number }) {
  const def = CURRENCY_BY_ID[id];
  const tip = useTip(() => (
    <>
      <div className="tip-title">{def.name}</div>
      <div className="tip-muted">{def.description}</div>
    </>
  ));
  return (
    <div className={`currency-chip ${count === 0 ? 'empty' : ''}`} {...tip}>
      <span>{def.icon}</span>
      <span className="mono">{count}</span>
    </div>
  );
}

function ArtifactPanel({ onSelect }: { onSelect: (id: string) => void }) {
  const game = useGame();
  const items = Object.values(game.state.loot.items);
  return (
    <section>
      <h2>Artefakte</h2>
      <div className="socket-row">
        {Array.from({ length: ARTIFACT_SLOTS }, (_, slot) => {
          const item = items.find((i) => i.location?.kind === 'artifact' && i.location.slot === slot);
          return item ? (
            <ItemTile key={slot} item={item} small onClick={() => onSelect(item.id)} />
          ) : (
            <div key={slot} className="item-tile small empty-socket" title="Leerer Artefaktplatz">
              🏺
            </div>
          );
        })}
      </div>
    </section>
  );
}

function JewelPanel({ onSelect }: { onSelect: (id: string) => void }) {
  const game = useGame();
  const sockets = game.state.commander.allocated.filter((id) => COMMANDER_TREE.nodes[id]?.kind === 'socket');
  const items = Object.values(game.state.loot.items);
  return (
    <section>
      <h2>Juwelsockel</h2>
      {sockets.length === 0 && <div className="muted small">Vergib Juwelsockel im Kommandanten-Baum.</div>}
      <div className="socket-row">
        {sockets.map((node) => {
          const item = items.find((i) => i.location?.kind === 'jewel' && i.location.node === node);
          return item ? (
            <ItemTile key={node} item={item} small onClick={() => onSelect(item.id)} />
          ) : (
            <div key={node} className="item-tile small empty-socket" title="Leerer Juwelsockel">
              💠
            </div>
          );
        })}
      </div>
    </section>
  );
}

function CodexPanel() {
  const game = useGame();
  const codex = game.state.loot.codex;
  return (
    <section>
      <h2>Kodex der Aspekte</h2>
      {codex.length === 0 && <div className="muted small">Extrahiere legendäre Module, um ihre Aspekte zu speichern.</div>}
      {codex.map((id) => (
        <div key={id} className="small">
          <strong>{ASPECTS[id].name}</strong>
          <div className="muted">{ASPECTS[id].mods.map(describeModifier).join(' · ')}</div>
        </div>
      ))}
    </section>
  );
}

const CRAFT_ORDER = ['c_transmute', 'c_augment', 'c_alchemy', 'c_chaos', 'c_exalt', 'c_annul', 'c_divine', 'c_scour', 'c_masterwork', 'c_temper'];

function CraftPanel({ item, onGone }: { item: Item; onGone: () => void }) {
  const game = useGame();
  const [message, setMessage] = useState('');
  const [temper, setTemper] = useState(TEMPER_CATEGORIES[0].id);
  const [aspect, setAspect] = useState('');
  const slot = BASES[item.base].slot;
  const sockets = game.state.commander.allocated.filter((id) => COMMANDER_TREE.nodes[id]?.kind === 'socket');
  const report = (r: { ok: boolean; message: string }) => setMessage(r.message);

  return (
    <div className="craft-panel">
      <ItemDetails item={item} />

      {!item.unique && (
        <section>
          <h2>Crafting</h2>
          <div className="craft-buttons">
            {CRAFT_ORDER.map((c) => {
              const def = CURRENCY_BY_ID[c];
              const count = game.state.loot.currency[c] ?? 0;
              const reason = currencyApplicable(item, c);
              return (
                <CraftButton
                  key={c}
                  id={c}
                  count={count}
                  reason={reason}
                  onClick={() => report(game.applyCurrency(item.id, c, temper))}
                  label={def.icon}
                />
              );
            })}
          </div>
          {slot === 'module' && (
            <label className="option-row small">
              <span>Härtung:</span>
              <select value={temper} onChange={(e) => setTemper(e.target.value)}>
                {TEMPER_CATEGORIES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {slot === 'module' && (item.rarity === 'rare' || item.rarity === 'legendary') && game.state.loot.codex.length > 0 && (
            <div className="row small">
              <select value={aspect} onChange={(e) => setAspect(e.target.value)}>
                <option value="">Aspekt aufprägen …</option>
                {game.state.loot.codex.map((a) => (
                  <option key={a} value={a}>
                    {ASPECTS[a].name}
                  </option>
                ))}
              </select>
              <button disabled={!aspect} onClick={() => report(game.imprintAspect(item.id, aspect))}>
                Prägen ({IMPRINT_COST} 🧪)
              </button>
            </div>
          )}
        </section>
      )}

      <section>
        <h2>Verwendung</h2>
        <div className="button-row">
          {item.location && <button onClick={() => game.unequipItem(item.id)}>Ausbauen</button>}
          {slot === 'artifact' &&
            Array.from({ length: ARTIFACT_SLOTS }, (_, i) => (
              <button key={i} onClick={() => report(game.setArtifact(item.id, i))}>
                Platz {i + 1}
              </button>
            ))}
          {slot === 'jewel' &&
            sockets.map((node, i) => (
              <button key={node} onClick={() => report(game.socketJewel(item.id, node))}>
                Sockel {i + 1}
              </button>
            ))}
          {slot === 'module' && <span className="muted small">Module setzt du im Fabrik-Tab über das Maschinen-Panel ein.</span>}
        </div>
        <div className="button-row">
          {item.aspect && item.rarity === 'legendary' && (
            <button
              disabled={!!item.location}
              onClick={() => {
                const r = game.extractAspect(item.id);
                report(r);
                if (r.ok) onGone();
              }}
            >
              Aspekt extrahieren
            </button>
          )}
          <button
            className="danger-button"
            disabled={!!item.location}
            onClick={() => {
              const r = game.salvageItem(item.id);
              report(r);
              if (r.ok) onGone();
            }}
          >
            Verschrotten
          </button>
        </div>
      </section>
      {message && <div className="small message">{message}</div>}
      <div className="muted small">{RARITY_NAMES[item.rarity]}e Items können mit Währung verändert werden. Fahre über eine Währung für Details.</div>
    </div>
  );
}

function CraftButton({ id, count, reason, onClick, label }: { id: string; count: number; reason: string | null; onClick: () => void; label: string }) {
  const def = CURRENCY_BY_ID[id];
  const tip = useTip(() => (
    <>
      <div className="tip-header">
        <span className="tip-title">{def.name}</span>
        <span className="tip-muted">{count} vorhanden</span>
      </div>
      <div className="tip-muted">{def.description}</div>
      {reason && <div className="tip-section bad small">{reason}</div>}
    </>
  ));
  return (
    <button className="craft-currency" disabled={!!reason || count === 0} onClick={onClick} {...tip}>
      <span>{label}</span>
      <span className="mono small">{count}</span>
    </button>
  );
}
