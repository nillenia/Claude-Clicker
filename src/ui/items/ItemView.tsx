import type { Item } from '../../core/state';
import { describeModifier } from '../../engine/describe';
import { AFFIX_BY_ID, ASPECTS, BASES, moduleTier, RARITY_COLORS, RARITY_NAMES, UNIQUES } from '../../data/items';
import { PLANETS } from '../../data/planets';
import { useTip } from '../components/Tooltip';

const ROMAN = ['I', 'II', 'III', 'IV', 'V'];

/** Ausführliche Beschreibung eines Items (für Tooltip und Detailansicht). */
export function ItemDetails({ item }: { item: Item }) {
  const base = BASES[item.base];
  const color = RARITY_COLORS[item.rarity];
  const unique = item.unique ? UNIQUES[item.unique] : null;
  const mw = 1 + item.masterwork * 0.1;

  return (
    <div className="item-details">
      <div className="item-name" style={{ color }}>
        {item.name}
      </div>
      <div className="muted small">
        {RARITY_NAMES[item.rarity]} · {base.name}
        {base.slot === 'module' && !unique && ` Mk ${ROMAN[moduleTier(item.ilvl) - 1]}`} · Item-Level {item.ilvl}
        {item.masterwork > 0 && ` · Meisterkalibrierung ${item.masterwork}/5`}
      </div>
      {!unique && base.implicit.length > 0 && (
        <div className="item-section implicit">
          {base.implicit.map((m, i) => (
            <div key={i}>{describeModifier({ ...m, value: m.value * (1 + (moduleTier(item.ilvl) - 1) * 0.5) })}</div>
          ))}
        </div>
      )}
      {item.affixes.length > 0 && (
        <div className="item-section">
          {item.affixes.map((a, i) => {
            const def = AFFIX_BY_ID[a.id];
            return (
              <div key={i} className="row between">
                <span>{describeModifier({ stat: def.stat, kind: def.modKind, value: a.value * mw, tags: def.tags, condition: def.condition })}</span>
                <span className="tier">T{6 - a.tier}</span>
              </div>
            );
          })}
        </div>
      )}
      {item.tempered.length > 0 && (
        <div className="item-section tempered">
          {item.tempered.map((a, i) => {
            const def = AFFIX_BY_ID[a.id];
            return (
              <div key={i}>
                🔥 {describeModifier({ stat: def.stat, kind: def.modKind, value: a.value * mw, tags: def.tags, condition: def.condition })}
              </div>
            );
          })}
        </div>
      )}
      {item.aspect && (
        <div className="item-section aspect">
          <div style={{ fontWeight: 600 }}>{ASPECTS[item.aspect].name}</div>
          {ASPECTS[item.aspect].mods.map((m, i) => (
            <div key={i}>{describeModifier(m)}</div>
          ))}
        </div>
      )}
      {unique && (
        <div className="item-section aspect">
          {unique.mods.map((m, i) => (
            <div key={i}>{describeModifier(m)}</div>
          ))}
          {unique.description && <div className="warn">{unique.description}</div>}
          <div className="flavor">„{unique.flavor}“</div>
        </div>
      )}
      {item.location && (
        <div className="small muted">
          {item.location.kind === 'machine'
            ? `Eingesetzt auf ${PLANETS[item.location.planet]?.name ?? item.location.planet}`
            : item.location.kind === 'jewel'
              ? 'In einem Juwelsockel'
              : `Artefaktplatz ${item.location.slot + 1}`}
        </div>
      )}
    </div>
  );
}

export function ItemTile({ item, selected, onClick, small = false }: { item: Item; selected?: boolean; onClick?: () => void; small?: boolean }) {
  const tip = useTip(() => <ItemDetails item={item} />);
  return (
    <button
      className={`item-tile ${small ? 'small' : ''} ${selected ? 'active' : ''} ${item.location ? 'equipped' : ''}`}
      style={{ '--rarity': RARITY_COLORS[item.rarity] } as React.CSSProperties}
      onClick={onClick}
      {...tip}
    >
      <span className="item-icon">{BASES[item.base].icon}</span>
      {!small && <span className="item-label">{item.name}</span>}
    </button>
  );
}
