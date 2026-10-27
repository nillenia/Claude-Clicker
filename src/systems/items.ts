import type { Rng } from '../core/rng';
import type { GameState, Item, RolledAffix } from '../core/state';
import type { Flag, Modifier, SourcedModifier } from '../engine/types';
import {
  AFFIX_BY_ID,
  AFFIXES,
  ASPECTS,
  BASES,
  CURRENCIES,
  IMPRINT_COST,
  MODULE_BASES,
  moduleTier,
  TEMPER_CATEGORIES,
  TIER_ILVL,
  TIER_SCALE,
  UNIQUES,
  type AffixDef,
  type ItemSlot,
  type Rarity,
} from '../data/items';

const MAX_AFFIXES: Record<Rarity, number> = { normal: 0, magic: 1, rare: 3, legendary: 3, unique: 0 };
export const MAX_TEMPERED = 2;
export const MAX_MASTERWORK = 5;
export const ARTIFACT_SLOTS = 3;

// ---------- Würfeln ----------

function rollValue(rng: Rng, def: AffixDef, tier: number): number {
  const [a, b] = def.range;
  const v = (a + rng.next() * (b - a)) * TIER_SCALE[tier];
  return Math.round(v * 10) / 10;
}

function allowedTiers(ilvl: number): number {
  return TIER_ILVL.filter((l) => ilvl >= l).length;
}

export function rollAffix(rng: Rng, slot: ItemSlot, ilvl: number, exclude: Set<string>, kind?: 'prefix' | 'suffix', pool?: string[]): RolledAffix | null {
  const candidates = AFFIXES.filter((a) => a.slots.includes(slot) && !exclude.has(a.id) && (!kind || a.kind === kind) && (!pool || pool.includes(a.id)));
  if (candidates.length === 0) return null;
  const def = rng.weighted(candidates.map((a) => ({ weight: a.weight, value: a })));
  const maxTier = allowedTiers(ilvl);
  // Höhere Stufen sind seltener
  const tier = rng.weighted(Array.from({ length: maxTier }, (_, t) => ({ weight: maxTier - t + 1, value: t })));
  return { id: def.id, tier, value: rollValue(rng, def, tier) };
}

function counts(item: Item) {
  let prefix = 0;
  let suffix = 0;
  for (const a of item.affixes) {
    if (AFFIX_BY_ID[a.id]?.kind === 'prefix') prefix++;
    else suffix++;
  }
  return { prefix, suffix };
}

/** Fügt ein Affix hinzu, falls noch Platz ist. */
function addRandomAffix(rng: Rng, item: Item): boolean {
  const max = MAX_AFFIXES[item.rarity];
  const { prefix, suffix } = counts(item);
  const open: ('prefix' | 'suffix')[] = [];
  if (prefix < max) open.push('prefix');
  if (suffix < max) open.push('suffix');
  if (open.length === 0) return false;
  const kind = open[Math.floor(rng.next() * open.length)];
  const slot = BASES[item.base].slot;
  const affix = rollAffix(rng, slot, item.ilvl, new Set(item.affixes.map((a) => a.id)), kind);
  if (!affix) return false;
  item.affixes.push(affix);
  return true;
}

const RARE_A = ['Kalte', 'Stille', 'Rote', 'Ewige', 'Hohle', 'Wilde', 'Graue', 'Brennende', 'Splitternde', 'Dunkle', 'Singende', 'Letzte'];
const RARE_B = ['Spule', 'Matrix', 'Klinge', 'Seele', 'Linse', 'Flamme', 'Achse', 'Krone', 'Ader', 'Welle', 'Feder', 'Glut'];

export function itemName(item: Item, rng?: Rng): string {
  const base = BASES[item.base];
  if (item.unique) return UNIQUES[item.unique].name;
  if (item.rarity === 'normal') return base.name;
  if (item.rarity === 'magic') {
    const pre = item.affixes.find((a) => AFFIX_BY_ID[a.id]?.kind === 'prefix');
    const suf = item.affixes.find((a) => AFFIX_BY_ID[a.id]?.kind === 'suffix');
    return [pre ? AFFIX_BY_ID[pre.id].name : '', base.name, suf ? AFFIX_BY_ID[suf.id].name : ''].filter(Boolean).join(' ');
  }
  if (item.rarity === 'legendary' && item.aspect) return `${ASPECTS[item.aspect].name.replace('Aspekt', 'Modul')}`;
  if (rng) return `${RARE_A[Math.floor(rng.next() * RARE_A.length)]} ${RARE_B[Math.floor(rng.next() * RARE_B.length)]}`;
  return item.name;
}

export interface CreateOptions {
  ilvl: number;
  base?: string;
  rarity?: Rarity;
  unique?: string;
  aspect?: string;
}

export function createItem(state: GameState, rng: Rng, opts: CreateOptions): Item {
  const id = `i${state.loot.nextItemId++}`;
  if (opts.unique) {
    const u = UNIQUES[opts.unique];
    const item: Item = { id, base: u.base, rarity: 'unique', ilvl: opts.ilvl, name: u.name, affixes: [], tempered: [], masterwork: 0, unique: u.id };
    state.loot.items[id] = item;
    return item;
  }
  const base = opts.base ?? MODULE_BASES[Math.floor(rng.next() * MODULE_BASES.length)];
  const rarity = opts.rarity ?? 'normal';
  const item: Item = { id, base, rarity, ilvl: opts.ilvl, name: '', affixes: [], tempered: [], masterwork: 0 };
  if (rarity === 'magic') {
    addRandomAffix(rng, item);
    if (rng.chance(0.5)) addRandomAffix(rng, item);
  } else if (rarity === 'rare' || rarity === 'legendary') {
    const n = 3 + Math.floor(rng.next() * 3);
    for (let i = 0; i < n; i++) addRandomAffix(rng, item);
    if (rarity === 'legendary') item.aspect = opts.aspect ?? Object.keys(ASPECTS)[Math.floor(rng.next() * Object.keys(ASPECTS).length)];
  }
  item.name = itemName(item, rng);
  state.loot.items[id] = item;
  return item;
}

/** Zufälliger Drop. `rarityBonus` in Prozentpunkten verschiebt die Gewichte. */
export function dropItem(state: GameState, rng: Rng, ilvl: number, rarityBonus: number, jewelChance = 0.15): Item {
  const f = 1 + rarityBonus / 100;
  const rarity = rng.weighted<Rarity>([
    { weight: 50, value: 'normal' },
    { weight: 32 * f, value: 'magic' },
    { weight: 14 * f, value: 'rare' },
    { weight: 2.5 * f, value: 'legendary' },
  ]);
  const base = rng.chance(jewelChance) ? 'jewel' : undefined;
  return createItem(state, rng, { ilvl, rarity: base === 'jewel' && rarity === 'legendary' ? 'rare' : rarity, base });
}

export function dropCurrency(rng: Rng, count: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (let i = 0; i < count; i++) {
    const c = rng.weighted(CURRENCIES.map((x) => ({ weight: x.weight, value: x.id })));
    out[c] = (out[c] ?? 0) + 1;
  }
  return out;
}

// ---------- Effekte ----------

/** Alle Modifier eines Items (ohne Quelle). */
export function itemMods(item: Item): Modifier[] {
  const mods: Modifier[] = [];
  const base = BASES[item.base];
  if (item.unique) return [...UNIQUES[item.unique].mods];
  const tierScale = 1 + (moduleTier(item.ilvl) - 1) * 0.5;
  for (const imp of base.implicit) mods.push({ stat: imp.stat, kind: imp.kind, value: imp.value * tierScale, tags: imp.tags });
  const mw = 1 + item.masterwork * 0.1;
  for (const a of [...item.affixes, ...item.tempered]) {
    const def = AFFIX_BY_ID[a.id];
    if (!def) continue;
    mods.push({ stat: def.stat, kind: def.modKind, value: a.value * mw, tags: def.tags, condition: def.condition });
  }
  if (item.aspect) mods.push(...ASPECTS[item.aspect].mods);
  return mods;
}

export function itemFlags(item: Item): Flag[] {
  if (item.unique) return UNIQUES[item.unique].flags ?? [];
  if (item.aspect) return ASPECTS[item.aspect].flags ?? [];
  return [];
}

/** Globale Modifier aus Juwelen und Artefakten. */
export function equippedGlobalModifiers(state: GameState): SourcedModifier[] {
  const mods: SourcedModifier[] = [];
  for (const item of Object.values(state.loot.items)) {
    const loc = item.location;
    if (!loc || loc.kind === 'machine') continue;
    if (loc.kind === 'jewel' && !state.commander.allocated.includes(loc.node)) continue;
    for (const m of itemMods(item)) mods.push({ ...m, source: item.name });
  }
  return mods;
}

export function equippedGlobalFlags(state: GameState): Flag[] {
  const flags: Flag[] = [];
  for (const item of Object.values(state.loot.items)) {
    const loc = item.location;
    if (!loc || loc.kind === 'machine') continue;
    if (loc.kind === 'jewel' && !state.commander.allocated.includes(loc.node)) continue;
    flags.push(...itemFlags(item));
  }
  return flags;
}

// ---------- Crafting ----------

export type CraftResult = { ok: true; message: string } | { ok: false; message: string };

const fail = (message: string): CraftResult => ({ ok: false, message });
const ok = (message: string): CraftResult => ({ ok: true, message });

function spend(state: GameState, currency: string, n = 1): boolean {
  if ((state.loot.currency[currency] ?? 0) < n) return false;
  state.loot.currency[currency] -= n;
  return true;
}

/** Prüft, ob eine Währung auf ein Item anwendbar ist (ohne sie zu verbrauchen). */
export function currencyApplicable(item: Item, currency: string): string | null {
  if (item.unique) return 'Einzigartige Items lassen sich nicht verändern';
  const max = MAX_AFFIXES[item.rarity];
  const { prefix, suffix } = counts(item);
  switch (currency) {
    case 'c_transmute':
      return item.rarity === 'normal' ? null : 'Nur für normale Items';
    case 'c_alchemy':
      return item.rarity === 'normal' ? null : 'Nur für normale Items';
    case 'c_augment':
      return item.rarity !== 'magic' ? 'Nur für verbesserte Items' : prefix < max || suffix < max ? null : 'Keine freien Affixplätze';
    case 'c_exalt':
      return item.rarity !== 'rare' && item.rarity !== 'legendary' ? 'Nur für seltene oder legendäre Items' : prefix < max || suffix < max ? null : 'Keine freien Affixplätze';
    case 'c_chaos':
      return item.rarity === 'rare' || item.rarity === 'legendary' ? null : 'Nur für seltene oder legendäre Items';
    case 'c_divine':
      return item.affixes.length + item.tempered.length > 0 ? null : 'Keine Affixe';
    case 'c_annul':
      return item.affixes.length > 0 ? null : 'Keine Affixe';
    case 'c_scour':
      return item.rarity === 'normal' ? 'Bereits normal' : null;
    case 'c_temper':
      return BASES[item.base].slot !== 'module' ? 'Nur für Module' : item.tempered.length >= MAX_TEMPERED ? 'Bereits zweimal gehärtet' : null;
    case 'c_masterwork':
      return item.rarity === 'normal' ? 'Nicht für normale Items' : item.masterwork >= MAX_MASTERWORK ? 'Maximale Stufe erreicht' : null;
    default:
      return 'Unbekannte Währung';
  }
}

export function applyCurrency(state: GameState, rng: Rng, itemId: string, currency: string, temperCategory?: string): CraftResult {
  const item = state.loot.items[itemId];
  if (!item) return fail('Item nicht gefunden');
  const reason = currencyApplicable(item, currency);
  if (reason) return fail(reason);
  if (currency === 'c_temper' && !TEMPER_CATEGORIES.some((c) => c.id === temperCategory)) return fail('Kategorie wählen');
  if (!spend(state, currency)) return fail('Keine Währung übrig');

  switch (currency) {
    case 'c_transmute':
      item.rarity = 'magic';
      addRandomAffix(rng, item);
      break;
    case 'c_alchemy': {
      item.rarity = 'rare';
      const n = 3 + Math.floor(rng.next() * 3);
      for (let i = 0; i < n; i++) addRandomAffix(rng, item);
      item.name = itemName(item, rng);
      return ok('Das Modul ist jetzt selten.');
    }
    case 'c_augment':
    case 'c_exalt':
      addRandomAffix(rng, item);
      break;
    case 'c_chaos': {
      item.affixes = [];
      const n = 3 + Math.floor(rng.next() * 3);
      for (let i = 0; i < n; i++) addRandomAffix(rng, item);
      break;
    }
    case 'c_divine':
      for (const a of [...item.affixes, ...item.tempered]) a.value = rollValue(rng, AFFIX_BY_ID[a.id], a.tier);
      break;
    case 'c_annul':
      item.affixes.splice(Math.floor(rng.next() * item.affixes.length), 1);
      break;
    case 'c_scour':
      item.affixes = [];
      item.rarity = 'normal';
      item.aspect = undefined;
      break;
    case 'c_temper': {
      const cat = TEMPER_CATEGORIES.find((c) => c.id === temperCategory)!;
      const exclude = new Set(item.tempered.map((a) => a.id));
      const affix = rollAffix(rng, 'module', item.ilvl, exclude, undefined, cat.affixes);
      if (affix) item.tempered.push(affix);
      break;
    }
    case 'c_masterwork':
      item.masterwork++;
      break;
  }
  item.name = itemName(item);
  return ok('Angewendet.');
}

/** Verschrotten: gibt etwas Währung zurück. */
export function salvageItem(state: GameState, rng: Rng, itemId: string): CraftResult {
  const item = state.loot.items[itemId];
  if (!item) return fail('Item nicht gefunden');
  if (item.location) return fail('Erst ausbauen');
  const n = { normal: 1, magic: 1, rare: 2, legendary: 3, unique: 4 }[item.rarity];
  const gained = dropCurrency(rng, n);
  for (const [c, k] of Object.entries(gained)) state.loot.currency[c] = (state.loot.currency[c] ?? 0) + k;
  delete state.loot.items[itemId];
  return ok(`Verschrottet: ${n} Währung erhalten.`);
}

/** Legendären Aspekt in den Kodex übernehmen (Item wird zerstört). */
export function extractAspect(state: GameState, itemId: string): CraftResult {
  const item = state.loot.items[itemId];
  if (!item?.aspect) return fail('Kein Aspekt');
  if (item.location) return fail('Erst ausbauen');
  if (!state.loot.codex.includes(item.aspect)) state.loot.codex.push(item.aspect);
  state.loot.currency.c_essence = (state.loot.currency.c_essence ?? 0) + 1;
  delete state.loot.items[itemId];
  return ok(`${ASPECTS[item.aspect!].name} im Kodex gespeichert.`);
}

/** Aspekt aus dem Kodex auf ein seltenes Modul prägen → legendär. */
export function imprintAspect(state: GameState, itemId: string, aspectId: string): CraftResult {
  const item = state.loot.items[itemId];
  if (!item) return fail('Item nicht gefunden');
  if (item.rarity !== 'rare' && item.rarity !== 'legendary') return fail('Nur für seltene oder legendäre Module');
  if (BASES[item.base].slot !== 'module') return fail('Nur für Module');
  if (!state.loot.codex.includes(aspectId)) return fail('Aspekt nicht im Kodex');
  if (!spend(state, 'c_essence', IMPRINT_COST)) return fail(`Benötigt ${IMPRINT_COST} Aspekt-Essenzen`);
  item.rarity = 'legendary';
  item.aspect = aspectId;
  item.name = itemName(item);
  return ok('Aspekt aufgeprägt.');
}

// ---------- Ausrüsten ----------

export function unequip(state: GameState, itemId: string): void {
  const item = state.loot.items[itemId];
  if (!item?.location) return;
  const loc = item.location;
  if (loc.kind === 'machine') {
    const entity = state.planets[loc.planet]?.entities.find((e) => e.id === loc.entity);
    if (entity) entity.modules = (entity.modules ?? []).filter((id) => id !== itemId);
  }
  item.location = undefined;
}

export function equipModule(state: GameState, itemId: string, planet: string, entityId: number, slots: number): CraftResult {
  const item = state.loot.items[itemId];
  if (!item || BASES[item.base].slot !== 'module') return fail('Kein Modul');
  const entity = state.planets[planet]?.entities.find((e) => e.id === entityId);
  if (!entity) return fail('Maschine nicht gefunden');
  if ((entity.modules?.length ?? 0) >= slots) return fail('Alle Sockel belegt');
  unequip(state, itemId);
  entity.modules = [...(entity.modules ?? []), itemId];
  item.location = { kind: 'machine', planet, entity: entityId };
  return ok('Eingesetzt.');
}

export function socketJewel(state: GameState, itemId: string, node: string): CraftResult {
  const item = state.loot.items[itemId];
  if (!item || BASES[item.base].slot !== 'jewel') return fail('Kein Juwel');
  for (const other of Object.values(state.loot.items)) if (other.location?.kind === 'jewel' && other.location.node === node) other.location = undefined;
  unequip(state, itemId);
  item.location = { kind: 'jewel', node };
  return ok('Eingesetzt.');
}

export function setArtifact(state: GameState, itemId: string, slot: number): CraftResult {
  const item = state.loot.items[itemId];
  if (!item || BASES[item.base].slot !== 'artifact') return fail('Kein Artefakt');
  if (slot < 0 || slot >= ARTIFACT_SLOTS) return fail('Ungültiger Platz');
  for (const other of Object.values(state.loot.items)) if (other.location?.kind === 'artifact' && other.location.slot === slot) other.location = undefined;
  unequip(state, itemId);
  item.location = { kind: 'artifact', slot };
  return ok('Ausgerüstet.');
}

/** Gibt Module einer abgerissenen Maschine zurück ins Lager. */
export function releaseModules(state: GameState, planet: string, entityId: number): void {
  for (const item of Object.values(state.loot.items)) {
    if (item.location?.kind === 'machine' && item.location.planet === planet && item.location.entity === entityId) item.location = undefined;
  }
}
