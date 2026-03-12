let sim = {};
let SCALE = 1024;
let s1x, s1y, s1z, s2x, s2y, s2z, totalSteps;
let bSigma, bRho, bBeta, bDt, bS;

function cacheBigInts() {
  bSigma = BigInt(sim.sigma);
  bRho = BigInt(sim.rho);
  bBeta = BigInt(sim.beta);
  bDt = BigInt(sim.dt);
  bS = BigInt(SCALE);
}

function resetState() {
  s1x = sim.x0;
  s1y = sim.y0;
  s1z = sim.z0;
  s2x = sim.px0;
  s2y = sim.py0;
  s2z = sim.pz0;
  totalSteps = 0;
}

function stepOnce(x, y, z) {
  const bx = BigInt(x),
    by = BigInt(y),
    bz = BigInt(z);
  const dx = (bSigma * (by - bx) * bDt) / bS / bS;
  const dy = (((bx * (bRho - bz)) / bS - by) * bDt) / bS;
  const dz = (((bx * by) / bS - (bBeta * bz) / bS) * bDt) / bS;
  return [Number(bx + dx), Number(by + dy), Number(bz + dz)];
}

self.onmessage = function (e) {
  const msg = e.data;
  if (msg.type === "init") {
    sim = msg.sim;
    SCALE = msg.SCALE;
    cacheBigInts();
    resetState();
  } else if (msg.type === "reset") {
    resetState();
  } else if (msg.type === "setParam") {
    sim[msg.key] = msg.value;
    cacheBigInts();
  } else if (msg.type === "step") {
    const count = msg.count;
    const pts1 = new Float64Array(count * 3);
    const pts2 = new Float64Array(count * 3);
    let didOverflow = false;
    let written = 0;
    for (let n = 0; n < count; n++) {
      if (Math.abs(s1x) > 1e9 || Math.abs(s2x) > 1e9) {
        didOverflow = true;
        break;
      }
      [s1x, s1y, s1z] = stepOnce(s1x, s1y, s1z);
      [s2x, s2y, s2z] = stepOnce(s2x, s2y, s2z);
      const i = written * 3;
      // world coords: sim-x -> x, sim-z -> y, sim-y -> z
      pts1[i] = s1x / SCALE;
      pts1[i + 1] = s1z / SCALE;
      pts1[i + 2] = s1y / SCALE;
      pts2[i] = s2x / SCALE;
      pts2[i + 1] = s2z / SCALE;
      pts2[i + 2] = s2y / SCALE;
      written++;
      totalSteps++;
    }
    self.postMessage(
      { type: "result", pts1, pts2, count: written, totalSteps, didOverflow },
      [pts1.buffer, pts2.buffer],
    );
  }
};
