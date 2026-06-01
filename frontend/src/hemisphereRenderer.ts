/**
 * hemisphereRenderer.ts
 *
 * Renders the full grid onto the front hemisphere of a sphere by padding the
 * texture to double width with zeros. The real data occupies the front-facing
 * half (φ ∈ [0, π]); the zero-padded half wraps around the back and is black.
 *
 * Fisheye lens correction uses a Bresenham slot-allocation approach:
 *   - Each axis is oversampled by OVERSAMPLE (4×), giving a minimum cell size
 *     of 1 slot = 1/OVERSAMPLE of the default.
 *   - Slots are distributed using 1/sin(φ) weights so edge cells expand and
 *     center cells shrink — no column or row is ever skipped entirely.
 *   - fisheyeX/Y = 0 → uniform (4 slots each); increasing pulls edges inward
 *     and reduces center cells down to 1 slot minimum.
 */

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { Grid } from "@shared/types";

// Texture slots per data column/row at fisheye=0.
// Determines minimum cell size: 1/OVERSAMPLE of default at max fisheye.
const OVERSAMPLE = 4;

export class HemisphereRenderer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private webgl: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private mesh: THREE.Mesh | null = null;
  private linesObj: THREE.LineSegments | null = null;
  private animId: number | null = null;

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene();

    const w = container.clientWidth;
    const h = container.clientHeight;

    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    this.camera.position.z = 2.5;

    this.webgl = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    this.webgl.setPixelRatio(window.devicePixelRatio);
    this.webgl.setSize(w, h);
    this.webgl.domElement.style.display = "block";
    container.appendChild(this.webgl.domElement);

    this.controls = new OrbitControls(this.camera, this.webgl.domElement);
    this.controls.enablePan = false;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
  }

  render(grid: Grid, satPoint = 1.0, fisheyeX = 0.0, fisheyeY = 0.0, displace = false, offset = 0.01, maxHeight = 1.0, lines = false): void {
    const rows = grid.length;
    const cols = rows > 0 ? grid[0].length : 0;
    if (rows === 0 || cols === 0) return;

    const sp     = Math.max(1e-6, satPoint);
    const maxAdj = Math.max(1e-6, sp + offset);

    // Dispose previous objects.
    if (this.mesh) {
      const mat = this.mesh.material as THREE.MeshBasicMaterial;
      mat.map?.dispose();
      mat.dispose();
      this.mesh.geometry.dispose();
      this.scene.remove(this.mesh);
      this.mesh = null;
    }
    if (this.linesObj) {
      (this.linesObj.material as THREE.LineBasicMaterial).dispose();
      this.linesObj.geometry.dispose();
      this.scene.remove(this.linesObj);
      this.linesObj = null;
    }

    // Lines mode requires displacement. Use raw equirectangular angles for
    // directions (no fisheye applied) so each cell maps to its natural position
    // on the front hemisphere (phi ∈ [0, π]).
    if (lines && displace) {
      const posData   = new Float32Array(rows * cols * 6);
      const colorData = new Float32Array(rows * cols * 6);

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const i     = r * cols + c;
          const raw   = grid[r][c] ?? 0;
          const h     = Math.min(1, Math.max(0, (raw + offset) / maxAdj)) * maxHeight;
          const cv    = Math.min(1, Math.max(0, raw / sp));
          // Front hemisphere: phi ∈ [0, π], theta ∈ [0, π].
          const phi   = ((c + 0.5) / cols) * Math.PI;
          const theta = ((r + 0.5) / rows) * Math.PI;
          const sx    = -Math.sin(theta) * Math.cos(phi);
          const sy    =  Math.cos(theta);
          const sz    =  Math.sin(theta) * Math.sin(phi);

          posData[i * 6]     = 0;      posData[i * 6 + 1] = 0;      posData[i * 6 + 2] = 0;
          posData[i * 6 + 3] = sx * h; posData[i * 6 + 4] = sy * h; posData[i * 6 + 5] = sz * h;
          colorData[i * 6]     = cv; colorData[i * 6 + 1] = cv; colorData[i * 6 + 2] = cv;
          colorData[i * 6 + 3] = cv; colorData[i * 6 + 4] = cv; colorData[i * 6 + 5] = cv;
        }
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(posData, 3));
      geo.setAttribute("color",    new THREE.BufferAttribute(colorData, 3));
      const mat = new THREE.LineBasicMaterial({ vertexColors: true });
      this.linesObj = new THREE.LineSegments(geo, mat);
      this.scene.add(this.linesObj);
      return;
    }

    const colMap = buildMapping(cols, fisheyeX);
    const rowMap = buildMapping(rows, fisheyeY);

    const sampledCols = cols * OVERSAMPLE;
    const sampledRows = rows * OVERSAMPLE;
    const paddedCols  = sampledCols * 2; // double: front data + back zeros

    const offscreen = document.createElement("canvas");
    offscreen.width  = paddedCols;
    offscreen.height = sampledRows;
    const ctx = offscreen.getContext("2d")!;
    const img = ctx.createImageData(paddedCols, sampledRows);

    for (let pr = 0; pr < sampledRows; pr++) {
      const r = rowMap[pr];
      for (let p = 0; p < paddedCols; p++) {
        const raw = p < sampledCols ? (grid[r][colMap[p]] ?? 0) : 0;
        const v   = Math.round(Math.min(1, Math.max(0, raw / sp)) * 255);
        const i   = (pr * paddedCols + p) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);

    const texture = new THREE.CanvasTexture(offscreen);
    texture.magFilter  = THREE.NearestFilter;
    texture.minFilter  = THREE.NearestFilter;
    texture.colorSpace = THREE.SRGBColorSpace;

    const geometry = new THREE.SphereGeometry(1, paddedCols, sampledRows);

    if (displace) {
      // Height for the zero-padded back hemisphere.
      const backH = Math.min(1, Math.max(0, offset / maxAdj)) * maxHeight;

      // SphereGeometry(1, paddedCols, sampledRows) has
      // (paddedCols+1)*(sampledRows+1) vertices.
      // Vertex at (i, j): index = j*(paddedCols+1) + i.
      // i < sampledCols → front hemisphere real data (use colMap/rowMap).
      // i >= sampledCols → back hemisphere zeros (use backH).
      const pos = geometry.attributes.position as THREE.BufferAttribute;
      for (let j = 0; j <= sampledRows; j++) {
        const r = rowMap[Math.min(j, sampledRows - 1)];
        for (let i = 0; i <= paddedCols; i++) {
          const vi = j * (paddedCols + 1) + i;
          let h: number;
          if (i < sampledCols) {
            const c = colMap[Math.min(i, sampledCols - 1)];
            h = Math.min(1, Math.max(0, ((grid[r][c] ?? 0) + offset) / maxAdj)) * maxHeight;
          } else {
            h = backH;
          }
          const x = pos.getX(vi), y = pos.getY(vi), z = pos.getZ(vi);
          const len = Math.sqrt(x * x + y * y + z * z);
          if (len > 1e-6) pos.setXYZ(vi, (x / len) * h, (y / len) * h, (z / len) * h);
        }
      }
      pos.needsUpdate = true;
      geometry.computeVertexNormals();
    }

    const material  = new THREE.MeshBasicMaterial({ map: texture });
    this.mesh       = new THREE.Mesh(geometry, material);
    this.scene.add(this.mesh);
  }

  start(): void {
    const loop = () => {
      this.animId = requestAnimationFrame(loop);
      this.controls.update();
      this.webgl.render(this.scene, this.camera);
    };
    loop();
  }

  stop(): void {
    if (this.animId !== null) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }

  dispose(): void {
    this.stop();
    this.controls.dispose();
    this.webgl.dispose();
    this.webgl.domElement.remove();
  }
}

/**
 * Build a texture-slot → data-index mapping for one axis.
 *
 * Returns a Uint16Array of length (count * OVERSAMPLE). Each entry is the
 * data index (0..count-1) to sample for that texture slot.
 *
 * At fisheye=0: every index gets exactly OVERSAMPLE slots (uniform).
 * As fisheye increases: edge indices expand (more slots), center shrinks
 * (fewer slots), down to a hard minimum of 1 slot — so nothing disappears.
 *
 * Weights use 1/sin(φ), the true equal-screen-width distribution, so the
 * fisheye correction matches the actual spherical foreshortening curve.
 */
function buildMapping(count: number, fisheye: number): Uint16Array {
  const slots = count * OVERSAMPLE;

  // eps prevents 1/sin blowing up at the very edge slots.
  const eps = Math.PI / (2 * count);

  // Raw 1/sin weights and their mean.
  let wSum = 0;
  const raw = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const phi = ((i + 0.5) / count) * Math.PI;
    raw[i]    = 1.0 / (Math.sin(phi) + eps);
    wSum     += raw[i];
  }
  const wMean = wSum / count;

  // Per-index target slot count.
  // At fisheye=0: OVERSAMPLE each. As fisheye grows, edges increase and
  // centre decreases, clamped to minimum 1.
  let tSum = 0;
  const targets = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const normW  = raw[i] / wMean;           // mean-normalised weight
    targets[i]   = Math.max(1, OVERSAMPLE * (1.0 + (normW - 1.0) * fisheye));
    tSum        += targets[i];
  }

  // Scale so the total exactly equals slots, then Bresenham-distribute.
  const scale  = slots / tSum;
  const mapping = new Uint16Array(slots);
  let carry = 0;
  let slot  = 0;
  for (let i = 0; i < count; i++) {
    const n    = targets[i] * scale + carry;
    const intN = Math.max(1, Math.round(n));
    carry      = n - intN;
    for (let j = 0; j < intN && slot < slots; j++) {
      mapping[slot++] = i;
    }
  }
  while (slot < slots) mapping[slot++] = count - 1;

  return mapping;
}
