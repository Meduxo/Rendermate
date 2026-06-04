import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { Grid } from "./lib-types";

export class GridRenderer3D {
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
    this.camera.position.set(0, -2.2, 2.2);
    this.camera.lookAt(0, 0, 0);

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

  render(grid: Grid, satPoint = 1.0, offset = 0.01, maxHeight = 1.0, lines = false): void {
    const rows = grid.length;
    const cols = rows > 0 ? grid[0].length : 0;
    if (rows === 0 || cols === 0) return;

    // Dispose previous objects.
    if (this.mesh) {
      (this.mesh.material as THREE.MeshBasicMaterial).dispose();
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

    const sp     = Math.max(1e-6, satPoint);
    const maxAdj = Math.max(1e-6, sp + offset);

    const aspect = cols / rows;
    const planeW = aspect >= 1 ? 2 : 2 * aspect;
    const planeH = aspect >= 1 ? 2 / aspect : 2;

    if (lines) {
      // One vertical segment per cell: base (z=0) → displaced height (z=h).
      const posData   = new Float32Array(rows * cols * 6);
      const colorData = new Float32Array(rows * cols * 6);

      for (let iy = 0; iy < rows; iy++) {
        for (let ix = 0; ix < cols; ix++) {
          const i   = iy * cols + ix;
          const raw = grid[iy][ix] ?? 0;
          const h   = Math.min(1, Math.max(0, (raw + offset) / maxAdj)) * maxHeight;
          const cv  = Math.min(1, Math.max(0, raw / sp));
          // Cell centre in the plane.
          const cx  = -planeW / 2 + (ix + 0.5) * (planeW / cols);
          const cy  =  planeH / 2 - (iy + 0.5) * (planeH / rows);

          posData[i * 6]     = cx;  posData[i * 6 + 1] = cy;  posData[i * 6 + 2] = 0;
          posData[i * 6 + 3] = cx;  posData[i * 6 + 4] = cy;  posData[i * 6 + 5] = h;
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

    // Mesh path (surface).
    // widthSegments=cols-1, heightSegments=rows-1 → cols*rows vertices.
    // Three.js PlaneGeometry vertex index = iy * cols + ix,
    // where iy=0 is the top row, matching grid[0].
    const geometry = new THREE.PlaneGeometry(planeW, planeH, cols - 1, rows - 1);
    const positions = geometry.attributes.position as THREE.BufferAttribute;
    const colorData = new Float32Array(positions.count * 3);

    for (let iy = 0; iy < rows; iy++) {
      for (let ix = 0; ix < cols; ix++) {
        const idx = iy * cols + ix;
        const raw = grid[iy][ix] ?? 0;
        const h   = Math.min(1, Math.max(0, (raw + offset) / maxAdj)) * maxHeight;
        positions.setZ(idx, h);

        const v = Math.min(1, Math.max(0, raw / sp));
        colorData[idx * 3]     = v;
        colorData[idx * 3 + 1] = v;
        colorData[idx * 3 + 2] = v;
      }
    }

    positions.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.setAttribute("color", new THREE.BufferAttribute(colorData, 3));

    const material = new THREE.MeshBasicMaterial({ vertexColors: true });
    this.mesh = new THREE.Mesh(geometry, material);
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
