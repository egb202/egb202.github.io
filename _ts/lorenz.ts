import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";

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

type WorkerResult = {
  type: "result";
  pts1: Float64Array;
  pts2: Float64Array;
  count: number;
  steps: number;
  didOverflow: boolean;
  didConverge: boolean;
};

type SectionDef = { section: string };
type ParamDef = {
  key: keyof SimParams;
  label: string;
  step: number;
  dp: number;
};
type ParamEntry = SectionDef | ParamDef;

interface Trail {
  geometry: LineGeometry;
  material: LineMaterial;
  color: THREE.Color;
  bufX: Float32Array;
  bufY: Float32Array;
  bufZ: Float32Array;
}

const urlParams = new URLSearchParams(window.location.search);
const getInt = (key: string, def: number): number => {
  const v = urlParams.get(key);
  return v !== null ? parseInt(v, 10) : def;
};

const SCALE = getInt("scale", 1024);
const TAIL_MAX = 30000;
const SIM_RATE = 2; // sim time units advanced per real second

const color1Hex = urlParams.get("c1") ? "#" + urlParams.get("c1") : "#0088ff";
const color2Hex = urlParams.get("c2") ? "#" + urlParams.get("c2") : "#ff2233";

const sim: SimParams = {
  sigma: getInt("sigma", 10240),
  rho: getInt("rho", 28672),
  beta: getInt("beta", 2731),
  dt: getInt("dt", 1),
  x0: getInt("x", 1024),
  y0: getInt("y", 1024),
  z0: getInt("z", 1024),
  px0: getInt("px", 1025),
  py0: getInt("py", 1025),
  pz0: getInt("pz", 1025),
};

const worker = new Worker("/assets/js/lorenz-worker.js");

let bufHead = 0;
let bufCount = 0;

let stepCount = 0;
let lastFrameTime = 0;
let simTimeAccum = 0;
let workerBusy = false;
let geometryDirty = false;
let frozen = false;

const toast = document.getElementById("toast")!;
let toastTimer: ReturnType<typeof setTimeout> | null = null;
function showToast(text: string): void {
  toast.textContent = text;
  toast.classList.add("visible");
  if (toastTimer !== null) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 3000);
}

worker.onmessage = function (e: MessageEvent<WorkerResult>) {
  const msg = e.data;
  if (msg.type !== "result") return;
  workerBusy = false;
  if (msg.didOverflow) {
    if (!paused) togglePause();
    frozen = true;
    showToast("State diverged — press R to reset");
    return;
  }
  const { pts1, pts2, count } = msg;
  for (let i = 0; i < count; i++) {
    const offset = i * 3;
    trails[0].bufX[bufHead] = pts1[offset];
    trails[0].bufY[bufHead] = pts1[offset + 1];
    trails[0].bufZ[bufHead] = pts1[offset + 2];
    trails[1].bufX[bufHead] = pts2[offset];
    trails[1].bufY[bufHead] = pts2[offset + 1];
    trails[1].bufZ[bufHead] = pts2[offset + 2];
    bufHead = (bufHead + 1) % TAIL_MAX;
    if (bufCount < TAIL_MAX) bufCount++;
  }
  stepCount = msg.steps;
  if (msg.didConverge) {
    if (!paused) togglePause();
    frozen = true;
    showToast("Converged to equilibrium point — press R to reset");
    return;
  }
  geometryDirty = true;
};

function resetSim(): void {
  bufHead = 0;
  bufCount = 0;
  geometryDirty = true;
  stepCount = 0;
  simTimeAccum = 0;
  lastFrameTime = 0;
  workerBusy = false;
  frozen = false;
  worker.postMessage({ type: "reset" });
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020208);
scene.fog = new THREE.FogExp2(0x020208, 0.0006);

const camera = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 0.001, 2000);
camera.position.set(0, 25, 45);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  preserveDrawingBuffer: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.enableDamping = true;
orbitControls.dampingFactor = 0.03;
orbitControls.minDistance = 0.001;
orbitControls.maxDistance = 200;
orbitControls.target.set(0, 25, 0);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  trails[0].material.resolution.set(window.innerWidth, window.innerHeight);
  trails[1].material.resolution.set(window.innerWidth, window.innerHeight);
});

function createTrail(colorHex: string): Trail {
  const baseColor = new THREE.Color(colorHex);

  const geometry = new LineGeometry();
  geometry.setPositions(new Float32Array(TAIL_MAX * 3));
  geometry.setColors(new Float32Array(TAIL_MAX * 3));

  const material = new LineMaterial({
    vertexColors: true,
    linewidth: 1.5,
    resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
    transparent: true,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendEquation: THREE.MaxEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
  });

  const line = new Line2(geometry, material);
  line.frustumCulled = false;
  scene.add(line);

  return {
    geometry,
    material,
    color: baseColor,
    bufX: new Float32Array(TAIL_MAX),
    bufY: new Float32Array(TAIL_MAX),
    bufZ: new Float32Array(TAIL_MAX),
  };
}

const trails: Trail[] = [createTrail(color1Hex), createTrail(color2Hex)];

const paramDefs: ParamEntry[] = [
  { section: "Parameters" },
  { key: "sigma", label: "σ", step: 0.5, dp: 1 },
  { key: "rho", label: "ρ", step: 0.5, dp: 1 },
  { key: "beta", label: "β", step: 0.1, dp: 3 },
  { section: "Initial Condition 1" },
  { key: "x0", label: "x", step: 0.1, dp: 3 },
  { key: "y0", label: "y", step: 0.1, dp: 3 },
  { key: "z0", label: "z", step: 0.1, dp: 3 },
  { section: "Initial Condition 2" },
  { key: "px0", label: "x", step: 0.001, dp: 3 },
  { key: "py0", label: "y", step: 0.001, dp: 3 },
  { key: "pz0", label: "z", step: 0.001, dp: 3 },
  { section: "Solver Parameters" },
  { key: "dt", label: "Δt", step: 0.0001, dp: 4 },
];

const displayValues = {} as SimParams;
const paramValueEls: Partial<Record<keyof SimParams, HTMLSpanElement>> = {};
for (const def of paramDefs) {
  if ("key" in def) displayValues[def.key] = sim[def.key] / SCALE;
}

function nudge(param: ParamDef, dir: number): void {
  displayValues[param.key] = parseFloat(
    (displayValues[param.key] + param.step * dir).toFixed(param.dp + 2),
  );
  sim[param.key] = Math.round(displayValues[param.key] * SCALE);
  paramValueEls[param.key]!.textContent = displayValues[param.key].toFixed(param.dp);
  worker.postMessage({
    type: "setParameters",
    key: param.key,
    value: sim[param.key],
  });
}

const paramsContainer = document.getElementById("params")!;
for (const def of paramDefs) {
  if ("section" in def) {
    const label = document.createElement("div");
    label.className = "section-label";
    label.textContent = def.section;
    paramsContainer.appendChild(label);
    continue;
  }

  const row = document.createElement("div");
  row.className = "param-row";

  const nameEl = document.createElement("span");
  nameEl.className = "param-name";
  nameEl.textContent = def.label;

  const valueEl = document.createElement("span");
  valueEl.className = "param-val";
  valueEl.contentEditable = "true";
  valueEl.spellcheck = false;
  valueEl.textContent = displayValues[def.key].toFixed(def.dp);
  paramValueEls[def.key] = valueEl;

  const param = def;
  function commitValue(): void {
    const parsed = parseFloat(valueEl.textContent ?? "");
    if (!isNaN(parsed)) {
      displayValues[param.key] = parsed;
      sim[param.key] = Math.round(parsed * SCALE);
      worker.postMessage({
        type: "setParameters",
        key: param.key,
        value: sim[param.key],
      });
    }
    valueEl.textContent = displayValues[param.key].toFixed(param.dp);
  }

  valueEl.addEventListener("blur", commitValue);
  valueEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      valueEl.blur();
    }
    if (e.key === "Escape") {
      valueEl.textContent = displayValues[def.key].toFixed(def.dp);
      valueEl.blur();
    }
  });
  valueEl.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      nudge(def, e.deltaY < 0 ? 1 : -1);
    },
    { passive: false },
  );

  const arrowsEl = document.createElement("span");
  arrowsEl.className = "param-arrows";
  const upBtn = document.createElement("button");
  upBtn.textContent = "▲";
  upBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    nudge(def, 1);
  });
  const downBtn = document.createElement("button");
  downBtn.textContent = "▼";
  downBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    nudge(def, -1);
  });
  arrowsEl.append(upBtn, downBtn);
  row.append(nameEl, valueEl, arrowsEl);
  paramsContainer.appendChild(row);
}

const resetBtn = document.createElement("button");
resetBtn.id = "reset-btn";
resetBtn.className = "ctrl-btn";
resetBtn.innerHTML = 'Reset<span class="hint">R</span>';
resetBtn.addEventListener("click", () => resetSim());
paramsContainer.appendChild(resetBtn);

let paused = false;
const pauseIndicator = document.getElementById("pause-indicator")!;
const controlsPanel = document.getElementById("controls")!;
const stepCounter = document.getElementById("step-counter")!;

function togglePause(): void {
  if (frozen && paused) return;
  paused = !paused;
  pauseIndicator.classList.toggle("visible", paused);
  screenshotBtn.classList.toggle("hidden", !paused);
  stepBtn.classList.toggle("hidden", !paused);
  pauseBtn.innerHTML = paused
    ? 'play<span class="hint">SP</span>'
    : 'pause<span class="hint">SP</span>';
  if (!paused) lastFrameTime = 0;
}

function singleStep(): void {
  if (!paused || workerBusy) return;
  workerBusy = true;
  worker.postMessage({ type: "step", count: 1 });
}

function screenshot(): void {
  const outputW = 3840,
    outputH = 2160;
  const ssW = outputW * 2,
    ssH = outputH * 2;

  const renderTarget = new THREE.WebGLRenderTarget(ssW, ssH, { samples: 8 });
  renderTarget.texture.colorSpace = THREE.SRGBColorSpace;

  const prevAspect = camera.aspect;
  camera.aspect = ssW / ssH;
  camera.updateProjectionMatrix();
  trails[0].material.resolution.set(ssW, ssH);
  trails[1].material.resolution.set(ssW, ssH);

  renderer.setRenderTarget(renderTarget);
  renderer.render(scene, camera);
  renderer.setRenderTarget(null);

  const pixels = new Uint8Array(ssW * ssH * 4);
  renderer.readRenderTargetPixels(renderTarget, 0, 0, ssW, ssH, pixels);
  renderTarget.dispose();

  const ssCanvas = document.createElement("canvas");
  ssCanvas.width = ssW;
  ssCanvas.height = ssH;
  const ssCtx = ssCanvas.getContext("2d")!;
  const imageData = ssCtx.createImageData(ssW, ssH);
  for (let y = 0; y < ssH; y++) {
    const src = (ssH - 1 - y) * ssW * 4;
    imageData.data.set(pixels.subarray(src, src + ssW * 4), y * ssW * 4);
  }
  ssCtx.putImageData(imageData, 0, 0);

  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = outputW;
  outputCanvas.height = outputH;
  outputCanvas.getContext("2d")!.drawImage(ssCanvas, 0, 0, outputW, outputH);

  camera.aspect = prevAspect;
  camera.updateProjectionMatrix();
  trails[0].material.resolution.set(window.innerWidth, window.innerHeight);
  trails[1].material.resolution.set(window.innerWidth, window.innerHeight);

  const downloadLink = document.createElement("a");
  downloadLink.download = "lorenz.png";
  downloadLink.href = outputCanvas.toDataURL("image/png");
  downloadLink.click();
}

const screenshotBtn = document.createElement("button");
screenshotBtn.className = "ctrl-btn hidden";
screenshotBtn.innerHTML = 'save<span class="hint">S</span>';
screenshotBtn.addEventListener("click", () => screenshot());

const stepBtn = document.createElement("button");
stepBtn.className = "ctrl-btn hidden";
stepBtn.innerHTML = 'step<span class="hint">→</span>';
stepBtn.addEventListener("click", singleStep);

const pauseBtn = document.createElement("button");
pauseBtn.className = "ctrl-btn";
pauseBtn.innerHTML = 'pause<span class="hint">SP</span>';
pauseBtn.addEventListener("click", togglePause);

controlsPanel.append(screenshotBtn, stepBtn, pauseBtn);

document.addEventListener("keydown", (e) => {
  if (e.key === "r" || e.key === "R") resetSim();
  if (e.key === " ") {
    e.preventDefault();
    togglePause();
  }
  if ((e.key === "s" || e.key === "S") && paused) screenshot();
  if (e.key === "ArrowRight" && paused) singleStep();
});

worker.postMessage({ type: "init", sim: { ...sim }, SCALE });
resetSim();

function animate(now: number): void {
  requestAnimationFrame(animate);

  if (!paused) {
    if (lastFrameTime === 0) lastFrameTime = now;
    const realDelta = Math.min((now - lastFrameTime) / 1000, 0.05);
    lastFrameTime = now;

    const stepDuration = sim.dt / SCALE;
    if (stepDuration > 0) {
      simTimeAccum += realDelta * SIM_RATE;
      // Cap accumulator so we don't build up debt while worker is busy
      simTimeAccum = Math.min(simTimeAccum, 0.5);
      if (!workerBusy) {
        const stepsNeeded = Math.floor(simTimeAccum / stepDuration);
        if (stepsNeeded > 0) {
          simTimeAccum -= stepsNeeded * stepDuration;
          workerBusy = true;
          worker.postMessage({ type: "step", count: stepsNeeded });
        }
      }
    }
  }

  const segCount = Math.max(0, bufCount - 1);
  if (geometryDirty) {
    geometryDirty = false;
    for (const { geometry, color, bufX, bufY, bufZ } of trails) {
      if (segCount > 0) {
        const posAttr = geometry.attributes.instanceStart as THREE.InterleavedBufferAttribute;
        const colAttr = geometry.attributes.instanceColorStart as THREE.InterleavedBufferAttribute;
        const posData = posAttr.data.array as Float32Array;
        const colData = colAttr.data.array as Float32Array;

        for (let i = 0; i < segCount; i++) {
          const segStartIdx = (bufHead - bufCount + i + TAIL_MAX) % TAIL_MAX;
          const segEndIdx = (bufHead - bufCount + i + 1 + TAIL_MAX) % TAIL_MAX;
          const fadeStart = Math.sqrt(i / bufCount) * 0.9;
          const fadeEnd = Math.sqrt((i + 1) / bufCount) * 0.9;
          const base = i * 6;
          posData[base] = bufX[segStartIdx];
          posData[base + 1] = bufY[segStartIdx];
          posData[base + 2] = bufZ[segStartIdx];
          posData[base + 3] = bufX[segEndIdx];
          posData[base + 4] = bufY[segEndIdx];
          posData[base + 5] = bufZ[segEndIdx];
          colData[base] = color.r * fadeStart;
          colData[base + 1] = color.g * fadeStart;
          colData[base + 2] = color.b * fadeStart;
          colData[base + 3] = color.r * fadeEnd;
          colData[base + 4] = color.g * fadeEnd;
          colData[base + 5] = color.b * fadeEnd;
        }

        posAttr.data.needsUpdate = true;
        colAttr.data.needsUpdate = true;
      }

      geometry.instanceCount = segCount;
    }
  }

  stepCounter.textContent = stepCount.toLocaleString();
  orbitControls.update();
  renderer.render(scene, camera);
}

requestAnimationFrame(animate);
