import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Game } from './core/game';
import { App } from './ui/App';
import { GameContext } from './ui/useGame';
import './ui/styles.css';
import { attachSound } from './ui/sound';

const game = new Game();
game.start();
attachSound(game);

// Für Debugging in der Browser-Konsole
(window as unknown as { game: Game }).game = game;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GameContext.Provider value={game}>
      <App />
    </GameContext.Provider>
  </StrictMode>,
);
