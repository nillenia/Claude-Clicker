import { fmt } from '../../core/format';
import { RECIPE_LIST, RECIPES, type RecipeDef } from '../../data/recipes';
import { RESOURCES } from '../../data/resources';
import { planCraft } from '../../systems/handcraft';
import { amountOf } from '../../systems/inventory';
import { isRecipeUnlocked } from '../../systems/research';
import { Amounts, ResourceIcon } from '../components/ResourceIcon';
import { useTip } from '../components/Tooltip';
import { useGame } from '../useGame';

export function CraftPanel() {
  const game = useGame();
  const recipes = RECIPE_LIST.filter((r) => r.hand && isRecipeUnlocked(game.state, r));
  const queue = game.state.handQueue;

  return (
    <section>
      <div className="row between">
        <h2>Handfertigung</h2>
        <span className="muted small">Klick ×1 · Shift ×5</span>
      </div>
      <div className="craft-grid">
        {recipes.map((r) => (
          <CraftButton key={r.id} recipe={r} />
        ))}
      </div>
      {queue.length > 0 && (
        <div className="queue">
          {queue.map((_, i) => (
            <QueueItem key={i} index={i} />
          ))}
        </div>
      )}
    </section>
  );
}

function mainOutput(r: RecipeDef): string {
  return Object.keys(r.outputs)[0];
}

function CraftButton({ recipe }: { recipe: RecipeDef }) {
  const game = useGame();
  const unlocked = (r: RecipeDef) => isRecipeUnlocked(game.state, r);
  const possible = planCraft(game.planet, recipe.id, 1, unlocked) !== null;
  const out = mainOutput(recipe);
  const tip = useTip(() => {
    const plan = planCraft(game.planet, recipe.id, 1, unlocked);
    return (
      <>
        <div className="tip-header">
          <span className="tip-title">{RESOURCES[out].name}</span>
          <span className="tip-muted">{fmt(recipe.time, true)} s</span>
        </div>
        <div className="tip-section io-line">
          <Amounts items={recipe.inputs} have={(id) => amountOf(game.planet, id).toNumber()} />
          <span className="arrow">→</span>
          <Amounts items={recipe.outputs} />
        </div>
        {plan && plan.steps.length > 1 && (
          <div className="tip-section tip-muted">Fehlende Zwischenprodukte werden mitgefertigt.</div>
        )}
        {!plan && <div className="tip-section bad small">Nicht genug Rohstoffe</div>}
        <div className="tip-section tip-muted">Im Inventar: {fmt(amountOf(game.planet, out))}</div>
      </>
    );
  });
  return (
    <button
      className={`craft-btn ${possible ? '' : 'unaffordable'}`}
      onClick={(e) => game.craft(recipe.id, e.shiftKey ? 5 : 1)}
      {...tip}
    >
      <ResourceIcon id={out} large tip={false} />
    </button>
  );
}

function QueueItem({ index }: { index: number }) {
  const game = useGame();
  const job = game.state.handQueue[index];
  const tip = useTip(() => (
    <>
      <span className="tip-title">{job ? RESOURCES[mainOutput(RECIPES[job.recipe])].name : ''}</span>
      <div className="tip-muted">Klicken zum Abbrechen</div>
    </>
  ));
  if (!job) return null;
  const recipe = RECIPES[job.recipe];
  const fraction = index === 0 ? job.progress / recipe.time : 0;
  return (
    <button className="queue-item" onClick={() => game.cancelCraft(index)} {...tip}>
      <ResourceIcon id={mainOutput(recipe)} tip={false} />
      <span className="count">{job.count}</span>
      <span className="progress" style={{ width: `${fraction * 100}%` }} />
    </button>
  );
}
