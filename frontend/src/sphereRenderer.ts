import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { Grid } from "./lib-types";

const MAP_CELL    = 4;   // px per cell in coverage map
const DUAL_OFFSET = 1.5; // world-space X offset per slot

export class SphereRenderer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private webgl: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private meshes:    [THREE.Mesh | null,         THREE.Mesh | null]         = [null, null];
  private linesObjs: [THREE.LineSegments | null,  THREE.LineSegments | null] = [null, null];
  private lastGrids:    [Grid | null, Grid | null] = [null, null];
  private lastSatPoints: [number,     number]      = [1.0,  1.0];
  private animId: number | null = null;

  constructor(
    container: HTMLElement,
    private mapCanvas: HTMLCanvasElement,
  ) {
    this.scene = new THREE.Scene();

    const w = container.clientWidth;
    const h = container.clientHeight;

    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    this.camera.position.z = 4.5; // pulled back to see both spheres

    this.webgl = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    this.webgl.setPixelRatio(window.devicePixelRatio);
    this.webgl.setSize(w, h);
    this.webgl.domElement.style.display = "block";
    container.appendChild(this.webgl.domElement);

    this.controls = new OrbitControls(this.camera, this.webgl.domElement);
    this.controls.enablePan = false;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.target.set(0, 0, 0);
  }

  render(slot: 0|1, grid: Grid, satPoint = 1.0, displace = false, offset = 0.01, maxHeight = 1.0, lines = false): void {
    const rows = grid.length;
    const cols = rows > 0 ? grid[0].length : 0;
    if (rows === 0 || cols === 0) return;

    this.lastGrids[slot]     = grid;
    this.lastSatPoints[slot] = satPoint;

    const sp     = Math.max(1e-6, satPoint);
    const maxAdj = Math.max(1e-6, sp + offset);
    const xPos   = slot === 0 ? -DUAL_OFFSET : DUAL_OFFSET;

    // Dispose this slot's previous objects.
    if (this.meshes[slot]) {
      const mat = this.meshes[slot]!.material as THREE.MeshBasicMaterial;
      mat.map?.dispose();
      mat.dispose();
      this.meshes[slot]!.geometry.dispose();
      this.scene.remove(this.meshes[slot]!);
      this.meshes[slot] = null;
    }
    if (this.linesObjs[slot]) {
      (this.linesObjs[slot]!.material as THREE.LineBasicMaterial).dispose();
      this.linesObjs[slot]!.geometry.dispose();
      this.scene.remove(this.linesObjs[slot]!);
      this.linesObjs[slot] = null;
    }

    if (lines && displace) {
      const posData   = new Float32Array(rows * cols * 6);
      const colorData = new Float32Array(rows * cols * 6);

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const i     = r * cols + c;
          const raw   = grid[r][c] ?? 0;
          const h     = Math.min(1, Math.max(0, (raw + offset) / maxAdj)) * maxHeight;
          const cv    = Math.min(1, Math.max(0, raw / sp));
          const u     = (c + 0.5) / cols;
          const v_    = (r + 0.5) / rows;
          const phi   = 2 * Math.PI * u;
          const theta = Math.PI * v_;
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
      const obj = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ vertexColors: true }));
      obj.position.x = xPos;
      this.linesObjs[slot] = obj;
      this.scene.add(obj);
      this.updateMap();
      return;
    }

    // Mesh path ────────────────────────────────────────────────────────────────
    const offscreen = document.createElement("canvas");
    offscreen.width = cols; offscreen.height = rows;
    const ctx = offscreen.getContext("2d")!;
    const img = ctx.createImageData(cols, rows);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const raw = grid[r][c] ?? 0;
        const v   = Math.round(Math.min(1, Math.max(0, raw / sp)) * 255);
        const i   = (r * cols + c) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);

    const texture = new THREE.CanvasTexture(offscreen);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.colorSpace = THREE.SRGBColorSpace;

    const geometry = new THREE.SphereGeometry(1, cols, rows);

    if (displace) {
      const pos = geometry.attributes.position as THREE.BufferAttribute;
      for (let j = 0; j <= rows; j++) {
        const r = Math.min(j, rows - 1);
        for (let i = 0; i <= cols; i++) {
          const vi = j * (cols + 1) + i;
          const cc = i % cols;
          const h  = Math.min(1, Math.max(0, ((grid[r][cc] ?? 0) + offset) / maxAdj)) * maxHeight;
          const x  = pos.getX(vi), y = pos.getY(vi), z = pos.getZ(vi);
          const len = Math.sqrt(x * x + y * y + z * z);
          if (len > 1e-6) pos.setXYZ(vi, (x / len) * h, (y / len) * h, (z / len) * h);
        }
      }
      pos.needsUpdate = true;
      geometry.computeVertexNormals();
    }

    const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ map: texture }));
    mesh.position.x = xPos;
    this.meshes[slot] = mesh;
    this.scene.add(mesh);
    this.updateMap();
  }

  // Coverage map tracks slot 0 only.
  private updateMap(): void {
    const grid = this.lastGrids[0];
    if (!grid) return;
    const rows = grid.length;
    const cols = rows > 0 ? grid[0].length : 0;
    if (rows === 0 || cols === 0) return;

    const mapW = cols * MAP_CELL, mapH = rows * MAP_CELL;
    if (this.mapCanvas.width !== mapW || this.mapCanvas.height !== mapH) {
      this.mapCanvas.width = mapW; this.mapCanvas.height = mapH;
    }
    const ctx = this.mapCanvas.getContext("2d");
    if (!ctx) return;

    // Direction from camera toward slot-0 sphere center.
    const cam = this.camera.position;
    const tx = -DUAL_OFFSET - cam.x, ty = -cam.y, tz = -cam.z;
    const tLen = Math.sqrt(tx * tx + ty * ty + tz * tz);
    const dx = tx / tLen, dy = ty / tLen, dz = tz / tLen;

    const sp = Math.max(1e-6, this.lastSatPoints[0]);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const u = (c + 0.5) / cols, v = (r + 0.5) / rows;
        const phi = 2 * Math.PI * u, theta = Math.PI * v;
        const sx = -Math.sin(theta) * Math.cos(phi);
        const sy =  Math.cos(theta);
        const sz =  Math.sin(theta) * Math.sin(phi);
        const vis = sx * dx + sy * dy + sz * dz;
        const raw     = grid[r][c] ?? 0;
        const clamped = Math.min(1, Math.max(0, raw / sp));
        const base    = Math.round(clamped * 255);
        const byte    = vis > 0 ? base : Math.round(base * 0.2);
        ctx.fillStyle = `rgb(${byte},${byte},${byte})`;
        ctx.fillRect(c * MAP_CELL, r * MAP_CELL, MAP_CELL, MAP_CELL);
      }
    }
  }

  start(): void {
    const loop = () => {
      this.animId = requestAnimationFrame(loop);
      this.controls.update();
      this.webgl.render(this.scene, this.camera);
      this.updateMap();
    };
    loop();
  }

  stop(): void {
    if (this.animId !== null) { cancelAnimationFrame(this.animId); this.animId = null; }
  }

  dispose(): void {
    this.stop();
    for (let s = 0; s < 2; s++) {
      const slot = s as 0|1;
      if (this.meshes[slot]) {
        (this.meshes[slot]!.material as THREE.MeshBasicMaterial).map?.dispose();
        (this.meshes[slot]!.material as THREE.MeshBasicMaterial).dispose();
        this.meshes[slot]!.geometry.dispose();
      }
      if (this.linesObjs[slot]) {
        (this.linesObjs[slot]!.material as THREE.LineBasicMaterial).dispose();
        this.linesObjs[slot]!.geometry.dispose();
      }
    }
    this.controls.dispose();
    this.webgl.dispose();
    this.webgl.domElement.remove();
    this.mapCanvas.width = 0; this.mapCanvas.height = 0;
  }
}
