import { D, ZERO } from './bignum';
import { EventBus } from './events';
import { setNotation, type Notation } from './format';
import { Rng } from './rng';
import { clearLocal, exportSave, importSave, readLocal, writeLocal } from './save';
import { countProduced, createInitialState, planetSeed, type Dir, type GameState } from './state';
import { CONFIG } from '../data/config';
import { MACHINES } from '../data/machines';
import { PLANETS } from '../data/planets';
import { RECIPES } from '../data/recipes';
import { RESOURCES } from '../data/resources';
import { BASES, CURRENCY_BY_ID, RARITY_NAMES, UNIQUES } from '../data/items';
import { cancelCraft, enqueueCraft, tickHandcraft } from '../systems/handcraft';
import { addItem, amountOf } from '../systems/inventory';
import { countedOfflineTime, offlineGains, type OfflineResult } from '../systems/offline';
import { addResearchProgress, currentResearchJob, isRecipeUnlocked, startResearch } from '../systems/research';
import { generateTerrain, oreAt, type Terrain } from '../sim/terrain';
import { PlanetWorld, type EntityStats, type Runtime } from '../sim/world';
import { StatEngine } from '../engine/engine';
import { computeMachineStats } from '../engine/machineStats';
import type { SourcedModifier, StatId } from '../engine/types';
import { researchModifiers } from '../systems/research';
import { allocateNode, machineLevel, machineTreeFlags, machineTreeModifiers, refundNode, resetTree } from '../systems/machineTrees';
import { xpValue } from '../systems/levels';
import * as cmd from '../systems/commander';
import { foundColony, tickRoutes, type RouteFlow } from '../systems/logistics';
import * as items from '../systems/items';
import { entityTags } from '../engine/machineStats';
import type { Item, PlanetThreat } from './state';
import { BOSSES, ENEMIES, MAX_THREAT_TIER, THREAT_MODS, tierScale } from '../data/enemies';
import type { BossFight, Enemy } from '../sim/threats';
import { SKILLS, CHIP_LIST, HOTBAR_SIZE, type ChipId, type SkillId } from '../data/skills';
import * as skills from '../systems/skills';
import * as prestige from '../systems/prestige';
import * as paragon from '../systems/paragon';
import { OBJECTIVES } from '../data/objectives';
import * as bp from '../systems/blueprints';
import type { Blueprint, Loadout } from './state';
import { TREE_GROUP_NAMES, type TreeGroup } from '../data/machines';

const COMMANDER_TAGS: ReadonlySet<string> = new Set(['hand', 'commander']);

export interface Toast {
  icon: string;
  title: string;
  text: string;
}

export interface GameEvents extends Record<string, unknown> {
  toast: Toast;
  offline: OfflineResult;
  /** Soundeffekt (Name aus ui/sound.ts). */
  sfx: string;
}

export interface GameOptions {
  /** Spielstand aus localStorage laden/speichern. */
  persist?: boolean;
  now?: () => number;
  state?: GameState;
}

/** Hält Zustand, Simulation und Speichern zusammen. Die UI liest nur und ruft Aktionen auf. */
export class Game {
  state: GameState;
  rng: Rng;
  readonly bus = new EventBus<GameEvents>();
  /** Steigt bei jeder sichtbaren Änderung; die UI abonniert diesen Wert. */
  version = 0;
  /** Offline-Ergebnis, das die UI noch anzeigen soll. */
  pendingOffline: OfflineResult | null = null;
  readonly worlds = new Map<string, PlanetWorld>();
  /** Gleitender Durchschnitt der Forschungseinheiten pro Sekunde. */
  researchRate = 0;
  readonly engine = new StatEngine();
  readonly routeFlow: RouteFlow = { actual: new Map() };
  /** Kurze Effekte für die Anzeige (Explosionen, Felder). */
  fx: { planet: string; x: number; y: number; r: number; color: string; t: number; max: number }[] = [];
  private echoes: { skill: SkillId; planet: string; x: number; y: number; t: number }[] = [];
  /** Produktionsverlauf: alle 10 s die Netto-Raten aller Planeten (letzte 30 Minuten). */
  history: { t: number; rates: Record<string, number> }[] = [];
  private historyTimer = 0;

  private readonly persist: boolean;
  private readonly now: () => number;
  private listeners = new Set<() => void>();
  private lastFrame: number;
  private autosaveTimer = 0;
  private tickCounter = 0;
  private simAccumulator = 0;
  private interval: ReturnType<typeof setInterval> | null = null;
  /** Produktion wird gesammelt und einmal pro Sekunde in die Statistik übernommen. */
  private producedAcc = new Map<string, number>();
  private flushTimer = 0;
  private researchThisStep = 0;
  /** Gesammelte Maschinen-Erfahrung (wird mit der Produktion übernommen). */
  private xpAcc = new Map<string, number>();

  constructor(options: GameOptions = {}) {
    this.persist = options.persist ?? true;
    this.now = options.now ?? Date.now;
    this.state = options.state ?? ((this.persist && readLocal()) || createInitialState(this.now()));
    this.rng = new Rng(this.state.rngState);
    setNotation(this.state.settings.notation);
    this.registerProviders();
    this.initWorlds();
    this.refreshStats();
    this.lastFrame = this.now();
    this.applyOffline((this.now() - this.state.savedAt) / 1000);
  }

  private initWorlds(): void {
    this.worlds.clear();
    for (const planet of Object.values(this.state.planets)) {
      const terrain = generateTerrain(planet.id, planet.seed);
      const world = new PlanetWorld(planet, terrain);
      for (const [res, rate] of Object.entries(this.state.rates.planets[planet.id] ?? {})) world.netRates.set(res, rate);
      this.worlds.set(planet.id, world);
    }
    this.researchRate = this.state.rates.research;
  }

  /** Aktuelle Raten in den Zustand übernehmen (für Offline-Fortschritt nach dem Laden). */
  private storeRates(): void {
    this.state.rates.research = this.researchRate;
    for (const [id, world] of this.worlds) this.state.rates.planets[id] = Object.fromEntries(world.netRates);
  }

  // ---------- Zugriff ----------

  get planet() {
    return this.state.planets[this.state.activePlanet];
  }

  get world(): PlanetWorld {
    return this.worlds.get(this.state.activePlanet)!;
  }

  get terrain(): Terrain {
    return this.world.terrain;
  }

  isRecipeUnlocked = (recipeId: string): boolean => {
    const recipe = RECIPES[recipeId];
    return !!recipe && isRecipeUnlocked(this.state, recipe);
  };

  // ---------- Werte ----------

  /** Quellen für Modifier registrieren. Spätere Systeme hängen sich hier an. */
  protected registerProviders(): void {
    this.engine.addProvider(() => researchModifiers(this.state));
    this.engine.addProvider(() => machineTreeModifiers(this.state));
    this.engine.addFlagProvider(() => machineTreeFlags(this.state));
    this.engine.addProvider(() => cmd.commanderModifiers(this.state));
    this.engine.addFlagProvider(() => cmd.commanderFlags(this.state));
    this.engine.addProvider(() => items.equippedGlobalModifiers(this.state));
    this.engine.addProvider(() => prestige.prestigeModifiers(this.state));
    this.engine.addProvider(() => paragon.paragonModifiers(this.state));
    this.engine.addFlagProvider(() => items.equippedGlobalFlags(this.state));
    this.engine.addProvider(() => {
      const mods: SourcedModifier[] = [];
      for (const id of Object.keys(this.state.planets)) {
        for (const m of PLANETS[id].modifiers ?? []) {
          mods.push({ ...m, tags: [...(m.tags ?? []), `planet:${id}`], source: `Umwelt: ${PLANETS[id].name}` });
        }
      }
      return mods;
    });
  }

  /** Alle Modifier neu einlesen (nach Forschung, Skillpunkten, Ausrüstung …). */
  refreshStats(): void {
    this.engine.refresh();
    for (const world of this.worlds.values()) {
      world.drillAnywhere = this.engine.has('planetCore');
      world.markDirty();
    }
  }

  /** Eingesetzte Module einer Maschine. */
  modulesOf(rt: Runtime): Item[] {
    return (rt.entity.modules ?? []).map((id) => this.state.loot.items[id]).filter((i): i is Item => !!i);
  }

  /** Anzahl Modulsockel (Grundwert + Baum + Module wie „Lebende Legierung“). */
  moduleSlots(world: PlanetWorld, rt: Runtime): number {
    if (rt.def.moduleSlots === 0 && !['drill', 'pump', 'furnace', 'assembler', 'chemical', 'lab', 'generator', 'turret'].includes(rt.def.category)) return 0;
    let slots = rt.def.moduleSlots + this.engine.value('moduleSlots', entityTags(world, rt), 0);
    for (const item of this.modulesOf(rt)) for (const m of items.itemMods(item)) if (m.stat === 'moduleSlots' && m.kind === 'flat') slots += m.value;
    return Math.floor(slots);
  }

  /** Modifier aus Modulen einer Maschine. */
  moduleModifiers(rt: Runtime, world: PlanetWorld = this.world): { mods: SourcedModifier[]; emptySockets: number } {
    const slots = this.moduleSlots(world, rt);
    if (this.engine.has('ironDiscipline')) return { mods: [], emptySockets: slots };
    const equipped = this.modulesOf(rt);
    const mods: SourcedModifier[] = [];
    for (const item of equipped) for (const m of items.itemMods(item)) if (m.stat !== 'moduleSlots') mods.push({ ...m, source: item.name });
    return { mods, emptySockets: Math.max(0, slots - equipped.length) };
  }

  /** Effektive Werte einer Maschine (gecacht, bis sich Modifier oder Layout ändern). */
  statsFor = (world: PlanetWorld, rt: Runtime): EntityStats => {
    const key = `${this.engine.version}:${world.layoutVersion}:${rt.recipe?.id ?? ''}:${rt.ore ?? ''}:${rt.entity.modules?.join(',') ?? ''}`;
    if (rt.statsKey === key) return rt.stats;
    const { mods, emptySockets } = this.moduleModifiers(rt, world);
    rt.stats = computeMachineStats({ engine: this.engine, world, rt, moduleMods: mods, emptySockets });
    rt.statsKey = key;
    return rt.stats;
  };

  /** Globaler Kommandanten-Wert (Handabbau, Offline …). */
  commanderStat(stat: StatId, base: number): number {
    return this.engine.value(stat, COMMANDER_TAGS, base);
  }

  handMinePower(): number {
    return this.commanderStat('handMine', CONFIG.handMine);
  }

  handCraftSpeed(): number {
    return this.commanderStat('handCraft', CONFIG.handCraft);
  }

  // ---------- Schleife ----------

  start(): void {
    if (this.interval) return;
    this.lastFrame = this.now();
    this.interval = setInterval(() => this.frame(), 1000 / CONFIG.tickRate);
    if (this.persist && typeof window !== 'undefined') {
      window.addEventListener('beforeunload', this.save);
      document.addEventListener('visibilitychange', this.onVisibility);
    }
  }

  stop(): void {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', this.save);
      document.removeEventListener('visibilitychange', this.onVisibility);
    }
  }

  private onVisibility = () => {
    if (document.visibilityState === 'hidden') this.save();
  };

  private frame(): void {
    const now = this.now();
    const elapsed = (now - this.lastFrame) / 1000;
    this.lastFrame = now;
    if (elapsed <= 0) return;

    if (elapsed > CONFIG.offlineThreshold) {
      // z. B. Rechner im Ruhezustand – wie Offline-Zeit behandeln
      this.applyOffline(elapsed);
    } else {
      this.advance(elapsed);
    }

    this.autosaveTimer += elapsed;
    if (this.persist && this.autosaveTimer >= CONFIG.autosaveInterval) this.save();
    if (++this.tickCounter % 2 === 0) this.notify();
  }

  /** Simuliert `seconds` Sekunden in festen Schritten. */
  advance(seconds: number): void {
    this.simAccumulator += seconds;
    // Gedrosselte Hintergrund-Tabs: höchstens 2 s pro Aufruf nachholen
    this.simAccumulator = Math.min(this.simAccumulator, 2);
    while (this.simAccumulator >= CONFIG.simStep) {
      this.simAccumulator -= CONFIG.simStep;
      this.step(CONFIG.simStep);
    }
  }

  /** Ein Simulationsschritt über `dt` Sekunden. */
  step(dt: number): void {
    const s = this.state;
    s.playTime += dt;
    const research = currentResearchJob(s);
    this.researchThisStep = 0;
    for (const world of this.worlds.values()) {
      world.tick({
        dt,
        isUnlocked: (r) => isRecipeUnlocked(s, r),
        research,
        statsFor: (rt) => this.statsFor(world, rt),
        onProduced: (rt, res, n) => {
          this.producedAcc.set(res, (this.producedAcc.get(res) ?? 0) + n);
          if (rt.def.tree) this.addXp(rt.def.tree, n * xpValue(RESOURCES[res]?.tier ?? 0));
        },
        onResearch: (units) => (this.researchThisStep += units),
        planetSpeed: 1,
        flags: this.engine.flags,
        rng: this.rng,
        onKill: (enemy, fight) => this.onEnemyKilled(world, enemy, fight),
      });
      this.tickWaves(world, dt);
    }
    if (this.researchThisStep > 0) {
      this.addResearch(this.researchThisStep);
      this.addXp('lab', this.researchThisStep * 5);
    }
    for (const world of this.worlds.values()) {
      if (world.power.gen > 0) this.addXp('generator', world.power.gen * dt * 0.002);
      if (world.movedAcc > 0) {
        this.addXp('logistics', world.movedAcc * 0.05);
        world.movedAcc = 0;
      }
    }
    this.researchRate += (this.researchThisStep / dt - this.researchRate) * Math.min(1, dt / 5);

    if (s.routes.length) tickRoutes(s, this.worlds, dt, this.commanderStat('cargoCapacity', 1), this.routeFlow);

    for (const id of tickHandcraft(s, dt, this.handCraftSpeed())) {
      const out = Object.keys(RECIPES[id].outputs)[0];
      if (RESOURCES[out]?.category === 'building') this.notify();
    }

    this.tickMeteor(dt);
    this.tickSkills(dt);
    this.historyTimer += dt;
    if (this.historyTimer >= 10) this.sampleHistory();

    this.flushTimer += dt;
    if (this.flushTimer >= 1) this.flushProduced();
  }

  private sampleHistory(): void {
    this.historyTimer = 0;
    const rates: Record<string, number> = {};
    for (const world of this.worlds.values()) for (const [res, n] of world.netRates) if (n > 0) rates[res] = (rates[res] ?? 0) + n;
    this.history.push({ t: this.state.playTime, rates });
    if (this.history.length > 180) this.history.shift();
  }

  // ---------- Aktive Skills ----------

  skillValues(): skills.CommanderValues {
    return {
      skillEffect: this.commanderStat('skillEffect', 1),
      skillArea: this.commanderStat('skillArea', 1),
      skillDuration: this.commanderStat('skillDuration', 1),
      cooldownRecovery: this.commanderStat('cooldownRecovery', 1),
    };
  }

  energyMax(): number {
    return this.commanderStat('energyMax', 100);
  }

  energyRegen(): number {
    return this.commanderStat('energyRegen', 2);
  }

  skillParams(skill: SkillId): skills.SkillParams {
    return skills.skillParams(this.state, skill, this.skillValues());
  }

  skillUnlocked(skill: SkillId): boolean {
    return cmd.commanderLevel(this.state).level >= SKILLS[skill].level;
  }

  /** Grund, warum ein Skill gerade nicht geht, oder null. */
  skillBlocked(skill: SkillId): string | null {
    if (!this.skillUnlocked(skill)) return `Ab Kommandanten-Level ${SKILLS[skill].level}`;
    if ((this.state.skills.cooldowns[skill] ?? 0) > 0) return 'Lädt nach';
    if (this.state.skills.energy < this.skillParams(skill).cost) return 'Zu wenig Energie';
    return null;
  }

  castSkill(skill: SkillId, x = 0, y = 0): string | null {
    const blocked = this.skillBlocked(skill);
    if (blocked) return blocked;
    const p = this.skillParams(skill);
    this.state.skills.energy -= p.cost;
    this.state.skills.cooldowns[skill] = p.cooldown;
    this.applySkill(skill, this.state.activePlanet, x, y, p.effect, p);
    this.bus.emit('sfx', 'skill');
    if (skills.chipsOf(this.state, skill).includes('echo')) this.echoes.push({ skill, planet: this.state.activePlanet, x, y, t: 2 });
    this.notify();
    return null;
  }

  private applySkill(skill: SkillId, planet: string, x: number, y: number, effect: number, p: skills.SkillParams): void {
    const world = this.worlds.get(planet);
    if (!world) return;
    const level = cmd.commanderLevel(this.state).level;
    switch (skill) {
      case 'orbital': {
        const damage = 300 * 1.15 ** (level - 1) * effect;
        const hit = world.threat.enemies.filter((e) => Math.hypot(e.x - x, e.y - y) <= p.radius + e.def.size);
        for (const e of hit) world.threat.hit(e, damage, 'plasma', 0);
        if (hit.length === 0) {
          // Kein Gegner: Erz aus dem Boden sprengen
          const t = world.terrain;
          const r = Math.ceil(p.radius);
          for (let ty = Math.floor(y) - r; ty <= Math.floor(y) + r; ty++) {
            for (let tx = Math.floor(x) - r; tx <= Math.floor(x) + r; tx++) {
              if (Math.hypot(tx + 0.5 - x, ty + 0.5 - y) > p.radius) continue;
              const ore = oreAt(t, tx, ty);
              if (!ore || RESOURCES[ore].category === 'fluid') continue;
              const amount = this.handMinePower() * 3 * effect;
              addItem(world.state, ore, D(amount));
              countProduced(this.state, ore, amount);
            }
          }
        }
        this.fx.push({ planet, x, y, r: p.radius, color: '255,122,217', t: 0.6, max: 0.6 });
        break;
      }
      case 'overcharge':
        world.zones.push({ x, y, r: p.radius, mult: 1 + 2 * effect, t: p.duration });
        this.fx.push({ planet, x, y, r: p.radius, color: '79,209,255', t: p.duration, max: p.duration });
        break;
      case 'meteor_call':
        this.state.loot.meteor = { planet, x: Math.floor(x), y: Math.floor(y), ttl: 30 };
        break;
      case 'drone_swarm':
        for (const rt of world.entities) {
          if (rt.entity.hp === undefined) continue;
          const max = rt.def.hp * rt.stats.hp;
          rt.entity.hp = Math.min(max, rt.entity.hp + max * 0.5 * effect);
          if (rt.entity.hp >= max) rt.entity.hp = undefined;
        }
        if (this.state.loot.meteor?.planet === planet && planet === this.state.activePlanet) this.clickMeteor();
        break;
      case 'emergency_power':
        world.powerOverride = Math.max(world.powerOverride, p.duration);
        break;
      case 'time_dilation':
        world.dilation = { t: p.duration, mult: 1 + effect };
        break;
      case 'stasis':
        for (const e of world.threat.enemies) if (Math.hypot(e.x - x, e.y - y) <= p.radius + e.def.size) e.stasis = Math.max(e.stasis, p.duration);
        this.fx.push({ planet, x, y, r: p.radius, color: '179,136,255', t: p.duration, max: p.duration });
        break;
    }
  }

  private tickSkills(dt: number): void {
    const sk = this.state.skills;
    const max = this.energyMax();
    sk.energy = Math.min(max, sk.energy + this.energyRegen() * dt);
    for (const id of Object.keys(sk.cooldowns)) sk.cooldowns[id] = Math.max(0, sk.cooldowns[id] - dt);
    this.fx = this.fx.filter((f) => (f.t -= dt) > 0);

    // Echo: Wiederholung mit 60 % Wirkung
    for (const echo of this.echoes) echo.t -= dt;
    for (const echo of this.echoes.filter((e) => e.t <= 0)) {
      const p = this.skillParams(echo.skill);
      this.applySkill(echo.skill, echo.planet, echo.x, echo.y, p.effect * 0.6, p);
    }
    this.echoes = this.echoes.filter((e) => e.t > 0);

    // Automatik-Auslöser
    for (const id of sk.hotbar) {
      if (!id) continue;
      const skill = id as SkillId;
      if (!skills.chipsOf(this.state, skill).includes('auto') || this.skillBlocked(skill)) continue;
      if (sk.energy < max * 0.95) continue;
      const target = this.autoTarget(skill);
      if (target) this.castSkill(skill, target[0], target[1]);
    }
  }

  /** Ziel für automatisch ausgelöste Skills. */
  private autoTarget(skill: SkillId): [number, number] | null {
    const world = this.world;
    if (!SKILLS[skill].targeted) return [0, 0];
    const enemy = world.threat.enemies[0];
    if ((skill === 'orbital' || skill === 'stasis') && enemy) return [enemy.x, enemy.y];
    if (skill === 'stasis') return null;
    const producers = world.entities.filter((rt) => rt.status === 'working' && ['drill', 'furnace', 'assembler', 'chemical', 'lab'].includes(rt.def.category));
    if (skill === 'overcharge' || skill === 'orbital') {
      if (skill === 'orbital') {
        // Erzfeld in Kapselnähe
        const t = world.terrain;
        for (let k = 0; k < 30; k++) {
          const x = Math.floor(this.rng.range(1, t.width - 1));
          const y = Math.floor(this.rng.range(1, t.height - 1));
          const ore = oreAt(t, x, y);
          if (ore && RESOURCES[ore].category !== 'fluid' && !world.entityAt(x, y)) return [x + 0.5, y + 0.5];
        }
        return null;
      }
      if (!producers.length) return null;
      const rt = producers[Math.floor(this.rng.next() * producers.length)];
      return [rt.entity.x + rt.def.w / 2, rt.entity.y + rt.def.h / 2];
    }
    if (skill === 'meteor_call') {
      const t = world.terrain;
      const x = Math.floor(this.rng.range(2, t.width - 2));
      const y = Math.floor(this.rng.range(2, t.height - 2));
      return world.entityAt(x, y) ? null : [x, y];
    }
    return null;
  }

  socketChip(skill: SkillId, chip: ChipId): string | null {
    const err = skills.socketChip(this.state, skill, chip);
    this.notify();
    return err;
  }

  unsocketChip(skill: SkillId, chip: ChipId): void {
    skills.unsocketChip(this.state, skill, chip);
    this.notify();
  }

  setHotbar(slot: number, skill: SkillId | null): void {
    if (slot < 0 || slot >= HOTBAR_SIZE) return;
    skills.setHotbar(this.state, slot, skill);
    this.notify();
  }

  grantChip(count = 1): void {
    for (let i = 0; i < count; i++) {
      const chip = CHIP_LIST[Math.floor(this.rng.next() * CHIP_LIST.length)];
      this.state.skills.chips[chip.id] = (this.state.skills.chips[chip.id] ?? 0) + 1;
      this.toast({ icon: chip.icon, title: 'Erweiterungschip', text: chip.name });
    }
  }

  // ---------- Blaupausen ----------

  createBlueprint(x0: number, y0: number, x1: number, y1: number): Blueprint | null {
    const captured = bp.captureBlueprint(this.world, x0, y0, x1, y1);
    if (!captured) return null;
    const blueprint: Blueprint = { id: bp.nextBlueprintId(this.state), name: `Blaupause ${this.state.blueprints.length + 1}`, ...captured };
    this.state.blueprints.push(blueprint);
    this.notify();
    return blueprint;
  }

  /** Platziert eine Blaupause. Gebäude ohne Item im Inventar oder ohne Platz werden übersprungen. */
  pasteBlueprint(id: number, x: number, y: number, rot: number): { placed: number; skipped: number } {
    const blueprint = this.state.blueprints.find((b) => b.id === id);
    if (!blueprint) return { placed: 0, skipped: 0 };
    const rotated = bp.rotateBlueprint(blueprint, rot);
    let placed = 0;
    let skipped = 0;
    for (const e of rotated.entities) {
      if (this.build(e.type, x + e.dx, y + e.dy, e.rot)) {
        skipped++;
        continue;
      }
      placed++;
      const entity = this.world.entityAt(x + e.dx, y + e.dy);
      if (entity && e.recipe) this.world.setRecipe(entity.id, e.recipe);
      if (entity && e.filter) this.world.setFilter(entity.id, e.filter);
    }
    this.notify();
    return { placed, skipped };
  }

  renameBlueprint(id: number, name: string): void {
    const b = this.state.blueprints.find((x) => x.id === id);
    if (b && name.trim()) b.name = name.trim().slice(0, 40);
    this.notify();
  }

  deleteBlueprint(id: number): void {
    this.state.blueprints = this.state.blueprints.filter((b) => b.id !== id);
    this.notify();
  }

  importBlueprint(code: string): Blueprint {
    const b = bp.decodeBlueprint(this.state, code);
    this.state.blueprints.push(b);
    this.notify();
    return b;
  }

  // ---------- Loadouts (Build-Konfigurationen) ----------

  saveLoadout(name: string): void {
    const c = this.state.commander;
    const loadout: Loadout = {
      name: name.trim().slice(0, 40) || `Loadout ${this.state.loadouts.length + 1}`,
      commander: { classId: c.classId, ascendancy: c.ascendancy, allocated: [...c.allocated], ascAllocated: [...c.ascAllocated], masteries: { ...c.masteries } },
      machines: Object.fromEntries(Object.entries(this.state.machines.allocated).map(([g, a]) => [g, [...a]])),
    };
    this.state.loadouts = [...this.state.loadouts.filter((l) => l.name !== loadout.name), loadout];
    this.notify();
  }

  /** Übernimmt ein Loadout, falls die Punkte reichen. Gibt eine Fehlermeldung oder null zurück. */
  applyLoadout(loadout: Loadout): string | null {
    const level = cmd.commanderLevel(this.state).level;
    if (loadout.commander.allocated.length - 1 > level) return `Benötigt Kommandanten-Level ${loadout.commander.allocated.length - 1}`;
    if (loadout.commander.ascendancy && loadout.commander.ascAllocated.length - 1 > cmd.ascendancyPoints(this.state)) return 'Zu wenige Aszendenzpunkte';
    if (loadout.commander.ascendancy && level < cmd.ASCENDANCY_UNLOCK) return 'Aszendenz noch nicht verfügbar';
    for (const [group, nodes] of Object.entries(loadout.machines)) {
      if (nodes.length - 1 > machineLevel(this.state, group as TreeGroup).level) return `Zu wenige Punkte im Baum „${TREE_GROUP_NAMES[group as TreeGroup]}“`;
    }
    const c = this.state.commander;
    c.classId = loadout.commander.classId;
    c.ascendancy = loadout.commander.ascendancy;
    c.allocated = [...loadout.commander.allocated];
    c.ascAllocated = [...loadout.commander.ascAllocated];
    c.masteries = { ...loadout.commander.masteries };
    this.state.machines.allocated = Object.fromEntries(Object.entries(loadout.machines).map(([g, a]) => [g, [...a]]));
    this.refreshStats();
    this.notify();
    return null;
  }

  deleteLoadout(name: string): void {
    this.state.loadouts = this.state.loadouts.filter((l) => l.name !== name);
    this.notify();
  }

  exportLoadout(loadout: Loadout): string {
    return btoa(unescape(encodeURIComponent(JSON.stringify(loadout))));
  }

  importLoadout(code: string): Loadout {
    const raw = JSON.parse(decodeURIComponent(escape(atob(code.trim())))) as Loadout;
    if (!raw?.commander || !Array.isArray(raw.commander.allocated) || typeof raw.machines !== 'object') throw new Error('Ungültiger Build-Code');
    this.state.loadouts = [...this.state.loadouts.filter((l) => l.name !== raw.name), raw];
    this.notify();
    return raw;
  }

  // ---------- Endgame ----------

  starJump(): string | null {
    if (prestige.darkEnergyGain(this.state) < 1) return 'Noch nicht genug Imperiumswert';
    const gain = prestige.darkEnergyGain(this.state);
    this.replaceState(prestige.starJump(this.state, this.rng, this.now()));
    this.toast({ icon: '🌌', title: 'Sternensprung', text: `+${gain} Dunkle Energie – willkommen in einem neuen System` });
    return null;
  }

  buyDarkUpgrade(id: string): string | null {
    const err = prestige.buyDarkUpgrade(this.state, id);
    if (!err) this.refreshStats();
    this.notify();
    return err;
  }

  allocateParagon(tile: string): number {
    const n = paragon.allocateParagon(this.state, tile);
    if (n) this.refreshStats();
    this.notify();
    return n;
  }

  setGlyph(board: number, glyph: string | null): string | null {
    const err = paragon.setGlyph(this.state, board, glyph);
    if (!err) this.refreshStats();
    this.notify();
    return err;
  }

  resetParagon(): void {
    paragon.resetParagon(this.state);
    this.refreshStats();
    this.notify();
  }

  // ---------- Bedrohung ----------

  threatOf(planet: string): PlanetThreat {
    return (this.state.threats[planet] ??= { timer: 300, waves: 0, kills: 0, maxTier: 1, bossKills: 0 });
  }

  /** Wellen beginnen erst mit einer gewissen Fabrikgröße und nach „Verteidigung“ bzw. 45 Minuten. */
  threatsActive(world: PlanetWorld): boolean {
    if (this.state.settings.peaceful) return false;
    const buildings = world.entities.filter((rt) => rt.def.category !== 'belt' && rt.def.category !== 'splitter' && rt.def.category !== 'hub').length;
    return buildings >= 20 && (this.state.research.done.has('defense') || this.state.playTime > 45 * 60);
  }

  waveLevel(world: PlanetWorld): number {
    const t = this.threatOf(world.state.id);
    const size = world.entities.length;
    return 1 + Math.floor(t.waves / 3) + Math.floor(size / 60) + Object.keys(PLANETS).indexOf(world.state.id) * 2;
  }

  private tickWaves(world: PlanetWorld, dt: number): void {
    if (!this.threatsActive(world) || world.threat.active) return;
    const t = this.threatOf(world.state.id);
    t.timer -= dt * (PLANETS[world.state.id].threatRate ?? 1);
    if (t.timer > 0) return;
    t.timer = this.rng.range(240, 420);
    t.waves++;
    const level = this.waveLevel(world);
    const count = 2 + Math.floor(level * 1.5);
    const enemy = PLANETS[world.state.id].enemy;
    for (let i = 0; i < count; i++) world.threat.spawn(world, enemy, tierScale(level), this.rng);
    this.toast({ icon: ENEMIES[enemy].icon, title: `Angriff auf ${PLANETS[world.state.id].name}!`, text: `${count}× ${ENEMIES[enemy].name} (Stufe ${level})` }, 'alarm');
  }

  private onEnemyKilled(world: PlanetWorld, enemy: Enemy, fight: BossFight | null): void {
    const t = this.threatOf(world.state.id);
    t.kills++;
    this.addXp('turret', enemy.maxHp / 10);
    if (enemy.boss && fight) {
      t.bossKills++;
      t.maxTier = Math.min(MAX_THREAT_TIER, Math.max(t.maxTier, fight.tier + 1));
      this.addCommanderXp(enemy.maxHp / 5);
      this.toast({ icon: '🏆', title: `${enemy.boss.name} besiegt!`, text: `Bedrohungsstufe ${fight.tier} · Stufe ${t.maxTier} freigeschaltet` });
      const bonus = 1 + fight.lootBonus / 100;
      this.grantLoot({
        items: (3 + fight.tier / 2) * bonus,
        currency: Math.round((4 + fight.tier) * bonus),
        uniqueChance: Math.min(1, 0.4 + fight.tier * 0.04),
        boss: enemy.boss.id,
        ilvlBonus: fight.tier * 3,
      });
      this.grantChip(1);
      return;
    }
    this.addCommanderXp(enemy.maxHp / 40);
    if (this.rng.chance(0.03)) this.grantLoot({ items: 1 });
    else if (this.rng.chance(0.06)) this.grantLoot({ currency: 1 });
  }

  /** Beschwört den Boss des aktiven Planeten mit einer Signalbake. */
  summonBoss(tier: number, mods: string[]): string | null {
    const world = this.world;
    const t = this.threatOf(world.state.id);
    if (world.threat.fight) return 'Ein Boss ist bereits aktiv';
    if (tier < 1 || tier > t.maxTier) return 'Diese Bedrohungsstufe ist noch gesperrt';
    if (amountOf(this.planet, 'signal_beacon').lt(1)) return 'Keine Signalbake im Inventar';
    this.planet.inventory.signal_beacon = amountOf(this.planet, 'signal_beacon').sub(1);
    const bossId = Object.values(BOSSES).find((b) => b.planet === world.state.id)!.id;
    const lootBonus = mods.reduce((s, id) => s + (THREAT_MODS.find((m) => m.id === id)?.loot ?? 0), 0) + (tier - 1) * 10;
    world.threat.startBoss(world, { bossId, tier, mods, lootBonus }, this.rng);
    this.toast({ icon: BOSSES[bossId].icon, title: `${BOSSES[bossId].name} erscheint!`, text: BOSSES[bossId].mechanicText }, 'boss');
    this.notify();
    return null;
  }

  // ---------- Meteoriten (Beutequelle wie der goldene Keks) ----------

  private tickMeteor(dt: number): void {
    const loot = this.state.loot;
    if (loot.meteor) {
      loot.meteor.ttl -= dt;
      if (loot.meteor.ttl <= 0) {
        loot.meteor = null;
        this.notify();
      }
      return;
    }
    loot.meteorTimer -= dt;
    if (loot.meteorTimer > 0) return;
    loot.meteorTimer = this.rng.range(90, 240) / this.commanderStat('meteorFrequency', 1);
    const world = this.world;
    const t = world.terrain;
    for (let tries = 0; tries < 40; tries++) {
      const x = Math.floor(this.rng.range(2, t.width - 2));
      const y = Math.floor(this.rng.range(2, t.height - 2));
      if (world.entityAt(x, y)) continue;
      loot.meteor = { planet: this.state.activePlanet, x, y, ttl: 30 };
      this.toast({ icon: '☄️', title: 'Meteoriteneinschlag!', text: 'Klicke ihn an, bevor er verglüht.' });
      this.notify();
      return;
    }
  }

  /** Item-Level für Beute: Kommandanten-Level, leicht erhöht auf späten Planeten. */
  lootLevel(bonus = 0): number {
    const planetIndex = Math.max(0, Object.keys(PLANETS).indexOf(this.state.activePlanet));
    return Math.min(100, cmd.commanderLevel(this.state).level + planetIndex * 5 + bonus);
  }

  /** Beute vergeben und melden. */
  grantLoot(opts: { items?: number; currency?: number; uniqueChance?: number; boss?: string; ilvlBonus?: number }): Item[] {
    const quantity = 1 + this.commanderStat('lootQuantity', 0) / 100;
    const rarity = this.commanderStat('lootRarity', 0);
    const dropped: Item[] = [];
    let itemCount = opts.items ?? 0;
    // Bruchteile über Zufall
    itemCount = Math.floor(itemCount * quantity) + (this.rng.chance((itemCount * quantity) % 1) ? 1 : 0);
    for (let i = 0; i < itemCount; i++) dropped.push(items.dropItem(this.state, this.rng, this.lootLevel(opts.ilvlBonus), rarity));
    if (opts.uniqueChance && this.rng.chance(opts.uniqueChance)) {
      const pool = Object.values(UNIQUES).filter((u) => (opts.boss ? u.boss === opts.boss : !u.boss));
      if (pool.length) dropped.push(items.createItem(this.state, this.rng, { ilvl: this.lootLevel(opts.ilvlBonus), unique: pool[Math.floor(this.rng.next() * pool.length)].id }));
    }
    const currencyCount = Math.round((opts.currency ?? 0) * quantity);
    const gained = items.dropCurrency(this.rng, currencyCount);
    for (const [c, n] of Object.entries(gained)) this.state.loot.currency[c] = (this.state.loot.currency[c] ?? 0) + n;
    for (const item of dropped) this.toast({ icon: BASES[item.base].icon, title: `${RARITY_NAMES[item.rarity]}: ${item.name}`, text: `Item-Level ${item.ilvl}` }, 'loot');
    if (currencyCount > 0) this.toast({ icon: '💰', title: 'Währung', text: Object.entries(gained).map(([c, n]) => `${n}× ${CURRENCY_BY_ID[c].name}`).join(', ') });
    return dropped;
  }

  clickMeteor(): boolean {
    const m = this.state.loot.meteor;
    if (!m || m.planet !== this.state.activePlanet) return false;
    this.state.loot.meteor = null;
    // Erze: Grundmenge plus eine Minute der aktuellen Rohstoffproduktion
    const world = this.world;
    const ores = world.terrain.resources.filter((r) => RESOURCES[r].category === 'ore');
    let rate = 0;
    for (const [res, n] of world.netRates) if (n > 0 && RESOURCES[res]?.category === 'ore') rate += n;
    const per = Math.round(25 + (rate * 60) / Math.max(1, ores.length));
    for (const ore of ores) {
      addItem(this.planet, ore, D(per));
    }
    this.toast({ icon: '☄️', title: 'Meteorit geborgen', text: `+${per} von jedem Erz des Planeten` });
    this.grantLoot({ items: this.rng.chance(0.6) ? 1 : 0, currency: 1 + Math.floor(this.rng.next() * 3), uniqueChance: 0.03 });
    if (this.rng.chance(0.12)) this.grantChip(1);
    this.notify();
    return true;
  }

  // ---------- Items ----------

  private itemsChanged(): void {
    this.refreshStats();
    this.notify();
  }

  applyCurrency(itemId: string, currency: string, temperCategory?: string): items.CraftResult {
    const r = items.applyCurrency(this.state, this.rng, itemId, currency, temperCategory);
    if (r.ok) this.itemsChanged();
    return r;
  }

  salvageItem(itemId: string): items.CraftResult {
    const r = items.salvageItem(this.state, this.rng, itemId);
    if (r.ok) this.itemsChanged();
    return r;
  }

  extractAspect(itemId: string): items.CraftResult {
    const r = items.extractAspect(this.state, itemId);
    if (r.ok) this.itemsChanged();
    return r;
  }

  imprintAspect(itemId: string, aspect: string): items.CraftResult {
    const r = items.imprintAspect(this.state, itemId, aspect);
    if (r.ok) this.itemsChanged();
    return r;
  }

  equipModule(itemId: string, entityId: number): items.CraftResult {
    const rt = this.world.runtimes.get(entityId);
    if (!rt) return { ok: false, message: 'Maschine nicht gefunden' };
    if (this.engine.has('ironDiscipline')) return { ok: false, message: 'Eiserne Disziplin verbietet Module' };
    const r = items.equipModule(this.state, itemId, this.state.activePlanet, entityId, this.moduleSlots(this.world, rt));
    if (r.ok) this.itemsChanged();
    return r;
  }

  unequipItem(itemId: string): void {
    items.unequip(this.state, itemId);
    this.itemsChanged();
  }

  socketJewel(itemId: string, node: string): items.CraftResult {
    const r = items.socketJewel(this.state, itemId, node);
    if (r.ok) this.itemsChanged();
    return r;
  }

  setArtifact(itemId: string, slot: number): items.CraftResult {
    const r = items.setArtifact(this.state, itemId, slot);
    if (r.ok) this.itemsChanged();
    return r;
  }

  private flushProduced(): void {
    this.flushTimer = 0;
    for (const [res, n] of this.producedAcc) {
      countProduced(this.state, res, n);
      this.state.run.value += n * xpValue(RESOURCES[res]?.tier ?? 0);
    }
    this.producedAcc.clear();
    this.flushXp();
    this.checkObjectives();
  }

  /** Abgeschlossene Ziele erkennen und belohnen (der Reihe nach). */
  checkObjectives(): void {
    for (const obj of OBJECTIVES) {
      if (this.state.objectives.includes(obj.id)) continue;
      if (obj.progress(this.state) < 1) return;
      this.state.objectives.push(obj.id);
      this.toast({ icon: '🎯', title: 'Ziel erreicht', text: obj.title });
      const r = obj.reward;
      if (r.xp) this.addCommanderXp(r.xp);
      if (r.chips) this.grantChip(r.chips);
      if (r.items || r.currency) this.grantLoot({ items: r.items, currency: r.currency });
      this.notify();
    }
  }

  addXp(group: string, amount: number): void {
    this.xpAcc.set(group, (this.xpAcc.get(group) ?? 0) + amount);
  }

  private flushXp(): void {
    if (this.xpAcc.size === 0) return;
    const gain = this.commanderStat('xpGain', 1);
    for (const [group, amount] of this.xpAcc) {
      const g = group as TreeGroup;
      const before = machineLevel(this.state, g).level;
      this.state.machines.xp[g] = (this.state.machines.xp[g] ?? 0) + amount * gain;
      const after = machineLevel(this.state, g).level;
      if (after > before) this.toast({ icon: '⬆️', title: `${TREE_GROUP_NAMES[g]}: Level ${after}`, text: 'Neuer Punkt im Maschinenbaum' });
      this.onXpGained(amount * gain);
    }
    this.xpAcc.clear();
  }

  /** Maschinen-Erfahrung zählt zur Hälfte für den Kommandanten. */
  protected onXpGained(amount: number): void {
    this.addCommanderXp(amount * 0.5);
  }

  addCommanderXp(amount: number): void {
    const before = cmd.commanderLevel(this.state).level;
    const paragonBefore = paragon.paragonInfo(this.state).level;
    this.state.commander.xp += amount;
    const after = cmd.commanderLevel(this.state).level;
    const paragonAfter = paragon.paragonInfo(this.state).level;
    if (paragonAfter > paragonBefore) this.toast({ icon: '♾️', title: `Paragon ${paragonAfter}`, text: 'Neuer Paragon-Punkt' });
    if (after > before) {
      this.toast({ icon: '🎖️', title: `Kommandant: Level ${after}`, text: 'Neuer Punkt im Kommandanten-Baum' });
      if (cmd.ASCENDANCY_LEVELS.includes(after)) this.toast({ icon: '✨', title: 'Aszendenz', text: '2 neue Aszendenzpunkte verfügbar' });
    }
  }

  private addResearch(units: number): void {
    const done = addResearchProgress(this.state, units);
    if (done) {
      this.toast({ icon: done.icon, title: 'Forschung abgeschlossen', text: done.name });
      this.addCommanderXp(done.units * 3);
      if (this.rng.chance(0.35)) this.grantLoot({ currency: 1 });
      this.onResearchCompleted();
    }
  }

  /** Neue Forschung kann Modifier und Planeten freischalten. */
  protected onResearchCompleted(): void {
    this.refreshStats();
    this.notify();
  }

  private applyOffline(elapsed: number): void {
    if (elapsed < CONFIG.offlineMinReport) return;
    const counted = countedOfflineTime(elapsed, this.commanderStat('offlineCap', CONFIG.offlineCap));
    const efficiency = Math.min(1, this.commanderStat('offlineEfficiency', CONFIG.offlineEfficiency));
    const gains: OfflineResult['gains'] = {};
    for (const [id, world] of this.worlds) {
      const g = offlineGains(world.netRates, counted, efficiency);
      for (const [res, n] of Object.entries(g)) {
        // Verbrauch nie unter 0
        const current = amountOf(world.state, res);
        const next = current.add(n);
        world.state.inventory[res] = next.lt(0) ? ZERO : next;
      }
      if (Object.keys(g).length) gains[id] = g;
    }
    const researchUnits = this.researchRate * counted * efficiency;
    if (researchUnits > 0) this.addResearch(researchUnits);
    const result: OfflineResult = { elapsed, counted, efficiency, gains, researchUnits };
    const anyGain = Object.values(gains).some((g) => Object.values(g).some((n) => n > 0));
    if (anyGain || researchUnits > 0) {
      this.pendingOffline = result;
      this.bus.emit('offline', result);
    }
    this.notify();
  }

  // ---------- Abonnement für die UI ----------

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getVersion = (): number => this.version;

  notify(): void {
    this.version++;
    this.listeners.forEach((l) => l());
  }

  toast(t: Toast, sfx = 'notify'): void {
    this.bus.emit('toast', t);
    this.bus.emit('sfx', sfx);
  }

  // ---------- Aktionen ----------

  /** Handabbau auf einem Feld. Gibt die abgebaute Menge zurück. */
  mineTile(x: number, y: number): { resource: string; amount: number } | null {
    const ore = oreAt(this.terrain, x, y);
    if (!ore || RESOURCES[ore].category === 'fluid') return null;
    if (this.world.entityAt(x, y)) return null;
    const amount = this.handMinePower();
    addItem(this.planet, ore, D(amount));
    countProduced(this.state, ore, amount);
    this.state.counters.clicks++;
    this.state.counters.handMined += amount;
    this.bus.emit('sfx', 'mine');
    this.notify();
    return { resource: ore, amount };
  }

  craft(recipeId: string, count: number): boolean {
    const ok = enqueueCraft(this.state, recipeId, count, (r) => isRecipeUnlocked(this.state, r));
    if (ok) this.notify();
    return ok;
  }

  cancelCraft(index: number): void {
    cancelCraft(this.state, index);
    this.notify();
  }

  /** Baut ein Gebäude aus dem Inventar. Gibt eine Fehlermeldung zurück oder null. */
  build(type: string, x: number, y: number, rot: Dir): string | null {
    const def = MACHINES[type];
    if (!def?.buildable) return 'Nicht baubar';
    if (amountOf(this.planet, type).lt(1)) return `Kein ${def.name} im Inventar`;
    const error = this.world.canPlace(type, x, y);
    if (error) return error;
    this.world.place(type, x, y, rot);
    this.planet.inventory[type] = amountOf(this.planet, type).sub(1);
    this.bus.emit('sfx', 'build');
    this.notify();
    return null;
  }

  deconstruct(id: number): boolean {
    const hadModules = (this.world.runtimes.get(id)?.entity.modules?.length ?? 0) > 0;
    const removed = this.world.remove(id);
    if (!removed) return false;
    if (hadModules) {
      items.releaseModules(this.state, this.state.activePlanet, id);
      this.refreshStats();
    }
    addItem(this.planet, removed.type, D(1));
    this.bus.emit('sfx', 'remove');
    this.notify();
    return true;
  }

  rotateEntity(id: number): void {
    this.world.rotate(id);
    this.notify();
  }

  setRotation(id: number, rot: Dir): void {
    this.world.setRotation(id, rot);
    this.notify();
  }

  setRecipe(id: number, recipe: string | undefined): void {
    this.world.setRecipe(id, recipe);
    this.notify();
  }

  setFilter(id: number, filter: string | undefined): void {
    this.world.setFilter(id, filter);
    this.notify();
  }

  allocateMachineNode(group: TreeGroup, nodeId: string): boolean {
    if (!allocateNode(this.state, group, nodeId)) return false;
    this.refreshStats();
    this.notify();
    return true;
  }

  refundMachineNode(group: TreeGroup, nodeId: string): boolean {
    if (!refundNode(this.state, group, nodeId)) return false;
    this.refreshStats();
    this.notify();
    return true;
  }

  /** Führt eine Kommandanten-Aktion aus und aktualisiert die Werte, falls sie etwas geändert hat. */
  commander<T>(action: (state: GameState) => T): T {
    const result = action(this.state);
    if (result) {
      this.refreshStats();
      this.notify();
    }
    return result;
  }

  resetMachineTree(group: TreeGroup): void {
    resetTree(this.state, group);
    this.refreshStats();
    this.notify();
  }

  startResearch(id: string): void {
    if (startResearch(this.state, id)) this.notify();
  }

  setActivePlanet(id: string): void {
    if (!this.state.planets[id]) return;
    this.state.activePlanet = id;
    this.notify();
  }

  /** Gründet eine Kolonie auf einem Planeten. Die Raketenteile kommen von `from`. */
  foundColony(id: string, from: string): boolean {
    if (!PLANETS[id] || !foundColony(this.state, id, from, planetSeed(this.state, id))) return false;
    const planet = this.state.planets[id];
    this.worlds.set(id, new PlanetWorld(planet, generateTerrain(id, planet.seed)));
    this.refreshStats();
    this.toast({ icon: PLANETS[id].icon, title: 'Kolonie gegründet', text: `Willkommen auf ${PLANETS[id].name}` });
    this.notify();
    return true;
  }

  addRoute(from: string, to: string, resource: string, rate: number): void {
    if (from === to || !this.state.planets[from] || !this.state.planets[to] || rate <= 0) return;
    this.state.routes.push({ id: this.state.nextRouteId++, from, to, resource, rate });
    this.notify();
  }

  updateRoute(id: number, rate: number): void {
    const route = this.state.routes.find((r) => r.id === id);
    if (route && rate > 0) route.rate = rate;
    this.notify();
  }

  removeRoute(id: number): void {
    this.state.routes = this.state.routes.filter((r) => r.id !== id);
    this.routeFlow.actual.delete(id);
    this.notify();
  }

  setNotation(notation: Notation): void {
    this.state.settings.notation = notation;
    setNotation(notation);
    this.notify();
  }

  setSetting<K extends keyof GameState['settings']>(key: K, value: GameState['settings'][K]): void {
    this.state.settings[key] = value;
    if (key === 'notation') setNotation(value as Notation);
    this.notify();
  }

  dismissOffline(): void {
    this.pendingOffline = null;
    this.notify();
  }

  // ---------- Speichern ----------

  save = (): void => {
    this.autosaveTimer = 0;
    this.flushProduced();
    this.storeRates();
    this.state.savedAt = this.now();
    this.state.rngState = this.rng.state;
    if (this.persist) writeLocal(this.state);
  };

  exportCode(): string {
    this.flushProduced();
    this.storeRates();
    this.state.rngState = this.rng.state;
    this.state.savedAt = this.now();
    return exportSave(this.state);
  }

  /** Lädt einen exportierten Spielstand. Wirft bei ungültigem Code. */
  importCode(code: string): void {
    this.replaceState(importSave(code));
  }

  hardReset(): void {
    clearLocal();
    this.replaceState(createInitialState(this.now()));
  }

  protected replaceState(state: GameState): void {
    this.state = state;
    this.rng = new Rng(state.rngState);
    this.pendingOffline = null;
    this.producedAcc.clear();
    setNotation(state.settings.notation);
    this.state.savedAt = this.now();
    this.initWorlds();
    this.refreshStats();
    this.notify();
    this.save();
  }
}

