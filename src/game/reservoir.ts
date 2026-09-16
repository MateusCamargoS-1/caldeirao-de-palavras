type Grain = {
  id: number;
  x: number;
  y: number;
  vy: number;
  color: string;
  settled: boolean;
  column: number;
  row: number;
};

const COLORS = ["#f47a16", "#ff9b45", "#ffc28a", "#df6410"];
const GRAIN_SIZE = 4;
const STEP = 1 / 120;

export class WordReservoir {
  private particles: Grain[] = [];
  private width = 1;
  private height = 1;
  private accumulator = 0;
  private nextId = 0;
  private flow = 0;

  clear() {
    this.particles = [];
    this.accumulator = 0;
    this.nextId = 0;
    this.flow = 0;
  }

  // Exactly one 4 px grain for each correctly completed character.
  addParticle() {
    const geometry = this.geometry(this.width, this.height);
    const id = this.nextId++;
    this.flow = .28;
    this.particles.push({
      id,
      x: geometry.nozzleX - 6 + ((id % 3) - 1) * .35,
      y: geometry.nozzleBottom + 3,
      vy: 34,
      color: COLORS[id % COLORS.length],
      settled: false,
      column: -1,
      row: -1,
    });
  }

  update(dt: number, width: number, height: number) {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.flow = Math.max(0, this.flow - dt);
    this.accumulator = Math.min(this.accumulator + Math.min(dt, .05), STEP * 6);
    while (this.accumulator >= STEP) {
      this.simulate(STEP);
      this.accumulator -= STEP;
    }
  }

  private simulate(dt: number) {
    const geometry = this.geometry(this.width, this.height);
    const columns = Math.max(1, Math.floor((geometry.right - geometry.left) / GRAIN_SIZE));
    const rows = Math.max(1, Math.floor((geometry.floor - geometry.top) / GRAIN_SIZE));
    const gridTop = geometry.floor - rows * GRAIN_SIZE;
    const occupied = new Set<number>();
    for (const grain of this.particles) if (grain.settled) occupied.add(grain.row * columns + grain.column);

    for (const grain of this.particles) {
      if (grain.settled) continue;
      grain.vy = Math.min(470, grain.vy + 1_260 * dt);
      const nextY = grain.y + grain.vy * dt;
      const column = this.columnFor(grain.x, geometry.left, columns);
      const nextRow = Math.floor((nextY - gridTop) / GRAIN_SIZE);
      if (nextRow < 0) {
        grain.y = nextY;
        continue;
      }
      if (nextRow < rows && !occupied.has(nextRow * columns + column)) {
        grain.y = nextY;
        continue;
      }

      const currentRow = Math.max(0, Math.min(rows - 1, Math.floor((grain.y - gridTop) / GRAIN_SIZE)));
      const direction = grain.id % 2 === 0 ? -1 : 1;
      const candidates = currentRow + 1 < rows ? [column + direction, column - direction] : [];
      let slid = false;
      for (const candidate of candidates) {
        const diagonalRow = Math.min(rows - 1, currentRow + 1);
        if (candidate < 0 || candidate >= columns) continue;
        if (occupied.has(diagonalRow * columns + candidate)) continue;
        const targetX = geometry.left + candidate * GRAIN_SIZE + GRAIN_SIZE / 2;
        const targetY = gridTop + diagonalRow * GRAIN_SIZE + GRAIN_SIZE / 2;
        grain.x += (targetX - grain.x) * .34;
        grain.y += (targetY - grain.y) * .34;
        grain.vy *= .66;
        slid = true;
        break;
      }
      if (slid) continue;

      let restingRow = currentRow;
      while (restingRow > 0 && occupied.has(restingRow * columns + column)) restingRow--;
      grain.column = column;
      grain.row = restingRow;
      grain.x = geometry.left + column * GRAIN_SIZE + GRAIN_SIZE / 2;
      grain.y = gridTop + restingRow * GRAIN_SIZE + GRAIN_SIZE / 2;
      grain.vy = 0;
      grain.settled = true;
      occupied.add(restingRow * columns + column);
    }
  }

  private columnFor(x: number, left: number, columns: number) {
    return Math.max(0, Math.min(columns - 1, Math.floor((x - left) / GRAIN_SIZE)));
  }

  private geometry(width: number, height: number) {
    const vesselX = width * .10;
    const vesselWidth = width * .80;
    const vesselTop = height * .275;
    const vesselBottom = height * .94;
    const left = vesselX - 8.6;
    const right = vesselX + vesselWidth + 8.6;
    const top = vesselTop + 3;
    const floor = vesselBottom - 1.4;
    const nozzleX = width * .50;
    const pipeY = height * .145;
    const nozzleBottom = pipeY + 55;
    return { vesselX, vesselWidth, vesselTop, vesselBottom, left, right, top, floor, nozzleX, pipeY, nozzleBottom };
  }

  draw(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const g = this.geometry(width, height);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#f0e8dc";
    ctx.fillRect(0, 0, width, height);

    // Clear rectangular vessel from the reference, with short shoulders at the opening.
    ctx.fillStyle = "rgba(255,255,255,.10)";
    ctx.beginPath();
    ctx.roundRect(g.vesselX, g.vesselTop, g.vesselWidth, g.vesselBottom - g.vesselTop, 12);
    ctx.fill();
    ctx.strokeStyle = "#4a463f";
    ctx.lineWidth = 2.8;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(g.vesselX + 24, g.vesselTop);
    ctx.lineTo(g.vesselX + 12, g.vesselTop);
    ctx.quadraticCurveTo(g.vesselX + 1, g.vesselTop, g.vesselX + 1, g.vesselTop + 13);
    ctx.lineTo(g.vesselX + 1, g.vesselTop + 29);
    ctx.quadraticCurveTo(g.vesselX - 10, g.vesselTop + 31, g.vesselX - 10, g.vesselTop + 42);
    ctx.lineTo(g.vesselX - 10, g.vesselBottom - 15);
    ctx.quadraticCurveTo(g.vesselX - 10, g.vesselBottom, g.vesselX + 7, g.vesselBottom);
    ctx.lineTo(g.vesselX + g.vesselWidth - 7, g.vesselBottom);
    ctx.quadraticCurveTo(g.vesselX + g.vesselWidth + 10, g.vesselBottom, g.vesselX + g.vesselWidth + 10, g.vesselBottom - 15);
    ctx.lineTo(g.vesselX + g.vesselWidth + 10, g.vesselTop + 42);
    ctx.quadraticCurveTo(g.vesselX + g.vesselWidth + 10, g.vesselTop + 31, g.vesselX + g.vesselWidth - 1, g.vesselTop + 29);
    ctx.lineTo(g.vesselX + g.vesselWidth - 1, g.vesselTop + 13);
    ctx.quadraticCurveTo(g.vesselX + g.vesselWidth - 1, g.vesselTop, g.vesselX + g.vesselWidth - 12, g.vesselTop);
    ctx.lineTo(g.vesselX + g.vesselWidth - 24, g.vesselTop);
    ctx.stroke();

    this.drawFaucet(ctx, width, height, g.nozzleX, g.pipeY);

    if (this.flow > 0) {
      ctx.fillStyle = "#f47a16";
      ctx.globalAlpha = Math.min(1, this.flow * 4);
      ctx.fillRect(Math.round(g.nozzleX - 8), Math.round(g.nozzleBottom + 5), GRAIN_SIZE, GRAIN_SIZE);
      ctx.globalAlpha = 1;
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(g.left, g.top, g.right - g.left, g.floor - g.top);
    ctx.clip();
    for (const grain of this.particles) {
      ctx.fillStyle = grain.color;
      ctx.fillRect(Math.round(grain.x - 2), Math.round(grain.y - 2), GRAIN_SIZE, GRAIN_SIZE);
    }
    ctx.restore();
  }

  private drawFaucet(ctx: CanvasRenderingContext2D, width: number, height: number, nozzleX: number, pipeY: number) {
    const wallX = width * .955;
    const orange = "#f47a16";
    const metal = "#4a463f";
    ctx.strokeStyle = metal;
    ctx.fillStyle = metal;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Supply pipe and wall bracket.
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(nozzleX + 23, pipeY);
    ctx.lineTo(wallX - 6, pipeY);
    ctx.stroke();
    ctx.beginPath();
    ctx.roundRect(wallX - 7, pipeY - 15, 12, 38, 4);
    ctx.fill();
    ctx.fillStyle = "#756a5c";
    ctx.fillRect(wallX - 4, pipeY - 8, 3, 23);

    // Curved inlet and square faucet body.
    ctx.strokeStyle = metal;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(nozzleX + 23, pipeY);
    ctx.lineTo(nozzleX - 2, pipeY);
    ctx.quadraticCurveTo(nozzleX - 19, pipeY, nozzleX - 19, pipeY + 17);
    ctx.lineTo(nozzleX - 19, pipeY + 35);
    ctx.stroke();
    ctx.fillStyle = metal;
    ctx.beginPath();
    ctx.roundRect(nozzleX - 28, pipeY + 33, 44, 13, 3);
    ctx.fill();

    // Valve handle and orange stem.
    ctx.beginPath();
    ctx.roundRect(nozzleX - 2, pipeY - 31, 59, 9, 4);
    ctx.fill();
    ctx.fillStyle = orange;
    ctx.fillRect(nozzleX + 24, pipeY - 22, 5, 22);
    ctx.fillRect(nozzleX + 20, pipeY - 26, 13, 3);
    ctx.strokeStyle = metal;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(nozzleX + 26.5, pipeY - 21);
    ctx.lineTo(nozzleX + 26.5, pipeY - 2);
    ctx.stroke();

    // Single outlet, centered directly under the thick faucet body.
    ctx.fillStyle = orange;
    ctx.fillRect(nozzleX - 10, pipeY + 46, 8, 9);
  }
}
