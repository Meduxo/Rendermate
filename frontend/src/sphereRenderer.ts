import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { Grid } from "@shared/types";

const MAP_CELL = 4; // px per grid cell in the coverage map

export class SphereRenderer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private webgl: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private mesh: THREE.Mesh | null = null;
  private animId: number | null = null;
  private lastGrid: Grid | null = null;
  private lastScale = 1.0;

  constructor(
    container: HTMLElement,
    private mapCanvas: HTMLCanvasElement,
  ) {
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

  render(grid: Grid, scale = 1.0): void {
    const rows = grid.length;
    const cols = rows > 0 ? grid[0].length : 0;
    if (rows === 0 || cols === 0) return;

    this.lastGrid = grid;
    this.lastScale = scale;

    // One pixel per cell. NearestFilter preserves sharp discrete faces.
    const offscreen = document.createElement("canvas");
    offscreen.width = cols;
    offscreen.height = rows;
    const ctx = offscreen.getContext("2d")!;
    const img = ctx.createImageData(cols, rows);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const raw = grid[r][c] ?? 0;
        const v = Math.round(Math.min(1, Math.max(0, raw * scale)) * 255);
        const i = (r * cols + c) * 4;
        img.data[i]     = v;
        img.data[i + 1] = v;
        img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);

    const texture = new THREE.CanvasTexture(offscreen);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.colorSpace = THREE.SRGBColorSpace;

    if (this.mesh) {
      const mat = this.mesh.material as THREE.MeshBasicMaterial;
      mat.map?.dispose();
      mat.dispose();
      this.mesh.geometry.dispose();
      this.scene.remove(this.mesh);
    }

    // widthSegments=cols, heightSegments=rows → one face per grid cell.
    // Three.js SphereGeometry uses equirectangular UV mapping by default,
    // so the texture wraps perfectly: left edge meets right edge, top row
    // converges at the north pole, bottom row at the south pole.
    const geometry = new THREE.SphereGeometry(1, cols, rows);
    const material = new THREE.MeshBasicMaterial({ map: texture });
    this.mesh = new THREE.Mesh(geometry, material);
    this.scene.add(this.mesh);

    this.updateMap();
  }

  // Redraws the coverage map canvas every frame.
  // Each cell is shown at full brightness if it faces the camera, dimmed if hidden.
  // Three.js SphereGeometry vertex formula (defaults: phiStart=0, thetaStart=0):
  //   x = -sin(theta) * cos(phi)
  //   y =  cos(theta)
  //   z =  sin(theta) * sin(phi)
  // where phi = u*2π, theta = v*π, u = col/cols, v = row/rows.
  private updateMap(): void {
    const grid = this.lastGrid;
    if (!grid) return;
    const rows = grid.length;
    const cols = rows > 0 ? grid[0].length : 0;
    if (rows === 0 || cols === 0) return;

    const mapW = cols * MAP_CELL;
    const mapH = rows * MAP_CELL;
    if (this.mapCanvas.width !== mapW || this.mapCanvas.height !== mapH) {
      this.mapCanvas.width  = mapW;
      this.mapCanvas.height = mapH;
    }

    const ctx = this.mapCanvas.getContext("2d");
    if (!ctx) return;

    // Camera view direction toward the sphere center (origin).
    const cam = this.camera.position;
    const len = cam.length();
    const dx = -cam.x / len;
    const dy = -cam.y / len;
    const dz = -cam.z / len;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const u   = (c + 0.5) / cols;
        const v   = (r + 0.5) / rows;
        const phi   = 2 * Math.PI * u;
        const theta = Math.PI * v;
        const sx  = -Math.sin(theta) * Math.cos(phi);
        const sy  =  Math.cos(theta);
        const sz  =  Math.sin(theta) * Math.sin(phi);

        // Positive dot product → cell faces the camera (visible).
        const vis = sx * dx + sy * dy + sz * dz;

        const raw     = grid[r][c] ?? 0;
        const clamped = Math.min(1, Math.max(0, raw * this.lastScale));
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
    this.mapCanvas.width = 0;
    this.mapCanvas.height = 0;
  }
}
