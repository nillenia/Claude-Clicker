import { useContext, useEffect, useRef, useState } from 'react';
import type { Toast as ToastData } from '../../core/game';
import { GameContext } from '../useGame';

interface Toast extends ToastData {
  id: number;
}

const TOAST_MS = 4500;

export function Toasts() {
  const game = useContext(GameContext)!;
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  useEffect(
    () =>
      game.bus.on('toast', (t) => {
        const id = nextId.current++;
        setToasts((list) => [...list.slice(-4), { ...t, id }]);
        setTimeout(() => setToasts((list) => list.filter((x) => x.id !== id)), TOAST_MS);
      }),
    [game],
  );

  return (
    <div className="toasts">
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          <span className="toast-icon">{t.icon}</span>
          <div>
            <div className="toast-title">{t.title}</div>
            <div className="toast-text">{t.text}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
