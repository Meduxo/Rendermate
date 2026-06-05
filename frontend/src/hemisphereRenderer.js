/**
 * hemisphereRenderer.ts — dual-slot version
 *
 * Slot 0 at x = -DUAL_OFFSET, slot 1 at x = +DUAL_OFFSET.
 * Each slot renders its grid onto the front hemisphere (φ ∈ [0,π])
 * with the back half zero-padded (black). Fisheye and relief are
 * per-slot; the fisheye Bresenham logic is unchanged.
 */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
const OVERSAMPLE = 4;
const DUAL_OFFSET = 1.5;
export class HemisphereRenderer {
    constructor(container) {
        this.meshes = [null, null];
        this.linesObjs = [null, null];
        this.animId = null;
        this.scene = new THREE.Scene();
        const w = container.clientWidth, h = container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
        this.camera.position.z = 4.5;
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
    render(slot, grid, satPoint = 1.0, fisheyeX = 0.0, fisheyeY = 0.0, displace = false, offset = 0.01, maxHeight = 1.0, lines = false) {
        const rows = grid.length;
        const cols = rows > 0 ? grid[0].length : 0;
        if (rows === 0 || cols === 0)
            return;
        const sp = Math.max(1e-6, satPoint);
        const maxAdj = Math.max(1e-6, sp + offset);
        const xPos = slot === 0 ? -DUAL_OFFSET : DUAL_OFFSET;
        if (this.meshes[slot]) {
            const mat = this.meshes[slot].material;
            mat.map?.dispose();
            mat.dispose();
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
        if (lines && displace) {
            const posData = new Float32Array(rows * cols * 6);
            const colorData = new Float32Array(rows * cols * 6);
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const i = r * cols + c;
                    const raw = grid[r][c] ?? 0;
                    const h = Math.min(1, Math.max(0, (raw + offset) / maxAdj)) * maxHeight;
                    const cv = Math.min(1, Math.max(0, raw / sp));
                    const phi = ((c + 0.5) / cols) * Math.PI;
                    const theta = ((r + 0.5) / rows) * Math.PI;
                    const sx = -Math.sin(theta) * Math.cos(phi);
                    const sy = Math.cos(theta);
                    const sz = Math.sin(theta) * Math.sin(phi);
                    posData[i * 6] = 0;
                    posData[i * 6 + 1] = 0;
                    posData[i * 6 + 2] = 0;
                    posData[i * 6 + 3] = sx * h;
                    posData[i * 6 + 4] = sy * h;
                    posData[i * 6 + 5] = sz * h;
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
        const colMap = buildMapping(cols, fisheyeX);
        const rowMap = buildMapping(rows, fisheyeY);
        const sampledCols = cols * OVERSAMPLE;
        const sampledRows = rows * OVERSAMPLE;
        const paddedCols = sampledCols * 2;
        const offscreen = document.createElement("canvas");
        offscreen.width = paddedCols;
        offscreen.height = sampledRows;
        const ctx = offscreen.getContext("2d");
        const img = ctx.createImageData(paddedCols, sampledRows);
        for (let pr = 0; pr < sampledRows; pr++) {
            const r = rowMap[pr];
            for (let p = 0; p < paddedCols; p++) {
                const raw = p < sampledCols ? (grid[r][colMap[p]] ?? 0) : 0;
                const v = Math.round(Math.min(1, Math.max(0, raw / sp)) * 255);
                const i = (pr * paddedCols + p) * 4;
                img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
                img.data[i + 3] = 255;
            }
        }
        ctx.putImageData(img, 0, 0);
        const texture = new THREE.CanvasTexture(offscreen);
        texture.magFilter = texture.minFilter = THREE.NearestFilter;
        texture.colorSpace = THREE.SRGBColorSpace;
        const geometry = new THREE.SphereGeometry(1, paddedCols, sampledRows);
        if (displace) {
            const backH = Math.min(1, Math.max(0, offset / maxAdj)) * maxHeight;
            const pos = geometry.attributes.position;
            for (let j = 0; j <= sampledRows; j++) {
                const r = rowMap[Math.min(j, sampledRows - 1)];
                for (let i = 0; i <= paddedCols; i++) {
                    const vi = j * (paddedCols + 1) + i;
                    const h = i < sampledCols
                        ? Math.min(1, Math.max(0, ((grid[r][colMap[Math.min(i, sampledCols - 1)]] ?? 0) + offset) / maxAdj)) * maxHeight
                        : backH;
                    const x = pos.getX(vi), y = pos.getY(vi), z = pos.getZ(vi);
                    const len = Math.sqrt(x * x + y * y + z * z);
                    if (len > 1e-6)
                        pos.setXYZ(vi, (x / len) * h, (y / len) * h, (z / len) * h);
                }
            }
            pos.needsUpdate = true;
            geometry.computeVertexNormals();
        }
        const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ map: texture }));
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
                this.meshes[slot].material.map?.dispose();
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
function buildMapping(count, fisheye) {
    const slots = count * OVERSAMPLE;
    const eps = Math.PI / (2 * count);
    let wSum = 0;
    const raw = new Float32Array(count);
    for (let i = 0; i < count; i++) {
        const phi = ((i + 0.5) / count) * Math.PI;
        raw[i] = 1.0 / (Math.sin(phi) + eps);
        wSum += raw[i];
    }
    const wMean = wSum / count;
    let tSum = 0;
    const targets = new Float32Array(count);
    for (let i = 0; i < count; i++) {
        const normW = raw[i] / wMean;
        targets[i] = Math.max(1, OVERSAMPLE * (1.0 + (normW - 1.0) * fisheye));
        tSum += targets[i];
    }
    const scale = slots / tSum;
    const mapping = new Uint16Array(slots);
    let carry = 0, slot = 0;
    for (let i = 0; i < count; i++) {
        const n = targets[i] * scale + carry;
        const intN = Math.max(1, Math.round(n));
        carry = n - intN;
        for (let j = 0; j < intN && slot < slots; j++)
            mapping[slot++] = i;
    }
    while (slot < slots)
        mapping[slot++] = count - 1;
    return mapping;
}
