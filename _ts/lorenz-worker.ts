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
let px1: number, py1: number, pz1: number;
let px2: number, py2: number, pz2: number;
let converged1 = false;
let converged2 = false;
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
  px1 = x1;
  py1 = y1;
  pz1 = z1;
  px2 = x2;
  py2 = y2;
  pz2 = z2;
  converged1 = false;
  converged2 = false;
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

  const diverged = nextX !== clampedX || nextY !== clampedY || nextZ !== clampedZ;

  return [Number(clampedX), Number(clampedY), Number(clampedZ), diverged];
}

function reachedEquilibrium(
  x1: number,
  y1: number,
  z1: number,
  x2: number,
  y2: number,
  z2: number,
): boolean {
  return x1 === x2 && y1 === y2 && z1 === z2;
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
      const offset = pointCount * 3;

      // world coords: sim-x -> x, sim-z -> y, sim-y -> z

      if (!converged1) {
        [x1, y1, z1, diverged] = stepSim(x1, y1, z1);
        if (diverged) break;
        if (reachedEquilibrium(x1, y1, z1, px1, py1, pz1)) converged1 = true;
        px1 = x1;
        py1 = y1;
        pz1 = z1;

        traj1[offset] = x1 / SCALE;
        traj1[offset + 1] = z1 / SCALE;
        traj1[offset + 2] = y1 / SCALE;
      }

      if (!converged2) {
        [x2, y2, z2, diverged] = stepSim(x2, y2, z2);
        if (diverged) break;
        if (reachedEquilibrium(x2, y2, z2, px2, py2, pz2)) converged2 = true;
        px2 = x2;
        py2 = y2;
        pz2 = z2;

        traj2[offset] = x2 / SCALE;
        traj2[offset + 1] = z2 / SCALE;
        traj2[offset + 2] = y2 / SCALE;
      }

      pointCount++;
      stepCount++;

      if (converged1 && converged2) break;
    }

    self.postMessage(
      {
        type: "result",
        pts1: traj1,
        pts2: traj2,
        count: pointCount,
        steps: stepCount,
        didOverflow: diverged,
        didConverge: converged1 && converged2,
        didConverge1: converged1,
        didConverge2: converged2,
      },
      [traj1.buffer, traj2.buffer],
    );
  }
};
