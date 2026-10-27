import type { Rng } from '../core/rng';
import type { Flag } from '../engine/types';
import { BOSSES, ENEMIES, THREAT_MODS, tierScale, type BossDef, type EnemyDef, type Resists } from '../data/enemies';
import { DAMAGE_TYPE_NAMES, type DamageType } from '../data/machines';
import { amountOf } from '../systems/inventory';
import type { PlanetWorld, Runtime } from './world';

export interface Enemy {
  id: number;
  def: EnemyDef;
  boss: BossDef | null;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  resists: Resists;
  dps: number;
  speed: number;
  target: number | null;
  retarget: number;
  /** Boss-Mechanik-Timer, Unverwundbarkeit, Splitter-Stufen. */
  timer: number;
  invulnerable: number;
  splits: number;
  burn: { dps: number; t: number } | null;
  shock: number;
  /** Stasisfeld: Restdauer. */
  stasis: number;
}

export interface Projectile {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  t: number;
}

export interface Hazard {
  x: number;
  y: number;
  r: number;
  dps: number;
  t: number;
}

export interface BossFight {
  bossId: string;
  tier: number;
  mods: string[];
  /** Zusätzliche Beutemenge in Prozent. */
  lootBonus: number;
}

export interface ThreatContext {
  dt: number;
  rng: Rng;
  flags: ReadonlySet<Flag>;
  statsFor: (rt: Runtime) => Runtime['stats'];
  onKill: (enemy: Enemy, fight: BossFight | null) => void;
  /** Leistungsfaktor des Stromnetzes (0–1). */
  powerFactor: number;
}

export const DAMAGE_COLORS: Record<DamageType, string> = {
  kinetic: '#ffd27a',
  thermal: '#ff6b3d',
  em: '#7ac8ff',
  plasma: '#ff7ad9',
  void: '#9a6bff',
};

/** Effektiver Schaden nach Resistenz und Durchdringung. */
export function mitigate(damage: number, type: DamageType, resists: Resists, penetration: number, shocked: boolean): number {
  let res = (resists[type] ?? 0) - penetration;
  if (type === 'void') res *= 0.5;
  res = Math.min(90, res);
  return damage * (1 - res / 100) * (shocked ? 1.15 : 1);
}

export class ThreatSystem {
  enemies: Enemy[] = [];
  projectiles: Projectile[] = [];
  hazards: Hazard[] = [];
  fight: BossFight | null = null;
  private nextId = 1;
  private turretCooldown = new Map<number, number>();
  private quietTime = 0;

  get active(): boolean {
    return this.enemies.length > 0;
  }

  /** Langsamere Bänder durch Bedrohungsmodifikatoren. */
  get beltFactor(): number {
    if (!this.fight) return 1;
    const slow = this.fight.mods.reduce((s, id) => s + (THREAT_MODS.find((m) => m.id === id)?.beltSlow ?? 0), 0);
    return 1 - slow / 100;
  }

  private modSum(key: 'hp' | 'dps' | 'speed' | 'resist'): number {
    if (!this.fight) return 0;
    return this.fight.mods.reduce((s, id) => s + (THREAT_MODS.find((m) => m.id === id)?.[key] ?? 0), 0);
  }

  spawn(world: PlanetWorld, defId: string, scale: number, rng: Rng, at?: { x: number; y: number }): Enemy {
    const boss = BOSSES[defId] ?? null;
    const def = boss ?? ENEMIES[defId];
    const { width, height } = world.terrain;
    let x: number;
    let y: number;
    if (at) {
      x = at.x + rng.range(-1, 1);
      y = at.y + rng.range(-1, 1);
    } else {
      // Zufälliger Punkt am Rand
      const side = Math.floor(rng.next() * 4);
      const t = rng.next();
      x = side === 0 ? 0.5 : side === 1 ? width - 0.5 : t * width;
      y = side === 2 ? 0.5 : side === 3 ? height - 0.5 : t * height;
    }
    const hpMult = scale * (1 + this.modSum('hp') / 100);
    const resistBonus = this.modSum('resist');
    const resists: Resists = {};
    for (const type of Object.keys(DAMAGE_TYPE_NAMES) as DamageType[]) resists[type] = (def.resists[type] ?? 0) + resistBonus;
    const enemy: Enemy = {
      id: this.nextId++,
      def,
      boss,
      x,
      y,
      hp: def.hp * hpMult,
      maxHp: def.hp * hpMult,
      resists,
      dps: def.dps * Math.sqrt(scale) * (1 + this.modSum('dps') / 100),
      speed: def.speed * (1 + this.modSum('speed') / 100),
      target: null,
      retarget: 0,
      timer: 0,
      invulnerable: 0,
      splits: 0,
      burn: null,
      shock: 0,
      stasis: 0,
    };
    this.enemies.push(enemy);
    return enemy;
  }

  startBoss(world: PlanetWorld, fight: BossFight, rng: Rng): Enemy {
    this.fight = fight;
    const boss = BOSSES[fight.bossId];
    const e = this.spawn(world, fight.bossId, tierScale(fight.tier), rng);
    if (fight.mods.includes('horde')) {
      const minion = boss.minion ?? world.terrain.planet.enemy;
      for (let i = 0; i < 6; i++) this.spawn(world, minion, tierScale(fight.tier), rng, e);
    }
    return e;
  }

  maxHp(rt: Runtime): number {
    return rt.def.hp * rt.stats.hp;
  }

  private damageBuilding(rt: Runtime, amount: number): void {
    const max = this.maxHp(rt);
    rt.entity.hp = Math.max(0, (rt.entity.hp ?? max) - amount);
  }

  tick(world: PlanetWorld, ctx: ThreatContext): void {
    const { dt } = ctx;
    this.projectiles = this.projectiles.filter((p) => (p.t -= dt) > 0);
    this.hazards = this.hazards.filter((h) => (h.t -= dt) > 0);

    const buildings = world.entities.filter((rt) => rt.def.category !== 'belt' && rt.def.category !== 'splitter');
    const storm = this.enemies.some((e) => e.boss?.mechanic === 'storm');

    // ----- Gegner -----
    for (const e of this.enemies) {
      if (e.invulnerable > 0) e.invulnerable -= dt;
      if (e.shock > 0) e.shock -= dt;
      if (e.stasis > 0) {
        e.stasis -= dt;
        continue;
      }
      if (e.burn) {
        e.hp -= e.burn.dps * dt;
        e.burn.t -= dt;
        if (e.burn.t <= 0) e.burn = null;
      }
      if (e.boss) this.bossMechanic(world, e, ctx);

      e.retarget -= dt;
      let target = e.target !== null ? world.runtimes.get(e.target) : undefined;
      if (!target || (target.entity.hp ?? 1) <= 0 || e.retarget <= 0) {
        e.retarget = 1;
        target = nearest(buildings.filter((b) => (b.entity.hp ?? 1) > 0), e.x, e.y);
        e.target = target?.entity.id ?? null;
      }
      if (!target || e.invulnerable > 0) continue;
      const cx = target.entity.x + target.def.w / 2;
      const cy = target.entity.y + target.def.h / 2;
      const dist = Math.hypot(cx - e.x, cy - e.y);
      const reach = e.def.size + Math.max(target.def.w, target.def.h) / 2 + 0.1;
      if (dist > reach + 0.02) {
        const step = Math.min(dist - reach, e.speed * (storm ? 1.2 : 1) * dt);
        e.x += ((cx - e.x) / dist) * step;
        e.y += ((cy - e.y) / dist) * step;
      } else {
        this.damageBuilding(target, e.dps * dt);
      }
    }

    // ----- Gefahrenzonen (Lava) -----
    for (const h of this.hazards) {
      for (const rt of buildings) {
        const cx = rt.entity.x + rt.def.w / 2;
        const cy = rt.entity.y + rt.def.h / 2;
        if (Math.hypot(cx - h.x, cy - h.y) < h.r + rt.def.w / 2) this.damageBuilding(rt, h.dps * dt);
      }
    }

    // ----- Türme -----
    for (const rt of world.entities) {
      const spec = rt.def.turret;
      if (!spec) continue;
      const s = ctx.statsFor(rt);
      const destroyed = (rt.entity.hp ?? 1) <= 0;
      const range = spec.range * s.range * (storm ? 0.7 : 1);
      const cx = rt.entity.x + rt.def.w / 2;
      const cy = rt.entity.y + rt.def.h / 2;
      const inRange = destroyed ? [] : this.enemies.filter((e) => e.hp > 0 && Math.hypot(e.x - cx, e.y - cy) <= range);
      rt.load = rt.def.power > 0 ? (inRange.length ? 1 : 0.05) : 0;
      if (destroyed) continue;
      let cd = (this.turretCooldown.get(rt.entity.id) ?? 0) - dt * (rt.def.power > 0 ? ctx.powerFactor : 1);
      if (inRange.length === 0) {
        rt.status = 'idle';
        this.turretCooldown.set(rt.entity.id, Math.max(0, cd));
        continue;
      }
      if (cd > 0) {
        this.turretCooldown.set(rt.entity.id, cd);
        rt.status = 'working';
        continue;
      }
      if (rt.def.power > 0 && ctx.powerFactor < 0.05) {
        rt.status = 'no_power';
        continue;
      }
      if (spec.ammo) {
        const need = s.ammoUse;
        if (amountOf(world.state, spec.ammo).lt(need)) {
          rt.status = 'no_input';
          continue;
        }
        world.state.inventory[spec.ammo] = amountOf(world.state, spec.ammo).sub(need);
        world.recordNet(spec.ammo, -need);
      }
      const target = inRange.reduce((a, b) => (Math.hypot(a.x - cx, a.y - cy) <= Math.hypot(b.x - cx, b.y - cy) ? a : b));
      const critEv = 1 + s.critChance * (s.critMulti - 1);
      const dmg = spec.damage * s.damage * critEv;
      this.hit(target, dmg, spec.damageType, s.penetration);
      this.projectiles.push({ x1: cx, y1: cy, x2: target.x, y2: target.y, color: DAMAGE_COLORS[spec.damageType], t: 0.12 });
      // Kettenblitz: EM springt auf bis zu 3 weitere Gegner
      if (spec.damageType === 'em' && ctx.flags.has('chainLightning')) {
        let from = target;
        const hitIds = new Set([target.id]);
        for (let k = 0; k < 3; k++) {
          const next = this.enemies.filter((e) => !hitIds.has(e.id) && e.hp > 0 && Math.hypot(e.x - from.x, e.y - from.y) < 4);
          if (!next.length) break;
          const n = nearest(next.map((e) => ({ e, x: e.x, y: e.y })), from.x, from.y)!.e;
          this.hit(n, dmg * 0.6, 'em', s.penetration);
          this.projectiles.push({ x1: from.x, y1: from.y, x2: n.x, y2: n.y, color: DAMAGE_COLORS.em, t: 0.12 });
          hitIds.add(n.id);
          from = n;
        }
      }
      cd = 1 / (spec.fireRate * s.fireRate);
      this.turretCooldown.set(rt.entity.id, cd);
      rt.status = 'working';
    }

    // ----- Tote Gegner -----
    const dead = this.enemies.filter((e) => e.hp <= 0);
    if (dead.length) {
      this.enemies = this.enemies.filter((e) => e.hp > 0);
      for (const e of dead) {
        ctx.onKill(e, e.boss ? this.fight : null);
        if (e.boss) this.fight = null;
      }
    }
    if (this.fight && !this.enemies.some((e) => e.boss)) this.fight = null;

    // ----- Reparatur, wenn Ruhe herrscht -----
    if (this.enemies.length === 0) {
      this.quietTime += dt;
      if (this.quietTime > 5) {
        for (const rt of world.entities) {
          if (rt.entity.hp === undefined) continue;
          const max = this.maxHp(rt);
          rt.entity.hp = Math.min(max, rt.entity.hp + max * 0.05 * dt);
          if (rt.entity.hp >= max) rt.entity.hp = undefined;
        }
      }
    } else {
      this.quietTime = 0;
    }
  }

  hit(e: Enemy, damage: number, type: DamageType, penetration: number): void {
    if (e.invulnerable > 0) return;
    e.hp -= mitigate(damage, type, e.resists, penetration, e.shock > 0) * (e.stasis > 0 ? 1.3 : 1);
    if (type === 'thermal') e.burn = { dps: damage * 0.2, t: 3 };
    if (type === 'em') e.shock = 2;
  }

  private bossMechanic(world: PlanetWorld, e: Enemy, ctx: ThreatContext): void {
    const boss = e.boss!;
    const { rng, dt } = ctx;
    e.timer += dt;
    switch (boss.mechanic) {
      case 'burrow':
        if (e.timer >= 12) {
          e.timer = 0;
          e.invulnerable = 3;
          const t = world.terrain;
          e.x = rng.range(2, t.width - 2);
          e.y = rng.range(2, t.height - 2);
          e.target = null;
        }
        break;
      case 'lava':
        if (e.timer >= 8) {
          e.timer = 0;
          this.hazards.push({ x: e.x, y: e.y, r: 1.6, dps: e.dps * 0.3, t: 15 });
        }
        break;
      case 'freeze':
        if (e.timer >= 10) {
          e.timer = 0;
          for (const rt of world.entities) {
            const cx = rt.entity.x + rt.def.w / 2;
            const cy = rt.entity.y + rt.def.h / 2;
            if (Math.hypot(cx - e.x, cy - e.y) < 4.5) rt.downtime = Math.max(rt.downtime, 5);
          }
        }
        break;
      case 'split': {
        const thresholds = [0.5, 0.25];
        if (e.splits < thresholds.length && e.hp / e.maxHp < thresholds[e.splits]) {
          e.splits++;
          for (let i = 0; i < 6; i++) this.spawn(world, boss.minion!, Math.sqrt(e.maxHp / boss.hp), rng, e);
        }
        break;
      }
      case 'spawn':
        if (e.timer >= 8) {
          e.timer = 0;
          for (let i = 0; i < 2; i++) this.spawn(world, boss.minion!, Math.sqrt(e.maxHp / boss.hp), rng, e);
        }
        break;
      case 'void':
        if (e.timer >= 10) {
          e.timer = 0;
          const types = Object.keys(DAMAGE_TYPE_NAMES) as DamageType[];
          const weak = types[Math.floor(rng.next() * types.length)];
          for (const t of types) e.resists[t] = t === weak ? -50 : 60;
        }
        break;
      case 'storm':
        break;
    }
  }
}

function nearest<T extends { x?: number; y?: number; entity?: { x: number; y: number }; def?: { w: number; h: number } }>(list: T[], x: number, y: number): T | undefined {
  let best: T | undefined;
  let bestD = Infinity;
  for (const item of list) {
    const ix = item.entity ? item.entity.x + (item.def?.w ?? 1) / 2 : item.x!;
    const iy = item.entity ? item.entity.y + (item.def?.h ?? 1) / 2 : item.y!;
    const d = Math.hypot(ix - x, iy - y);
    if (d < bestD) [best, bestD] = [item, d];
  }
  return best;
}
