import { Decimal } from './bignum';
import { createInitialState, type GameState } from './state';

export const SAVE_VERSION = 2;
export const SAVE_KEY = 'claude-clicker-save';

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
interface RawSave {
  v: number;
  state: Json;
}

/** Migrationen: MIGRATIONS[n] hebt einen Spielstand von Version n auf n + 1. */
const MIGRATIONS: Record<number, (raw: RawSave) => RawSave> = {};

// ---------- Kodierung: Decimal und Set als markierte Objekte ----------

function encode(value: unknown): Json {
  if (value instanceof Decimal) return { $d: value.toString() };
  if (value instanceof Set) return { $s: [...value].map(encode) };
  if (Array.isArray(value)) return value.map(encode);
  if (value && typeof value === 'object') {
    const out: Record<string, Json> = {};
    for (const [k, v] of Object.entries(value)) if (v !== undefined) out[k] = encode(v);
    return out;
  }
  if (typeof value === 'number' && !Number.isFinite(value)) return 0;
  return value as Json;
}

function decode(value: Json): unknown {
  if (Array.isArray(value)) return value.map(decode);
  if (value && typeof value === 'object') {
    if ('$d' in value && typeof value.$d === 'string') return new Decimal(value.$d);
    if ('$s' in value && Array.isArray(value.$s)) return new Set(value.$s.map(decode));
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = decode(v);
    return out;
  }
  return value;
}

/** Füllt fehlende Felder aus den Standardwerten auf (für neue Felder in späteren Versionen). */
function mergeDefaults(defaults: unknown, loaded: unknown): unknown {
  if (loaded === undefined) return defaults;
  if (
    defaults &&
    loaded &&
    typeof defaults === 'object' &&
    typeof loaded === 'object' &&
    !Array.isArray(defaults) &&
    !(defaults instanceof Decimal) &&
    !(defaults instanceof Set) &&
    !Array.isArray(loaded) &&
    !(loaded instanceof Decimal) &&
    !(loaded instanceof Set)
  ) {
    const out: Record<string, unknown> = { ...(loaded as Record<string, unknown>) };
    for (const [k, v] of Object.entries(defaults as Record<string, unknown>)) out[k] = mergeDefaults(v, out[k]);
    return out;
  }
  return loaded;
}

export function serialize(state: GameState): RawSave {
  return { v: SAVE_VERSION, state: encode(state) };
}

export function deserialize(input: RawSave): GameState {
  let raw = input;
  if (typeof raw.v !== 'number' || raw.v > SAVE_VERSION) throw new Error('Unbekannte Spielstand-Version');
  if (raw.v < 2) throw new Error('Spielstand aus der Keks-Version – nicht kompatibel');
  while (raw.v < SAVE_VERSION) {
    const migrate = MIGRATIONS[raw.v];
    if (!migrate) throw new Error(`Keine Migration für Version ${raw.v}`);
    raw = migrate(raw);
  }
  return mergeDefaults(createInitialState(), decode(raw.state)) as GameState;
}

function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

function fromBase64(code: string): string {
  const binary = atob(code.trim());
  return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
}

export function exportSave(state: GameState): string {
  return toBase64(JSON.stringify(serialize(state)));
}

export function importSave(code: string): GameState {
  return deserialize(JSON.parse(fromBase64(code)) as RawSave);
}

export function writeLocal(state: GameState): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(serialize(state)));
  } catch {
    // Speicher voll oder blockiert – beim nächsten Autosave erneut versuchen
  }
}

export function readLocal(): GameState | null {
  let text: string | null = null;
  try {
    text = localStorage.getItem(SAVE_KEY);
    return text ? deserialize(JSON.parse(text) as RawSave) : null;
  } catch {
    // Unlesbaren oder inkompatiblen Spielstand sichern, bevor der Autosave ihn überschreibt
    try {
      if (text) localStorage.setItem(`${SAVE_KEY}-backup-${Date.now()}`, text);
    } catch {
      // ignorieren
    }
    return null;
  }
}

export function clearLocal(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // ignorieren
  }
}
