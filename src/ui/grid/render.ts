import type { Dir } from '../../core/state';
import { MACHINES, type MachineDef } from '../../data/machines';
import { RECIPES } from '../../data/recipes';
import { RESOURCES } from '../../data/resources';
import { DIRS, outputCell, splitterCells } from '../../sim/geometry';
import type { Terrain } from '../../sim/terrain';
import type { PlanetWorld, Runtime, Status } from '../../sim/world';

export interface Camera {
  /** Weltkoordinate (in Pixeln) der linken oberen Ecke. */
  x: number;
  y: number;
  /** Pixel pro Kachel. */
  tile: number;
}

export interface Floater {
  x: number;
  y: number;
  text: string;
  color: string;
  born: number;
}

export interface Ghost {
  type: string;
  x: number;
  y: number;
  rot: Dir;
  ok: boolean;
}

export interface RenderInput {
  world: PlanetWorld;
  cam: Camera;
  width: number;
  height: number;
  time: number;
  hover: [number, number] | null;
  selected: number | null;
  ghost: Ghost | null;
  floaters: Floater[];
  showGrid: boolean;
  /** Markierte Gebäude (z. B. Reichweite von Skills). */
  highlight?: { x: number; y: number; radius: number; color: string } | null;
  overlay?: (ctx: CanvasRenderingContext2D, input: RenderInput) => void;
}

// ---------- Gelände-Bitmap (1 Pixel pro Kachel, wird skaliert gezeichnet) ----------

const terrainCache = new WeakMap<Terrain, HTMLCanvasElement>();

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function terrainBitmap(t: Terrain): HTMLCanvasElement {
  const cached = terrainCache.get(t);
  if (cached) return cached;
  const canvas = document.createElement('canvas');
  canvas.width = t.width;
  canvas.height = t.height;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(t.width, t.height);
  const g0 = hexToRgb(t.planet.ground[0]);
  const g1 = hexToRgb(t.planet.ground[1]);
  const oreColors = t.resources.map((r) => hexToRgb(RESOURCES[r].color));
  for (let i = 0; i < t.width * t.height; i++) {
    let [r, g, b] = t.shade[i] ? g1 : g0;
    const ore = t.ore[i];
    if (ore) {
      const c = oreColors[ore - 1];
      const mix = 0.32;
      r = r * (1 - mix) + c[0] * mix;
      g = g * (1 - mix) + c[1] * mix;
      b = b * (1 - mix) + c[2] * mix;
    }
    img.data[i * 4] = r;
    img.data[i * 4 + 1] = g;
    img.data[i * 4 + 2] = b;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  terrainCache.set(t, canvas);
  return canvas;
}

function hash(x: number, y: number, n: number): number {
  let h = (x * 73856093) ^ (y * 19349663) ^ (n * 83492791);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// ---------- Zeichnen ----------

const STATUS_COLOR: Record<Status, string> = {
  working: '#5be08a',
  idle: '#6b7a90',
  no_input: '#ffc857',
  output_blocked: '#ffc857',
  no_power: '#ff6b6b',
  no_recipe: '#ff6b6b',
  no_ore: '#ff6b6b',
  no_fuel: '#ff6b6b',
  no_research: '#ffc857',
  disabled: '#ff6b6b',
};

export function render(ctx: CanvasRenderingContext2D, input: RenderInput): void {
  const { world, cam, width, height } = input;
  const t = world.terrain;
  const T = cam.tile;

  ctx.fillStyle = '#05070c';
  ctx.fillRect(0, 0, width, height);

  // Gelände
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(terrainBitmap(t), -cam.x, -cam.y, t.width * T, t.height * T);

  const x0 = Math.max(0, Math.floor(cam.x / T));
  const y0 = Math.max(0, Math.floor(cam.y / T));
  const x1 = Math.min(t.width - 1, Math.floor((cam.x + width) / T));
  const y1 = Math.min(t.height - 1, Math.floor((cam.y + height) / T));

  // Erzbrocken für Tiefe
  if (T >= 14) {
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const idx = t.ore[y * t.width + x];
        if (!idx) continue;
        const res = RESOURCES[t.resources[idx - 1]];
        ctx.fillStyle = res.color;
        const fluid = res.category === 'fluid';
        for (let k = 0; k < 3; k++) {
          const px = (x + 0.15 + hash(x, y, k) * 0.7) * T - cam.x;
          const py = (y + 0.15 + hash(x, y, k + 7) * 0.7) * T - cam.y;
          const r = T * (fluid ? 0.12 : 0.08 + hash(x, y, k + 13) * 0.06);
          ctx.globalAlpha = fluid ? 0.35 + 0.25 * Math.sin(input.time * 2 + x + y * 1.7 + k) : 0.8;
          ctx.beginPath();
          ctx.arc(px, py, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  // Rasterlinien
  if (input.showGrid && T >= 12) {
    ctx.strokeStyle = 'rgba(255,255,255,0.045)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = x0; x <= x1 + 1; x++) {
      const px = Math.round(x * T - cam.x) + 0.5;
      ctx.moveTo(px, y0 * T - cam.y);
      ctx.lineTo(px, (y1 + 1) * T - cam.y);
    }
    for (let y = y0; y <= y1 + 1; y++) {
      const py = Math.round(y * T - cam.y) + 0.5;
      ctx.moveTo(x0 * T - cam.x, py);
      ctx.lineTo((x1 + 1) * T - cam.x, py);
    }
    ctx.stroke();
  }

  // Rand des Baugebiets
  ctx.strokeStyle = 'rgba(79,209,255,0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(-cam.x, -cam.y, t.width * T, t.height * T);

  // Bänder zuerst, Maschinen darüber
  const runtimes = world.entities;
  for (const rt of runtimes) {
    if (rt.def.category === 'belt' && visible(rt, cam, width, height)) drawBelt(ctx, rt, input);
  }
  for (const rt of runtimes) {
    if (rt.def.category !== 'belt' && visible(rt, cam, width, height)) drawMachine(ctx, rt, input);
  }

  // Auswahl
  if (input.selected) {
    const rt = world.runtimes.get(input.selected);
    if (rt) {
      ctx.strokeStyle = '#4fd1ff';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.lineDashOffset = -input.time * 20;
      ctx.strokeRect(rt.entity.x * T - cam.x - 2, rt.entity.y * T - cam.y - 2, rt.def.w * T + 4, rt.def.h * T + 4);
      ctx.setLineDash([]);
    }
  }

  // Bauvorschau
  if (input.ghost) drawGhost(ctx, input.ghost, input);
  else if (input.hover) {
    const [hx, hy] = input.hover;
    const e = world.entityAt(hx, hy);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    if (e) {
      const def = MACHINES[e.type];
      ctx.strokeRect(e.x * T - cam.x + 0.5, e.y * T - cam.y + 0.5, def.w * T - 1, def.h * T - 1);
    } else if (world.inBounds(hx, hy)) {
      ctx.strokeRect(hx * T - cam.x + 0.5, hy * T - cam.y + 0.5, T - 1, T - 1);
    }
  }

  if (input.highlight) {
    const h = input.highlight;
    ctx.strokeStyle = h.color;
    ctx.fillStyle = h.color.replace(/[\d.]+\)$/, '0.08)');
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc((h.x + 0.5) * T - cam.x, (h.y + 0.5) * T - cam.y, h.radius * T, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  input.overlay?.(ctx, input);

  // Schwebende Texte
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `600 ${Math.max(11, T * 0.42)}px -apple-system, sans-serif`;
  for (const f of input.floaters) {
    const age = input.time - f.born;
    if (age > 1.2) continue;
    ctx.globalAlpha = 1 - age / 1.2;
    ctx.fillStyle = f.color;
    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.lineWidth = 3;
    const px = (f.x + 0.5) * T - cam.x;
    const py = (f.y + 0.5) * T - cam.y - age * T * 1.2;
    ctx.strokeText(f.text, px, py);
    ctx.fillText(f.text, px, py);
  }
  ctx.globalAlpha = 1;
}

function visible(rt: Runtime, cam: Camera, width: number, height: number): boolean {
  const T = cam.tile;
  const px = rt.entity.x * T - cam.x;
  const py = rt.entity.y * T - cam.y;
  return px + rt.def.w * T >= 0 && py + rt.def.h * T >= 0 && px <= width && py <= height;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function arrow(ctx: CanvasRenderingContext2D, cx: number, cy: number, dir: Dir, size: number): void {
  const [dx, dy] = DIRS[dir];
  const px = -dy;
  const py = dx;
  ctx.beginPath();
  ctx.moveTo(cx + dx * size, cy + dy * size);
  ctx.lineTo(cx - dx * size * 0.6 + px * size * 0.8, cy - dy * size * 0.6 + py * size * 0.8);
  ctx.lineTo(cx - dx * size * 0.6 - px * size * 0.8, cy - dy * size * 0.6 - py * size * 0.8);
  ctx.closePath();
  ctx.fill();
}

/** Pfeilspitze in beliebigem Winkel (Bogenmaß). */
function arrowAt(ctx: CanvasRenderingContext2D, cx: number, cy: number, angle: number, size: number): void {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  ctx.beginPath();
  ctx.moveTo(cx + dx * size, cy + dy * size);
  ctx.lineTo(cx - dx * size * 0.6 - dy * size * 0.8, cy - dy * size * 0.6 + dx * size * 0.8);
  ctx.lineTo(cx - dx * size * 0.6 + dy * size * 0.8, cy - dy * size * 0.6 - dx * size * 0.8);
  ctx.closePath();
  ctx.fill();
}

interface BeltPath {
  /** Punkt und Laufrichtung bei Anteil f (0 = Eingang, 1 = Ausgang). */
  at: (f: number) => { x: number; y: number; angle: number };
  drawBody: (ctx: CanvasRenderingContext2D, color: string) => void;
}

function beltPath(rt: Runtime, px: number, py: number, T: number): BeltPath {
  const rot = rt.entity.rot;
  const [dx, dy] = DIRS[rot];
  const cx = px + T / 2;
  const cy = py + T / 2;

  if (rt.curveFrom === null) {
    const horizontal = dx !== 0;
    return {
      at: (f) => ({ x: cx + dx * (f - 0.5) * T, y: cy + dy * (f - 0.5) * T, angle: Math.atan2(dy, dx) }),
      drawBody: (c, color) => {
        c.fillStyle = '#151b26';
        if (horizontal) c.fillRect(px, py + T * 0.12, T, T * 0.76);
        else c.fillRect(px + T * 0.12, py, T * 0.76, T);
        c.fillStyle = color;
        if (horizontal) {
          c.fillRect(px, py + T * 0.1, T, T * 0.06);
          c.fillRect(px, py + T * 0.84, T, T * 0.06);
        } else {
          c.fillRect(px + T * 0.1, py, T * 0.06, T);
          c.fillRect(px + T * 0.84, py, T * 0.06, T);
        }
      },
    };
  }

  // Kurve: Viertelkreis um die Ecke zwischen Eingangs- und Ausgangsseite
  const [sx, sy] = DIRS[rt.curveFrom];
  const ox = cx + ((sx + dx) * T) / 2;
  const oy = cy + ((sy + dy) * T) / 2;
  const a0 = Math.atan2(-dy, -dx);
  let delta = Math.atan2(-sy, -sx) - a0;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  const ccw = delta < 0;
  const a1 = a0 + delta;
  return {
    at: (f) => {
      const a = a0 + delta * f;
      return { x: ox + Math.cos(a) * (T / 2), y: oy + Math.sin(a) * (T / 2), angle: a + (ccw ? -Math.PI / 2 : Math.PI / 2) };
    },
    drawBody: (c, color) => {
      c.fillStyle = '#151b26';
      c.beginPath();
      c.arc(ox, oy, T * 0.88, a0, a1, ccw);
      c.arc(ox, oy, T * 0.12, a1, a0, !ccw);
      c.closePath();
      c.fill();
      c.strokeStyle = color;
      c.lineWidth = T * 0.06;
      for (const r of [0.13, 0.87]) {
        c.beginPath();
        c.arc(ox, oy, T * r, a0, a1, ccw);
        c.stroke();
      }
    },
  };
}

function drawBelt(ctx: CanvasRenderingContext2D, rt: Runtime, input: RenderInput): void {
  const { cam, world, time } = input;
  const T = cam.tile;
  const px = rt.entity.x * T - cam.x;
  const py = rt.entity.y * T - cam.y;
  const path = beltPath(rt, px, py, T);

  path.drawBody(ctx, rt.def.color);

  // Laufrichtung (Chevrons bewegen sich, solange das Band läuft)
  const moving = rt.status === 'working';
  const speed = Math.min(2.5, 0.6 + rt.def.speed / 16);
  const offset = moving ? (time * speed) % 0.5 : 0;
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  for (let k = 0; k < 2; k++) {
    const p = path.at((k * 0.5 + offset + 0.25) % 1);
    arrowAt(ctx, p.x, p.y, p.angle, T * 0.14);
  }

  // Items: Dichte aus Füllstand (Stau) bzw. Durchfluss (laufendes Band)
  const fill = Math.min(1, world.beltFill(rt));
  const flow = Math.min(1, rt.rate / Math.max(0.001, rt.def.speed * rt.stats.throughput));
  const density = Math.max(fill, flow);
  if (density > 0.005 && T >= 8) {
    const colors: string[] = [];
    const totalAmount = [...rt.inBuf.values()].reduce((a, b) => a + b, 0);
    for (const [res, n] of rt.inBuf) {
      const share = Math.round((n / Math.max(1e-9, totalAmount)) * 4);
      for (let i = 0; i < share; i++) colors.push(RESOURCES[res]?.color ?? '#fff');
    }
    if (colors.length === 0 && rt.lastItem) colors.push(RESOURCES[rt.lastItem]?.color ?? '#fff');
    if (colors.length === 0) return;
    const count = Math.max(1, Math.round(density * 4));
    for (let i = 0; i < count; i++) {
      const p = path.at((i / count + offset * 2) % 1);
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath();
      ctx.arc(p.x, p.y, T * 0.14, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawMachine(ctx: CanvasRenderingContext2D, rt: Runtime, input: RenderInput): void {
  const { cam } = input;
  const T = cam.tile;
  const def = rt.def;
  const { x, y, rot } = rt.entity;
  const px = x * T - cam.x;
  const py = y * T - cam.y;
  const w = def.w * T;
  const h = def.h * T;
  const pad = Math.max(1, T * 0.06);

  // Körper
  const grad = ctx.createLinearGradient(px, py, px, py + h);
  grad.addColorStop(0, shade(def.color, 0.25));
  grad.addColorStop(1, shade(def.color, -0.25));
  ctx.fillStyle = grad;
  roundRect(ctx, px + pad, py + pad, w - pad * 2, h - pad * 2, T * 0.18);
  ctx.fill();
  ctx.strokeStyle = shade(def.color, 0.45);
  ctx.lineWidth = Math.max(1, T * 0.05);
  ctx.stroke();

  // Symbol
  if (T >= 10) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const size = Math.min(def.w, def.h) * T * (def.category === 'splitter' ? 0.55 : 0.5);
    ctx.font = `${size}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
    // Arbeitende Maschinen pulsieren leicht
    const pulse = rt.status === 'working' && def.category !== 'storage' ? 1 + Math.sin(input.time * 6 + x) * 0.04 : 1;
    ctx.save();
    ctx.translate(px + w / 2, py + h / 2);
    ctx.scale(pulse, pulse);
    ctx.fillText(def.icon, 0, T * 0.02);
    ctx.restore();
  }

  // Ausgang
  if (hasOutputArrow(def)) {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    if (def.category === 'splitter') {
      for (const [cx, cy] of splitterCells(x, y, rot)) {
        const d = DIRS.findIndex(([ddx, ddy]) => ddx === cx - x && ddy === cy - y) as Dir;
        arrow(ctx, px + T / 2 + DIRS[d][0] * T * 0.38, py + T / 2 + DIRS[d][1] * T * 0.38, d, T * 0.1);
      }
    } else {
      const [ox, oy] = outputCell(def, x, y, rot);
      const [dx, dy] = DIRS[rot];
      const ax = (ox + 0.5 - dx * 0.62) * T - cam.x;
      const ay = (oy + 0.5 - dy * 0.62) * T - cam.y;
      arrow(ctx, ax, ay, rot, T * 0.16);
    }
  }

  // Rezept-Symbol
  if (T >= 16 && rt.recipe && def.category !== 'furnace') {
    const out = Object.keys(rt.recipe.outputs)[0];
    drawResourceBadge(ctx, out, px + w - T * 0.42, py + h - T * 0.42, T * 0.3);
  } else if (T >= 16 && def.category === 'terminal' && rt.entity.filter) {
    drawResourceBadge(ctx, rt.entity.filter, px + w - T * 0.3, py + h - T * 0.3, T * 0.22);
  } else if (T >= 16 && (def.category === 'drill' || def.category === 'pump') && rt.ore) {
    drawResourceBadge(ctx, rt.ore, px + w - T * 0.42, py + h - T * 0.42, T * 0.3);
  }

  // Status-Lämpchen
  if (def.category !== 'storage' && def.category !== 'hub' && def.category !== 'splitter' && T >= 10) {
    ctx.fillStyle = STATUS_COLOR[rt.status];
    ctx.beginPath();
    ctx.arc(px + T * 0.3, py + T * 0.3, Math.max(2, T * 0.09), 0, Math.PI * 2);
    ctx.fill();
  }

  // Auslastung
  if (isProducer(def) && T >= 14) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(px + T * 0.2, py + h - T * 0.2, w - T * 0.4, T * 0.07);
    ctx.fillStyle = '#5be08a';
    ctx.fillRect(px + T * 0.2, py + h - T * 0.2, (w - T * 0.4) * Math.min(1, rt.activity), T * 0.07);
  }

  // Lebenspunkte bei Schaden
  if (rt.entity.hp !== undefined && rt.entity.hp < def.hp) {
    const f = Math.max(0, rt.entity.hp / def.hp);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(px + T * 0.1, py + T * 0.05, w - T * 0.2, T * 0.1);
    ctx.fillStyle = f > 0.5 ? '#5be08a' : f > 0.25 ? '#ffc857' : '#ff6b6b';
    ctx.fillRect(px + T * 0.1, py + T * 0.05, (w - T * 0.2) * f, T * 0.1);
  }
}

function drawResourceBadge(ctx: CanvasRenderingContext2D, res: string, cx: number, cy: number, r: number): void {
  const def = RESOURCES[res];
  if (!def) return;
  ctx.fillStyle = 'rgba(5,8,14,0.85)';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = def.color;
  ctx.lineWidth = Math.max(1, r * 0.15);
  ctx.stroke();
  ctx.fillStyle = def.color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (def.icon) {
    ctx.font = `${r * 1.1}px "Apple Color Emoji", sans-serif`;
    ctx.fillText(def.icon, cx, cy + r * 0.05);
  } else {
    ctx.font = `700 ${r * 0.9}px ui-monospace, monospace`;
    ctx.fillText(def.symbol, cx, cy + r * 0.05);
  }
}

function drawGhost(ctx: CanvasRenderingContext2D, ghost: Ghost, input: RenderInput): void {
  const { cam } = input;
  const T = cam.tile;
  const def = MACHINES[ghost.type];
  const px = ghost.x * T - cam.x;
  const py = ghost.y * T - cam.y;
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = ghost.ok ? 'rgba(91,224,138,0.35)' : 'rgba(255,107,107,0.4)';
  ctx.fillRect(px, py, def.w * T, def.h * T);
  ctx.globalAlpha = 0.85;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${Math.min(def.w, def.h) * T * 0.5}px "Apple Color Emoji", sans-serif`;
  ctx.fillText(def.icon, px + (def.w * T) / 2, py + (def.h * T) / 2);
  ctx.fillStyle = '#ffffff';
  if (def.category === 'belt') {
    arrow(ctx, px + T / 2, py + T / 2, ghost.rot, T * 0.3);
  } else if (hasOutputArrow(def)) {
    const [ox, oy] = outputCell(def, ghost.x, ghost.y, ghost.rot);
    arrow(ctx, (ox + 0.5) * T - cam.x, (oy + 0.5) * T - cam.y, ghost.rot, T * 0.25);
  }
  // Reichweite von Türmen
  if (def.turret) {
    ctx.strokeStyle = 'rgba(255,107,107,0.6)';
    ctx.beginPath();
    ctx.arc(px + (def.w * T) / 2, py + (def.h * T) / 2, def.turret.range * T, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function hasOutputArrow(def: MachineDef): boolean {
  return ['drill', 'pump', 'furnace', 'assembler', 'chemical', 'terminal', 'splitter'].includes(def.category);
}

function isProducer(def: MachineDef): boolean {
  return ['drill', 'pump', 'furnace', 'assembler', 'chemical', 'lab', 'generator'].includes(def.category);
}

function shade(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const f = (c: number) => Math.round(amount >= 0 ? c + (255 - c) * amount : c * (1 + amount));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}

/** Für das UI: Rezept-Ausgabe eines Laufzeitobjekts. */
export function recipeOutput(rt: Runtime): string | null {
  const r = rt.recipe ?? (rt.entity.recipe ? RECIPES[rt.entity.recipe] : null);
  return r ? Object.keys(r.outputs)[0] : null;
}
