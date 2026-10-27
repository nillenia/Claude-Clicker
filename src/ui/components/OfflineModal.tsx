import { fmt, fmtPercent, fmtTime } from '../../core/format';
import { PLANETS } from '../../data/planets';
import { useGame } from '../useGame';
import { AmountChip } from './ResourceIcon';

export function OfflineModal() {
  const game = useGame();
  const result = game.pendingOffline;
  if (!result) return null;
  const capped = result.elapsed > result.counted;

  return (
    <div className="modal-backdrop" onClick={() => game.dismissOffline()}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Willkommen zurück, Kommandant</h2>
        <p>
          Du warst <strong>{fmtTime(result.elapsed)}</strong> weg. Deine Fabriken haben weitergearbeitet:
        </p>
        <div className="modal-gains">
          {Object.entries(result.gains).map(([planet, gains]) => (
            <div key={planet}>
              <div className="muted small">
                {PLANETS[planet].icon} {PLANETS[planet].name}
              </div>
              <div className="io-line">
                {Object.entries(gains)
                  .filter(([, n]) => n > 0)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 12)
                  .map(([res, n]) => (
                    <AmountChip key={res} id={res} amount={n} />
                  ))}
              </div>
            </div>
          ))}
          {result.researchUnits > 0 && <div className="small">🔬 +{fmt(result.researchUnits, true)} Forschungseinheiten</div>}
        </div>
        <p className="muted small">
          Offline-Effizienz: {fmtPercent(result.efficiency)}
          {capped && ` · angerechnet: maximal ${fmtTime(result.counted)}`}
        </p>
        <button className="primary" onClick={() => game.dismissOffline()}>
          Weiter
        </button>
      </div>
    </div>
  );
}
