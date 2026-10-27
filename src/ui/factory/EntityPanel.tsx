import { fmt, fmtPercent } from '../../core/format';
import { RECIPE_LIST, type RecipeDef } from '../../data/recipes';
import { RESEARCH } from '../../data/research';
import { RESOURCES } from '../../data/resources';
import { DAMAGE_TYPE_NAMES } from '../../data/machines';
import { isRecipeUnlocked } from '../../systems/research';
import { STATUS_TEXT, type Runtime, type Status } from '../../sim/world';
import { Amounts, ResourceIcon } from '../components/ResourceIcon';
import { useTip } from '../components/Tooltip';
import { useGame } from '../useGame';
import { StatsSection } from './StatsSection';
import { ModuleSockets } from './ModuleSockets';

const STATUS_CLASS: Record<Status, string> = {
  working: 'working',
  idle: '',
  no_input: 'blocked',
  output_blocked: 'blocked',
  no_research: 'blocked',
  no_power: 'error',
  no_recipe: 'error',
  no_ore: 'error',
  no_fuel: 'error',
  disabled: 'error',
};

export function EntityPanel({ id, onClose, extra }: { id: number; onClose: () => void; extra?: (rt: Runtime) => React.ReactNode }) {
  const game = useGame();
  const rt = game.world.runtimes.get(id);
  if (!rt) return null;
  const def = rt.def;
  const showStatus = !['storage', 'hub', 'belt', 'splitter'].includes(def.category);

  return (
    <div className="entity-panel">
      <div className="entity-title">
        <span>{def.icon}</span>
        <span>{def.name}</span>
        <button className="close" onClick={onClose} aria-label="Schließen">
          ✕
        </button>
      </div>
      <div className="muted small">{def.description}</div>
      {showStatus && (
        <div className="row">
          <span className={`status-pill ${STATUS_CLASS[rt.status]}`}>{STATUS_TEXT[rt.status]}</span>
          {def.category !== 'generator' && <span className="muted small">Auslastung {fmtPercent(Math.min(1, rt.activity))}</span>}
        </div>
      )}

      <Details rt={rt} />
      <ModuleSockets rt={rt} />
      <StatsSection rt={rt} />
      {extra?.(rt)}

      {def.category !== 'hub' && (
        <div className="button-row">
          <button onClick={() => game.rotateEntity(id)}>⟳ Drehen (R)</button>
          <button
            className="danger-button"
            onClick={() => {
              game.deconstruct(id);
              onClose();
            }}
          >
            Abreißen
          </button>
        </div>
      )}
    </div>
  );
}

function Details({ rt }: { rt: Runtime }) {
  const game = useGame();
  const def = rt.def;
  const s = rt.stats;
  const rows: [string, string][] = [];

  switch (def.category) {
    case 'drill':
    case 'pump':
      if (rt.ore) rows.push(['Fördert', RESOURCES[rt.ore].name], ['Abdeckung', fmtPercent(rt.coverage)]);
      rows.push(['Förderrate', `${fmt(rt.rate, true)} /s`]);
      break;
    case 'belt':
    case 'splitter':
      rows.push(['Durchsatz max.', `${fmt(def.speed * s.throughput, true)} /s`], ['Aktuell', `${fmt(rt.rate, true)} /s`]);
      break;
    case 'furnace':
    case 'assembler':
    case 'chemical':
      rows.push(['Fertigungsgeschw.', `×${fmt(def.speed * s.speed, true)}`]);
      if (rt.recipe) rows.push(['Durchläufe', `${fmt(rt.rate * 60, true)} /min`]);
      break;
    case 'lab':
      rows.push(['Forschungsgeschw.', `×${fmt(def.speed * s.speed, true)}`], ['Einheiten', `${fmt(rt.rate * 60, true)} /min`]);
      break;
    case 'generator':
      rows.push(['Leistung max.', `${fmt((def.powerGen ?? 0) * s.powerGen)} kW`], ['Last', fmtPercent(Math.min(1, rt.activity))]);
      if (def.fuel) rows.push(['Brennstoff', RESOURCES[def.fuel.resource].name]);
      break;
    case 'terminal':
      rows.push(['Ausgabe max.', `${fmt(def.speed * s.throughput, true)} /s`], ['Aktuell', `${fmt(rt.rate, true)} /s`]);
      break;
  }
  if (def.turret) {
    const t = def.turret;
    rows.push(
      ['Schaden', `${fmt(t.damage * s.damage, true)} ${DAMAGE_TYPE_NAMES[t.damageType]}`],
      ['Schüsse', `${fmt(t.fireRate * s.fireRate, true)} /s`],
      ['Reichweite', `${fmt(t.range * s.range, true)} Felder`],
    );
    if (s.penetration > 0) rows.push(['Durchdringung', `${fmt(s.penetration, true)} %`]);
    if (t.ammo) rows.push(['Munition', `${RESOURCES[t.ammo].name} (${fmt(game.planet.inventory[t.ammo] ?? 0)} im Lager)`]);
  }
  const maxHp = def.hp * s.hp;
  rows.push(['Struktur', `${fmt(rt.entity.hp ?? maxHp)} / ${fmt(maxHp)}`]);
  if (def.power > 0) rows.push(['Strombedarf', `${fmt(def.power * s.power)} kW`]);
  if (s.productivity > 0) rows.push(['Produktivität', `+${fmtPercent(s.productivity)}`]);
  if (s.critChance > 0) rows.push(['Krit-Produktion', `${fmtPercent(s.critChance)} · ×${fmt(s.critMulti, true)}`]);

  return (
    <>
      {rows.length > 0 && (
        <dl className="kv">
          {rows.map(([k, v]) => (
            <Row key={k} k={k} v={v} />
          ))}
        </dl>
      )}
      {(def.category === 'assembler' || def.category === 'chemical') && <RecipePicker rt={rt} />}
      {def.category === 'furnace' && rt.recipe && <RecipeIO recipe={rt.recipe} rt={rt} />}
      {def.category === 'terminal' && <FilterPicker rt={rt} />}
      {def.category === 'lab' && (
        <div className="small">
          {game.state.research.current ? (
            <>
              Forscht: <strong>{RESEARCH[game.state.research.current].name}</strong>
              <div className="io-line">
                Braucht: <Amounts items={RESEARCH[game.state.research.current].packs} />
              </div>
            </>
          ) : (
            <span className="warn">Keine Forschung aktiv – wähle eine im Tab „Forschung“.</span>
          )}
        </div>
      )}
      <Buffers rt={rt} />
    </>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <>
      <dt>{k}</dt>
      <dd>{v}</dd>
    </>
  );
}

function RecipeIO({ recipe, rt }: { recipe: RecipeDef; rt: Runtime }) {
  const perMin = ((rt.def.speed * rt.stats.speed) / recipe.time) * 60;
  return (
    <div className="small">
      <div className="io-line">
        <Amounts items={recipe.inputs} />
        <span className="arrow">→</span>
        <Amounts items={recipe.outputs} />
      </div>
      <div className="muted">
        {fmt(recipe.time / (rt.def.speed * rt.stats.speed), true)} s pro Durchlauf · max. {fmt(perMin, true)} /min
      </div>
    </div>
  );
}

function RecipePicker({ rt }: { rt: Runtime }) {
  const game = useGame();
  const recipes = RECIPE_LIST.filter((r) => rt.def.recipeCategories?.includes(r.category) && isRecipeUnlocked(game.state, r));
  return (
    <div>
      <h2>Rezept</h2>
      <div className="recipe-list">
        {recipes.map((r) => (
          <RecipeButton key={r.id} recipe={r} active={rt.recipe?.id === r.id} onClick={() => game.setRecipe(rt.entity.id, rt.recipe?.id === r.id ? undefined : r.id)} />
        ))}
      </div>
      {rt.recipe && (
        <div style={{ marginTop: 8 }}>
          <RecipeIO recipe={rt.recipe} rt={rt} />
        </div>
      )}
    </div>
  );
}

function RecipeButton({ recipe, active, onClick }: { recipe: RecipeDef; active: boolean; onClick: () => void }) {
  const out = Object.keys(recipe.outputs)[0];
  const tip = useTip(() => (
    <>
      <span className="tip-title">{RESOURCES[out].name}</span>
      <div className="tip-section io-line">
        <Amounts items={recipe.inputs} />
        <span className="arrow">→</span>
        <Amounts items={recipe.outputs} />
      </div>
      <div className="tip-muted">{fmt(recipe.time, true)} s</div>
    </>
  ));
  return (
    <button className={active ? 'active' : ''} onClick={onClick} {...tip}>
      <ResourceIcon id={out} tip={false} />
    </button>
  );
}

function FilterPicker({ rt }: { rt: Runtime }) {
  const game = useGame();
  const items = Object.entries(game.planet.inventory)
    .filter(([id, n]) => n.gt(0) || id === rt.entity.filter)
    .map(([id]) => id)
    .sort((a, b) => (RESOURCES[a]?.tier ?? 0) - (RESOURCES[b]?.tier ?? 0));
  return (
    <div>
      <h2>Ausgabe</h2>
      {items.length === 0 && <div className="muted small">Inventar ist leer.</div>}
      <div className="recipe-list">
        {items.map((id) => (
          <button key={id} className={rt.entity.filter === id ? 'active' : ''} onClick={() => game.setFilter(rt.entity.id, rt.entity.filter === id ? undefined : id)}>
            <ResourceIcon id={id} />
          </button>
        ))}
      </div>
    </div>
  );
}

function Buffers({ rt }: { rt: Runtime }) {
  const entries = [...rt.inBuf, ...rt.outBuf].filter(([, n]) => n > 0.01);
  const tip = useTip(() => <span className="tip-muted">Items, die gerade in der Maschine oder auf dem Band liegen.</span>);
  if (entries.length === 0) return null;
  return (
    <div className="small" {...tip}>
      <span className="muted">Inhalt: </span>
      <span className="io-line" style={{ display: 'inline-flex' }}>
        {entries.map(([res, n], i) => (
          <span key={`${res}${i}`} className="amount-chip">
            <ResourceIcon id={res} tip={false} />
            {fmt(n, true)}
          </span>
        ))}
      </span>
    </div>
  );
}
