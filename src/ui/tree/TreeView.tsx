import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { describeModifier } from '../../engine/describe';
import { pathTo, type TreeDef, type TreeNode } from '../../data/treeTypes';

export interface TreeViewProps {
  tree: TreeDef;
  allocated: ReadonlySet<string>;
  pointsLeft: number;
  onAllocate: (id: string) => void;
  onRefund: (id: string) => void;
  /** Knoten, die nicht betreten werden dürfen (z. B. fremde Aszendenzen). */
  blocked?: (id: string) => boolean;
  /** Startknoten, die eine Klasse als Wurzel hat. */
  search?: string;
  /** Zusätzliche Zeilen im Tooltip. */
  extraTooltip?: (node: TreeNode) => ReactNode;
  /** Farbe vergebener Knoten. */
  accent?: string;
}

interface View {
  x: number;
  y: number;
  scale: number;
}

const RADIUS: Record<TreeNode['kind'], number> = {
  start: 18,
  small: 8,
  notable: 14,
  keystone: 20,
  mastery: 13,
  socket: 12,
  ascendancy: 12,
};

export function TreeView({ tree, allocated, pointsLeft, onAllocate, onRefund, blocked, search, extraTooltip, accent = '#4fd1ff' }: TreeViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewRef = useRef<View | null>(null);
  const [hover, setHover] = useState<{ node: TreeNode; x: number; y: number } | null>(null);
  const hoverRef = useRef<TreeNode | null>(null);
  const dragRef = useRef<{ x: number; y: number; vx: number; vy: number; moved: boolean } | null>(null);
  const propsRef = useRef({ allocated, pointsLeft, blocked, search, accent });
  propsRef.current = { allocated, pointsLeft, blocked, search, accent };

  const nodes = useMemo(() => Object.values(tree.nodes), [tree]);

  const fit = () => {
    const canvas = canvasRef.current!;
    const xs = nodes.map((n) => n.x);
    const ys = nodes.map((n) => n.y);
    const minX = Math.min(...xs) - 60;
    const maxX = Math.max(...xs) + 60;
    const minY = Math.min(...ys) - 60;
    const maxY = Math.max(...ys) + 60;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const scale = Math.min(w / (maxX - minX), h / (maxY - minY), 1.4);
    viewRef.current = { scale, x: (minX + maxX) / 2 - w / 2 / scale, y: (minY + maxY) / 2 - h / 2 / scale };
  };

  // Ansicht beim Baumwechsel einpassen
  useEffect(() => {
    viewRef.current = null;
    setHover(null);
  }, [tree]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    let frame = 0;
    const draw = (now: number) => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      if (!viewRef.current && w > 0) fit();
      const view = viewRef.current;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      if (!view) {
        frame = requestAnimationFrame(draw);
        return;
      }
      const { allocated, pointsLeft, blocked, search, accent } = propsRef.current;
      const sx = (x: number) => (x - view.x) * view.scale;
      const sy = (y: number) => (y - view.y) * view.scale;
      const hovered = hoverRef.current;
      const path = hovered && !allocated.has(hovered.id) ? (pathTo(tree, allocated as Set<string>, hovered.id, blocked) ?? []) : [];
      const pathSet = new Set(path);
      const affordable = path.length <= pointsLeft;
      const term = search?.trim().toLowerCase();
      const pulse = 0.5 + 0.5 * Math.sin(now / 300);

      // Kanten
      for (const [a, b] of tree.edges) {
        const na = tree.nodes[a];
        const nb = tree.nodes[b];
        const both = allocated.has(a) && allocated.has(b);
        const onPath = (pathSet.has(a) || allocated.has(a)) && (pathSet.has(b) || allocated.has(b)) && (pathSet.has(a) || pathSet.has(b));
        ctx.strokeStyle = both ? accent : onPath ? (affordable ? 'rgba(91,224,138,0.9)' : 'rgba(255,107,107,0.8)') : 'rgba(80,100,130,0.45)';
        ctx.lineWidth = (both ? 4 : onPath ? 3 : 2) * Math.max(0.6, view.scale);
        ctx.beginPath();
        const ra = Math.hypot(na.x, na.y);
        const rb = Math.hypot(nb.x, nb.y);
        if (ra > 1 && Math.abs(ra - rb) < 1 && tree.arcCenter) {
          // Knoten auf demselben Ring: als Kreisbogen um den Mittelpunkt zeichnen
          let a0 = Math.atan2(na.y, na.x);
          let a1 = Math.atan2(nb.y, nb.x);
          let delta = a1 - a0;
          while (delta > Math.PI) delta -= Math.PI * 2;
          while (delta < -Math.PI) delta += Math.PI * 2;
          a1 = a0 + delta;
          if (delta < 0) [a0, a1] = [a1, a0];
          ctx.arc(sx(0), sy(0), ra * view.scale, a0, a1);
        } else {
          ctx.moveTo(sx(na.x), sy(na.y));
          ctx.lineTo(sx(nb.x), sy(nb.y));
        }
        ctx.stroke();
      }

      // Knoten
      for (const n of nodes) {
        const r = RADIUS[n.kind] * Math.max(0.55, view.scale);
        const x = sx(n.x);
        const y = sy(n.y);
        if (x < -40 || y < -40 || x > w + 40 || y > h + 40) continue;
        const isAlloc = allocated.has(n.id);
        const reachable = !isAlloc && (tree.neighbors.get(n.id) ?? []).some((m) => allocated.has(m)) && !blocked?.(n.id);
        const isBlocked = blocked?.(n.id) ?? false;
        const onPath = pathSet.has(n.id);
        const match = term && (n.name.toLowerCase().includes(term) || n.mods.some((m) => describeModifier(m).toLowerCase().includes(term)));

        ctx.beginPath();
        if (n.kind === 'keystone') polygon(ctx, x, y, r, 8, Math.PI / 8);
        else if (n.kind === 'mastery') polygon(ctx, x, y, r, 6, 0);
        else if (n.kind === 'socket') polygon(ctx, x, y, r, 4, 0);
        else ctx.arc(x, y, r, 0, Math.PI * 2);

        ctx.fillStyle = isAlloc ? accent : onPath ? (affordable ? 'rgba(91,224,138,0.5)' : 'rgba(255,107,107,0.4)') : isBlocked ? '#0b0f17' : '#141c2a';
        ctx.fill();
        ctx.lineWidth = (n.kind === 'small' ? 2 : 3) * Math.max(0.6, view.scale);
        ctx.strokeStyle = isAlloc
          ? n.kind === 'small'
            ? '#d8f6ff'
            : '#ffd24d'
          : reachable
            ? `rgba(216,228,242,${0.6 + pulse * 0.4})`
            : n.kind === 'keystone' || n.kind === 'notable'
              ? 'rgba(255,210,77,0.45)'
              : 'rgba(110,130,160,0.6)';
        ctx.stroke();

        if (match) {
          ctx.strokeStyle = '#ff7ad9';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(x, y, r + 6, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Beschriftung großer Knoten
        if ((n.kind !== 'small' || hovered?.id === n.id) && view.scale > 0.45) {
          ctx.font = `${n.kind === 'keystone' ? 600 : 500} ${Math.max(9, 11 * Math.min(1.2, view.scale))}px -apple-system, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillStyle = isAlloc ? '#ffffff' : 'rgba(200,215,235,0.75)';
          ctx.fillText(n.name, x, y + r + 4);
        }
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tree, nodes]);

  const nodeAt = (clientX: number, clientY: number): TreeNode | null => {
    const view = viewRef.current;
    const canvas = canvasRef.current;
    if (!view || !canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const wx = (clientX - rect.left) / view.scale + view.x;
    const wy = (clientY - rect.top) / view.scale + view.y;
    let best: TreeNode | null = null;
    let bestD = Infinity;
    for (const n of nodes) {
      const d = Math.hypot(n.x - wx, n.y - wy);
      const r = (RADIUS[n.kind] + 6) / Math.min(1, view.scale);
      if (d < r && d < bestD) [best, bestD] = [n, d];
    }
    return best;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const view = viewRef.current;
    if (!view) return;
    canvasRef.current!.setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, moved: false };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    const view = viewRef.current;
    if (drag && view) {
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (Math.hypot(dx, dy) > 4) drag.moved = true;
      if (drag.moved) {
        view.x = drag.vx - dx / view.scale;
        view.y = drag.vy - dy / view.scale;
        return;
      }
    }
    const node = nodeAt(e.clientX, e.clientY);
    hoverRef.current = node;
    const rect = canvasRef.current!.getBoundingClientRect();
    setHover(node ? { node, x: e.clientX - rect.left, y: e.clientY - rect.top } : null);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag?.moved) return;
    const node = nodeAt(e.clientX, e.clientY);
    if (!node) return;
    if (e.button === 2 || allocated.has(node.id)) onRefund(node.id);
    else onAllocate(node.id);
  };

  const onWheel = (e: React.WheelEvent) => {
    const view = viewRef.current;
    if (!view) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const wx = mx / view.scale + view.x;
    const wy = my / view.scale + view.y;
    view.scale = Math.min(2.5, Math.max(0.15, view.scale * Math.exp(-e.deltaY * 0.0015)));
    view.x = wx - mx / view.scale;
    view.y = wy - my / view.scale;
  };

  const path = hover && !allocated.has(hover.node.id) ? pathTo(tree, allocated as Set<string>, hover.node.id, blocked) : null;

  return (
    <div className="tree-view">
      <canvas
        ref={canvasRef}
        className="tree-canvas"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => {
          hoverRef.current = null;
          setHover(null);
        }}
        onWheel={onWheel}
        onContextMenu={(e) => e.preventDefault()}
      />
      <button className="tree-fit" onClick={() => (viewRef.current = null)} title="Ansicht einpassen">
        ⤢
      </button>
      {hover && (
        <div className="tree-tooltip" style={{ left: Math.min(hover.x + 16, (canvasRef.current?.clientWidth ?? 600) - 290), top: hover.y + 16 }}>
          <div className="tip-header">
            <span className={`tip-title ${hover.node.kind}`}>{hover.node.name}</span>
            <span className="tip-muted">{KIND_NAMES[hover.node.kind]}</span>
          </div>
          {hover.node.mods.length > 0 && (
            <ul className="tip-effects">
              {hover.node.mods.map((m, i) => (
                <li key={i}>{describeModifier(m)}</li>
              ))}
            </ul>
          )}
          {hover.node.description && <div className="tip-section warn small">{hover.node.description}</div>}
          {extraTooltip?.(hover.node)}
          <div className="tip-section tip-muted">
            {allocated.has(hover.node.id)
              ? 'Klicken zum Zurücknehmen'
              : path
                ? `Kostet ${path.length} Punkt${path.length === 1 ? '' : 'e'} · ${path.length <= pointsLeft ? 'Klicken zum Vergeben' : 'nicht genug Punkte'}`
                : 'Nicht erreichbar'}
          </div>
        </div>
      )}
    </div>
  );
}

const KIND_NAMES: Record<TreeNode['kind'], string> = {
  start: 'Start',
  small: 'Knoten',
  notable: 'Notable',
  keystone: 'Keystone',
  mastery: 'Meisterschaft',
  socket: 'Juwelsockel',
  ascendancy: 'Aszendenz',
};

function polygon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, sides: number, rotation: number): void {
  for (let i = 0; i <= sides; i++) {
    const a = rotation + (i / sides) * Math.PI * 2;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}
