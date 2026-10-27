import type { ThreatSystem } from '../../sim/threats';
import type { Camera } from './render';

export function drawThreats(ctx: CanvasRenderingContext2D, cam: Camera, threat: ThreatSystem, time: number): void {
  const T = cam.tile;
  const sx = (x: number) => x * T - cam.x;
  const sy = (y: number) => y * T - cam.y;

  // Lavapfützen
  for (const h of threat.hazards) {
    const g = ctx.createRadialGradient(sx(h.x), sy(h.y), 0, sx(h.x), sy(h.y), h.r * T);
    g.addColorStop(0, `rgba(255,120,30,${0.55 + 0.15 * Math.sin(time * 4)})`);
    g.addColorStop(1, 'rgba(255,60,20,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(sx(h.x), sy(h.y), h.r * T, 0, Math.PI * 2);
    ctx.fill();
  }

  // Geschosse
  ctx.lineCap = 'round';
  for (const p of threat.projectiles) {
    ctx.strokeStyle = p.color;
    ctx.globalAlpha = Math.min(1, p.t / 0.12);
    ctx.lineWidth = Math.max(1.5, T * 0.08);
    ctx.beginPath();
    ctx.moveTo(sx(p.x1), sy(p.y1));
    ctx.lineTo(sx(p.x2), sy(p.y2));
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Gegner
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const e of threat.enemies) {
    const r = e.def.size * T;
    const x = sx(e.x);
    const y = sy(e.y);
    ctx.globalAlpha = e.invulnerable > 0 ? 0.35 : 1;
    ctx.fillStyle = e.boss ? 'rgba(120,20,40,0.85)' : 'rgba(60,10,20,0.75)';
    ctx.strokeStyle = e.boss ? '#ff4d6d' : '#ff6b6b';
    ctx.lineWidth = e.boss ? 3 : 1.5;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.font = `${r * 1.3}px "Apple Color Emoji", sans-serif`;
    ctx.fillText(e.def.icon, x, y + r * 0.05);
    if (e.burn) {
      ctx.fillStyle = 'rgba(255,107,61,0.8)';
      ctx.beginPath();
      ctx.arc(x + r * 0.7, y - r * 0.7, Math.max(2, r * 0.18), 0, Math.PI * 2);
      ctx.fill();
    }
    if (e.shock > 0) {
      ctx.fillStyle = 'rgba(122,200,255,0.9)';
      ctx.beginPath();
      ctx.arc(x - r * 0.7, y - r * 0.7, Math.max(2, r * 0.18), 0, Math.PI * 2);
      ctx.fill();
    }
    // Lebensbalken
    const w = Math.max(T * 0.8, r * 2);
    const f = Math.max(0, e.hp / e.maxHp);
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(x - w / 2, y - r - T * 0.22, w, Math.max(3, T * 0.08));
    ctx.fillStyle = e.boss ? '#ff4d6d' : '#ff8a8a';
    ctx.fillRect(x - w / 2, y - r - T * 0.22, w * f, Math.max(3, T * 0.08));
    if (e.boss) {
      ctx.font = `600 ${Math.max(11, T * 0.4)}px -apple-system, sans-serif`;
      ctx.fillStyle = '#ffd0d8';
      ctx.fillText(e.boss.name, x, y - r - T * 0.55);
    }
    ctx.globalAlpha = 1;
  }
}
