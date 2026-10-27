import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export type PlanetStatus = 'colony' | 'reachable' | 'locked';

export interface MapPlanet {
  id: string;
  name: string;
  icon: string;
  status: PlanetStatus;
  active: boolean;
}

export interface MapRoute {
  id: number;
  from: string;
  to: string;
  /** Tatsächlicher Fluss in Items/s (bestimmt Anzahl und Tempo der Schiffe). */
  flow: number;
  color: string;
}

export interface MapData {
  planets: MapPlanet[];
  routes: MapRoute[];
}

interface Look {
  radius: number;
  orbit: number;
  /** Startwinkel auf der Umlaufbahn. */
  phase: number;
  colors: [string, string, string];
  glow: string;
  style: 'rock' | 'lava' | 'ice' | 'gas' | 'crystal' | 'jungle' | 'void';
  ring?: boolean;
  tilt: number;
}

const LOOKS: Record<string, Look> = {
  kepler: { radius: 1.0, orbit: 9, phase: 0.3, colors: ['#8a6a48', '#b48c5c', '#5a4632'], glow: '#ffcf8a', style: 'rock', tilt: 0.2 },
  ignis: { radius: 0.8, orbit: 12.5, phase: 2.2, colors: ['#3a1410', '#5a1c12', '#ff5a1f'], glow: '#ff6a2a', style: 'lava', tilt: 0.1 },
  cryon: { radius: 0.95, orbit: 16, phase: 4.1, colors: ['#cfeaff', '#8fc4ea', '#ffffff'], glow: '#a6dcff', style: 'ice', tilt: 0.35 },
  zephyr: { radius: 1.9, orbit: 21, phase: 1.2, colors: ['#4a5aa8', '#8a9ae0', '#c8b6ff'], glow: '#9ee6ff', style: 'gas', ring: true, tilt: 0.45 },
  prisma: { radius: 0.95, orbit: 25.5, phase: 5.3, colors: ['#7a4dd6', '#c9a6ff', '#59d6a3'], glow: '#c58bff', style: 'crystal', tilt: 0.25 },
  verdant: { radius: 1.15, orbit: 29.5, phase: 3.3, colors: ['#1f6a3a', '#3fa055', '#1d4f6a'], glow: '#6cc644', style: 'jungle', tilt: 0.15 },
  void: { radius: 1.1, orbit: 35, phase: 0.9, colors: ['#05030a', '#120a24', '#7a4dff'], glow: '#7a4dff', style: 'void', tilt: 0.6 },
};

const STATUS_COLOR: Record<PlanetStatus, number> = {
  colony: 0x5be08a,
  reachable: 0xffc857,
  locked: 0x4a5a72,
};

// ---------- Prozedurale Texturen ----------

function hash(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Einfaches Wertrauschen mit Oktaven (kachelbar in x). */
function noise(x: number, y: number, seed: number, period: number): number {
  let total = 0;
  let amp = 1;
  let norm = 0;
  let freq = 1;
  for (let o = 0; o < 4; o++) {
    const p = period * freq;
    const fx = x * freq;
    const fy = y * freq;
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const tx = fx - x0;
    const ty = fy - y0;
    const sx = tx * tx * (3 - 2 * tx);
    const sy = ty * ty * (3 - 2 * ty);
    const v = (ix: number, iy: number) => hash(((ix % p) + p) % p, iy, seed + o * 17);
    const a = v(x0, y0) * (1 - sx) + v(x0 + 1, y0) * sx;
    const b = v(x0, y0 + 1) * (1 - sx) + v(x0 + 1, y0 + 1) * sx;
    total += (a * (1 - sy) + b * sy) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return total / norm;
}

function mix(a: THREE.Color, b: THREE.Color, t: number): THREE.Color {
  return a.clone().lerp(b, Math.min(1, Math.max(0, t)));
}

function planetTexture(look: Look, seed: number): { map: THREE.CanvasTexture; emissive?: THREE.CanvasTexture } {
  const W = 256;
  const H = 128;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(W, H);
  const emCanvas = look.style === 'lava' || look.style === 'void' ? document.createElement('canvas') : null;
  const emImg = emCanvas ? (emCanvas.getContext('2d')!.createImageData(W, H)) : null;
  if (emCanvas) {
    emCanvas.width = W;
    emCanvas.height = H;
  }
  const [c0, c1, c2] = look.colors.map((c) => new THREE.Color(c));
  const period = 8;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const u = (x / W) * period;
      const v = (y / H) * (period / 2);
      const n = noise(u, v, seed, period);
      let col: THREE.Color;
      let em = 0;
      switch (look.style) {
        case 'gas': {
          const band = Math.sin((y / H) * Math.PI * 9 + noise(u * 0.5, v * 2, seed, period) * 4);
          col = mix(c0, c1, 0.5 + band * 0.5);
          col = mix(col, c2, Math.max(0, noise(u * 2, v * 2, seed + 3, period * 2) - 0.6) * 2);
          break;
        }
        case 'lava': {
          col = mix(c0, c1, n);
          const crack = Math.abs(noise(u * 2, v * 2, seed + 7, period * 2) - 0.5);
          if (crack < 0.04) {
            col = c2.clone();
            em = 1 - crack / 0.04;
          }
          break;
        }
        case 'ice': {
          col = mix(c1, c0, n);
          const lat = Math.abs(y / H - 0.5) * 2;
          col = mix(col, c2, Math.max(0, lat - 0.7) * 3);
          break;
        }
        case 'jungle': {
          const land = n > 0.48;
          col = land ? mix(c0, c1, (n - 0.48) * 4) : mix(c2, c0, n);
          break;
        }
        case 'crystal':
          col = mix(c0, c1, n);
          if (noise(u * 3, v * 3, seed + 5, period * 3) > 0.7) col = c2.clone();
          break;
        case 'void': {
          col = mix(c0, c1, n);
          const vein = Math.abs(noise(u * 1.5, v * 1.5, seed + 9, period * 2) - 0.5);
          if (vein < 0.03) {
            col = c2.clone();
            em = 1 - vein / 0.03;
          }
          break;
        }
        default: {
          col = mix(c0, c1, n);
          if (noise(u * 3, v * 3, seed + 11, period * 3) > 0.68) col = mix(col, c2, 0.7);
        }
      }
      const i = (y * W + x) * 4;
      img.data[i] = col.r * 255;
      img.data[i + 1] = col.g * 255;
      img.data[i + 2] = col.b * 255;
      img.data[i + 3] = 255;
      if (emImg) {
        emImg.data[i] = col.r * 255 * em;
        emImg.data[i + 1] = col.g * 255 * em;
        emImg.data[i + 2] = col.b * 255 * em;
        emImg.data[i + 3] = 255;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  let emissive: THREE.CanvasTexture | undefined;
  if (emCanvas && emImg) {
    emCanvas.getContext('2d')!.putImageData(emImg, 0, 0);
    emissive = new THREE.CanvasTexture(emCanvas);
    emissive.colorSpace = THREE.SRGBColorSpace;
  }
  return { map, emissive };
}

/** Weicher, radialer Leuchtpunkt (für Sonne, Atmosphären, Triebwerke). */
function glowTexture(color: string, inner = 0.15): THREE.CanvasTexture {
  const S = 128;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  const c = new THREE.Color(color);
  const rgb = `${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)}`;
  g.addColorStop(0, `rgba(${rgb},1)`);
  g.addColorStop(inner, `rgba(${rgb},0.6)`);
  g.addColorStop(0.5, `rgba(${rgb},0.15)`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Ring mit Streifen und Lücken (radial über die UV-Koordinate der RingGeometry). */
function ringTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 1;
  const ctx = canvas.getContext('2d')!;
  for (let x = 0; x < 256; x++) {
    const t = x / 255;
    const band = 0.35 + 0.65 * noise(t * 24, 0.5, 42, 1000);
    const gap = t > 0.55 && t < 0.6 ? 0.05 : 1;
    const edge = Math.min(1, t * 6, (1 - t) * 6);
    ctx.fillStyle = `rgba(255,255,255,${band * gap * edge})`;
    ctx.fillRect(x, 0, 1, 1);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ---------- Szene ----------

interface PlanetNode {
  id: string;
  look: Look;
  group: THREE.Group;
  body: THREE.Mesh;
  status: THREE.Mesh;
  atmosphere: THREE.Sprite;
  orbitLine: THREE.Line;
  label: HTMLDivElement;
  angle: number;
  data: MapPlanet | null;
}

interface RouteNode {
  id: number;
  line: THREE.Line;
  ships: THREE.Sprite[];
  data: MapRoute;
  offset: number;
}

interface Rocket {
  from: string;
  to: string;
  t: number;
  sprite: THREE.Sprite;
  trail: THREE.Points;
  trailPositions: Float32Array;
}

export interface StarMapCallbacks {
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
}

export class StarMapScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private clock = new THREE.Clock();
  private planets = new Map<string, PlanetNode>();
  private routes = new Map<number, RouteNode>();
  private rockets: Rocket[] = [];
  private sun: THREE.Mesh;
  private corona: THREE.Sprite;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2(-10, -10);
  private hovered: string | null = null;
  private selected: string | null = null;
  private frame = 0;
  private disposed = false;
  private overviewTarget = new THREE.Vector3(0, 0, 0);
  private overviewDistance = 62;
  private flying = false;
  private shipTexture = glowTexture('#ffffff', 0.3);
  private downAt: { x: number; y: number } | null = null;
  /** Geschwindigkeit der Umlaufbahnen (0 = angehalten). */
  orbitSpeed = 1;

  constructor(
    private container: HTMLDivElement,
    private labels: HTMLDivElement,
    private getData: () => MapData,
    private callbacks: StarMapCallbacks,
    reducedMotion: boolean,
  ) {
    this.orbitSpeed = reducedMotion ? 0 : 1;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.setClearColor(0x04060b);
    container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 2000);
    this.camera.position.set(0, 38, 50);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 4;
    this.controls.maxDistance = 140;
    this.controls.maxPolarAngle = Math.PI * 0.85;
    this.controls.addEventListener('start', () => (this.flying = false));

    this.scene.add(new THREE.AmbientLight(0x30364a, 0.9));
    const light = new THREE.PointLight(0xfff1d6, 2.2, 0, 0);
    this.scene.add(light);

    // Sonne mit Korona
    this.sun = new THREE.Mesh(new THREE.SphereGeometry(2.4, 48, 32), new THREE.MeshBasicMaterial({ color: 0xffd27a }));
    this.scene.add(this.sun);
    this.corona = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('#ffb347', 0.2), blending: THREE.AdditiveBlending, depthWrite: false }));
    this.corona.scale.set(16, 16, 1);
    this.scene.add(this.corona);

    this.addStarfield();
    this.addNebulae();
    this.resize();

    const el = this.renderer.domElement;
    el.addEventListener('pointermove', this.onPointerMove);
    el.addEventListener('pointerdown', this.onPointerDown);
    el.addEventListener('pointerup', this.onPointerUp);
    el.addEventListener('pointerleave', this.onPointerLeave);
    window.addEventListener('resize', this.resize);
    this.loop();
  }

  private addStarfield(): void {
    const count = 2500;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const palette = [new THREE.Color('#ffffff'), new THREE.Color('#a6c8ff'), new THREE.Color('#ffd9a6'), new THREE.Color('#c8b6ff')];
    for (let i = 0; i < count; i++) {
      // Zufällige Punkte auf einer großen Kugelschale
      const r = 400 + hash(i, 1, 3) * 400;
      const theta = hash(i, 2, 3) * Math.PI * 2;
      const phi = Math.acos(2 * hash(i, 3, 3) - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      const c = palette[Math.floor(hash(i, 4, 3) * palette.length)];
      const b = 0.4 + hash(i, 5, 3) * 0.6;
      colors.set([c.r * b, c.g * b, c.b * b], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const stars = new THREE.Points(geo, new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true, depthWrite: false }));
    this.scene.add(stars);
  }

  private addNebulae(): void {
    const tints = ['#3a2a7a', '#1a4a6a', '#5a1a4a'];
    tints.forEach((tint, i) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(tint, 0.05), blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.55 }));
      const angle = i * 2.1 + 0.5;
      s.position.set(Math.cos(angle) * 300, -40 + i * 50, Math.sin(angle) * 300);
      s.scale.set(420, 420, 1);
      this.scene.add(s);
    });
  }

  private createPlanet(data: MapPlanet, index: number): PlanetNode {
    const look = LOOKS[data.id] ?? LOOKS.kepler;
    const group = new THREE.Group();
    group.rotation.z = look.tilt;

    const { map, emissive } = planetTexture(look, index * 97 + 13);
    const geometry = look.style === 'crystal' ? new THREE.IcosahedronGeometry(look.radius, 2) : new THREE.SphereGeometry(look.radius, 48, 32);
    const material = new THREE.MeshStandardMaterial({
      map,
      emissiveMap: emissive ?? null,
      emissive: emissive ? new THREE.Color(0xffffff) : new THREE.Color(0x000000),
      emissiveIntensity: emissive ? 1.4 : 0,
      roughness: look.style === 'ice' || look.style === 'crystal' ? 0.35 : 0.85,
      metalness: look.style === 'crystal' ? 0.3 : 0,
      flatShading: look.style === 'crystal',
    });
    const body = new THREE.Mesh(geometry, material);
    body.userData.planet = data.id;
    group.add(body);

    if (look.ring) {
      const inner = look.radius * 1.35;
      const outer = look.radius * 2.2;
      const ringGeo = new THREE.RingGeometry(inner, outer, 96);
      const pos = ringGeo.attributes.position;
      const uv = ringGeo.attributes.uv;
      for (let i = 0; i < pos.count; i++) {
        const r = Math.hypot(pos.getX(i), pos.getY(i));
        uv.setXY(i, (r - inner) / (outer - inner), 0.5);
      }
      const ring = new THREE.Mesh(
        ringGeo,
        new THREE.MeshBasicMaterial({ map: ringTexture(), color: 0xc8d0f0, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }),
      );
      ring.rotation.x = Math.PI / 2.3;
      group.add(ring);
    }
    if (look.style === 'void') {
      // Akkretionsscheibe um den Riss
      const disk = new THREE.Mesh(
        new THREE.TorusGeometry(look.radius * 1.7, 0.08, 12, 96),
        new THREE.MeshBasicMaterial({ color: 0xa57bff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending }),
      );
      disk.rotation.x = Math.PI / 2.2;
      disk.userData.spin = true;
      group.add(disk);
    }

    const atmosphere = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(look.glow, 0.35), blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.55 }));
    atmosphere.scale.set(look.radius * 4.2, look.radius * 4.2, 1);
    group.add(atmosphere);

    // Statusring in der Bahnebene
    const status = new THREE.Mesh(
      new THREE.RingGeometry(look.radius * 1.5, look.radius * 1.56, 96),
      new THREE.MeshBasicMaterial({ color: STATUS_COLOR[data.status], transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }),
    );
    status.rotation.x = -Math.PI / 2;
    const holder = new THREE.Group();
    holder.add(group);
    holder.add(status);
    this.scene.add(holder);

    // Umlaufbahn
    const orbitPoints: THREE.Vector3[] = [];
    for (let i = 0; i <= 128; i++) {
      const a = (i / 128) * Math.PI * 2;
      orbitPoints.push(new THREE.Vector3(Math.cos(a) * look.orbit, 0, Math.sin(a) * look.orbit));
    }
    const orbitLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(orbitPoints), new THREE.LineBasicMaterial({ color: 0x2a3a58, transparent: true, opacity: 0.6 }));
    this.scene.add(orbitLine);

    const label = document.createElement('div');
    label.className = 'map-label';
    this.labels.appendChild(label);

    return { id: data.id, look, group: holder, body, status, atmosphere, orbitLine, label, angle: look.phase, data };
  }

  private syncPlanets(data: MapData): void {
    data.planets.forEach((p, i) => {
      let node = this.planets.get(p.id);
      if (!node) {
        node = this.createPlanet(p, i);
        this.planets.set(p.id, node);
      }
      node.data = p;
      (node.status.material as THREE.MeshBasicMaterial).color.setHex(STATUS_COLOR[p.status]);
      const locked = p.status === 'locked';
      const mat = node.body.material as THREE.MeshStandardMaterial;
      mat.color.setScalar(locked ? 0.35 : 1);
      (node.atmosphere.material as THREE.SpriteMaterial).opacity = locked ? 0.15 : 0.55;
      const label = `<span class="map-label-icon">${p.icon}</span><span>${p.name}</span>${p.active ? '<span class="map-label-tag">aktiv</span>' : ''}`;
      if (node.label.dataset.html !== label) {
        node.label.innerHTML = label;
        node.label.dataset.html = label;
      }
      node.label.dataset.id = p.id;
      node.label.className = `map-label ${p.status} ${this.selected === p.id ? 'selected' : ''} ${this.hovered === p.id ? 'hovered' : ''}`;
    });
  }

  positionOf(id: string): THREE.Vector3 | null {
    return this.planets.get(id)?.group.position.clone() ?? null;
  }

  private curveBetween(a: THREE.Vector3, b: THREE.Vector3): THREE.QuadraticBezierCurve3 {
    const mid = a.clone().add(b).multiplyScalar(0.5);
    mid.y += 3 + a.distanceTo(b) * 0.25;
    return new THREE.QuadraticBezierCurve3(a, mid, b);
  }

  private syncRoutes(data: MapData, t: number): void {
    const alive = new Set<number>();
    for (const r of data.routes) {
      const a = this.positionOf(r.from);
      const b = this.positionOf(r.to);
      if (!a || !b) continue;
      alive.add(r.id);
      let node = this.routes.get(r.id);
      if (!node) {
        const line = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({ color: r.color, dashSize: 0.6, gapSize: 0.5, transparent: true, opacity: 0.7 }));
        this.scene.add(line);
        node = { id: r.id, line, ships: [], data: r, offset: hash(r.id, 1, 1) };
        this.routes.set(r.id, node);
      }
      node.data = r;
      const curve = this.curveBetween(a, b);
      node.line.geometry.setFromPoints(curve.getPoints(48));
      node.line.computeLineDistances();
      // Schiffe: Anzahl und Tempo folgen dem Fluss
      const wanted = r.flow > 0.01 ? Math.min(8, 1 + Math.floor(Math.log2(1 + r.flow))) : 0;
      while (node.ships.length < wanted) {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.shipTexture, color: r.color, blending: THREE.AdditiveBlending, depthWrite: false }));
        s.scale.set(0.9, 0.9, 1);
        this.scene.add(s);
        node.ships.push(s);
      }
      while (node.ships.length > wanted) this.scene.remove(node.ships.pop()!);
      const speed = 0.04 + Math.min(0.12, r.flow * 0.01);
      node.ships.forEach((s, i) => {
        const u = (t * speed + node!.offset + i / node!.ships.length) % 1;
        s.position.copy(curve.getPoint(u));
      });
    }
    for (const [id, node] of this.routes) {
      if (alive.has(id)) continue;
      this.scene.remove(node.line);
      node.ships.forEach((s) => this.scene.remove(s));
      this.routes.delete(id);
    }
  }

  /** Startet eine Rakete von einem Planeten zum anderen (z. B. bei einer Koloniegründung). */
  launchRocket(from: string, to: string): void {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('#ffd27a', 0.25), blending: THREE.AdditiveBlending, depthWrite: false }));
    sprite.scale.set(1.6, 1.6, 1);
    this.scene.add(sprite);
    const trailPositions = new Float32Array(40 * 3);
    // Schweif am Startplaneten beginnen lassen (sonst zeigen die ersten Punkte auf die Sonne)
    const start = this.positionOf(from);
    if (start) for (let i = 0; i < 40; i++) trailPositions.set([start.x, start.y, start.z], i * 3);
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    const trail = new THREE.Points(trailGeo, new THREE.PointsMaterial({ color: 0xff9a4d, size: 0.35, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.scene.add(trail);
    this.rockets.push({ from, to, t: 0, sprite, trail, trailPositions });
  }

  private updateRockets(dt: number): void {
    for (const r of this.rockets) {
      r.t += dt / 3.5;
      const a = this.positionOf(r.from);
      const b = this.positionOf(r.to);
      if (!a || !b) {
        r.t = 2;
        continue;
      }
      const curve = this.curveBetween(a, b);
      // Beschleunigen, dann abbremsen
      const eased = r.t < 0.5 ? 2 * r.t * r.t : 1 - (-2 * r.t + 2) ** 2 / 2;
      const p = curve.getPoint(Math.min(1, eased));
      r.sprite.position.copy(p);
      // Schweif nachziehen
      r.trailPositions.copyWithin(3, 0, r.trailPositions.length - 3);
      r.trailPositions.set([p.x, p.y, p.z], 0);
      r.trail.geometry.attributes.position.needsUpdate = true;
    }
    for (const r of this.rockets.filter((x) => x.t >= 1.15)) {
      this.scene.remove(r.sprite);
      this.scene.remove(r.trail);
      // Ankunftsblitz
      const target = this.planets.get(r.to);
      if (target) (target.atmosphere.material as THREE.SpriteMaterial).opacity = 1.4;
    }
    this.rockets = this.rockets.filter((x) => x.t < 1.15);
  }

  select(id: string | null): void {
    this.selected = id;
    this.flying = true;
  }

  resetView(): void {
    this.select(null);
  }

  private loop = (): void => {
    if (this.disposed) return;
    this.frame = requestAnimationFrame(this.loop);
    const dt = Math.min(0.1, this.clock.getDelta());
    const t = this.clock.elapsedTime;
    const data = this.getData();
    this.syncPlanets(data);

    // Umlaufbahnen (äußere Planeten langsamer)
    for (const node of this.planets.values()) {
      node.angle += dt * this.orbitSpeed * (0.9 / node.look.orbit ** 1.2);
      node.group.position.set(Math.cos(node.angle) * node.look.orbit, 0, Math.sin(node.angle) * node.look.orbit);
      node.body.rotation.y += dt * 0.25;
      node.group.children[0].children.forEach((c) => {
        if (c.userData.spin) c.rotation.z += dt * 0.6;
      });
      const status = node.data?.status;
      const pulse = status === 'reachable' ? 1 + Math.sin(t * 3) * 0.08 : 1;
      node.status.scale.setScalar(pulse * (this.hovered === node.id || this.selected === node.id ? 1.12 : 1));
      (node.status.material as THREE.MeshBasicMaterial).opacity = status === 'locked' ? 0.3 : this.selected === node.id ? 0.9 : 0.6;
      const atm = node.atmosphere.material as THREE.SpriteMaterial;
      if (atm.opacity > 0.56) atm.opacity -= dt * 0.6;
      (node.orbitLine.material as THREE.LineBasicMaterial).color.setHex(this.selected === node.id ? 0x4fd1ff : 0x2a3a58);
    }

    this.sun.rotation.y += dt * 0.05;
    this.corona.scale.setScalar(16 + Math.sin(t * 1.3) * 0.8);

    this.syncRoutes(data, t);
    this.updateRockets(dt);

    // Kamera folgt dem ausgewählten Planeten
    const sel = this.selected ? this.planets.get(this.selected) : null;
    const target = sel ? sel.group.position : this.overviewTarget;
    if (sel) {
      // Ausgewählter Planet bewegt sich: Ziel immer nachführen, Kamera sanft mitziehen
      const delta = target.clone().sub(this.controls.target);
      this.controls.target.add(delta.multiplyScalar(this.flying ? 0.08 : 1));
      if (!this.flying) this.camera.position.add(delta);
    } else if (this.flying) {
      this.controls.target.lerp(target, 0.08);
    }
    if (this.flying) {
      const wanted = sel ? sel.look.radius * 7 + 4 : this.overviewDistance;
      const dir = this.camera.position.clone().sub(this.controls.target).normalize();
      const dist = this.camera.position.distanceTo(this.controls.target);
      const next = dist + (wanted - dist) * 0.08;
      this.camera.position.copy(this.controls.target.clone().add(dir.multiplyScalar(next)));
      if (Math.abs(next - wanted) < 0.05 && this.controls.target.distanceTo(target) < 0.05) this.flying = false;
    }
    this.controls.update();

    this.updateHover();
    this.renderer.render(this.scene, this.camera);
    this.updateLabels();
  };

  private updateHover(): void {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const bodies = [...this.planets.values()].map((p) => p.body);
    const hit = this.raycaster.intersectObjects(bodies, false)[0];
    const id = (hit?.object.userData.planet as string | undefined) ?? null;
    if (id !== this.hovered) {
      this.hovered = id;
      this.renderer.domElement.style.cursor = id ? 'pointer' : 'grab';
      this.callbacks.onHover(id);
    }
  }

  private updateLabels(): void {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    const v = new THREE.Vector3();
    for (const node of this.planets.values()) {
      v.copy(node.group.position);
      v.y += node.look.radius * 1.6;
      v.project(this.camera);
      const visible = v.z < 1 && Math.abs(v.x) < 1.2 && Math.abs(v.y) < 1.2;
      node.label.style.display = visible ? 'flex' : 'none';
      if (!visible) continue;
      node.label.style.transform = `translate(-50%, -100%) translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px)`;
    }
  }

  private setPointer(e: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
  }

  private onPointerMove = (e: PointerEvent) => this.setPointer(e);

  private onPointerDown = (e: PointerEvent) => {
    this.setPointer(e);
    this.downAt = { x: e.clientX, y: e.clientY };
  };

  private onPointerUp = (e: PointerEvent) => {
    const down = this.downAt;
    this.downAt = null;
    // Nur echte Klicks, kein Ziehen der Kamera
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5 || e.button !== 0) return;
    this.setPointer(e);
    this.updateHover();
    this.callbacks.onSelect(this.hovered);
  };

  private onPointerLeave = () => {
    this.pointer.set(-10, -10);
  };

  /** Klick auf ein Label wählt den Planeten. */
  labelFor(id: string): HTMLDivElement | null {
    return this.planets.get(id)?.label ?? null;
  }

  resize = (): void => {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  };

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    window.removeEventListener('resize', this.resize);
    const el = this.renderer.domElement;
    el.removeEventListener('pointermove', this.onPointerMove);
    el.removeEventListener('pointerdown', this.onPointerDown);
    el.removeEventListener('pointerup', this.onPointerUp);
    el.removeEventListener('pointerleave', this.onPointerLeave);
    this.controls.dispose();
    this.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      mesh.geometry?.dispose();
      const mats = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
      for (const m of mats) {
        for (const value of Object.values(m)) if (value instanceof THREE.Texture) value.dispose();
        m.dispose();
      }
    });
    this.renderer.dispose();
    el.remove();
    this.labels.innerHTML = '';
  }
}
