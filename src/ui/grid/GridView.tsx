import { useContext, useEffect, useRef } from 'react';
import { fmt } from '../../core/format';
import type { Dir } from '../../core/state';
import { MACHINES } from '../../data/machines';
import { RESOURCES } from '../../data/resources';
import { dirBetween } from '../../sim/geometry';
import { amountOf } from '../../systems/inventory';
import { GameContext } from '../useGame';
import { render, type Camera, type Floater, type Ghost } from './render';
import type { Meteor } from '../../core/state';
import { drawThreats } from './drawThreats';
import type { SkillId } from '../../data/skills';
import type { Game } from '../../core/game';
import { rotateBlueprint } from '../../systems/blueprints';

function drawBlueprintOverlay(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  game: Game,
  mode: BlueprintMode,
  rect: [number, number, number, number] | null,
  hover: [number, number] | null,
): void {
  const T = cam.tile;
  if (mode?.mode === 'select' && rect) {
    const [x0, y0, x1, y1] = rect;
    const x = Math.min(x0, x1);
    const y = Math.min(y0, y1);
    ctx.fillStyle = 'rgba(79,209,255,0.12)';
    ctx.strokeStyle = '#4fd1ff';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.fillRect(x * T - cam.x, y * T - cam.y, (Math.abs(x1 - x0) + 1) * T, (Math.abs(y1 - y0) + 1) * T);
    ctx.strokeRect(x * T - cam.x, y * T - cam.y, (Math.abs(x1 - x0) + 1) * T, (Math.abs(y1 - y0) + 1) * T);
    ctx.setLineDash([]);
  }
  if (mode?.mode === 'paste' && hover) {
    const blueprint = game.state.blueprints.find((b) => b.id === mode.id);
    if (!blueprint) return;
    const rotated = rotateBlueprint(blueprint, mode.rot);
    const have = new Map<string, number>();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const e of rotated.entities) {
      const def = MACHINES[e.type];
      const x = hover[0] + e.dx;
      const y = hover[1] + e.dy;
      const used = (have.get(e.type) ?? 0) + 1;
      have.set(e.type, used);
      const ok = !game.world.canPlace(e.type, x, y) && amountOf(game.planet, e.type).gte(used);
      ctx.fillStyle = ok ? 'rgba(91,224,138,0.3)' : 'rgba(255,107,107,0.35)';
      ctx.fillRect(x * T - cam.x, y * T - cam.y, def.w * T, def.h * T);
      if (T >= 12) {
        ctx.globalAlpha = 0.8;
        ctx.font = `${Math.min(def.w, def.h) * T * 0.45}px "Apple Color Emoji", sans-serif`;
        ctx.fillText(def.icon, (x + def.w / 2) * T - cam.x, (y + def.h / 2) * T - cam.y);
        ctx.globalAlpha = 1;
      }
    }
  }
}

function drawFx(ctx: CanvasRenderingContext2D, cam: Camera, game: Game): void {
  const T = cam.tile;
  for (const f of game.fx) {
    if (f.planet !== game.state.activePlanet) continue;
    const a = Math.min(1, f.t / Math.min(0.5, f.max));
    ctx.strokeStyle = `rgba(${f.color},${0.8 * a})`;
    ctx.fillStyle = `rgba(${f.color},${0.15 * a})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(f.x * T - cam.x, f.y * T - cam.y, f.r * T, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

function drawMeteor(ctx: CanvasRenderingContext2D, cam: Camera, meteor: Meteor | null, planet: string, time: number): void {
  if (!meteor || meteor.planet !== planet) return;
  const T = cam.tile;
  const cx = (meteor.x + 0.5) * T - cam.x;
  const cy = (meteor.y + 0.5) * T - cam.y;
  const fade = Math.min(1, meteor.ttl / 3);
  const pulse = 1 + Math.sin(time * 5) * 0.12;
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, T * 1.8 * pulse);
  glow.addColorStop(0, `rgba(255,190,90,${0.85 * fade})`);
  glow.addColorStop(0.4, `rgba(255,120,40,${0.4 * fade})`);
  glow.addColorStop(1, 'rgba(255,80,20,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, T * 1.8 * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = fade;
  ctx.font = `${T * 1.1}px "Apple Color Emoji", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('☄️', cx, cy);
  ctx.globalAlpha = 1;
}

export interface Tool {
  type: string;
  rot: Dir;
}

/** Blaupausen-Modus: Bereich wählen oder eine Blaupause einfügen. */
export type BlueprintMode = { mode: 'select' } | { mode: 'paste'; id: number; rot: number } | null;

interface Props {
  blueprint?: BlueprintMode;
  setBlueprint?: (b: BlueprintMode) => void;
  /** Skill, für den gerade ein Ziel gewählt wird. */
  skillTarget?: SkillId | null;
  setSkillTarget?: (s: SkillId | null) => void;
  tool: Tool | null;
  setTool: (t: Tool | null) => void;
  selected: number | null;
  setSelected: (id: number | null) => void;
  setHint: (hint: string | null) => void;
}

/** Kamera pro Planet merken, damit sie Tab-Wechsel übersteht. */
const cameras = new Map<string, Camera>();

const MIN_TILE = 8;
const MAX_TILE = 72;

export function GridView({ tool, setTool, selected, setSelected, setHint, skillTarget = null, setSkillTarget, blueprint = null, setBlueprint }: Props) {
  const game = useContext(GameContext)!;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const toolRef = useRef(tool);
  const selectedRef = useRef(selected);
  const skillRef = useRef(skillTarget);
  const bpRef = useRef(blueprint);
  bpRef.current = blueprint;
  const bpRect = useRef<[number, number, number, number] | null>(null);
  const mouseRef = useRef<[number, number] | null>(null);
  toolRef.current = tool;
  selectedRef.current = selected;
  skillRef.current = skillTarget;

  const hoverRef = useRef<[number, number] | null>(null);
  const floatersRef = useRef<Floater[]>([]);
  const camRef = useRef<Camera | null>(null);
  const dragRef = useRef<{
    mode: 'pan' | 'paint' | 'erase' | 'click';
    startX: number;
    startY: number;
    camX: number;
    camY: number;
    lastCell: [number, number] | null;
    lastPlaced: number | null;
    moved: boolean;
  } | null>(null);

  const camera = (): Camera => {
    const planetId = game.state.activePlanet;
    let cam = cameras.get(planetId);
    if (!cam) {
      const canvas = canvasRef.current;
      const t = game.terrain;
      const tile = 30;
      const w = canvas?.clientWidth ?? 800;
      const h = canvas?.clientHeight ?? 600;
      cam = { x: (t.hub.x + 1.5) * tile - w / 2, y: (t.hub.y + 1.5) * tile - h / 2, tile };
      cameras.set(planetId, cam);
    }
    camRef.current = cam;
    return cam;
  };

  const cellAt = (clientX: number, clientY: number): [number, number] => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const cam = camera();
    return [Math.floor((clientX - rect.left + cam.x) / cam.tile), Math.floor((clientY - rect.top + cam.y) / cam.tile)];
  };

  /** Ankerzelle für mehrfeldrige Gebäude: Mauszeiger in der Mitte. */
  const anchorFor = (type: string, cell: [number, number]): [number, number] => {
    const def = MACHINES[type];
    return [cell[0] - Math.floor((def.w - 1) / 2), cell[1] - Math.floor((def.h - 1) / 2)];
  };

  const ghost = (): Ghost | null => {
    const t = toolRef.current;
    const hover = hoverRef.current;
    if (!t || !hover) return null;
    const [x, y] = anchorFor(t.type, hover);
    const ok = !game.world.canPlace(t.type, x, y) && amountOf(game.planet, t.type).gte(1);
    return { type: t.type, x, y, rot: t.rot, ok };
  };

  const updateHint = () => {
    const t = toolRef.current;
    const hover = hoverRef.current;
    if (t && hover) {
      const [x, y] = anchorFor(t.type, hover);
      const error = amountOf(game.planet, t.type).lt(1)
        ? `Kein ${MACHINES[t.type].name} im Inventar – in der Handfertigung herstellen`
        : game.world.canPlace(t.type, x, y);
      setHint(error ? `⚠ ${error}` : `${MACHINES[t.type].name}: Linksklick bauen · R drehen · Rechtsklick/Esc abbrechen`);
      return;
    }
    if (hover) {
      const e = game.world.entityAt(hover[0], hover[1]);
      if (e) {
        setHint(`${MACHINES[e.type].name}: Klick auswählen · R drehen · Q kopieren · Rechtsklick abreißen`);
        return;
      }
      const ore = game.terrain.ore[hover[1] * game.terrain.width + hover[0]];
      if (ore && game.world.inBounds(hover[0], hover[1])) {
        const res = RESOURCES[game.terrain.resources[ore - 1]];
        setHint(res.category === 'fluid' ? `${res.name}: mit einer Förderpumpe fördern` : `${res.name}: Klicken zum Abbauen`);
        return;
      }
    }
    setHint(null);
  };

  // Zeichenschleife
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    let frame = 0;
    const loop = (now: number) => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const time = now / 1000;
      floatersRef.current = floatersRef.current.filter((f) => time - f.born < 1.3);
      render(ctx, {
        world: game.world,
        cam: camera(),
        width: w,
        height: h,
        time,
        hover: hoverRef.current,
        selected: selectedRef.current,
        ghost: ghost(),
        floaters: floatersRef.current,
        showGrid: game.state.settings.showGrid,
        overlay: (c, input) => {
          drawThreats(c, input.cam, game.world.threat, time);
          drawFx(c, input.cam, game);
          drawBlueprintOverlay(c, input.cam, game, bpRef.current, bpRect.current, hoverRef.current);
          // Zielbereich eines Skills
          const sk = skillRef.current;
          const mouse = mouseRef.current;
          if (sk && mouse) {
            const r = game.skillParams(sk).radius || 1;
            const T = input.cam.tile;
            c.strokeStyle = 'rgba(255,210,77,0.9)';
            c.fillStyle = 'rgba(255,210,77,0.12)';
            c.lineWidth = 2;
            c.beginPath();
            c.arc(mouse[0] * T - input.cam.x, mouse[1] * T - input.cam.y, r * T, 0, Math.PI * 2);
            c.fill();
            c.stroke();
          }
          drawMeteor(c, input.cam, game.state.loot.meteor, game.state.activePlanet, time);
          // Reichweite des ausgewählten Turms
          const sel = selectedRef.current ? game.world.runtimes.get(selectedRef.current) : null;
          if (sel?.def.turret) {
            const T = input.cam.tile;
            c.strokeStyle = 'rgba(255,107,107,0.5)';
            c.setLineDash([4, 4]);
            c.beginPath();
            c.arc((sel.entity.x + sel.def.w / 2) * T - input.cam.x, (sel.entity.y + sel.def.h / 2) * T - input.cam.y, sel.def.turret.range * sel.stats.range * T, 0, Math.PI * 2);
            c.stroke();
            c.setLineDash([]);
          }
        },
      });
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game]);

  // Tastatur
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      const hover = hoverRef.current;
      const hovered = hover ? game.world.entityAt(hover[0], hover[1]) : null;
      const key = e.key.toLowerCase();
      const bpMode = bpRef.current;
      if (key === 'b') {
        setBlueprint?.(bpMode ? null : { mode: 'select' });
        setTool(null);
      } else if (key === 'r' && bpMode?.mode === 'paste') {
        setBlueprint?.({ ...bpMode, rot: (bpMode.rot + (e.shiftKey ? 3 : 1)) % 4 });
      } else if (key === 'r') {
        const t = toolRef.current;
        if (t) setTool({ ...t, rot: (((t.rot + (e.shiftKey ? 3 : 1)) % 4) as Dir) });
        else if (hovered) game.rotateEntity(hovered.id);
      } else if (key === 'escape') {
        setTool(null);
        setSelected(null);
        setSkillTarget?.(null);
        setBlueprint?.(null);
      } else if (key === 'q') {
        if (toolRef.current) setTool(null);
        else if (hovered && MACHINES[hovered.type].buildable) setTool({ type: hovered.type, rot: hovered.rot });
      } else if ((key === 'x' || key === 'delete' || key === 'backspace') && hovered) {
        game.deconstruct(hovered.id);
        if (selectedRef.current === hovered.id) setSelected(null);
      } else {
        return;
      }
      updateHint();
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, setTool, setSelected]);

  useEffect(updateHint, [tool]); // eslint-disable-line react-hooks/exhaustive-deps

  const placeAt = (cell: [number, number], rot: Dir): number | null => {
    const t = toolRef.current!;
    const [x, y] = anchorFor(t.type, cell);
    if (game.build(t.type, x, y, rot)) return null;
    return game.world.entityAt(x, y)?.id ?? null;
  };

  const worldPos = (clientX: number, clientY: number): [number, number] => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const cam = camera();
    return [(clientX - rect.left + cam.x) / cam.tile, (clientY - rect.top + cam.y) / cam.tile];
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const canvas = canvasRef.current!;
    canvas.setPointerCapture(e.pointerId);
    const cell = cellAt(e.clientX, e.clientY);
    const bpMode = bpRef.current;
    if (bpMode) {
      if (e.button !== 0) {
        setBlueprint?.(null);
        return;
      }
      if (bpMode.mode === 'select') {
        bpRect.current = [cell[0], cell[1], cell[0], cell[1]];
      } else {
        const r = game.pasteBlueprint(bpMode.id, cell[0], cell[1], bpMode.rot);
        setHint(r.skipped ? `⚠ ${r.placed} platziert, ${r.skipped} übersprungen (kein Platz oder kein Item im Inventar)` : `${r.placed} Gebäude platziert`);
      }
      return;
    }
    if (skillRef.current) {
      if (e.button === 0) {
        const [wx, wy] = worldPos(e.clientX, e.clientY);
        game.castSkill(skillRef.current, wx, wy);
      }
      setSkillTarget?.(null);
      return;
    }
    const cam = camera();
    const base = { startX: e.clientX, startY: e.clientY, camX: cam.x, camY: cam.y, lastCell: cell, lastPlaced: null, moved: false };

    if (e.button === 1) {
      dragRef.current = { mode: 'pan', ...base };
      return;
    }
    if (e.button === 2) {
      if (toolRef.current) {
        setTool(null);
        dragRef.current = null;
        return;
      }
      dragRef.current = { mode: 'erase', ...base };
      const hovered = game.world.entityAt(cell[0], cell[1]);
      if (hovered) {
        game.deconstruct(hovered.id);
        if (selectedRef.current === hovered.id) setSelected(null);
      }
      return;
    }
    if (toolRef.current) {
      const id = placeAt(cell, toolRef.current.rot);
      dragRef.current = { mode: 'paint', ...base, lastPlaced: id };
      updateHint();
      return;
    }
    dragRef.current = { mode: 'click', ...base };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    mouseRef.current = worldPos(e.clientX, e.clientY);
    const cell = cellAt(e.clientX, e.clientY);
    const prevHover = hoverRef.current;
    hoverRef.current = cell;
    if (!prevHover || prevHover[0] !== cell[0] || prevHover[1] !== cell[1]) updateHint();

    if (bpRect.current) {
      bpRect.current = [bpRect.current[0], bpRect.current[1], cell[0], cell[1]];
      return;
    }
    const drag = dragRef.current;
    if (!drag) return;
    const dist = Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY);
    if (drag.mode === 'click' && dist > 5) drag.mode = 'pan';
    if (drag.mode === 'pan') {
      const cam = camera();
      cam.x = drag.camX - (e.clientX - drag.startX);
      cam.y = drag.camY - (e.clientY - drag.startY);
      drag.moved = true;
      return;
    }
    const last = drag.lastCell;
    if (!last || (last[0] === cell[0] && last[1] === cell[1])) return;

    if (drag.mode === 'erase') {
      const hovered = game.world.entityAt(cell[0], cell[1]);
      if (hovered) game.deconstruct(hovered.id);
      drag.lastCell = cell;
      return;
    }

    if (drag.mode === 'paint' && toolRef.current) {
      const t = toolRef.current;
      const isBelt = MACHINES[t.type].category === 'belt';
      // Zelle für Zelle bis zur Mausposition laufen, damit keine Lücken entstehen
      let cur: [number, number] = last;
      while (cur[0] !== cell[0] || cur[1] !== cell[1]) {
        const dir = dirBetween(cur[0], cur[1], cell[0], cell[1])!;
        const next: [number, number] = [cur[0] + (dir === 0 ? 1 : dir === 2 ? -1 : 0), cur[1] + (dir === 1 ? 1 : dir === 3 ? -1 : 0)];
        if (isBelt) {
          // Vorheriges Band zeigt auf das neue
          if (drag.lastPlaced) game.setRotation(drag.lastPlaced, dir);
          drag.lastPlaced = placeAt(next, dir);
          if (t.rot !== dir) setTool({ ...t, rot: dir });
          toolRef.current = { ...t, rot: dir };
        } else {
          placeAt(next, t.rot);
        }
        cur = next;
      }
      drag.lastCell = cell;
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (bpRect.current) {
      const [x0, y0, x1, y1] = bpRect.current;
      bpRect.current = null;
      const created = game.createBlueprint(x0, y0, x1, y1);
      if (created) {
        setBlueprint?.({ mode: 'paste', id: created.id, rot: 0 });
        setHint(`${created.name} erstellt (${created.entities.length} Gebäude) – klicke zum Einfügen, R dreht`);
      } else {
        setBlueprint?.(null);
        setHint('⚠ Keine Gebäude im Bereich');
      }
      return;
    }
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag || drag.mode !== 'click') return;
    const cell = cellAt(e.clientX, e.clientY);
    const meteor = game.state.loot.meteor;
    if (meteor && meteor.planet === game.state.activePlanet && Math.abs(meteor.x - cell[0]) <= 1 && Math.abs(meteor.y - cell[1]) <= 1) {
      game.clickMeteor();
      return;
    }
    const entity = game.world.entityAt(cell[0], cell[1]);
    if (entity) {
      setSelected(entity.id);
      return;
    }
    const mined = game.mineTile(cell[0], cell[1]);
    if (mined) {
      floatersRef.current.push({
        x: cell[0],
        y: cell[1],
        text: `+${fmt(mined.amount)} ${RESOURCES[mined.resource].name}`,
        color: RESOURCES[mined.resource].color,
        born: performance.now() / 1000,
      });
    } else {
      setSelected(null);
    }
  };

  const onWheel = (e: React.WheelEvent) => {
    const cam = camera();
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const factor = Math.exp(-e.deltaY * 0.0015);
    const tile = Math.min(MAX_TILE, Math.max(MIN_TILE, cam.tile * factor));
    const wx = (mx + cam.x) / cam.tile;
    const wy = (my + cam.y) / cam.tile;
    cam.tile = tile;
    cam.x = wx * tile - mx;
    cam.y = wy * tile - my;
  };

  return (
    <canvas
      ref={canvasRef}
      className="grid-canvas"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={() => {
        hoverRef.current = null;
        updateHint();
      }}
      onWheel={onWheel}
      onContextMenu={(e) => e.preventDefault()}
    />
  );
}
