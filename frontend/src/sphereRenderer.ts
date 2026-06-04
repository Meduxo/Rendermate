import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { Grid } from "./lib-types";

const MAP_CELL = 4; // px per grid cell in the coverage map

export class SphereRenderer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private webgl: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private mesh: THREE.Mesh | null = null;
  private linesObj: THREE.LineSegments | null = null;
  private animId: number | null = null;
  private lastGrid: Grid | null = null;
  private lastSatPoint = 1.0;

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

  render(grid: Grid, satPoint = 1.0, displace = false, offset = 0.01, maxHeight = 1.0, lines = false): void {
    const rows = grid.length;
    const cols = rows > 0 ? grid[0].length : 0;
    if (rows === 0 || cols === 0) return;

    this.lastGrid     = grid;
    this.lastSatPoint = satPoint;

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

    // Lines mode requires displacement to be meaningful.
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
      const mat = new THREE.LineBasicMaterial({ vertexColors: true });
      this.linesObj = new THREE.LineSegments(geo, mat);
      this.scene.add(this.linesObj);
      this.updateMap();
      return;
    }

    // Mesh path ────────────────────────────────────────────────────────────────

    // One pixel per cell. NearestFilter preserves sharp discrete faces.
    const offscreen = document.createElement("canvas");
    offscreen.width = cols;
    offscreen.height = rows;
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

    // widthSegments=cols, heightSegments=rows → one face per grid cell.
    const geometry = new THREE.SphereGeometry(1, cols, rows);

    if (displace) {
      // SphereGeometry(1, cols, rows) has (cols+1)*(rows+1) vertices.
      // Vertex at grid position (j, i): index = j*(cols+1) + i.
      // i wraps at the seam: column = i % cols.
      const pos = geometry.attributes.position as THREE.BufferAttribute;
      for (let j = 0; j <= rows; j++) {
        const r = Math.min(j, rows - 1);
        for (let i = 0; i <= cols; i++) {
          const vi = j * (cols + 1) + i;
          const c  = i % cols;
          const h  = Math.min(1, Math.max(0, ((grid[r][c] ?? 0) + offset) / maxAdj)) * maxHeight;
          const x  = pos.getX(vi), y = pos.getY(vi), z = pos.getZ(vi);
          const len = Math.sqrt(x * x + y * y + z * z);
          if (len > 1e-6) pos.setXYZ(vi, (x / len) * h, (y / len) * h, (z / len) * h);
        }
      }
      pos.needsUpdate = true;
      geometry.computeVertexNormals();
    }

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
        const clamped = Math.min(1, Math.max(0, raw / Math.max(1e-6, this.lastSatPoint)));
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
