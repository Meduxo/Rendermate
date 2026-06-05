import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
const DUAL_OFFSET = 1.5;
export class GridRenderer3D {
    constructor(container) {
        this.meshes = [null, null];
        this.linesObjs = [null, null];
        this.animId = null;
        this.scene = new THREE.Scene();
        const w = container.clientWidth, h = container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
        this.camera.position.set(0, -2.2, 4.0); // pulled back to see both grids
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
    render(slot, grid, satPoint = 1.0, offset = 0.01, maxHeight = 1.0, lines = false) {
        const rows = grid.length;
        const cols = rows > 0 ? grid[0].length : 0;
        if (rows === 0 || cols === 0)
            return;
        if (this.meshes[slot]) {
            this.meshes[slot].material.dispose();
            this.meshes[slot].geometry.dispose();
            this.scene.remove(this.meshes[slot]);
            this.meshes[slot] = null;
        }
        if (this.linesObjs[slot]) {
            this.linesObjs[slot].material.dispose();
            this.linesObjs[slot].geometry.dispose();
            this.scene.remove(this.linesObjs[slot]);
            this.linesObjs[slot] = null;
        }
        const sp = Math.max(1e-6, satPoint);
        const maxAdj = Math.max(1e-6, sp + offset);
        const aspect = cols / rows;
        const planeW = aspect >= 1 ? 2 : 2 * aspect;
        const planeH = aspect >= 1 ? 2 / aspect : 2;
        const xPos = slot === 0 ? -DUAL_OFFSET : DUAL_OFFSET;
        if (lines) {
            const posData = new Float32Array(rows * cols * 6);
            const colorData = new Float32Array(rows * cols * 6);
            for (let iy = 0; iy < rows; iy++) {
                for (let ix = 0; ix < cols; ix++) {
                    const i = iy * cols + ix;
                    const raw = grid[iy][ix] ?? 0;
                    const h = Math.min(1, Math.max(0, (raw + offset) / maxAdj)) * maxHeight;
                    const cv = Math.min(1, Math.max(0, raw / sp));
                    const cx = -planeW / 2 + (ix + 0.5) * (planeW / cols);
                    const cy = planeH / 2 - (iy + 0.5) * (planeH / rows);
                    posData[i * 6] = cx;
                    posData[i * 6 + 1] = cy;
                    posData[i * 6 + 2] = 0;
                    posData[i * 6 + 3] = cx;
                    posData[i * 6 + 4] = cy;
                    posData[i * 6 + 5] = h;
                    colorData[i * 6] = cv;
                    colorData[i * 6 + 1] = cv;
                    colorData[i * 6 + 2] = cv;
                    colorData[i * 6 + 3] = cv;
                    colorData[i * 6 + 4] = cv;
                    colorData[i * 6 + 5] = cv;
                }
            }
            const geo = new THREE.BufferGeometry();
            geo.setAttribute("position", new THREE.BufferAttribute(posData, 3));
            geo.setAttribute("color", new THREE.BufferAttribute(colorData, 3));
            const obj = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ vertexColors: true }));
            obj.position.x = xPos;
            this.linesObjs[slot] = obj;
            this.scene.add(obj);
            return;
        }
        const geometry = new THREE.PlaneGeometry(planeW, planeH, cols - 1, rows - 1);
        const positions = geometry.attributes.position;
        const colorData = new Float32Array(positions.count * 3);
        for (let iy = 0; iy < rows; iy++) {
            for (let ix = 0; ix < cols; ix++) {
                const idx = iy * cols + ix;
                const raw = grid[iy][ix] ?? 0;
                positions.setZ(idx, Math.min(1, Math.max(0, (raw + offset) / maxAdj)) * maxHeight);
                const v = Math.min(1, Math.max(0, raw / sp));
                colorData[idx * 3] = colorData[idx * 3 + 1] = colorData[idx * 3 + 2] = v;
            }
        }
        positions.needsUpdate = true;
        geometry.computeVertexNormals();
        geometry.setAttribute("color", new THREE.BufferAttribute(colorData, 3));
        const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ vertexColors: true }));
        mesh.position.x = xPos;
        this.meshes[slot] = mesh;
        this.scene.add(mesh);
    }
    start() {
        const loop = () => {
            this.animId = requestAnimationFrame(loop);
            this.controls.update();
            this.webgl.render(this.scene, this.camera);
        };
        loop();
    }
    stop() {
        if (this.animId !== null) {
            cancelAnimationFrame(this.animId);
            this.animId = null;
        }
    }
    dispose() {
        this.stop();
        for (let s = 0; s < 2; s++) {
            const slot = s;
            if (this.meshes[slot]) {
                this.meshes[slot].material.dispose();
                this.meshes[slot].geometry.dispose();
            }
            if (this.linesObjs[slot]) {
                this.linesObjs[slot].material.dispose();
                this.linesObjs[slot].geometry.dispose();
            }
        }
        this.controls.dispose();
        this.webgl.dispose();
        this.webgl.domElement.remove();
    }
}
