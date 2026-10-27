import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useGame } from '../useGame';

interface Tip {
  render: () => ReactNode;
  x: number;
  y: number;
}

const TipContext = createContext<(tip: Tip | null) => void>(() => {});

export function TooltipProvider({ children }: { children: ReactNode }) {
  const [tip, setTip] = useState<Tip | null>(null);
  return (
    <TipContext.Provider value={setTip}>
      {children}
      {tip && <TooltipLayer tip={tip} />}
    </TipContext.Provider>
  );
}

function TooltipLayer({ tip }: { tip: Tip }) {
  useGame(); // Inhalt live aktualisieren
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: tip.x + 16, top: tip.y + 16 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const margin = 8;
    let left = tip.x + 16;
    if (left + width > window.innerWidth - margin) left = tip.x - 16 - width;
    let top = tip.y + 16;
    if (top + height > window.innerHeight - margin) top = window.innerHeight - margin - height;
    setPos({ left: Math.max(margin, left), top: Math.max(margin, top) });
  }, [tip.x, tip.y]);

  return (
    <div ref={ref} className="tooltip" style={pos}>
      {tip.render()}
    </div>
  );
}

/** Maus-Handler, die beim Überfahren einen Tooltip mit live gerendertem Inhalt anzeigen. */
export function useTip(render: () => ReactNode) {
  const setTip = useContext(TipContext);
  const renderRef = useRef(render);
  renderRef.current = render;
  const active = useRef(false);

  // Verschwindet das Element unter der Maus (z. B. gekauftes Upgrade), Tooltip schließen
  useEffect(
    () => () => {
      if (active.current) setTip(null);
    },
    [setTip],
  );

  const show = (e: React.MouseEvent) => {
    active.current = true;
    setTip({ render: () => renderRef.current(), x: e.clientX, y: e.clientY });
  };
  return {
    onMouseEnter: show,
    onMouseMove: show,
    onMouseLeave: () => {
      active.current = false;
      setTip(null);
    },
  };
}
