import { createContext, useContext, useSyncExternalStore } from 'react';
import type { Game } from '../core/game';

export const GameContext = createContext<Game | null>(null);

/** Liefert die Spielinstanz und rendert neu, sobald sich der Spielzustand ändert. */
export function useGame(): Game {
  const game = useContext(GameContext);
  if (!game) throw new Error('useGame außerhalb von GameContext');
  useSyncExternalStore(game.subscribe, game.getVersion);
  return game;
}
