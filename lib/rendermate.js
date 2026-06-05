import * as o from "three";
import { OrbitControls as Z } from "three/addons/controls/OrbitControls.js";
const G = 8;
function K(M, t, e = 1) {
  const s = t.length, f = s > 0 ? t[0].length : 0;
  if (M.width = f * G, M.height = s * G, s === 0 || f === 0)
    return;
  const g = M.getContext("2d");
  if (!g)
    throw new Error("Could not acquire 2D canvas context.");
  const P = Math.max(1e-6, e);
  for (let a = 0; a < s; a++)
    for (let i = 0; i < f; i++) {
      const d = t[a][i] ?? 0, p = Math.min(1, Math.max(0, d / P)), c = Math.round(p * 255);
      g.fillStyle = `rgb(${c},${c},${c})`, g.fillRect(i * G, a * G, G, G);
    }
}
function Q(M, t, e = 1) {
  const s = t.length, f = s > 0 ? t[0].length : 0;
  if (M.width = f * G, M.height = s * G, s === 0 || f === 0)
    return;
  const g = M.getContext("2d");
  if (!g)
    throw new Error("Could not acquire 2D canvas context.");
  g.fillStyle = "#000", g.fillRect(0, 0, M.width, M.height);
  const P = Math.max(1e-6, e);
  for (let a = 0; a < s; a++)
    for (let i = 0; i < f; i++) {
      const d = t[a][i] ?? 0, p = Math.min(1, Math.max(0, d / P)), c = Math.round(p * 255), v = Math.round(p * G);
      v <= 0 || (g.fillStyle = `rgb(${c},${c},${c})`, g.fillRect(i * G, (a + 1) * G - v, G, v));
    }
}
function tt(M) {
  M.width = 0, M.height = 0;
}
const q = 4, T = 1.5;
class et {
  constructor(t, e) {
    this.mapCanvas = e, this.meshes = [null, null], this.linesObjs = [null, null], this.lastGrids = [null, null], this.lastSatPoints = [1, 1], this.animId = null, this.scene = new o.Scene();
    const s = t.clientWidth, f = t.clientHeight;
    this.camera = new o.PerspectiveCamera(45, s / f, 0.1, 100), this.camera.position.z = 4.5, this.webgl = new o.WebGLRenderer({ antialias: !1, alpha: !0 }), this.webgl.setPixelRatio(window.devicePixelRatio), this.webgl.setSize(s, f), this.webgl.domElement.style.display = "block", t.appendChild(this.webgl.domElement), this.controls = new Z(this.camera, this.webgl.domElement), this.controls.enablePan = !1, this.controls.enableDamping = !0, this.controls.dampingFactor = 0.08, this.controls.target.set(0, 0, 0);
  }
  render(t, e, s = 1, f = !1, g = 0.01, P = 1, a = !1) {
    var x;
    const i = e.length, d = i > 0 ? e[0].length : 0;
    if (i === 0 || d === 0)
      return;
    this.lastGrids[t] = e, this.lastSatPoints[t] = s;
    const p = Math.max(1e-6, s), c = Math.max(1e-6, p + g), v = t === 0 ? -T : T;
    if (this.meshes[t]) {
      const n = this.meshes[t].material;
      (x = n.map) == null || x.dispose(), n.dispose(), this.meshes[t].geometry.dispose(), this.scene.remove(this.meshes[t]), this.meshes[t] = null;
    }
    if (this.linesObjs[t] && (this.linesObjs[t].material.dispose(), this.linesObjs[t].geometry.dispose(), this.scene.remove(this.linesObjs[t]), this.linesObjs[t] = null), a && f) {
      const n = new Float32Array(i * d * 6), h = new Float32Array(i * d * 6);
      for (let w = 0; w < i; w++)
        for (let b = 0; b < d; b++) {
          const j = w * d + b, u = e[w][b] ?? 0, r = Math.min(1, Math.max(0, (u + g) / c)) * P, l = Math.min(1, Math.max(0, u / p)), R = (b + 0.5) / d, B = (w + 0.5) / i, I = 2 * Math.PI * R, C = Math.PI * B, $ = -Math.sin(C) * Math.cos(I), z = Math.cos(C), L = Math.sin(C) * Math.sin(I);
          n[j * 6] = 0, n[j * 6 + 1] = 0, n[j * 6 + 2] = 0, n[j * 6 + 3] = $ * r, n[j * 6 + 4] = z * r, n[j * 6 + 5] = L * r, h[j * 6] = l, h[j * 6 + 1] = l, h[j * 6 + 2] = l, h[j * 6 + 3] = l, h[j * 6 + 4] = l, h[j * 6 + 5] = l;
        }
      const A = new o.BufferGeometry();
      A.setAttribute("position", new o.BufferAttribute(n, 3)), A.setAttribute("color", new o.BufferAttribute(h, 3));
      const y = new o.LineSegments(A, new o.LineBasicMaterial({ vertexColors: !0 }));
      y.position.x = v, this.linesObjs[t] = y, this.scene.add(y), this.updateMap();
      return;
    }
    const m = document.createElement("canvas");
    m.width = d, m.height = i;
    const E = m.getContext("2d"), F = E.createImageData(d, i);
    for (let n = 0; n < i; n++)
      for (let h = 0; h < d; h++) {
        const A = e[n][h] ?? 0, y = Math.round(Math.min(1, Math.max(0, A / p)) * 255), w = (n * d + h) * 4;
        F.data[w] = F.data[w + 1] = F.data[w + 2] = y, F.data[w + 3] = 255;
      }
    E.putImageData(F, 0, 0);
    const O = new o.CanvasTexture(m);
    O.magFilter = o.NearestFilter, O.minFilter = o.NearestFilter, O.colorSpace = o.SRGBColorSpace;
    const S = new o.SphereGeometry(1, d, i);
    if (f) {
      const n = S.attributes.position;
      for (let h = 0; h <= i; h++) {
        const A = Math.min(h, i - 1);
        for (let y = 0; y <= d; y++) {
          const w = h * (d + 1) + y, b = y % d, j = Math.min(1, Math.max(0, ((e[A][b] ?? 0) + g) / c)) * P, u = n.getX(w), r = n.getY(w), l = n.getZ(w), R = Math.sqrt(u * u + r * r + l * l);
          R > 1e-6 && n.setXYZ(w, u / R * j, r / R * j, l / R * j);
        }
      }
      n.needsUpdate = !0, S.computeVertexNormals();
    }
    const D = new o.Mesh(S, new o.MeshBasicMaterial({ map: O }));
    D.position.x = v, this.meshes[t] = D, this.scene.add(D), this.updateMap();
  }
  // Coverage map tracks slot 0 only.
  updateMap() {
    const t = this.lastGrids[0];
    if (!t)
      return;
    const e = t.length, s = e > 0 ? t[0].length : 0;
    if (e === 0 || s === 0)
      return;
    const f = s * q, g = e * q;
    (this.mapCanvas.width !== f || this.mapCanvas.height !== g) && (this.mapCanvas.width = f, this.mapCanvas.height = g);
    const P = this.mapCanvas.getContext("2d");
    if (!P)
      return;
    const a = this.camera.position, i = -T - a.x, d = -a.y, p = -a.z, c = Math.sqrt(i * i + d * d + p * p), v = i / c, m = d / c, E = p / c, F = Math.max(1e-6, this.lastSatPoints[0]);
    for (let O = 0; O < e; O++)
      for (let S = 0; S < s; S++) {
        const D = (S + 0.5) / s, x = (O + 0.5) / e, n = 2 * Math.PI * D, h = Math.PI * x, A = -Math.sin(h) * Math.cos(n), y = Math.cos(h), w = Math.sin(h) * Math.sin(n), b = A * v + y * m + w * E, j = t[O][S] ?? 0, u = Math.min(1, Math.max(0, j / F)), r = Math.round(u * 255), l = b > 0 ? r : Math.round(r * 0.2);
        P.fillStyle = `rgb(${l},${l},${l})`, P.fillRect(S * q, O * q, q, q);
      }
  }
  start() {
    const t = () => {
      this.animId = requestAnimationFrame(t), this.controls.update(), this.webgl.render(this.scene, this.camera), this.updateMap();
    };
    t();
  }
  stop() {
    this.animId !== null && (cancelAnimationFrame(this.animId), this.animId = null);
  }
  dispose() {
    var t;
    this.stop();
    for (let e = 0; e < 2; e++) {
      const s = e;
      this.meshes[s] && ((t = this.meshes[s].material.map) == null || t.dispose(), this.meshes[s].material.dispose(), this.meshes[s].geometry.dispose()), this.linesObjs[s] && (this.linesObjs[s].material.dispose(), this.linesObjs[s].geometry.dispose());
    }
    this.controls.dispose(), this.webgl.dispose(), this.webgl.domElement.remove(), this.mapCanvas.width = 0, this.mapCanvas.height = 0;
  }
}
const N = 4, _ = 1.5;
class st {
  constructor(t) {
    this.meshes = [null, null], this.linesObjs = [null, null], this.animId = null, this.scene = new o.Scene();
    const e = t.clientWidth, s = t.clientHeight;
    this.camera = new o.PerspectiveCamera(45, e / s, 0.1, 100), this.camera.position.z = 4.5, this.webgl = new o.WebGLRenderer({ antialias: !1, alpha: !0 }), this.webgl.setPixelRatio(window.devicePixelRatio), this.webgl.setSize(e, s), this.webgl.domElement.style.display = "block", t.appendChild(this.webgl.domElement), this.controls = new Z(this.camera, this.webgl.domElement), this.controls.enablePan = !1, this.controls.enableDamping = !0, this.controls.dampingFactor = 0.08, this.controls.target.set(0, 0, 0);
  }
  render(t, e, s = 1, f = 0, g = 0, P = !1, a = 0.01, i = 1, d = !1) {
    var j;
    const p = e.length, c = p > 0 ? e[0].length : 0;
    if (p === 0 || c === 0)
      return;
    const v = Math.max(1e-6, s), m = Math.max(1e-6, v + a), E = t === 0 ? -_ : _;
    if (this.meshes[t]) {
      const u = this.meshes[t].material;
      (j = u.map) == null || j.dispose(), u.dispose(), this.meshes[t].geometry.dispose(), this.scene.remove(this.meshes[t]), this.meshes[t] = null;
    }
    if (this.linesObjs[t] && (this.linesObjs[t].material.dispose(), this.linesObjs[t].geometry.dispose(), this.scene.remove(this.linesObjs[t]), this.linesObjs[t] = null), d && P) {
      const u = new Float32Array(p * c * 6), r = new Float32Array(p * c * 6);
      for (let B = 0; B < p; B++)
        for (let I = 0; I < c; I++) {
          const C = B * c + I, $ = e[B][I] ?? 0, z = Math.min(1, Math.max(0, ($ + a) / m)) * i, L = Math.min(1, Math.max(0, $ / v)), W = (I + 0.5) / c * Math.PI, U = (B + 0.5) / p * Math.PI, X = -Math.sin(U) * Math.cos(W), V = Math.cos(U), Y = Math.sin(U) * Math.sin(W);
          u[C * 6] = 0, u[C * 6 + 1] = 0, u[C * 6 + 2] = 0, u[C * 6 + 3] = X * z, u[C * 6 + 4] = V * z, u[C * 6 + 5] = Y * z, r[C * 6] = L, r[C * 6 + 1] = L, r[C * 6 + 2] = L, r[C * 6 + 3] = L, r[C * 6 + 4] = L, r[C * 6 + 5] = L;
        }
      const l = new o.BufferGeometry();
      l.setAttribute("position", new o.BufferAttribute(u, 3)), l.setAttribute("color", new o.BufferAttribute(r, 3));
      const R = new o.LineSegments(l, new o.LineBasicMaterial({ vertexColors: !0 }));
      R.position.x = E, this.linesObjs[t] = R, this.scene.add(R);
      return;
    }
    const F = k(c, f), O = k(p, g), S = c * N, D = p * N, x = S * 2, n = document.createElement("canvas");
    n.width = x, n.height = D;
    const h = n.getContext("2d"), A = h.createImageData(x, D);
    for (let u = 0; u < D; u++) {
      const r = O[u];
      for (let l = 0; l < x; l++) {
        const R = l < S ? e[r][F[l]] ?? 0 : 0, B = Math.round(Math.min(1, Math.max(0, R / v)) * 255), I = (u * x + l) * 4;
        A.data[I] = A.data[I + 1] = A.data[I + 2] = B, A.data[I + 3] = 255;
      }
    }
    h.putImageData(A, 0, 0);
    const y = new o.CanvasTexture(n);
    y.magFilter = y.minFilter = o.NearestFilter, y.colorSpace = o.SRGBColorSpace;
    const w = new o.SphereGeometry(1, x, D);
    if (P) {
      const u = Math.min(1, Math.max(0, a / m)) * i, r = w.attributes.position;
      for (let l = 0; l <= D; l++) {
        const R = O[Math.min(l, D - 1)];
        for (let B = 0; B <= x; B++) {
          const I = l * (x + 1) + B, C = B < S ? Math.min(1, Math.max(0, ((e[R][F[Math.min(B, S - 1)]] ?? 0) + a) / m)) * i : u, $ = r.getX(I), z = r.getY(I), L = r.getZ(I), W = Math.sqrt($ * $ + z * z + L * L);
          W > 1e-6 && r.setXYZ(I, $ / W * C, z / W * C, L / W * C);
        }
      }
      r.needsUpdate = !0, w.computeVertexNormals();
    }
    const b = new o.Mesh(w, new o.MeshBasicMaterial({ map: y }));
    b.position.x = E, this.meshes[t] = b, this.scene.add(b);
  }
  start() {
    const t = () => {
      this.animId = requestAnimationFrame(t), this.controls.update(), this.webgl.render(this.scene, this.camera);
    };
    t();
  }
  stop() {
    this.animId !== null && (cancelAnimationFrame(this.animId), this.animId = null);
  }
  dispose() {
    var t;
    this.stop();
    for (let e = 0; e < 2; e++) {
      const s = e;
      this.meshes[s] && ((t = this.meshes[s].material.map) == null || t.dispose(), this.meshes[s].material.dispose(), this.meshes[s].geometry.dispose()), this.linesObjs[s] && (this.linesObjs[s].material.dispose(), this.linesObjs[s].geometry.dispose());
    }
    this.controls.dispose(), this.webgl.dispose(), this.webgl.domElement.remove();
  }
}
function k(M, t) {
  const e = M * N, s = Math.PI / (2 * M);
  let f = 0;
  const g = new Float32Array(M);
  for (let m = 0; m < M; m++) {
    const E = (m + 0.5) / M * Math.PI;
    g[m] = 1 / (Math.sin(E) + s), f += g[m];
  }
  const P = f / M;
  let a = 0;
  const i = new Float32Array(M);
  for (let m = 0; m < M; m++) {
    const E = g[m] / P;
    i[m] = Math.max(1, N * (1 + (E - 1) * t)), a += i[m];
  }
  const d = e / a, p = new Uint16Array(e);
  let c = 0, v = 0;
  for (let m = 0; m < M; m++) {
    const E = i[m] * d + c, F = Math.max(1, Math.round(E));
    c = E - F;
    for (let O = 0; O < F && v < e; O++)
      p[v++] = m;
  }
  for (; v < e; )
    p[v++] = M - 1;
  return p;
}
const H = 1.5;
class it {
  constructor(t) {
    this.meshes = [null, null], this.linesObjs = [null, null], this.animId = null, this.scene = new o.Scene();
    const e = t.clientWidth, s = t.clientHeight;
    this.camera = new o.PerspectiveCamera(45, e / s, 0.1, 100), this.camera.position.set(0, -2.2, 4), this.camera.lookAt(0, 0, 0), this.webgl = new o.WebGLRenderer({ antialias: !1, alpha: !0 }), this.webgl.setPixelRatio(window.devicePixelRatio), this.webgl.setSize(e, s), this.webgl.domElement.style.display = "block", t.appendChild(this.webgl.domElement), this.controls = new Z(this.camera, this.webgl.domElement), this.controls.enablePan = !1, this.controls.enableDamping = !0, this.controls.dampingFactor = 0.08, this.controls.target.set(0, 0, 0);
  }
  render(t, e, s = 1, f = 0.01, g = 1, P = !1) {
    const a = e.length, i = a > 0 ? e[0].length : 0;
    if (a === 0 || i === 0)
      return;
    this.meshes[t] && (this.meshes[t].material.dispose(), this.meshes[t].geometry.dispose(), this.scene.remove(this.meshes[t]), this.meshes[t] = null), this.linesObjs[t] && (this.linesObjs[t].material.dispose(), this.linesObjs[t].geometry.dispose(), this.scene.remove(this.linesObjs[t]), this.linesObjs[t] = null);
    const d = Math.max(1e-6, s), p = Math.max(1e-6, d + f), c = i / a, v = c >= 1 ? 2 : 2 * c, m = c >= 1 ? 2 / c : 2, E = t === 0 ? -H : H;
    if (P) {
      const x = new Float32Array(a * i * 6), n = new Float32Array(a * i * 6);
      for (let y = 0; y < a; y++)
        for (let w = 0; w < i; w++) {
          const b = y * i + w, j = e[y][w] ?? 0, u = Math.min(1, Math.max(0, (j + f) / p)) * g, r = Math.min(1, Math.max(0, j / d)), l = -v / 2 + (w + 0.5) * (v / i), R = m / 2 - (y + 0.5) * (m / a);
          x[b * 6] = l, x[b * 6 + 1] = R, x[b * 6 + 2] = 0, x[b * 6 + 3] = l, x[b * 6 + 4] = R, x[b * 6 + 5] = u, n[b * 6] = r, n[b * 6 + 1] = r, n[b * 6 + 2] = r, n[b * 6 + 3] = r, n[b * 6 + 4] = r, n[b * 6 + 5] = r;
        }
      const h = new o.BufferGeometry();
      h.setAttribute("position", new o.BufferAttribute(x, 3)), h.setAttribute("color", new o.BufferAttribute(n, 3));
      const A = new o.LineSegments(h, new o.LineBasicMaterial({ vertexColors: !0 }));
      A.position.x = E, this.linesObjs[t] = A, this.scene.add(A);
      return;
    }
    const F = new o.PlaneGeometry(v, m, i - 1, a - 1), O = F.attributes.position, S = new Float32Array(O.count * 3);
    for (let x = 0; x < a; x++)
      for (let n = 0; n < i; n++) {
        const h = x * i + n, A = e[x][n] ?? 0;
        O.setZ(h, Math.min(1, Math.max(0, (A + f) / p)) * g);
        const y = Math.min(1, Math.max(0, A / d));
        S[h * 3] = S[h * 3 + 1] = S[h * 3 + 2] = y;
      }
    O.needsUpdate = !0, F.computeVertexNormals(), F.setAttribute("color", new o.BufferAttribute(S, 3));
    const D = new o.Mesh(F, new o.MeshBasicMaterial({ vertexColors: !0 }));
    D.position.x = E, this.meshes[t] = D, this.scene.add(D);
  }
  start() {
    const t = () => {
      this.animId = requestAnimationFrame(t), this.controls.update(), this.webgl.render(this.scene, this.camera);
    };
    t();
  }
  stop() {
    this.animId !== null && (cancelAnimationFrame(this.animId), this.animId = null);
  }
  dispose() {
    this.stop();
    for (let t = 0; t < 2; t++) {
      const e = t;
      this.meshes[e] && (this.meshes[e].material.dispose(), this.meshes[e].geometry.dispose()), this.linesObjs[e] && (this.linesObjs[e].material.dispose(), this.linesObjs[e].geometry.dispose());
    }
    this.controls.dispose(), this.webgl.dispose(), this.webgl.domElement.remove();
  }
}
export {
  it as GridRenderer3D,
  st as HemisphereRenderer,
  G as PIXEL_SIZE,
  et as SphereRenderer,
  tt as clear,
  K as render,
  Q as renderBars
};
