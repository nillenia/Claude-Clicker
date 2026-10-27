import { lazy, Suspense, useEffect, useState } from 'react';
import { PLANETS } from '../data/planets';
import { FactoryTab } from './factory/FactoryTab';
import { OfflineModal } from './components/OfflineModal';
import { OptionsTab } from './components/OptionsTab';
import { StatsTab } from './components/StatsTab';
import { Toasts } from './components/Toasts';
import { TooltipProvider } from './components/Tooltip';
import { ResearchTab } from './research/ResearchTab';
import { MachinesTab } from './tree/MachinesTab';
import { CommanderTab } from './tree/CommanderTab';
import { ArsenalTab } from './items/ArsenalTab';
import { SkillsTab } from './tree/SkillsTab';
import { EndgameTab } from './endgame/EndgameTab';
import { useGame } from './useGame';
import { ErrorBoundary } from './components/ErrorBoundary';

// Die 3D-Karte (Three.js) wird erst geladen, wenn der Tab geöffnet wird
const StarMapTab = lazy(() => import('./starmap/StarMapTab').then((m) => ({ default: m.StarMapTab })));

type Tab = 'factory' | 'research' | 'machines' | 'commander' | 'skills' | 'arsenal' | 'starmap' | 'endgame' | 'stats' | 'options';

const TABS: { id: Tab; label: string }[] = [
  { id: 'factory', label: '🏭 Fabrik' },
  { id: 'research', label: '🔬 Forschung' },
  { id: 'machines', label: '🛠️ Maschinen' },
  { id: 'commander', label: '🎖️ Kommandant' },
  { id: 'skills', label: '⚡ Skills' },
  { id: 'arsenal', label: '💠 Arsenal' },
  { id: 'starmap', label: '🌌 Sternenkarte' },
  { id: 'endgame', label: '♾️ Endgame' },
  { id: 'stats', label: '📊 Statistik' },
  { id: 'options', label: '⚙️ Optionen' },
];

export function App() {
  const game = useGame();
  const [tab, setTab] = useState<Tab>('factory');
  const planets = Object.keys(game.state.planets);

  useEffect(() => {
    document.title = `${PLANETS[game.state.activePlanet].name} – Claude Clicker`;
  }, [game.state.activePlanet]);

  return (
    <TooltipProvider>
      <div className="app">
        <header className="topbar">
          <div className="logo">
            CLAUDE <span>◆</span> CLICKER
          </div>
          <nav className="tabs">
            {TABS.map((t) => (
              <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
                {t.label}
              </button>
            ))}
          </nav>
          {planets.length > 1 && (
            <div className="planet-switch">
              {planets.map((id) => (
                <button
                  key={id}
                  className={game.state.activePlanet === id ? 'active' : ''}
                  title={PLANETS[id].name}
                  onClick={() => game.setActivePlanet(id)}
                >
                  {PLANETS[id].icon}
                </button>
              ))}
            </div>
          )}
        </header>

        <main className="main">
          <ErrorBoundary key={tab}>
          {tab === 'factory' && <FactoryTab key={game.state.activePlanet} />}
          {tab === 'research' && <ResearchTab />}
          {tab === 'machines' && <MachinesTab />}
          {tab === 'commander' && <CommanderTab />}
          {tab === 'skills' && <SkillsTab />}
          {tab === 'arsenal' && <ArsenalTab />}
          {tab === 'starmap' && (
            <Suspense fallback={<div className="tab-page muted">Sternenkarte wird geladen …</div>}>
              <StarMapTab onOpenPlanet={() => setTab('factory')} />
            </Suspense>
          )}
          {tab === 'endgame' && <EndgameTab />}
          {tab === 'stats' && <StatsTab />}
          {tab === 'options' && <OptionsTab />}
          </ErrorBoundary>
        </main>

        <Toasts />
        <OfflineModal />
      </div>
    </TooltipProvider>
  );
}
