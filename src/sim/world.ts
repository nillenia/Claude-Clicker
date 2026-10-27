import { D } from '../core/bignum';
import type { Dir, Entity, PlanetState } from '../core/state';
import { MACHINES, type MachineDef } from '../data/machines';
import { RECIPES, smeltingRecipeFor, type Amounts, type RecipeDef } from '../data/recipes';
import { RESOURCES } from '../data/resources';
import { addItem, amountOf } from '../systems/inventory';
import { cellsOf, DIRS, outputCell, splitterCells } from './geometry';
import { oreAt, type Terrain } from './terrain';
import type { Flag } from '../engine/types';
import { ThreatSystem, type BossFight, type Enemy } from './threats';
import type { Rng } from '../core/rng';

/** Effektive Werte einer Maschine (aus Stat-Engine, Modulen, Nachbarschaft). */
export interface EntityStats {
  /** Multiplikator auf die Grundgeschwindigkeit. */
  speed: number;
  /** Bonus-Output als Anteil (0,1 = +10 %). */
  productivity: number;
  critChance: number;
  /** Output-Multiplikator bei Krit-Produktion. */
  critMulti: number;
  /** Multiplikator auf den Stromverbrauch. */
  power: number;
  /** Multiplikator auf die Stromerzeugung. */
  powerGen: number;
  /** Multiplikator auf den Brennstoffverbrauch (kleiner = sparsamer). */
  fuelUse: number;
  /** Multiplikator auf den Banddurchsatz. */
  throughput: number;
  /** Kampfwerte (Multiplikatoren bzw. Prozentpunkte bei Durchdringung). */
  damage: number;
  fireRate: number;
  range: number;
  penetration: number;
  ammoUse: number;
  /** Multiplikator auf die Strukturpunkte. */
  hp: number;
}

export const DEFAULT_STATS: EntityStats = {
  speed: 1,
  productivity: 0,
  critChance: 0,
  critMulti: 2,
  power: 1,
  powerGen: 1,
  fuelUse: 1,
  throughput: 1,
  damage: 1,
  fireRate: 1,
  range: 1,
  penetration: 0,
  ammoUse: 1,
  hp: 1,
};

export type Status =
  | 'working'
  | 'idle'
  | 'no_input'
  | 'output_blocked'
  | 'no_power'
  | 'no_recipe'
  | 'no_ore'
  | 'no_fuel'
  | 'no_research'
  | 'disabled';

export const STATUS_TEXT: Record<Status, string> = {
  working: 'Arbeitet',
  idle: 'Bereit',
  no_input: 'Wartet auf Material',
  output_blocked: 'Ausgang blockiert',
  no_power: 'Kein Strom',
  no_recipe: 'Kein Rezept gewählt',
  no_ore: 'Kein Erz darunter',
  no_fuel: 'Kein Brennstoff',
  no_research: 'Keine Forschung aktiv',
  disabled: 'Außer Betrieb',
};

export interface Runtime {
  entity: Entity;
  def: MachineDef;
  /** Eingänge (Maschinen) bzw. Inhalt (Bänder, Weichen). */
  inBuf: Map<string, number>;
  outBuf: Map<string, number>;
  targets: number[];
  rr: number;
  status: Status;
  /** Gleitender Durchschnitt: Durchläufe bzw. Items pro Sekunde. */
  rate: number;
  /** Tatsächliche Auslastung 0–1 im letzten Tick. */
  activity: number;
  /** Gewünschte Auslastung bei vollem Strom (bestimmt den Strombedarf). */
  load: number;
  /** Bohrer: geförderte Ressource und Anteil der Erzfelder unter dem Bohrer. */
  ore: string | null;
  coverage: number;
  /** Rezept, das gerade läuft (Öfen wählen es selbst). */
  recipe: RecipeDef | null;
  stats: EntityStats;
  /** Sekunden bis wieder betriebsbereit (z. B. Überlastbohrer). */
  downtime: number;
  /** Zuletzt transportiertes Item (für die Band-Animation). */
  lastItem: string | null;
  /** Anzahl angrenzender Gebäude pro Tag (Baumgruppe, Kategorie, „$same“). */
  adjacency: Map<string, number>;
  /** Cache-Schlüssel der berechneten Werte. */
  statsKey: string;
  /** Laufender Zyklus-Timer (Überlastbohrer). */
  cycle: number;
  /** Bänder in einer Kurve: Richtung, aus der die Items kommen (sonst null). */
  curveFrom: Dir | null;
}

export interface ResearchJob {
  packs: Amounts;
  /** Sekunden pro Einheit bei Laborgeschwindigkeit 1. */
  unitTime: number;
}

export interface TickContext {
  dt: number;
  isUnlocked: (recipe: RecipeDef) => boolean;
  research: ResearchJob | null;
  statsFor: (rt: Runtime) => EntityStats;
  onProduced: (rt: Runtime, resource: string, amount: number) => void;
  onResearch: (units: number) => void;
  /** Planetenweite Multiplikatoren (Umwelt, Skills). */
  planetSpeed: number;
  /** Aktive Sonderregeln (Keystones, Uniques). */
  flags: ReadonlySet<Flag>;
  /** Kampf: Zufall und Rückmeldung bei besiegten Gegnern. */
  rng?: Rng;
  onKill?: (enemy: Enemy, fight: BossFight | null) => void;
}

const EMA_TAU = 5;
const isBeltLike = (d: MachineDef) => d.category === 'belt' || d.category === 'splitter';
const isSink = (d: MachineDef) => d.category === 'storage' || d.category === 'hub';
const isCrafter = (d: MachineDef) => d.category === 'furnace' || d.category === 'assembler' || d.category === 'chemical';

function total(buf: Map<string, number>): number {
  let s = 0;
  for (const v of buf.values()) s += v;
  return s;
}

function addBuf(buf: Map<string, number>, res: string, n: number): void {
  buf.set(res, (buf.get(res) ?? 0) + n);
}

export class PlanetWorld {
  readonly occ: Int32Array;
  readonly runtimes = new Map<number, Runtime>();
  private order: Runtime[] = [];
  private dirty = true;
  power = { gen: 0, demand: 0, satisfaction: 1 };
  /** Steigt bei jeder Änderung des Layouts (für Caches). */
  layoutVersion = 0;
  /** Häufigste Produktionsgruppe (für den Keystone „Monokultur“). */
  dominantGroup: string | null = null;
  /** Keystone „Planetenkern“: Bohrer dürfen überall stehen. */
  drillAnywhere = false;
  /** Von Bändern bewegte Items seit dem letzten Auslesen (für Logistik-Erfahrung). */
  movedAcc = 0;
  readonly threat = new ThreatSystem();
  /** Zeitlich begrenzte Bereichseffekte (Überladung). */
  zones: { x: number; y: number; r: number; mult: number; t: number }[] = [];
  /** Notstrom: Restdauer in Sekunden. */
  powerOverride = 0;
  /** Zeitdilatation: Restdauer und Faktor. */
  dilation = { t: 0, mult: 1 };
  /** Gleitender Durchschnitt der Inventaränderung pro Ressource (Items/s). */
  readonly netRates = new Map<string, number>();
  private netThisTick = new Map<string, number>();

  constructor(
    readonly state: PlanetState,
    readonly terrain: Terrain,
  ) {
    this.occ = new Int32Array(terrain.width * terrain.height);
    this.ensureHub();
    this.rebuild();
  }

  private ensureHub(): void {
    if (this.state.entities.some((e) => e.type === 'hub')) return;
    this.state.entities.push({ id: this.state.nextEntityId++, type: 'hub', x: this.terrain.hub.x, y: this.terrain.hub.y, rot: 0 });
  }

  // ---------- Raster ----------

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.terrain.width && y < this.terrain.height;
  }

  entityAt(x: number, y: number): Entity | null {
    if (!this.inBounds(x, y)) return null;
    const id = this.occ[y * this.terrain.width + x];
    return id ? (this.runtimes.get(id)?.entity ?? null) : null;
  }

  /** Gibt eine Fehlermeldung zurück oder null, wenn der Platz passt. */
  canPlace(type: string, x: number, y: number): string | null {
    const def = MACHINES[type];
    if (!def) return 'Unbekanntes Gebäude';
    let oreTiles = 0;
    let fluidTiles = 0;
    let requiredTiles = 0;
    for (const [cx, cy] of cellsOf(def, x, y)) {
      if (!this.inBounds(cx, cy)) return 'Außerhalb des Baugebiets';
      if (this.occ[cy * this.terrain.width + cx]) return 'Feld ist belegt';
      const ore = oreAt(this.terrain, cx, cy);
      if (ore) {
        if (RESOURCES[ore].category === 'fluid') fluidTiles++;
        else oreTiles++;
        if (ore === def.requiresTile) requiredTiles++;
      }
    }
    if (def.category === 'drill' && oreTiles === 0 && !this.drillAnywhere) return 'Bohrer brauchen Erz darunter';
    if (def.category === 'pump' && fluidTiles === 0) return 'Pumpen brauchen eine Quelle darunter';
    if (def.requiresTile && requiredTiles === 0) return `Muss auf ${RESOURCES[def.requiresTile].name} stehen`;
    return null;
  }

  place(type: string, x: number, y: number, rot: Dir, extra: Partial<Entity> = {}): Entity | null {
    if (this.canPlace(type, x, y)) return null;
    const entity: Entity = { id: this.state.nextEntityId++, type, x, y, rot, ...extra };
    this.state.entities.push(entity);
    this.dirty = true;
    this.rebuild();
    return entity;
  }

  /** Entfernt ein Gebäude. Inhalt der Puffer landet im Planeteninventar. */
  remove(id: number): Entity | null {
    const rt = this.runtimes.get(id);
    if (!rt || rt.def.category === 'hub') return null;
    for (const buf of [rt.inBuf, rt.outBuf]) for (const [res, n] of buf) if (n > 0) addItem(this.state, res, D(n));
    this.state.entities = this.state.entities.filter((e) => e.id !== id);
    this.dirty = true;
    this.rebuild();
    return rt.entity;
  }

  rotate(id: number): void {
    const rt = this.runtimes.get(id);
    if (!rt) return;
    this.setRotation(id, ((rt.entity.rot + 1) % 4) as Dir);
  }

  setRotation(id: number, rot: Dir): void {
    const rt = this.runtimes.get(id);
    if (!rt || rt.def.category === 'hub' || rt.entity.rot === rot) return;
    rt.entity.rot = rot;
    this.dirty = true;
    this.rebuild();
  }

  setRecipe(id: number, recipe: string | undefined): void {
    const rt = this.runtimes.get(id);
    if (!rt) return;
    // Zutaten des alten Rezepts zurück ins Inventar
    for (const [res, n] of rt.inBuf) if (n > 0) addItem(this.state, res, D(n));
    rt.inBuf.clear();
    rt.entity.recipe = recipe;
    rt.recipe = recipe ? RECIPES[recipe] : null;
  }

  setFilter(id: number, filter: string | undefined): void {
    const rt = this.runtimes.get(id);
    if (!rt) return;
    for (const [res, n] of rt.outBuf) if (n > 0) addItem(this.state, res, D(n));
    rt.outBuf.clear();
    rt.entity.filter = filter;
  }

  markDirty(): void {
    this.dirty = true;
  }

  /** Belegung, Laufzeitdaten und Verbindungen neu aufbauen. Puffer bestehender Gebäude bleiben erhalten. */
  rebuild(): void {
    if (!this.dirty) return;
    this.dirty = false;
    const { width } = this.terrain;
    this.occ.fill(0);
    const old = new Map(this.runtimes);
    this.runtimes.clear();

    for (const e of this.state.entities) {
      const def = MACHINES[e.type];
      if (!def) continue;
      for (const [cx, cy] of cellsOf(def, e.x, e.y)) if (this.inBounds(cx, cy)) this.occ[cy * width + cx] = e.id;
      const prev = old.get(e.id);
      const rt: Runtime = prev ?? {
        entity: e,
        def,
        inBuf: new Map(),
        outBuf: new Map(),
        targets: [],
        rr: 0,
        status: 'idle',
        rate: 0,
        activity: 0,
        load: 1,
        ore: null,
        coverage: 0,
        recipe: e.recipe ? (RECIPES[e.recipe] ?? null) : null,
        stats: DEFAULT_STATS,
        downtime: 0,
        lastItem: null,
        adjacency: new Map(),
        statsKey: '',
        cycle: 0,
        curveFrom: null,
      };
      rt.entity = e;
      rt.def = def;
      this.runtimes.set(e.id, rt);
    }

    for (const rt of this.runtimes.values()) {
      const { def, entity: e } = rt;
      rt.targets = [];
      const cells =
        def.category === 'splitter'
          ? splitterCells(e.x, e.y, e.rot)
          : def.category === 'belt'
            ? [outputCell(def, e.x, e.y, e.rot)]
            : this.hasOutput(def)
              ? [outputCell(def, e.x, e.y, e.rot)]
              : [];
      for (const [cx, cy] of cells) {
        const target = this.entityAt(cx, cy);
        if (target && target.id !== e.id) rt.targets.push(target.id);
      }
      if (def.category === 'drill' || def.category === 'pump') this.scanOre(rt);
    }

    this.computeCurves();
    this.computeAdjacency();
    this.order = this.computeOrder();
    this.layoutVersion++;
  }

  /**
   * Kurven wie in Factorio: Ein Band ist eine Kurve, wenn genau ein Band seitlich hineinführt
   * und keines von hinten. Nur für die Darstellung – die Simulation ist davon unabhängig.
   */
  private computeCurves(): void {
    const feeders = new Map<number, Runtime[]>();
    for (const rt of this.runtimes.values()) {
      if (rt.def.category !== 'belt') continue;
      for (const t of rt.targets) {
        if (!feeders.has(t)) feeders.set(t, []);
        feeders.get(t)!.push(rt);
      }
    }
    for (const rt of this.runtimes.values()) {
      rt.curveFrom = null;
      if (rt.def.category !== 'belt') continue;
      const { x, y, rot } = rt.entity;
      let fromBehind = false;
      const sides: Dir[] = [];
      for (const f of feeders.get(rt.entity.id) ?? []) {
        // Richtung vom Band zum Zubringer
        const side = DIRS.findIndex(([dx, dy]) => dx === Math.sign(f.entity.x - x) && dy === Math.sign(f.entity.y - y)) as Dir;
        if (side < 0) continue;
        if (side === ((rot + 2) % 4)) fromBehind = true;
        else if (side !== rot) sides.push(side);
      }
      if (!fromBehind && sides.length === 1) rt.curveFrom = sides[0];
    }
  }

  private computeAdjacency(): void {
    const { width } = this.terrain;
    const groupCount = new Map<string, number>();
    for (const rt of this.runtimes.values()) {
      rt.adjacency = new Map();
      if (isBeltLike(rt.def)) continue;
      const g = rt.def.tree;
      if (g && ['drill', 'furnace', 'assembler', 'lab'].includes(g)) groupCount.set(g, (groupCount.get(g) ?? 0) + 1);
      const seen = new Set<number>();
      const { x, y } = rt.entity;
      const { w, h } = rt.def;
      const perimeter: [number, number][] = [];
      for (let dx = 0; dx < w; dx++) perimeter.push([x + dx, y - 1], [x + dx, y + h]);
      for (let dy = 0; dy < h; dy++) perimeter.push([x - 1, y + dy], [x + w, y + dy]);
      for (const [cx, cy] of perimeter) {
        if (!this.inBounds(cx, cy)) continue;
        const id = this.occ[cy * width + cx];
        if (!id || seen.has(id)) continue;
        seen.add(id);
        const other = this.runtimes.get(id);
        if (!other || isBeltLike(other.def)) continue;
        const add = (tag: string) => rt.adjacency.set(tag, (rt.adjacency.get(tag) ?? 0) + 1);
        add(other.def.category);
        add('any');
        if (other.def.tree) add(other.def.tree);
        if (other.def.tree && other.def.tree === rt.def.tree) add('$same');
      }
    }
    let best: string | null = null;
    let bestN = 0;
    for (const [g, n] of groupCount) if (n > bestN) [best, bestN] = [g, n];
    this.dominantGroup = best;
  }

  private hasOutput(def: MachineDef): boolean {
    return def.category === 'drill' || def.category === 'pump' || isCrafter(def) || def.category === 'terminal';
  }

  private scanOre(rt: Runtime): void {
    const counts = new Map<string, number>();
    const cells = cellsOf(rt.def, rt.entity.x, rt.entity.y);
    const wantFluid = rt.def.category === 'pump';
    for (const [cx, cy] of cells) {
      const ore = oreAt(this.terrain, cx, cy);
      if (!ore || (RESOURCES[ore].category === 'fluid') !== wantFluid) continue;
      counts.set(ore, (counts.get(ore) ?? 0) + 1);
    }
    let best: string | null = null;
    let bestCount = 0;
    for (const [ore, n] of counts) {
      if (n > bestCount) {
        best = ore;
        bestCount = n;
      }
    }
    rt.ore = best;
    rt.coverage = bestCount / cells.length;
    if (!best && !wantFluid && this.drillAnywhere) {
      // Nächstgelegenes festes Erz fördern
      let nearest: string | null = null;
      let nearestDist = Infinity;
      for (let ty = 0; ty < this.terrain.height; ty++) {
        for (let tx = 0; tx < this.terrain.width; tx++) {
          const ore = oreAt(this.terrain, tx, ty);
          if (!ore || RESOURCES[ore].category === 'fluid') continue;
          const d = Math.abs(tx - rt.entity.x) + Math.abs(ty - rt.entity.y);
          if (d < nearestDist) [nearest, nearestDist] = [ore, d];
        }
      }
      rt.ore = nearest;
      rt.coverage = nearest ? 1 : 0;
    }
  }

  /** Abnehmer zuerst verarbeiten, damit Platz frei wird, bevor Lieferanten schieben. */
  private computeOrder(): Runtime[] {
    const indeg = new Map<number, number>();
    for (const rt of this.runtimes.values()) indeg.set(rt.entity.id, 0);
    for (const rt of this.runtimes.values()) for (const t of rt.targets) indeg.set(t, (indeg.get(t) ?? 0) + 1);
    const queue = [...this.runtimes.values()].filter((rt) => indeg.get(rt.entity.id) === 0);
    const topo: Runtime[] = [];
    const seen = new Set<number>();
    while (queue.length) {
      const rt = queue.shift()!;
      if (seen.has(rt.entity.id)) continue;
      seen.add(rt.entity.id);
      topo.push(rt);
      for (const t of rt.targets) {
        indeg.set(t, indeg.get(t)! - 1);
        if (indeg.get(t) === 0) queue.push(this.runtimes.get(t)!);
      }
    }
    // Kreise: Rest anhängen
    for (const rt of this.runtimes.values()) if (!seen.has(rt.entity.id)) topo.push(rt);
    return topo.reverse();
  }

  // ---------- Annahme von Items ----------

  /** Kapazität eines Band-Felds (Items), abhängig vom Durchsatz. */
  private beltCap(rt: Runtime): number {
    return Math.max(2, rt.def.speed * rt.stats.throughput * 0.5);
  }

  private inputCap(rt: Runtime, res: string, ctx: TickContext): number {
    const def = rt.def;
    if (isCrafter(def)) {
      const recipe = this.recipeForInput(rt, res, ctx);
      if (!recipe) return 0;
      const runsPerSec = (def.speed * rt.stats.speed) / recipe.time;
      return recipe.inputs[res] * Math.max(2, runsPerSec * 2);
    }
    if (def.category === 'lab') {
      if (RESOURCES[res]?.category !== 'science') return 0;
      return Math.max(4, def.speed * rt.stats.speed * 4);
    }
    if (def.category === 'generator' && def.fuel?.resource === res) return Math.max(5, def.fuel.perSecond * 10);
    return 0;
  }

  private recipeForInput(rt: Runtime, res: string, ctx: TickContext): RecipeDef | null {
    if (rt.def.category === 'furnace') {
      const r = smeltingRecipeFor(res);
      return r && ctx.isUnlocked(r) ? r : null;
    }
    const r = rt.recipe;
    return r && res in r.inputs ? r : null;
  }

  /** Nimmt bis zu `amount` an. Gibt die angenommene Menge zurück. */
  private accept(target: Runtime, res: string, amount: number, ctx: TickContext): number {
    const def = target.def;
    if (isSink(def) || (def.category === 'silo' && res === 'rocket_part')) {
      addItem(this.state, res, D(amount));
      addBuf(this.netThisTick, res, amount);
      return amount;
    }
    if (isBeltLike(def)) {
      const space = this.beltCap(target) - total(target.inBuf);
      const take = Math.min(amount, Math.max(0, space));
      if (take > 0) addBuf(target.inBuf, res, take);
      return take;
    }
    const cap = this.inputCap(target, res, ctx);
    if (cap <= 0) return 0;
    const take = Math.min(amount, Math.max(0, cap - (target.inBuf.get(res) ?? 0)));
    if (take > 0) addBuf(target.inBuf, res, take);
    return take;
  }

  /** Schiebt Inhalte eines Puffers zu den Zielen (Weichen verteilen reihum). */
  private push(rt: Runtime, buf: Map<string, number>, limit: number, ctx: TickContext): number {
    if (rt.targets.length === 0) return 0;
    let moved = 0;
    for (const [res, n] of buf) {
      if (n <= 1e-9 || moved >= limit) continue;
      let remaining = Math.min(n, limit - moved);
      const count = rt.targets.length;
      // Gleichmäßig verteilen, Rest an Ziele mit Platz
      for (let pass = 0; pass < 2 && remaining > 1e-9; pass++) {
        const share = pass === 0 ? remaining / count : remaining;
        for (let i = 0; i < count && remaining > 1e-9; i++) {
          const target = this.runtimes.get(rt.targets[(rt.rr + i) % count]);
          if (!target) continue;
          const took = this.accept(target, res, Math.min(share, remaining), ctx);
          if (took > 0) rt.lastItem = res;
          remaining -= took;
          moved += took;
          buf.set(res, buf.get(res)! - took);
        }
      }
      rt.rr = (rt.rr + 1) % count;
    }
    for (const [res, n] of buf) if (n <= 1e-9) buf.delete(res);
    return moved;
  }

  // ---------- Simulation ----------

  tick(ctx: TickContext): void {
    this.rebuild();
    const { dt } = ctx;

    // Strom aus dem letzten Tick
    let gen = 0;
    let demand = 0;
    for (const rt of this.order) {
      rt.stats = ctx.statsFor(rt);
      if (rt.def.power > 0) demand += rt.def.power * rt.stats.power * rt.load;
    }
    for (const rt of this.order) {
      const def = rt.def;
      if (!def.powerGen) continue;
      const capacity = def.powerGen * rt.stats.powerGen;
      if (def.fuel) {
        // Brennstoff proportional zur Last verbrauchen
        const load = demand > 0 ? Math.min(1, demand / Math.max(1, capacity)) : 0;
        const need = def.fuel.perSecond * rt.stats.fuelUse * Math.max(load, 0.05) * dt;
        const have = rt.inBuf.get(def.fuel.resource) ?? 0;
        const burn = Math.min(need, have);
        rt.inBuf.set(def.fuel.resource, have - burn);
        const fraction = need > 0 ? burn / need : 0;
        gen += capacity * fraction;
        rt.status = fraction > 0 ? 'working' : 'no_fuel';
        rt.activity = fraction * Math.max(load, 0.05);
      } else {
        gen += capacity;
        rt.status = 'working';
        rt.activity = demand > 0 ? Math.min(1, demand / Math.max(1, capacity)) : 0;
      }
    }
    if (ctx.flags.has('wasteHeat')) {
      // Abwärmenutzung: arbeitende Öfen speisen Strom ein
      for (const rt of this.order) if (rt.def.category === 'furnace') gen += 150 * rt.def.tier * rt.activity;
    }
    if (this.powerOverride > 0) this.powerOverride -= dt;
    const satisfaction = demand <= 0 || this.powerOverride > 0 ? 1 : Math.min(1, gen / demand);
    this.power = { gen, demand, satisfaction };
    this.zones = this.zones.filter((z) => (z.t -= dt) > 0);
    if (this.dilation.t > 0) this.dilation.t -= dt;
    const overload = ctx.flags.has('overloadGrid');

    let researchUnits = 0;
    for (const rt of this.order) {
      const def = rt.def;
      const powerFactor = def.power > 0 && !overload ? satisfaction : 1;
      if (overload && def.power > 0 && satisfaction < 1 && rt.activity > 0) {
        // Überlastnetz: Strommangel beschädigt Maschinen statt sie zu bremsen
        rt.entity.hp = Math.max(0, (rt.entity.hp ?? def.hp) - def.hp * 0.01 * (1 - satisfaction) * dt);
      }
      if (ctx.flags.has('overloadDrill') && def.category === 'drill') {
        rt.cycle += dt;
        if (rt.cycle >= 60) {
          rt.cycle = 0;
          rt.downtime = 5;
        }
      }
      if (rt.entity.hp !== undefined && rt.entity.hp <= 0) {
        // Zerstört: bleibt außer Betrieb, bis es repariert ist
        rt.status = 'disabled';
        rt.activity = 0;
        rt.load = 0;
        this.decayRate(rt, 0, dt);
        continue;
      }
      if (rt.downtime > 0) {
        rt.downtime -= dt;
        rt.status = 'disabled';
        rt.activity = 0;
        rt.load = 0;
        this.decayRate(rt, 0, dt);
        continue;
      }
      switch (def.category) {
        case 'belt':
        case 'splitter': {
          const moved = this.push(rt, rt.inBuf, def.speed * rt.stats.throughput * this.threat.beltFactor * dt, ctx);
          this.movedAcc += moved;
          rt.status = rt.inBuf.size > 0 ? (moved > 0 ? 'working' : 'output_blocked') : 'idle';
          this.decayRate(rt, moved / dt, dt);
          break;
        }
        case 'drill':
        case 'pump':
          this.tickExtractor(rt, ctx, powerFactor);
          break;
        case 'furnace':
        case 'assembler':
        case 'chemical':
          this.tickCrafter(rt, ctx, powerFactor);
          break;
        case 'lab':
          researchUnits += this.tickLab(rt, ctx, powerFactor);
          break;
        case 'terminal':
          this.tickTerminal(rt, ctx);
          break;
        default:
          break;
      }
    }
    if (researchUnits > 0) ctx.onResearch(researchUnits);

    if (ctx.rng && ctx.onKill) {
      this.threat.tick(this, { dt, rng: ctx.rng, flags: ctx.flags, statsFor: ctx.statsFor, onKill: ctx.onKill, powerFactor: overload ? 1 : satisfaction });
    }

    // Silos: arbeiten, solange Strom da ist
    for (const rt of this.order) {
      if (rt.def.category !== 'silo') continue;
      rt.load = 1;
      rt.activity = satisfaction > 0.5 ? 1 : 0;
      rt.status = rt.activity > 0 ? 'working' : 'no_power';
    }

    // Gleitende Durchschnitte der Inventaränderung
    const alpha = Math.min(1, dt / EMA_TAU);
    const keys = new Set([...this.netRates.keys(), ...this.netThisTick.keys()]);
    for (const res of keys) {
      const prev = this.netRates.get(res) ?? 0;
      const next = prev + ((this.netThisTick.get(res) ?? 0) / dt - prev) * alpha;
      if (Math.abs(next) < 1e-6 && !this.netThisTick.has(res)) this.netRates.delete(res);
      else this.netRates.set(res, next);
    }
    this.netThisTick.clear();
  }

  /** Geschwindigkeitsbonus durch Skills (Überladung, Zeitdilatation). */
  boost(rt: Runtime): number {
    let mult = this.dilation.t > 0 ? this.dilation.mult : 1;
    if (this.zones.length === 0) return mult;
    const cx = rt.entity.x + rt.def.w / 2;
    const cy = rt.entity.y + rt.def.h / 2;
    for (const z of this.zones) if (Math.hypot(cx - z.x, cy - z.y) <= z.r) mult *= z.mult;
    return mult;
  }

  private decayRate(rt: Runtime, value: number, dt: number): void {
    rt.rate += (value - rt.rate) * Math.min(1, dt / EMA_TAU);
  }

  private outputMultiplier(rt: Runtime): number {
    const s = rt.stats;
    return (1 + s.productivity) * (1 + s.critChance * (s.critMulti - 1));
  }

  private tickExtractor(rt: Runtime, ctx: TickContext, powerFactor: number): void {
    const { dt } = ctx;
    // Erst ausliefern, dann fördern
    this.push(rt, rt.outBuf, Infinity, ctx);
    if (!rt.ore) {
      rt.status = 'no_ore';
      rt.activity = 0;
      rt.load = 0;
      this.decayRate(rt, 0, dt);
      return;
    }
    const rate = rt.def.speed * rt.stats.speed * rt.coverage * ctx.planetSpeed * this.boost(rt);
    const cap = Math.max(4, rate * 2);
    const space = cap - total(rt.outBuf);
    const wanted = rate * powerFactor * dt;
    rt.load = rate > 0 ? Math.max(0, Math.min(rate * dt, space)) / (rate * dt) : 0;
    const amount = Math.max(0, Math.min(wanted, space));
    if (amount > 0) {
      const produced = amount * this.outputMultiplier(rt);
      addBuf(rt.outBuf, rt.ore, produced);
      ctx.onProduced(rt, rt.ore, produced);
    }
    rt.activity = rate > 0 ? amount / (rate * dt) : 0;
    rt.status = powerFactor <= 0.01 ? 'no_power' : amount < wanted * 0.5 ? 'output_blocked' : 'working';
    if (rt.targets.length === 0 && space <= 0) rt.status = 'output_blocked';
    this.decayRate(rt, amount / dt, dt);
  }

  private tickCrafter(rt: Runtime, ctx: TickContext, powerFactor: number): void {
    const { dt } = ctx;
    this.push(rt, rt.outBuf, Infinity, ctx);
    const def = rt.def;

    // Öfen wählen ihr Rezept anhand des Eingangs
    if (def.category === 'furnace') {
      if (!rt.recipe || !Object.keys(rt.recipe.inputs).every((r) => (rt.inBuf.get(r) ?? 0) > 0)) {
        let best: RecipeDef | null = null;
        let bestAmount = 0;
        for (const [res, n] of rt.inBuf) {
          const r = smeltingRecipeFor(res);
          if (r && n >= r.inputs[res] && n > bestAmount) {
            best = r;
            bestAmount = n;
          }
        }
        if (best) rt.recipe = best;
      }
    }

    const recipe = rt.recipe;
    if (!recipe || (def.category !== 'furnace' && !ctx.isUnlocked(recipe))) {
      rt.status = def.category === 'furnace' ? 'no_input' : 'no_recipe';
      rt.activity = 0;
      rt.load = 0;
      this.decayRate(rt, 0, dt);
      return;
    }

    const runsPerSec = ((def.speed * rt.stats.speed) / recipe.time) * ctx.planetSpeed * this.boost(rt);
    // Mögliche Durchläufe bei vollem Strom (Material und Platz begrenzen)
    let possible = runsPerSec * dt;
    for (const [res, n] of Object.entries(recipe.inputs)) possible = Math.min(possible, (rt.inBuf.get(res) ?? 0) / n);
    const mult = this.outputMultiplier(rt);
    const outCap = Math.max(2, runsPerSec * 2);
    for (const [res, n] of Object.entries(recipe.outputs)) {
      const space = n * mult * outCap - (rt.outBuf.get(res) ?? 0);
      possible = Math.min(possible, Math.max(0, space) / (n * mult));
    }
    possible = Math.max(0, possible);
    rt.load = runsPerSec > 0 ? possible / (runsPerSec * dt) : 0;
    const runs = Math.min(possible, runsPerSec * powerFactor * dt);

    if (runs > 0) {
      for (const [res, n] of Object.entries(recipe.inputs)) rt.inBuf.set(res, (rt.inBuf.get(res) ?? 0) - n * runs);
      for (const [res, n] of Object.entries(recipe.outputs)) {
        const produced = n * runs * mult;
        addBuf(rt.outBuf, res, produced);
        ctx.onProduced(rt, res, produced);
      }
    }
    const full = runsPerSec * dt;
    rt.activity = full > 0 ? runs / full : 0;
    if (powerFactor <= 0.01 && def.power > 0) rt.status = 'no_power';
    else if (runs >= full * powerFactor * 0.5) rt.status = 'working';
    else {
      const starved = Object.entries(recipe.inputs).some(([res, n]) => (rt.inBuf.get(res) ?? 0) < n);
      rt.status = starved ? 'no_input' : 'output_blocked';
    }
    this.decayRate(rt, runs / dt, dt);
  }

  private tickLab(rt: Runtime, ctx: TickContext, powerFactor: number): number {
    const { dt } = ctx;
    const job = ctx.research;
    if (!job) {
      rt.status = 'no_research';
      rt.activity = 0;
      rt.load = 0;
      this.decayRate(rt, 0, dt);
      return 0;
    }
    const unitsPerSec = ((rt.def.speed * rt.stats.speed) / job.unitTime) * ctx.planetSpeed * this.boost(rt);
    let possible = unitsPerSec * dt;
    for (const [res, n] of Object.entries(job.packs)) possible = Math.min(possible, (rt.inBuf.get(res) ?? 0) / n);
    possible = Math.max(0, possible);
    rt.load = unitsPerSec > 0 ? possible / (unitsPerSec * dt) : 0;
    const units = Math.min(possible, unitsPerSec * powerFactor * dt);
    for (const [res, n] of Object.entries(job.packs)) rt.inBuf.set(res, (rt.inBuf.get(res) ?? 0) - n * units);
    const full = unitsPerSec * dt;
    rt.activity = full > 0 ? units / full : 0;
    rt.status = powerFactor <= 0.01 ? 'no_power' : units >= full * powerFactor * 0.5 ? 'working' : 'no_input';
    this.decayRate(rt, units / dt, dt);
    // Produktivität wirkt bei Laboren als Bonus-Forschung
    return units * this.outputMultiplier(rt);
  }

  private tickTerminal(rt: Runtime, ctx: TickContext): void {
    const { dt } = ctx;
    this.push(rt, rt.outBuf, Infinity, ctx);
    const filter = rt.entity.filter;
    if (!filter) {
      rt.status = 'no_recipe';
      this.decayRate(rt, 0, dt);
      return;
    }
    const rate = rt.def.speed * rt.stats.throughput;
    const space = Math.max(2, rate) - total(rt.outBuf);
    const available = amountOf(this.state, filter).toNumber();
    const amount = Math.max(0, Math.min(rate * dt, space, available));
    if (amount > 0) {
      this.state.inventory[filter] = amountOf(this.state, filter).sub(amount);
      addBuf(rt.outBuf, filter, amount);
      addBuf(this.netThisTick, filter, -amount);
    }
    rt.status = amount > 0 ? 'working' : available <= 0 ? 'no_input' : 'output_blocked';
    this.decayRate(rt, amount / dt, dt);
  }

  /** Inventaränderung von außen (Fracht, Skills) für die Raten erfassen. */
  recordNet(res: string, amount: number): void {
    addBuf(this.netThisTick, res, amount);
  }

  // ---------- Abfragen für UI ----------

  get entities(): Runtime[] {
    return this.order;
  }

  bufferTotal(rt: Runtime): number {
    return total(rt.inBuf);
  }

  beltFill(rt: Runtime): number {
    return total(rt.inBuf) / this.beltCap(rt);
  }
}
