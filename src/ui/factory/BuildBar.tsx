import { useEffect } from 'react';
import { fmt } from '../../core/format';
import { MACHINE_LIST } from '../../data/machines';
import { amountOf } from '../../systems/inventory';
import { useTip } from '../components/Tooltip';
import type { Tool } from '../grid/GridView';
import { useGame } from '../useGame';

const CATEGORY_ORDER = ['belt', 'splitter', 'drill', 'pump', 'furnace', 'assembler', 'chemical', 'lab', 'generator', 'storage', 'terminal', 'silo', 'turret'];

export function BuildBar({ tool, setTool }: { tool: Tool | null; setTool: (t: Tool | null) => void }) {
  const game = useGame();
  const slots = MACHINE_LIST.filter((m) => m.buildable && (amountOf(game.planet, m.id).gte(1) || tool?.type === m.id)).sort(
    (a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) || a.tier - b.tier,
  );

  // Zifferntasten wählen Slots
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const n = Number(e.key);
      if (!Number.isInteger(n) || n < 1 || n > 9) return;
      const slot = slots[n - 1];
      if (!slot) return;
      setTool(tool?.type === slot.id ? null : { type: slot.id, rot: tool?.rot ?? 0 });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (slots.length === 0) {
    return (
      <div className="build-bar">
        <div className="build-bar-empty small">Keine Gebäude im Inventar – stelle links in der Handfertigung welche her.</div>
      </div>
    );
  }

  return (
    <div className="build-bar">
      {slots.map((m, i) => (
        <BuildSlot key={m.id} id={m.id} index={i} active={tool?.type === m.id} onClick={() => setTool(tool?.type === m.id ? null : { type: m.id, rot: tool?.rot ?? 0 })} />
      ))}
    </div>
  );
}

function BuildSlot({ id, index, active, onClick }: { id: string; index: number; active: boolean; onClick: () => void }) {
  const game = useGame();
  const def = MACHINE_LIST.find((m) => m.id === id)!;
  const tip = useTip(() => (
    <>
      <div className="tip-header">
        <span className="tip-title">{def.name}</span>
        <span className="tip-muted">
          {def.w}×{def.h}
        </span>
      </div>
      <div className="tip-muted">{def.description}</div>
      {def.power > 0 && <div className="tip-section small">Strom: {fmt(def.power)} kW</div>}
      {def.powerGen && <div className="tip-section small good">Erzeugt: {fmt(def.powerGen)} kW</div>}
    </>
  ));
  return (
    <button className={`build-slot ${active ? 'active' : ''}`} onClick={onClick} {...tip}>
      {index < 9 && <span className="key">{index + 1}</span>}
      {def.icon}
      <span className="count">{fmt(amountOf(game.planet, id))}</span>
    </button>
  );
}
