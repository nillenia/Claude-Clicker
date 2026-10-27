import { Rng } from '../core/rng';
import { PLANETS, type PlanetDef } from '../data/planets';

export interface Terrain {
  planet: PlanetDef;
  width: number;
  height: number;
  /** Index in `resources` + 1, 0 = kein Erz. */
  ore: Uint8Array;
  resources: string[];
  /** Kleine Bodenvariation für die Darstellung. */
  shade: Uint8Array;
  hub: { x: number; y: number };
}

function hash(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function generateTerrain(planetId: string, seed: number): Terrain {
  const planet = PLANETS[planetId];
  const { width, height } = planet;
  const rng = new Rng(seed);
  const ore = new Uint8Array(width * height);
  const shade = new Uint8Array(width * height);
  const resources = [...new Set(planet.ores.map((o) => o.resource))];
  const hub = { x: Math.floor(width / 2) - 1, y: Math.floor(height / 2) - 1 };
  const cx = hub.x + 1.5;
  const cy = hub.y + 1.5;

  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) shade[y * width + x] = hash(x, y, seed) < 0.5 ? 0 : 1;

  const nearStart = planet.ores.filter((o) => o.nearStart);
  let startIndex = 0;
  const angleOffset = rng.next() * Math.PI * 2;

  const stamp = (resource: string, px: number, py: number, radius: number) => {
    const idx = resources.indexOf(resource) + 1;
    const r = Math.ceil(radius + 2);
    for (let y = Math.floor(py - r); y <= py + r; y++) {
      for (let x = Math.floor(px - r); x <= px + r; x++) {
        if (x < 0 || y < 0 || x >= width || y >= height) continue;
        // Rund um die Landekapsel frei lassen
        if (x >= hub.x - 1 && x <= hub.x + 3 && y >= hub.y - 1 && y <= hub.y + 3) continue;
        const d = Math.hypot(x + 0.5 - px, y + 0.5 - py) / radius;
        const noise = (hash(x, y, seed + idx * 31) - 0.5) * 0.6;
        if (d + noise < 1 && ore[y * width + x] === 0) ore[y * width + x] = idx;
      }
    }
  };

  for (const spec of planet.ores) {
    for (let i = 0; i < spec.patches; i++) {
      const radius = rng.range(spec.radius[0], spec.radius[1]);
      let px: number;
      let py: number;
      if (spec.nearStart && i === 0) {
        // Startfelder gleichmäßig im Kreis um die Kapsel verteilen
        const angle = angleOffset + (startIndex++ / nearStart.length) * Math.PI * 2 + rng.range(-0.25, 0.25);
        const dist = rng.range(7, 10) + radius * 0.5;
        px = cx + Math.cos(angle) * dist;
        py = cy + Math.sin(angle) * dist;
      } else {
        let tries = 0;
        do {
          px = rng.range(radius + 1, width - radius - 1);
          py = rng.range(radius + 1, height - radius - 1);
        } while (Math.hypot(px - cx, py - cy) < 12 && ++tries < 50);
      }
      stamp(spec.resource, px, py, radius);
    }
  }

  return { planet, width, height, ore, resources, shade, hub };
}

export function oreAt(t: Terrain, x: number, y: number): string | null {
  if (x < 0 || y < 0 || x >= t.width || y >= t.height) return null;
  const idx = t.ore[y * t.width + x];
  return idx ? t.resources[idx - 1] : null;
}
