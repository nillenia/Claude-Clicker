import { OBJECTIVES } from '../../data/objectives';
import { useGame } from '../useGame';

/** Zeigt das nächste offene Ziel mit Fortschritt und Hinweis. */
export function ObjectivesPanel() {
  const game = useGame();
  const next = OBJECTIVES.find((o) => !game.state.objectives.includes(o.id));
  if (!next) return null;
  const progress = next.progress(game.state);
  const r = next.reward;
  const reward = [r.xp && `${r.xp} EP`, r.items && `${r.items} Item${r.items > 1 ? 's' : ''}`, r.currency && `${r.currency} Währung`, r.chips && `${r.chips} Chip`]
    .filter(Boolean)
    .join(', ');
  return (
    <section className="objective">
      <div className="row between">
        <h2 style={{ margin: 0 }}>
          Ziel {game.state.objectives.length + 1}/{OBJECTIVES.length}
        </h2>
        <span className="muted small">🎁 {reward}</span>
      </div>
      <div style={{ fontWeight: 600 }}>{next.title}</div>
      <div className="meter good">
        <div style={{ width: `${progress * 100}%` }} />
      </div>
      <div className="muted small">{next.hint}</div>
    </section>
  );
}
