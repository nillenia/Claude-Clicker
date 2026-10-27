import { useContext, useEffect, useRef, useState } from 'react';
import { fmt } from '../../core/format';
import { PLANET_LIST, PLANETS, type PlanetDef } from '../../data/planets';
import { RESEARCH } from '../../data/research';
import { RESOURCES } from '../../data/resources';
import { amountOf } from '../../systems/inventory';
import { cargoCapacity, COLONY_COST, COLONY_KIT, colonyLaunchSites, ITEMS_PER_PART, planetUnlocked, SILO_RATE } from '../../systems/logistics';
import { Amounts, ResourceIcon } from '../components/ResourceIcon';
import { GameContext, useGame } from '../useGame';
import type { Game } from '../../core/game';
import { StarMapScene, type MapData, type PlanetStatus } from './StarMap3D';

function statusOf(game: Game, id: string): PlanetStatus {
  return game.state.planets[id] ? 'colony' : planetUnlocked(game.state, id) ? 'reachable' : 'locked';
}

/** Daten für die 3D-Szene – wird pro Bild direkt aus dem Spiel gelesen, ohne React-Rendering. */
function mapData(game: Game): MapData {
  return {
    planets: PLANET_LIST.map((p) => ({ id: p.id, name: p.name, icon: p.icon, status: statusOf(game, p.id), active: game.state.activePlanet === p.id })),
    routes: game.state.routes.map((r) => ({ id: r.id, from: r.from, to: r.to, flow: game.routeFlow.actual.get(r.id) ?? 0, color: RESOURCES[r.resource]?.color ?? '#ffffff' })),
  };
}

export function StarMapTab({ onOpenPlanet }: { onOpenPlanet: () => void }) {
  const game = useContext(GameContext)!;
  const viewRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<StarMapScene | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    let scene: StarMapScene;
    try {
      scene = new StarMapScene(viewRef.current!, labelsRef.current!, () => mapData(game), { onSelect: setSelected, onHover: setHovered }, reduced);
    } catch {
      // Kein WebGL verfügbar: auf die Kartenansicht ausweichen
      setFailed(true);
      return;
    }
    sceneRef.current = scene;
    setPaused(scene.orbitSpeed === 0);
    const observer = new ResizeObserver(() => scene.resize());
    observer.observe(viewRef.current!);
    return () => {
      observer.disconnect();
      scene.dispose();
      sceneRef.current = null;
    };
  }, [game]);

  useEffect(() => sceneRef.current?.select(selected), [selected]);

  const launch = (from: string, to: string) => sceneRef.current?.launchRocket(from, to);

  if (failed) {
    return (
      <div className="tab-page">
        <section className="card wide">
          <h2>Sternenkarte</h2>
          <div className="muted small">Dein Browser unterstützt kein WebGL – die 3D-Karte ist nicht verfügbar.</div>
        </section>
        <div className="planet-grid wide">
          {PLANET_LIST.map((p) => (
            <section key={p.id} className="card">
              <PlanetDetails planet={p} onOpen={onOpenPlanet} onLaunch={launch} />
            </section>
          ))}
        </div>
        <RoutesCard />
      </div>
    );
  }

  return (
    <div className="starmap">
      <div className="starmap-view" ref={viewRef}>
        <div
          className="map-labels"
          ref={labelsRef}
          onClick={(e) => {
            const id = (e.target as HTMLElement).closest<HTMLElement>('.map-label')?.dataset.id;
            if (id) setSelected(id);
          }}
        />
        <div className="map-controls">
          <button onClick={() => setSelected(null)} title="Ganzes System zeigen">
            ⤢ Übersicht
          </button>
          <button
            onClick={() => {
              const scene = sceneRef.current;
              if (!scene) return;
              scene.orbitSpeed = scene.orbitSpeed ? 0 : 1;
              setPaused(scene.orbitSpeed === 0);
            }}
          >
            {paused ? '▶ Umlauf' : '⏸ Umlauf'}
          </button>
        </div>
        <div className="map-legend small">
          <span>
            <i style={{ background: '#5be08a' }} /> Kolonie
          </span>
          <span>
            <i style={{ background: '#ffc857' }} /> Erreichbar
          </span>
          <span>
            <i style={{ background: '#4a5a72' }} /> Gesperrt
          </span>
          <span className="muted">Ziehen: drehen · Rad: zoomen · Rechts ziehen: verschieben</span>
        </div>
        {hovered && hovered !== selected && <div className="map-hover small">{PLANETS[hovered].name} – klicken für Details</div>}
      </div>
      <aside className="starmap-side">
        {selected ? (
          <>
            <button className="map-back" onClick={() => setSelected(null)}>
              ← Alle Planeten
            </button>
            <PlanetDetails planet={PLANETS[selected]} onOpen={onOpenPlanet} onLaunch={launch} />
          </>
        ) : (
          <SystemOverview onSelect={setSelected} />
        )}
        <RoutesCard />
      </aside>
    </div>
  );
}

function SystemOverview({ onSelect }: { onSelect: (id: string) => void }) {
  const game = useGame();
  return (
    <section className="map-section">
      <h2>Sternensystem</h2>
      <div className="muted small">
        Erforsche Expeditionen, baue ein Raketensilo und sammle {COLONY_COST} Raketenteile, um eine Kolonie zu gründen. Jedes arbeitende Silo verschickt {SILO_RATE} Items/s, je {ITEMS_PER_PART} Items kosten 1 Raketenteil.
      </div>
      <div className="planet-list">
        {PLANET_LIST.map((p) => {
          const status = statusOf(game, p.id);
          return (
            <button key={p.id} className={`planet-row ${status}`} onClick={() => onSelect(p.id)}>
              <span style={{ fontSize: 20 }}>{p.icon}</span>
              <span style={{ flex: 1, textAlign: 'left' }}>{p.name}</span>
              <span className={`status-pill ${status === 'colony' ? 'working' : status === 'reachable' ? 'blocked' : 'error'}`}>
                {status === 'colony' ? 'Kolonie' : status === 'reachable' ? 'Erreichbar' : 'Gesperrt'}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function PlanetDetails({ planet, onOpen, onLaunch }: { planet: PlanetDef; onOpen: () => void; onLaunch: (from: string, to: string) => void }) {
  const game = useGame();
  const colonized = !!game.state.planets[planet.id];
  const unlocked = planetUnlocked(game.state, planet.id);
  const sites = colonyLaunchSites(game.state, game.worlds);
  const [from, setFrom] = useState<string>('');
  const ores = [...new Set(planet.ores.map((o) => o.resource))];
  const world = game.worlds.get(planet.id);

  return (
    <section className="map-section">
      <div className="row between">
        <div className="row">
          <span className="planet-icon">{planet.icon}</span>
          <div>
            <div className="planet-name">{planet.name}</div>
            <div className="muted small">
              {planet.width}×{planet.height} Felder
            </div>
          </div>
        </div>
        <span className={`status-pill ${colonized ? 'working' : unlocked ? 'blocked' : 'error'}`}>{colonized ? 'Kolonie' : unlocked ? 'Erreichbar' : 'Gesperrt'}</span>
      </div>
      <div className="small">{planet.description}</div>
      <div className="small warn">{planet.environment}</div>
      <div className="io-line">
        {ores.map((o) => (
          <span key={o} className="amount-chip">
            <ResourceIcon id={o} /> {RESOURCES[o].name}
          </span>
        ))}
      </div>
      {colonized && world && (
        <>
          <div className="small muted">
            {world.state.entities.length - 1} Gebäude · Strom {fmt(world.power.demand)} / {fmt(world.power.gen)} kW
          </div>
          <button
            className="primary"
            onClick={() => {
              game.setActivePlanet(planet.id);
              onOpen();
            }}
          >
            {game.state.activePlanet === planet.id ? 'Zur Fabrik' : 'Hinfliegen'}
          </button>
        </>
      )}
      {!colonized && unlocked && (
        <>
          <div className="small">
            <div className="muted">Kolonierakete bringt mit:</div>
            <div className="io-line">
              <Amounts items={COLONY_KIT} />
            </div>
          </div>
          {sites.length === 0 ? (
            <div className="small bad">Benötigt ein Raketensilo und {COLONY_COST} Raketenteile auf einem deiner Planeten.</div>
          ) : (
            <div className="row" style={{ flexWrap: 'wrap' }}>
              <select value={from || sites[0]} onChange={(e) => setFrom(e.target.value)}>
                {sites.map((s) => (
                  <option key={s} value={s}>
                    Start von {PLANETS[s].name}
                  </option>
                ))}
              </select>
              <button
                className="primary"
                onClick={() => {
                  const source = from || sites[0];
                  if (game.foundColony(planet.id, source)) onLaunch(source, planet.id);
                }}
              >
                Kolonie gründen ({COLONY_COST} Raketenteile)
              </button>
            </div>
          )}
        </>
      )}
      {!unlocked && planet.unlock && <div className="small muted">Benötigt Forschung: {RESEARCH[planet.unlock].name}</div>}
    </section>
  );
}

function RoutesCard() {
  const game = useGame();
  const planets = Object.keys(game.state.planets);
  const [from, setFrom] = useState(planets[0]);
  const [to, setTo] = useState(planets[1] ?? planets[0]);
  const [resource, setResource] = useState('');
  const [rate, setRate] = useState('1');
  const mult = game.commanderStat('cargoCapacity', 1);
  const sourceItems = Object.entries(game.state.planets[from]?.inventory ?? {})
    .filter(([id, n]) => n.gt(0) && RESOURCES[id])
    .map(([id]) => id)
    .sort((a, b) => RESOURCES[a].name.localeCompare(RESOURCES[b].name));

  if (planets.length < 2) {
    return (
      <section className="map-section">
        <h2>Frachtrouten</h2>
        <div className="muted small">Gründe eine zweite Kolonie, um Frachtrouten einzurichten.</div>
      </section>
    );
  }

  return (
    <section className="map-section">
      <h2>Frachtrouten</h2>
      <div className="row" style={{ flexWrap: 'wrap' }}>
        {planets.map((id) => {
          const world = game.worlds.get(id)!;
          const cap = cargoCapacity(world, mult);
          const used = game.state.routes.filter((r) => r.from === id).reduce((s, r) => s + r.rate, 0);
          return (
            <span key={id} className="status-pill">
              {PLANETS[id].icon} {fmt(used, true)} / {fmt(cap, true)} /s · {fmt(amountOf(game.state.planets[id], 'rocket_part'))} 🚀
            </span>
          );
        })}
      </div>
      {game.state.routes.map((r) => (
        <div key={r.id} className="route-row small">
          <span>
            {PLANETS[r.from].icon} → {PLANETS[r.to].icon}
          </span>
          <ResourceIcon id={r.resource} />
          <input type="text" className="rate-input" defaultValue={r.rate} onBlur={(e) => game.updateRoute(r.id, Number(e.target.value.replace(',', '.')))} />
          <span className={`mono ${(game.routeFlow.actual.get(r.id) ?? 0) < r.rate * 0.95 ? 'warn' : 'good'}`}>{fmt(game.routeFlow.actual.get(r.id) ?? 0, true)}/s</span>
          <button onClick={() => game.removeRoute(r.id)} aria-label="Route löschen">
            ✕
          </button>
        </div>
      ))}
      <div className="route-form">
        <select value={from} onChange={(e) => setFrom(e.target.value)}>
          {planets.map((p) => (
            <option key={p} value={p}>
              Von {PLANETS[p].name}
            </option>
          ))}
        </select>
        <select value={to} onChange={(e) => setTo(e.target.value)}>
          {planets.map((p) => (
            <option key={p} value={p}>
              Nach {PLANETS[p].name}
            </option>
          ))}
        </select>
        <select value={resource} onChange={(e) => setResource(e.target.value)}>
          <option value="">Fracht wählen …</option>
          {sourceItems.map((id) => (
            <option key={id} value={id}>
              {RESOURCES[id].name}
            </option>
          ))}
        </select>
        <div className="row">
          <input type="text" className="rate-input" value={rate} onChange={(e) => setRate(e.target.value)} />
          <span className="muted small">/s</span>
          <button className="primary" disabled={!resource || from === to} onClick={() => game.addRoute(from, to, resource, Number(rate.replace(',', '.')))}>
            Route anlegen
          </button>
        </div>
      </div>
    </section>
  );
}
