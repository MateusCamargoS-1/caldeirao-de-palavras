import type { IngredientCategory } from "./recipes";

type ParticleKind = "dust" | "liquid" | "foam" | "splash" | "steam";

type FluidProfile = {
  name: "water" | "citrus" | "milk" | "oil" | "viscous";
  viscosity: number;
  cohesion: number;
  drag: number;
  size: number;
  miscible: boolean;
};

const FLUIDS: Record<FluidProfile["name"], FluidProfile> = {
  water: { name: "water", viscosity: 5, cohesion: 46, drag: 0.45, size: 1.8, miscible: true },
  citrus: { name: "citrus", viscosity: 7, cohesion: 42, drag: 0.65, size: 1.9, miscible: true },
  milk: { name: "milk", viscosity: 11, cohesion: 34, drag: 0.95, size: 2.1, miscible: true },
  oil: { name: "oil", viscosity: 26, cohesion: 30, drag: 2.1, size: 2.55, miscible: false },
  viscous: { name: "viscous", viscosity: 42, cohesion: 58, drag: 4.8, size: 3.1, miscible: false },
};

function fluidProfile(material: string, cat: IngredientCategory) {
  const name = material.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  if (name.includes("AZEITE") || name.includes("OLEO")) return FLUIDS.oil;
  if (name.includes("LEITE")) return FLUIDS.milk;
  if (name.includes("LIMAO")) return FLUIDS.citrus;
  if (cat === "VISCOUS") return FLUIDS.viscous;
  return FLUIDS.water;
}

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  rot: number;
  spin: number;
  kind: ParticleKind;
  cat: IngredientCategory;
  alpha: number;
  mass: number;
  fluid?: FluidProfile;
  delay?: number;
};

type GlyphMask = { w: number; h: number; points: { x: number; y: number }[] };

const BED_COLS = 84;
const BED_ROWS = 46;
const BED_CELLS = BED_COLS * BED_ROWS;
const ACTIVE_MATTER_LIMIT = 1400;

type HeatWave = {
  u: number;
  color: string;
  life: number;
  maxLife: number;
};

export type PotGeom = {
  cx: number;
  baseY: number;
  topY: number;
  potW: number;
  potH: number;
  left: number;
  right: number;
  rimY: number;
  mouthL: number;
  mouthR: number;
  surfaceY: number;
};

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function mixRgb(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
  t: number,
) {
  // Geometric blending in linear light is a compact pigment-like approximation:
  // unlike a plain RGB average it naturally deepens layered spices and juices.
  const blend = (x: number, y: number) =>
    Math.pow(Math.max(0.001, x / 255), 1 - t) * Math.pow(Math.max(0.001, y / 255), t) * 255;
  return {
    r: blend(a.r, b.r),
    g: blend(a.g, b.g),
    b: blend(a.b, b.b),
  };
}

function rgbCss(c: { r: number; g: number; b: number }, a = 1) {
  return `rgba(${c.r | 0},${c.g | 0},${c.b | 0},${a})`;
}

export class ParticleWorld {
  list: Particle[] = [];
  heatWaves: HeatWave[] = [];
  // The cauldron deliberately begins dry and empty. Matter is only counted on impact.
  fill = 0;
  targetFill = 0;
  wetness = 0;
  brew = { r: 88, g: 74, b: 55 };
  splashT = 0;
  onSplash: ((intensity: number) => void) | null = null;
  private lastSplashSfx = 0;
  private lastHeatWave = 0;
  private depositCounter = 0;
  private accumulator = 0;
  private solverTick = 0;
  private liquidScratch: Particle[] = [];
  private fluidGrid = new Map<number, number[]>();
  private fluidBuckets: number[][] = [];
  private glyphCache = new Map<string, GlyphMask>();
  private fluidBudget = 360;
  private slowFrames = 0;
  private fastFrames = 0;
  private bedKind = new Uint8Array(BED_CELLS);
  private bedColor = new Uint32Array(BED_CELLS);
  private bedHeight = new Uint8Array(BED_COLS);
  private bedCount = 0;
  private bedDirty = true;
  private bedTick = 0;
  private steamCount = 0;
  private settledLayer: HTMLCanvasElement | null = null;
  private settledLayerCtx: CanvasRenderingContext2D | null = null;

  clear() {
    this.list = [];
    this.heatWaves = [];
    this.accumulator = 0;
    this.solverTick = 0;
    this.depositCounter = 0;
    this.liquidScratch.length = 0;
    this.fluidGrid.clear();
    this.fluidBuckets.length = 0;
    this.fluidBudget = 360;
    this.slowFrames = 0;
    this.fastFrames = 0;
    this.bedKind.fill(0);
    this.bedColor.fill(0);
    this.bedHeight.fill(0);
    this.bedCount = 0;
    this.bedDirty = true;
    this.bedTick = 0;
    this.steamCount = 0;
    this.settledLayer = null;
    this.settledLayerCtx = null;
    this.fill = 0;
    this.targetFill = 0;
    this.wetness = 0;
    this.brew = { r: 88, g: 74, b: 55 };
    this.splashT = 0;
  }

  private depositBedCell(color: string, cat: IngredientCategory, pot: PotGeom, x: number) {
    if (this.bedCount >= BED_CELLS) return false;
    const impactCol = Math.max(0, Math.min(BED_COLS - 1, Math.floor(((x - pot.mouthL) / (pot.mouthR - pot.mouthL)) * BED_COLS)));
    let column = impactCol;
    let bestHeight = this.bedHeight[column];
    // Matter enters near its real impact point. The cellular gravity pass is
    // responsible for spreading it; distributing it across the whole vessel
    // here would draw artificial horizontal bands instead of falling grains.
    const searchRadius = cat === "CHUNK" ? 1 : 3;
    for (let offset = 1; offset <= searchRadius; offset++) {
      const left = impactCol - offset;
      const right = impactCol + offset;
      if (left >= 0 && this.bedHeight[left] < bestHeight) {
        column = left;
        bestHeight = this.bedHeight[left];
      }
      if (right < BED_COLS && this.bedHeight[right] < bestHeight) {
        column = right;
        bestHeight = this.bedHeight[right];
      }
      if (bestHeight === 0) break;
    }
    if (bestHeight >= BED_ROWS) {
      // Expand from the impact instead of teleporting overflow to the lowest
      // remote column. This keeps the pour continuous while a tall pile sheds.
      for (let offset = 1; offset < BED_COLS; offset++) {
        const left = impactCol - offset;
        const right = impactCol + offset;
        if (left >= 0 && this.bedHeight[left] < BED_ROWS) {
          column = left;
          bestHeight = this.bedHeight[left];
          break;
        }
        if (right < BED_COLS && this.bedHeight[right] < BED_ROWS) {
          column = right;
          bestHeight = this.bedHeight[right];
          break;
        }
      }
    }
    if (bestHeight >= BED_ROWS) return false;
    const rgb = hexToRgb(color);
    const index = bestHeight * BED_COLS + column;
    this.bedKind[index] = cat === "VISCOUS" ? 3 : cat === "LIQUID" ? 2 : 1;
    this.bedColor[index] = (rgb.r << 16) | (rgb.g << 8) | rgb.b;
    this.bedHeight[column] += 1;
    this.bedCount += 1;
    this.bedDirty = true;
    return true;
  }

  private moveBedTop(from: number, to: number) {
    const fromRow = this.bedHeight[from] - 1;
    const toRow = this.bedHeight[to];
    if (fromRow < 0 || toRow >= BED_ROWS) return false;
    const fromIndex = fromRow * BED_COLS + from;
    const toIndex = toRow * BED_COLS + to;
    this.bedKind[toIndex] = this.bedKind[fromIndex];
    this.bedColor[toIndex] = this.bedColor[fromIndex];
    this.bedKind[fromIndex] = 0;
    this.bedColor[fromIndex] = 0;
    this.bedHeight[from] -= 1;
    this.bedHeight[to] += 1;
    this.bedDirty = true;
    return true;
  }

  private updateBedPhysics() {
    this.bedTick += 1;
    let moved = false;
    for (let pass = 0; pass < 4; pass++) {
      const reverse = ((this.bedTick + pass) & 1) === 1;
      for (let step = 0; step < BED_COLS; step++) {
        const column = reverse ? BED_COLS - 1 - step : step;
        const height = this.bedHeight[column];
        if (height === 0) continue;
        const topIndex = (height - 1) * BED_COLS + column;
        const kind = this.bedKind[topIndex];
        if (kind === 0) continue;
        if (kind === 3 && (this.bedTick & 1) === 1) continue;
        // Two cells approximate a granular angle of repose. Viscous matter
        // creeps more slowly, but it is still pulled down and always supported.
        const threshold = kind === 3 ? 3 : 2;
        let target = -1;
        let targetHeight = height;
        const left = column - 1;
        const right = column + 1;
        if (left >= 0 && this.bedHeight[left] < targetHeight) {
          target = left;
          targetHeight = this.bedHeight[left];
        }
        if (right < BED_COLS && this.bedHeight[right] < targetHeight) {
          target = right;
          targetHeight = this.bedHeight[right];
        }
        if (target >= 0 && height - targetHeight > threshold) moved = this.moveBedTop(column, target) || moved;
      }
    }

    // Slow thermal mixing exchanges neighbouring supported grains without
    // moving mass into empty space. This breaks rigid colour strata while
    // preserving gravity and the exact pile silhouette.
    if ((this.bedTick & 7) === 0) {
      const exchanges = Math.min(12, Math.max(1, this.bedCount >> 8));
      for (let i = 0; i < exchanges; i++) {
        const column = (this.bedTick * 17 + i * 29) % (BED_COLS - 1);
        const commonHeight = Math.min(this.bedHeight[column], this.bedHeight[column + 1]);
        if (commonHeight < 2) continue;
        const row = (this.bedTick * 11 + i * 7) % commonHeight;
        const a = row * BED_COLS + column;
        const b = a + 1;
        if (this.bedColor[a] === this.bedColor[b]) continue;
        const color = this.bedColor[a];
        const kind = this.bedKind[a];
        this.bedColor[a] = this.bedColor[b];
        this.bedKind[a] = this.bedKind[b];
        this.bedColor[b] = color;
        this.bedKind[b] = kind;
        this.bedDirty = true;
      }
    }
    return moved;
  }

  private addMatter(color: string, cat: IngredientCategory, mass: number, pot: PotGeom, x: number, fluid?: FluidProfile) {
    this.targetFill = Math.min(0.92, this.targetFill + mass);
    const isWet = cat === "LIQUID" || cat === "VISCOUS";
    this.depositCounter += 1;
    if ((this.depositCounter & 15) === 0 && (!fluid || fluid.miscible)) {
      this.brew = mixRgb(this.brew, hexToRgb(color), 0.12);
      this.wetness += ((isWet ? 1 : cat === "CHUNK" ? 0.18 : 0.06) - this.wetness) * 0.08;
    }
    const desiredCells = Math.min(BED_CELLS, Math.floor(this.targetFill * BED_CELLS));
    while (this.bedCount < desiredCells) {
      if (!this.depositBedCell(color, cat, pot, x)) break;
    }
    const now = performance.now();
    if (now - this.lastHeatWave > 55) {
      this.lastHeatWave = now;
      this.heatWaves.push({
        u: Math.max(0.06, Math.min(0.94, (x - pot.mouthL) / (pot.mouthR - pot.mouthL))),
        color,
        life: 0.75,
        maxLife: 0.75,
      });
      if (this.heatWaves.length > 12) this.heatWaves.shift();
    }
  }

  materializeFromRects(
    rects: { x: number; y: number; w: number; h: number }[],
    color: string,
    cat: IngredientCategory,
    total: number,
    text: string,
    wordLength = 1,
    material = text,
  ) {
    const ingredientMass = 0.84 / Math.max(1, total) / Math.max(1, wordLength);
    const flow = cat === "LIQUID" || cat === "VISCOUS" ? fluidProfile(material, cat) : undefined;
    const samples: { x: number; y: number; order: number }[] = [];
    // Sample the actual glyph alpha mask: the letters themselves dissolve, rather than a box around them.
    for (let index = 0; index < rects.length; index++) {
      const r = rects[index];
      const w = Math.max(2, Math.ceil(r.w + 6));
      const h = Math.max(2, Math.ceil(r.h + 6));
      const glyph = text[index] ?? "";
      const cacheKey = `${glyph}|${w}|${h}`;
      let cached = this.glyphCache.get(cacheKey);
      if (!cached) {
        const mask = document.createElement("canvas");
        mask.width = w;
        mask.height = h;
        const ctx = mask.getContext("2d");
        if (!ctx) continue;
        ctx.fillStyle = "#fff";
        ctx.font = `700 ${Math.max(12, r.h * 0.86)}px Outfit, system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(glyph, w * 0.5, h * 0.54);
        const pixels = ctx.getImageData(0, 0, w, h).data;
        const points: { x: number; y: number }[] = [];
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          if (pixels[(y * w + x) * 4 + 3] > 96) points.push({ x: x - 3, y: y - 3 });
        }
        cached = { w, h, points };
        this.glyphCache.set(cacheKey, cached);
      }
      const glyphSamples: { x: number; y: number; order: number }[] = cached.points.map((point) => ({
        x: r.x + point.x,
        y: r.y + point.y,
        order: index,
      }));
      const glyphStride = Math.max(1, Math.ceil(glyphSamples.length / 5000));
      for (let i = 0; i < glyphSamples.length; i += glyphStride) samples.push(glyphSamples[i]);
    }
    // Keep the glyph silhouette, but do not make every display pixel a costly
    // physics body. Liquids get enough samples to read as continuous once the
    // splats overlap; dry ingredients retain a denser pixel shower.
    // The mask may contain thousands of source pixels, but 90–120 sampled
    // pixels preserve the glyph at this display size. The settled bed keeps
    // the full dense mass, so visual fullness no longer requires thousands of
    // expensive airborne canvas draw calls for every key press.
    const sampleCap = flow ? 90 : 120;
    const selected = samples.length > sampleCap
      ? samples.filter((_, i) => i % Math.ceil(samples.length / sampleCap) === 0).slice(0, sampleCap)
      : samples;
    if (selected.length === 0) return;
    const n = selected.length;
    for (let i = 0; i < n; i++) {
        const sample = selected[i];
        const liquid = !!flow;
        const px = sample.x + (Math.random() - 0.5) * 0.45;
        const py = sample.y + (Math.random() - 0.5) * 0.45;
        this.spawn({
          x: px,
          y: py,
          // No radial burst: the glyph loses support and gravity takes over.
          vx: (Math.random() - 0.5) * (liquid ? 2 : 5),
          vy: Math.random() * (liquid ? 5 : 9),
          size: liquid ? flow.size * (0.86 + Math.random() * 0.28) : cat === "CHUNK" ? 2.5 + Math.random() * 2.2 : 1 + Math.random() * 1.7,
          color,
          life: 2.6 + Math.random() * 0.7,
          maxLife: 3.2,
          rot: Math.random() * Math.PI * 2,
          spin: liquid ? (Math.random() - 0.5) * 2 : (Math.random() - 0.5) * 10,
          kind: liquid ? "liquid" : "dust",
          cat,
          alpha: 1,
          mass: ingredientMass / n,
          fluid: flow,
          delay: sample.order * 0.012 + Math.random() * 0.022,
        });
    }
  }

  private spawn(p: Particle) {
    if (this.list.length >= ACTIVE_MATTER_LIMIT + 80) return;
    if (p.kind === "steam") this.steamCount += 1;
    this.list.push(p);
  }

  private removeAt(index: number) {
    if (this.list[index].kind === "steam") this.steamCount = Math.max(0, this.steamCount - 1);
    this.list[index] = this.list[this.list.length - 1];
    this.list.pop();
  }

  private splash(x: number, y: number, color: string, cat: IngredientCategory, now: number) {
    this.splashT = Math.min(0.32, this.splashT + 0.025);
    if (now - this.lastSplashSfx > 80) {
      this.onSplash?.(0.24);
      this.lastSplashSfx = now;
    }
    // Deliberately no radial spray. Energy is absorbed by the bed/surface;
    // heat waves and sound communicate impact without an artificial explosion.
  }

  advanceFill(dt: number) {
    const k = 1 - Math.exp(-5.2 * dt);
    this.fill += (this.targetFill - this.fill) * k;
    this.splashT = Math.max(0, this.splashT - dt * 1.8);
  }

  update(dt: number, pot: PotGeom) {
    // Degrade only the expensive neighbour solve on a slower device; the
    // visual pixels and gravity integration remain intact.
    if (dt > 0.024) {
      this.slowFrames += 1;
      this.fastFrames = 0;
      if (this.slowFrames >= 3) this.fluidBudget = Math.max(240, this.fluidBudget - 80);
    } else if (dt < 0.018) {
      this.fastFrames += 1;
      this.slowFrames = 0;
      if (this.fastFrames >= 90) this.fluidBudget = Math.min(360, this.fluidBudget + 40);
    }
    // 60 Hz fixed physics is stable at these velocities and halves CPU cost vs 120 Hz.
    this.accumulator = Math.min(this.accumulator + dt, 0.05);
    const step = 1 / 60;
    while (this.accumulator >= step) {
      this.advanceFill(step);
      this.updateStep(step, pot);
      this.accumulator -= step;
    }
  }

  private updateStep(dt: number, pot: PotGeom) {
    const now = performance.now();

    if (this.targetFill > 0.025 && this.steamCount < 24 && Math.random() < dt * (1.5 + this.fill * 8)) {
      this.spawn({
        x: pot.cx + (Math.random() - 0.5) * (pot.mouthR - pot.mouthL) * 0.55,
        y: pot.rimY + 8,
        vx: (Math.random() - 0.5) * 18,
        vy: -24 - Math.random() * 42,
        size: 7 + Math.random() * 13,
        color: "#fff4df",
        life: 1.35 + Math.random() * 0.9,
        maxLife: 2.2,
        rot: 0,
        spin: 0,
        kind: "steam",
        cat: "POWDER",
        alpha: 0.12 + this.fill * 0.1,
        mass: 0,
      });
    }
    if (this.fill > 0.06 && Math.random() < dt * (3 + this.fill * 10)) {
      this.spawn({
        x: pot.cx + (Math.random() - 0.5) * (pot.mouthR - pot.mouthL) * 0.64,
        y: pot.rimY + 5,
        vx: (Math.random() - 0.5) * 42,
        vy: -42 - Math.random() * 78,
        size: 1 + Math.random() * 2,
        color: rgbCss(this.brew),
        life: 0.45 + Math.random() * 0.35,
        maxLife: 0.8,
        rot: 0,
        spin: 0,
        kind: "splash",
        cat: "POWDER",
        alpha: 0.7,
        mass: 0,
      });
    }

    const g = 1650;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      if (p.delay && p.delay > 0) {
        p.delay -= dt;
        continue;
      }
      p.life -= dt;
      if (p.life <= 0) {
        this.removeAt(i);
        continue;
      }

      if (p.kind === "foam") {
        p.x += p.vx * dt;
        p.vx *= Math.pow(0.2, dt);
        p.x += Math.sin(p.life * 6 + i) * 8 * dt;
        p.y = pot.surfaceY - 2 + Math.sin(p.life * 5 + i) * 2.2;
        if (p.x < pot.mouthL + 10) p.x = pot.mouthL + 10;
        if (p.x > pot.mouthR - 10) p.x = pot.mouthR - 10;
        p.alpha = Math.min(1, p.life / 0.4) * 0.8;
        continue;
      }

      if (p.kind === "steam") {
        p.x += p.vx * dt + Math.sin(p.life * 4 + i) * 10 * dt;
        p.y += p.vy * dt;
        p.size += 10 * dt;
        p.alpha = (p.life / p.maxLife) * 0.16;
        continue;
      }

      p.vy += g * dt;
      const flowDrag = p.fluid?.drag ?? 0.6;
      p.vx *= Math.exp(-flowDrag * dt);
      if (p.fluid) p.vy *= Math.exp(-flowDrag * 0.055 * dt);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.spin * dt;

      // Funnel into the mouth once near the rim — never clamp in mid-air.
      if (p.y > pot.rimY - 36 && (p.kind === "dust" || p.kind === "liquid")) {
        const mid = pot.cx;
        p.vx += (mid - p.x) * 3.4 * dt;
        if (p.x < pot.mouthL + 6) {
          p.x = pot.mouthL + 6;
          p.vx = Math.abs(p.vx) * 0.25;
        } else if (p.x > pot.mouthR - 6) {
          p.x = pot.mouthR - 6;
          p.vx = -Math.abs(p.vx) * 0.25;
        }
      }

      const landingY = this.fill > 0.025 ? pot.surfaceY : pot.baseY - 26;
      if ((p.kind === "dust" || p.kind === "liquid") && p.y >= landingY && p.x > pot.mouthL && p.x < pot.mouthR) {
        this.addMatter(p.color, p.cat, p.mass, pot, p.x, p.fluid);
        this.splash(p.x, landingY, p.color, p.cat, now);
        this.removeAt(i);
        continue;
      }

      if (p.kind === "splash" && p.y > pot.surfaceY + 8) {
        this.removeAt(i);
        continue;
      }

      if (p.y > pot.baseY + 40) {
        this.removeAt(i);
      }
    }
    this.solverTick += 1;
    const solverInterval = this.fluidBudget <= 280 ? 4 : 3;
    if (this.solverTick % solverInterval === 0) this.solveLiquidPairs(dt * solverInterval);
    if ((this.solverTick & 1) === 0) this.updateBedPhysics();
    for (let i = this.heatWaves.length - 1; i >= 0; i--) {
      this.heatWaves[i].life -= dt;
      if (this.heatWaves[i].life <= 0) this.heatWaves.splice(i, 1);
    }
  }

  // A small SPH/PBD-inspired local solve: close drops repel, exchange momentum and cohere.
  // It is intentionally local (not a full Navier–Stokes grid) to remain responsive during typing.
  private solveLiquidPairs(dt: number) {
    const drops = this.liquidScratch;
    drops.length = 0;
    let activeLiquids = 0;
    for (const p of this.list) {
      if (p.kind === "liquid" && (!p.delay || p.delay <= 0)) activeLiquids += 1;
    }
    // A bounded representative set carries viscosity/cohesion. The remaining
    // visual pixels still follow gravity and the funnel, avoiding an O(n*k)
    // solver spike when a whole word is typed quickly.
    const solverStride = Math.max(1, Math.ceil(activeLiquids / this.fluidBudget));
    let liquidIndex = 0;
    for (const p of this.list) {
      if (p.kind !== "liquid" || (p.delay && p.delay > 0)) continue;
      if (liquidIndex % solverStride === 0 && drops.length < this.fluidBudget) drops.push(p);
      liquidIndex += 1;
    }
    // Glyph pixels start only ~1 px apart. A compact support radius plus
    // normalized pair forces prevents the dense letter mask from behaving as
    // an over-pressurized fluid and bursting radially.
    const radius = 10;
    const grid = this.fluidGrid;
    grid.clear();
    let bucketCount = 0;
    for (let i = 0; i < drops.length; i++) {
      const cx = Math.floor(drops[i].x / radius);
      const cy = Math.floor(drops[i].y / radius);
      const key = (cx + 2048) * 8192 + cy + 2048;
      const cell = grid.get(key);
      if (cell) cell.push(i);
      else {
        const bucket = this.fluidBuckets[bucketCount] ?? [];
        bucket.length = 0;
        bucket.push(i);
        this.fluidBuckets[bucketCount] = bucket;
        bucketCount += 1;
        grid.set(key, bucket);
      }
    }
    for (let i = 0; i < drops.length; i++) {
      const a = drops[i];
      const cellX = Math.floor(a.x / radius);
      const cellY = Math.floor(a.y / radius);
      let solvedNeighbours = 0;
      neighbourSearch:
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
        const key = (cellX + ox + 2048) * 8192 + cellY + oy + 2048;
        const neighbours = grid.get(key);
        if (!neighbours) continue;
        for (const j of neighbours) {
        if (j <= i) continue;
        const a = drops[i];
        const b = drops[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distSq = dx * dx + dy * dy;
        if (distSq <= 0.001 || distSq >= radius * radius) continue;
        solvedNeighbours += 1;
        const dist = Math.sqrt(distSq);
        const nx = dx / dist;
        const ny = dy / dist;
        const closeness = 1 - dist / radius;
        const viscosity = ((a.fluid?.viscosity ?? 7) + (b.fluid?.viscosity ?? 7)) * 0.5 * closeness;
        const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        const pressure = closeness * closeness * closeness * 120;
        const impulse = Math.max(-2, Math.min(2, (pressure - rel * viscosity) * dt * 0.08));
        a.vx -= nx * impulse;
        a.vy -= ny * impulse;
        b.vx += nx * impulse;
        b.vy += ny * impulse;
        // Short-range attraction reads as surface tension and keeps streams coherent.
        const cohesionStrength = ((a.fluid?.cohesion ?? 36) + (b.fluid?.cohesion ?? 36)) * 0.5;
        const cohesion = closeness * cohesionStrength * dt * 0.08;
        a.vx += nx * cohesion;
        a.vy += ny * cohesion;
        b.vx -= nx * cohesion;
        b.vy -= ny * cohesion;
        // XSPH velocity blending supplies viscosity without injecting energy.
        const xsph = Math.min(0.04, viscosity * closeness * dt * 0.012);
        const dvx = (b.vx - a.vx) * xsph;
        const dvy = (b.vy - a.vy) * xsph;
        a.vx += dvx;
        a.vy += dvy;
        b.vx -= dvx;
        b.vy -= dvy;
        const separation = Math.min(0.16, closeness * closeness * 0.18);
        a.x -= nx * separation;
        a.y -= ny * separation;
        b.x += nx * separation;
        b.y += ny * separation;
        const maxSpeedSq = 1400 * 1400;
        const speedSqA = a.vx * a.vx + a.vy * a.vy;
        if (speedSqA > maxSpeedSq) {
          const scale = 1400 / Math.sqrt(speedSqA);
          a.vx *= scale;
          a.vy *= scale;
        }
        const speedSqB = b.vx * b.vx + b.vy * b.vy;
        if (speedSqB > maxSpeedSq) {
          const scale = 1400 / Math.sqrt(speedSqB);
          b.vx *= scale;
          b.vy *= scale;
        }
        if (solvedNeighbours >= 10) break neighbourSearch;
        }
      }
    }
  }

  private updateSettledLayer() {
    if (!this.settledLayer) {
      this.settledLayer = document.createElement("canvas");
      // Two texture pixels per physics cell preserve a grainy silhouette while
      // allowing the complete bed to be uploaded to canvas in one operation.
      this.settledLayer.width = BED_COLS * 2;
      this.settledLayer.height = BED_ROWS * 2;
      this.settledLayerCtx = this.settledLayer.getContext("2d");
      this.bedDirty = true;
    }
    const layer = this.settledLayerCtx;
    if (!layer || !this.bedDirty) return;

    const textureW = BED_COLS * 2;
    const textureH = BED_ROWS * 2;
    const image = layer.createImageData(textureW, textureH);
    const pixels = image.data;

    // Every visible pixel belongs to a supported cell. Empty cells can only
    // exist above a column, so settled matter cannot hover in the vessel.
    for (let row = 0; row < BED_ROWS; row++) {
      for (let column = 0; column < BED_COLS; column++) {
        const index = row * BED_COLS + column;
        const kind = this.bedKind[index];
        if (kind === 0) continue;
        const packed = this.bedColor[index];
        const r = (packed >> 16) & 255;
        const g = (packed >> 8) & 255;
        const b = packed & 255;
        const hash = (column * 73 + row * 151) & 255;
        const textureX = column * 2;
        const textureY = (BED_ROWS - 1 - row) * 2;
        const alpha = kind === 2 ? 226 : kind === 3 ? 238 : 230;
        const pore = hash & 3;
        const glint = (pore + 1) & 3;
        for (let py = 0; py < 2; py++) for (let px = 0; px < 2; px++) {
          const offset = ((textureY + py) * textureW + textureX + px) * 4;
          const subpixel = px + py * 2;
          const grain = subpixel === glint ? 13 : 0;
          pixels[offset] = Math.min(255, r + grain);
          pixels[offset + 1] = Math.min(255, g + grain);
          pixels[offset + 2] = Math.min(255, b + grain);
          pixels[offset + 3] = subpixel === pore ? 58 : alpha;
        }
      }
    }
    layer.putImageData(image, 0, 0);
    this.bedDirty = false;
  }

  draw(ctx: CanvasRenderingContext2D, pot: PotGeom) {
    const dryGroups = new Map<string, Particle[]>();
    const liquidGroups = new Map<string, Particle[]>();
    const steam: Particle[] = [];
    for (const p of this.list) {
      if (p.delay && p.delay > 0) continue;
      if (p.kind === "steam") {
        steam.push(p);
        continue;
      }
      if (p.y >= pot.rimY) continue;
      const groups = p.kind === "liquid" ? liquidGroups : dryGroups;
      const group = groups.get(p.color);
      if (group) group.push(p);
      else groups.set(p.color, [p]);
    }

    if (steam.length > 0) {
      ctx.globalAlpha = 0.095;
      ctx.fillStyle = "#fffdf7";
      ctx.beginPath();
      for (const p of steam) {
        ctx.moveTo(p.x + p.size, p.y);
        ctx.ellipse(p.x, p.y, p.size, p.size * 0.55, 0, 0, Math.PI * 2);
      }
      ctx.fill();
    }

    // Batch equal colours. Changing canvas paint state thousands of times was
    // substantially more expensive than gravity itself on CPU-rendered GPUs.
    for (const [color, particles] of dryGroups) {
      ctx.globalAlpha = 0.96;
      ctx.fillStyle = color;
      for (const p of particles) {
        const pixel = Math.max(2, Math.round(p.size));
        const x = Math.round(p.x - pixel * 0.5);
        const y = Math.round(p.y - pixel * 0.5);
        ctx.fillRect(x, y, pixel, pixel);
      }
    }

    // Overlapping rectangular splats stay continuous without Canvas filter,
    // whose per-frame offscreen blur was the largest rendering stall.
    for (const [color, particles] of liquidGroups) {
      ctx.globalAlpha = 0.88;
      ctx.fillStyle = color;
      for (const p of particles) {
        const stretch = Math.min(6, Math.abs(p.vy) * 0.008);
        const width = Math.max(2, Math.round(p.size * 1.55));
        const height = Math.max(2, Math.round(p.size * 1.55 + stretch));
        ctx.fillRect(Math.round(p.x - width * 0.5), Math.round(p.y - p.size * 0.72), width, height);
      }
    }
    ctx.globalAlpha = 1;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pot.mouthL + 8, pot.rimY + 6);
    ctx.quadraticCurveTo(pot.left + 10, pot.topY + pot.potH * 0.55, pot.left + 22, pot.baseY - 10);
    ctx.quadraticCurveTo(pot.cx, pot.baseY + 10, pot.right - 22, pot.baseY - 10);
    ctx.quadraticCurveTo(pot.right - 10, pot.topY + pot.potH * 0.55, pot.mouthR - 8, pot.rimY + 6);
    ctx.closePath();
    ctx.clip();
    this.updateSettledLayer();
    if (this.settledLayer) {
      ctx.globalAlpha = 1;
      ctx.imageSmoothingEnabled = false;
      const innerLeft = pot.mouthL + 7;
      const innerWidth = pot.mouthR - pot.mouthL - 14;
      const bedHeightPx = pot.potH * 0.72;
      ctx.drawImage(
        this.settledLayer,
        innerLeft,
        pot.baseY - 22 - bedHeightPx,
        innerWidth,
        bedHeightPx,
      );
    }
    for (const wave of this.heatWaves) {
      const progress = 1 - wave.life / wave.maxLife;
      const center = pot.mouthL + wave.u * (pot.mouthR - pot.mouthL);
      ctx.save();
      ctx.globalAlpha = (1 - progress) * 0.6;
      ctx.fillStyle = wave.color;
      for (let i = -5; i <= 5; i++) {
        const x = center + i * 7;
        const y = pot.baseY - 26 - progress * 22 - Math.abs(i) * 1.2;
        ctx.fillRect(Math.round(x), Math.round(y), 2, 2);
      }
      ctx.restore();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}

export function measurePot(W: number, H: number, fill: number, splashT: number): PotGeom {
  const cx = W * 0.5;
  const baseY = H * 0.86;
  const potW = Math.min(420, Math.max(240, W * 0.5));
  const potH = Math.min(240, Math.max(150, H * 0.34));
  const topY = baseY - potH;
  const left = cx - potW * 0.5;
  const right = cx + potW * 0.5;
  const rimY = topY + 16;
  const mouthL = cx - potW * 0.42;
  const mouthR = cx + potW * 0.42;
  const innerBottom = baseY - 16;
  const emptyY = rimY + 22;
  const fullY = innerBottom - 18;
  const wave = Math.sin(performance.now() * 0.004) * 2.5 + splashT * 7;
  const surfaceY = emptyY + (1 - fill) * (fullY - emptyY) + wave;
  return { cx, baseY, topY, potW, potH, left, right, rimY, mouthL, mouthR, surfaceY };
}

export function drawFire(ctx: CanvasRenderingContext2D, pot: PotGeom, t: number, fill: number) {
  const { cx, baseY, potW } = pot;
  ctx.fillStyle = "rgba(40,28,18,0.16)";
  ctx.beginPath();
  ctx.ellipse(cx, baseY + 22, potW * 0.52, 16, 0, 0, Math.PI * 2);
  ctx.fill();

  const glow = 0.4 + fill * 0.4 + Math.sin(t * 7) * 0.08;
  const grd = ctx.createRadialGradient(cx, baseY + 10, 6, cx, baseY + 10, 110);
  grd.addColorStop(0, `rgba(255,150,40,${0.55 * glow})`);
  grd.addColorStop(0.45, `rgba(255,90,20,${0.18 * glow})`);
  grd.addColorStop(1, "rgba(255,70,10,0)");
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(cx, baseY + 10, 110, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#4a3424";
  ctx.lineWidth = 9;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx - 38, baseY + 14);
  ctx.lineTo(cx + 36, baseY + 18);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - 28, baseY + 20);
  ctx.lineTo(cx + 22, baseY + 10);
  ctx.stroke();

  for (let i = 0; i < 9; i++) {
    const fx = cx + Math.sin(t * 4 + i * 1.4) * 22 + (i - 4) * 7;
    const rise = ((t * 55 + i * 19) % 42);
    const fy = baseY + 8 - rise;
    const fs = (7 + Math.sin(t * 6 + i) * 3) * (1 - rise / 42);
    ctx.globalAlpha = 0.55 + Math.sin(t * 5 + i) * 0.2;
    const flame = ctx.createRadialGradient(fx, fy, 0, fx, fy, fs);
    flame.addColorStop(0, "#ffe08a");
    flame.addColorStop(0.45, "#ff9028");
    flame.addColorStop(1, "rgba(255,80,10,0)");
    ctx.fillStyle = flame;
    ctx.beginPath();
    ctx.ellipse(fx, fy, fs * 0.55, fs * 1.15, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function drawPotBody(ctx: CanvasRenderingContext2D, pot: PotGeom) {
  const { cx, left, right, topY, baseY, potH, potW } = pot;

  ctx.strokeStyle = "#2a2420";
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  for (const ox of [-0.32, 0, 0.32]) {
    ctx.beginPath();
    ctx.moveTo(cx + potW * ox, baseY - 14);
    ctx.lineTo(cx + potW * ox * 1.12, baseY + 24);
    ctx.stroke();
  }

  // handles
  ctx.strokeStyle = "#3a3430";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(left + 4, topY + 36, 18, Math.PI * 0.25, Math.PI * 1.15);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(right - 4, topY + 36, 18, -Math.PI * 0.15, Math.PI * 0.75);
  ctx.stroke();

  const body = ctx.createLinearGradient(left, topY, right, baseY);
  body.addColorStop(0, "#4a4440");
  body.addColorStop(0.35, "#2c2724");
  body.addColorStop(0.7, "#1c1917");
  body.addColorStop(1, "#141211");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(left + 18, topY + 18);
  ctx.quadraticCurveTo(left - 4, topY + potH * 0.5, left + 24, baseY - 8);
  ctx.quadraticCurveTo(cx, baseY + 16, right - 24, baseY - 8);
  ctx.quadraticCurveTo(right + 4, topY + potH * 0.5, right - 18, topY + 18);
  ctx.closePath();
  ctx.fill();

  // inner cavity
  // Matte cavity: a flat interior avoids reading as a dark liquid before pixels arrive.
  ctx.fillStyle = "#171311";
  ctx.beginPath();
  ctx.moveTo(pot.mouthL + 6, pot.rimY + 4);
  ctx.quadraticCurveTo(left + 16, topY + potH * 0.5, left + 28, baseY - 14);
  ctx.quadraticCurveTo(cx, baseY + 4, right - 28, baseY - 14);
  ctx.quadraticCurveTo(right - 16, topY + potH * 0.5, pot.mouthR - 6, pot.rimY + 4);
  ctx.closePath();
  ctx.fill();
}

export function drawLiquid(
  ctx: CanvasRenderingContext2D,
  pot: PotGeom,
  fill: number,
  brew: { r: number; g: number; b: number },
  splashT: number,
  t: number,
  wetness = 0,
) {
  if (fill < 0.02) return;
  const { cx, mouthL, mouthR, surfaceY, baseY, left, right, potH, topY } = pot;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(mouthL + 6, pot.rimY + 4);
  ctx.quadraticCurveTo(left + 16, topY + potH * 0.5, left + 28, baseY - 14);
  ctx.quadraticCurveTo(cx, baseY + 4, right - 28, baseY - 14);
  ctx.quadraticCurveTo(right - 16, topY + potH * 0.5, mouthR - 6, pot.rimY + 4);
  ctx.closePath();
  ctx.clip();

  const liq = ctx.createLinearGradient(cx, surfaceY, cx, baseY);
  const deep = mixRgb(brew, { r: 40, g: 24, b: 10 }, 0.45);
  liq.addColorStop(0, rgbCss(brew, 0.72 + wetness * 0.24));
  liq.addColorStop(1, rgbCss(deep, 1));
  ctx.fillStyle = liq;

  ctx.beginPath();
  const steps = 28;
  const width = mouthR - mouthL - 16;
  for (let i = 0; i <= steps; i++) {
    const x = mouthL + 8 + (width * i) / steps;
    const y =
      surfaceY +
      Math.sin(i * 0.55 + t * 3.2) * (0.7 + wetness * 2.1 + splashT * 6) +
      Math.sin(i * 1.1 + t * 5.1) * (0.4 + wetness * 1.1 + splashT * 3);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.lineTo(right - 24, baseY);
  ctx.lineTo(left + 24, baseY);
  ctx.closePath();
  ctx.fill();

  if (wetness > 0.18) {
    ctx.fillStyle = rgbCss({ r: 255, g: 236, b: 190 }, wetness * 0.22 + splashT * 0.2);
    ctx.beginPath();
    ctx.ellipse(cx, surfaceY + 3, (mouthR - mouthL) * 0.32, 3 + wetness * 5 + splashT * 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const bubbles = wetness > 0.22 ? 1 + Math.floor(fill * 8 * wetness) : 0;
  for (let i = 0; i < bubbles; i++) {
    const bx = cx + Math.sin(t * 1.3 + i * 2.2) * (mouthR - mouthL) * 0.22;
    const depth = Math.max(12, baseY - 18 - surfaceY);
    const by = surfaceY + 10 + ((t * 28 + i * 37) % depth);
    ctx.globalAlpha = 0.28;
    ctx.strokeStyle = "rgba(255,240,210,0.7)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(bx, by, 2 + (i % 3), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

export function drawRim(ctx: CanvasRenderingContext2D, pot: PotGeom) {
  const { cx, mouthL, mouthR, rimY } = pot;
  ctx.strokeStyle = "#5a534c";
  ctx.lineWidth = 16;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(mouthL - 8, rimY + 4);
  ctx.quadraticCurveTo(cx, rimY - 10, mouthR + 8, rimY + 4);
  ctx.stroke();
  ctx.strokeStyle = "#8a8278";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(mouthL - 4, rimY);
  ctx.quadraticCurveTo(cx, rimY - 14, mouthR + 4, rimY);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,240,210,0.28)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(mouthL + 20, rimY - 4);
  ctx.quadraticCurveTo(cx - 20, rimY - 12, cx - 8, rimY - 8);
  ctx.stroke();
}
