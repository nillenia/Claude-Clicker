import { RESOURCES } from '../../data/resources';
import { fmt } from '../../core/format';
import { useTip } from './Tooltip';

export function ResourceIcon({ id, large = false, tip = true }: { id: string; large?: boolean; tip?: boolean }) {
  const def = RESOURCES[id];
  const tipHandlers = useTip(() => (def ? <span className="tip-title">{def.name}</span> : id));
  if (!def) return <span className="ricon">?</span>;
  return (
    <span
      className={`ricon ${def.category} ${large ? 'lg' : ''}`}
      style={{ '--c': def.color } as React.CSSProperties}
      {...(tip ? tipHandlers : {})}
    >
      <span>{def.icon ?? def.symbol}</span>
    </span>
  );
}

/** Symbol mit Menge, z. B. für Rezepte. */
export function AmountChip({ id, amount, have }: { id: string; amount: number; have?: number }) {
  const short = have !== undefined && have < amount;
  return (
    <span className={`amount-chip ${short ? 'bad' : ''}`}>
      <ResourceIcon id={id} />
      {fmt(amount, true)}
    </span>
  );
}

export function Amounts({ items, have }: { items: Record<string, number>; have?: (id: string) => number }) {
  return (
    <>
      {Object.entries(items).map(([id, n]) => (
        <AmountChip key={id} id={id} amount={n} have={have?.(id)} />
      ))}
    </>
  );
}
