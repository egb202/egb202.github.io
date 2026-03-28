interface SimParams {
  sigma: number;
  rho: number;
  beta: number;
  dt: number;
  x0: number;
  y0: number;
  z0: number;
  px0: number;
  py0: number;
  pz0: number;
}

type WorkerMessage =
  | { type: "init"; sim: SimParams; SCALE: number }
  | { type: "reset" }
  | { type: "setParameters"; key: keyof SimParams; value: number }
  | { type: "step"; count: number };

let sim: SimParams = {} as SimParams;
let SCALE = 1024;
let x1: number, y1: number, z1: number;
let x2: number, y2: number, z2: number;
let stepCount: number;
let bigSigma: bigint;
let bigRho: bigint;
let bigBeta: bigint;
let bigDt: bigint;
let bigScale: bigint;

function cacheParameters(): void {
  bigSigma = BigInt(sim.sigma);
  bigRho = BigInt(sim.rho);
  bigBeta = BigInt(sim.beta);
  bigDt = BigInt(sim.dt);
  bigScale = BigInt(SCALE);
}

function resetState(): void {
  x1 = sim.x0;
  y1 = sim.y0;
  z1 = sim.z0;
  x2 = sim.px0;
  y2 = sim.py0;
  z2 = sim.pz0;
  stepCount = 0;
}

function stepSim(x: number, y: number, z: number): [number, number, number, boolean] {
  const bx = BigInt(x);
  const by = BigInt(y);
  const bz = BigInt(z);

  const dx = (bigSigma * (by - bx) * bigDt) / bigScale / bigScale;
  const dy = (((bx * (bigRho - bz)) / bigScale - by) * bigDt) / bigScale;
  const dz = (((bx * by) / bigScale - (bigBeta * bz) / bigScale) * bigDt) / bigScale;

  const nextX = bx + dx;
  const nextY = by + dy;
  const nextZ = bz + dz;

  const clampedX = BigInt.asIntN(32, nextX);
  const clampedY = BigInt.asIntN(32, nextY);
  const clampedZ = BigInt.asIntN(32, nextZ);

  const outX = Number(clampedX);
  const outY = Number(clampedY);
  const outZ = Number(clampedZ);

  const diverged =
    nextX !== clampedX ||
    nextY !== clampedY ||
    nextZ !== clampedZ ||
    Math.abs(outX) > SCALE * 200 ||
    Math.abs(outY) > SCALE * 200 ||
    Math.abs(outZ) > SCALE * 200;

  return [outX, outY, outZ, diverged];
}

self.onmessage = function (e: MessageEvent<WorkerMessage>) {
  const msg = e.data;
  if (msg.type === "init") {
    sim = msg.sim;
    SCALE = msg.SCALE;
    cacheParameters();
    resetState();
  } else if (msg.type === "reset") {
    resetState();
  } else if (msg.type === "setParameters") {
    sim[msg.key] = msg.value;
    cacheParameters();
  } else if (msg.type === "step") {
    const count = msg.count;
    const traj1 = new Float64Array(count * 3);
    const traj2 = new Float64Array(count * 3);

    let diverged = false;
    let pointCount = 0;

    for (let n = 0; n < count; n++) {
      [x1, y1, z1, diverged] = stepSim(x1, y1, z1);
      if (diverged) break;

      [x2, y2, z2, diverged] = stepSim(x2, y2, z2);
      if (diverged) break;

      const offset = pointCount * 3;

      // world coords: sim-x -> x, sim-z -> y, sim-y -> z
      traj1[offset] = x1 / SCALE;
      traj1[offset + 1] = z1 / SCALE;
      traj1[offset + 2] = y1 / SCALE;
      traj2[offset] = x2 / SCALE;
      traj2[offset + 1] = z2 / SCALE;
      traj2[offset + 2] = y2 / SCALE;

      pointCount++;
      stepCount++;
    }

    self.postMessage(
      {
        type: "result",
        pts1: traj1,
        pts2: traj2,
        count: pointCount,
        steps: stepCount,
        didOverflow: diverged,
      },
      [traj1.buffer, traj2.buffer],
    );
  }
};
