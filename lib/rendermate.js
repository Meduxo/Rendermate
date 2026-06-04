import * as s from "three";
import { OrbitControls as q } from "three/addons/controls/OrbitControls.js";
const D = 8;
function V(u, t, m = 1) {
  const a = t.length, b = a > 0 ? t[0].length : 0;
  if (u.width = b * D, u.height = a * D, a === 0 || b === 0)
    return;
  const y = u.getContext("2d");
  if (!y)
    throw new Error("Could not acquire 2D canvas context.");
  const M = Math.max(1e-6, m);
  for (let e = 0; e < a; e++)
    for (let i = 0; i < b; i++) {
      const A = t[e][i] ?? 0, p = Math.min(1, Math.max(0, A / M)), f = Math.round(p * 255);
      y.fillStyle = `rgb(${f},${f},${f})`, y.fillRect(i * D, e * D, D, D);
    }
}
function Y(u, t, m = 1) {
  const a = t.length, b = a > 0 ? t[0].length : 0;
  if (u.width = b * D, u.height = a * D, a === 0 || b === 0)
    return;
  const y = u.getContext("2d");
  if (!y)
    throw new Error("Could not acquire 2D canvas context.");
  y.fillStyle = "#000", y.fillRect(0, 0, u.width, u.height);
  const M = Math.max(1e-6, m);
  for (let e = 0; e < a; e++)
    for (let i = 0; i < b; i++) {
      const A = t[e][i] ?? 0, p = Math.min(1, Math.max(0, A / M)), f = Math.round(p * 255), g = Math.round(p * D);
      g <= 0 || (y.fillStyle = `rgb(${f},${f},${f})`, y.fillRect(i * D, (e + 1) * D - g, D, g));
    }
}
function T(u) {
  u.width = 0, u.height = 0;
}
const W = 4;
class _ {
  constructor(t, m) {
    this.mapCanvas = m, this.mesh = null, this.linesObj = null, this.animId = null, this.lastGrid = null, this.lastSatPoint = 1, this.scene = new s.Scene();
    const a = t.clientWidth, b = t.clientHeight;
    this.camera = new s.PerspectiveCamera(45, a / b, 0.1, 100), this.camera.position.z = 2.5, this.webgl = new s.WebGLRenderer({ antialias: !1, alpha: !0 }), this.webgl.setPixelRatio(window.devicePixelRatio), this.webgl.setSize(a, b), this.webgl.domElement.style.display = "block", t.appendChild(this.webgl.domElement), this.controls = new q(this.camera, this.webgl.domElement), this.controls.enablePan = !1, this.controls.enableDamping = !0, this.controls.dampingFactor = 0.08;
  }
  render(t, m = 1, a = !1, b = 0.01, y = 1, M = !1) {
    var w;
    const e = t.length, i = e > 0 ? t[0].length : 0;
    if (e === 0 || i === 0)
      return;
    this.lastGrid = t, this.lastSatPoint = m;
    const A = Math.max(1e-6, m), p = Math.max(1e-6, A + b);
    if (this.mesh) {
      const n = this.mesh.material;
      (w = n.map) == null || w.dispose(), n.dispose(), this.mesh.geometry.dispose(), this.scene.remove(this.mesh), this.mesh = null;
    }
    if (this.linesObj && (this.linesObj.material.dispose(), this.linesObj.geometry.dispose(), this.scene.remove(this.linesObj), this.linesObj = null), M && a) {
      const n = new Float32Array(e * i * 6), h = new Float32Array(e * i * 6);
      for (let r = 0; r < e; r++)
        for (let v = 0; v < i; v++) {
          const x = r * i + v, l = t[r][v] ?? 0, c = Math.min(1, Math.max(0, (l + b) / p)) * y, d = Math.min(1, Math.max(0, l / A)), E = (v + 0.5) / i, R = (r + 0.5) / e, O = 2 * Math.PI * E, j = Math.PI * R, L = -Math.sin(j) * Math.cos(O), G = Math.cos(j), B = Math.sin(j) * Math.sin(O);
          n[x * 6] = 0, n[x * 6 + 1] = 0, n[x * 6 + 2] = 0, n[x * 6 + 3] = L * c, n[x * 6 + 4] = G * c, n[x * 6 + 5] = B * c, h[x * 6] = d, h[x * 6 + 1] = d, h[x * 6 + 2] = d, h[x * 6 + 3] = d, h[x * 6 + 4] = d, h[x * 6 + 5] = d;
        }
      const S = new s.BufferGeometry();
      S.setAttribute("position", new s.BufferAttribute(n, 3)), S.setAttribute("color", new s.BufferAttribute(h, 3));
      const C = new s.LineBasicMaterial({ vertexColors: !0 });
      this.linesObj = new s.LineSegments(S, C), this.scene.add(this.linesObj), this.updateMap();
      return;
    }
    const f = document.createElement("canvas");
    f.width = i, f.height = e;
    const g = f.getContext("2d"), o = g.createImageData(i, e);
    for (let n = 0; n < e; n++)
      for (let h = 0; h < i; h++) {
        const S = t[n][h] ?? 0, C = Math.round(Math.min(1, Math.max(0, S / A)) * 255), r = (n * i + h) * 4;
        o.data[r] = o.data[r + 1] = o.data[r + 2] = C, o.data[r + 3] = 255;
      }
    g.putImageData(o, 0, 0);
    const I = new s.CanvasTexture(f);
    I.magFilter = s.NearestFilter, I.minFilter = s.NearestFilter, I.colorSpace = s.SRGBColorSpace;
    const F = new s.SphereGeometry(1, i, e);
    if (a) {
      const n = F.attributes.position;
      for (let h = 0; h <= e; h++) {
        const S = Math.min(h, e - 1);
        for (let C = 0; C <= i; C++) {
          const r = h * (i + 1) + C, v = C % i, x = Math.min(1, Math.max(0, ((t[S][v] ?? 0) + b) / p)) * y, l = n.getX(r), c = n.getY(r), d = n.getZ(r), E = Math.sqrt(l * l + c * c + d * d);
          E > 1e-6 && n.setXYZ(r, l / E * x, c / E * x, d / E * x);
        }
      }
      n.needsUpdate = !0, F.computeVertexNormals();
    }
    const P = new s.MeshBasicMaterial({ map: I });
    this.mesh = new s.Mesh(F, P), this.scene.add(this.mesh), this.updateMap();
  }
  // Redraws the coverage map canvas every frame.
  // Each cell is shown at full brightness if it faces the camera, dimmed if hidden.
  // Three.js SphereGeometry vertex formula (defaults: phiStart=0, thetaStart=0):
  //   x = -sin(theta) * cos(phi)
  //   y =  cos(theta)
  //   z =  sin(theta) * sin(phi)
  // where phi = u*2π, theta = v*π, u = col/cols, v = row/rows.
  updateMap() {
    const t = this.lastGrid;
    if (!t)
      return;
    const m = t.length, a = m > 0 ? t[0].length : 0;
    if (m === 0 || a === 0)
      return;
    const b = a * W, y = m * W;
    (this.mapCanvas.width !== b || this.mapCanvas.height !== y) && (this.mapCanvas.width = b, this.mapCanvas.height = y);
    const M = this.mapCanvas.getContext("2d");
    if (!M)
      return;
    const e = this.camera.position, i = e.length(), A = -e.x / i, p = -e.y / i, f = -e.z / i;
    for (let g = 0; g < m; g++)
      for (let o = 0; o < a; o++) {
        const I = (o + 0.5) / a, F = (g + 0.5) / m, P = 2 * Math.PI * I, w = Math.PI * F, n = -Math.sin(w) * Math.cos(P), h = Math.cos(w), S = Math.sin(w) * Math.sin(P), C = n * A + h * p + S * f, r = t[g][o] ?? 0, v = Math.min(1, Math.max(0, r / Math.max(1e-6, this.lastSatPoint))), x = Math.round(v * 255), l = C > 0 ? x : Math.round(x * 0.2);
        M.fillStyle = `rgb(${l},${l},${l})`, M.fillRect(o * W, g * W, W, W);
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
    this.stop(), this.controls.dispose(), this.webgl.dispose(), this.webgl.domElement.remove(), this.mapCanvas.width = 0, this.mapCanvas.height = 0;
  }
}
const N = 4;
class J {
  constructor(t) {
    this.mesh = null, this.linesObj = null, this.animId = null, this.scene = new s.Scene();
    const m = t.clientWidth, a = t.clientHeight;
    this.camera = new s.PerspectiveCamera(45, m / a, 0.1, 100), this.camera.position.z = 2.5, this.webgl = new s.WebGLRenderer({ antialias: !1, alpha: !0 }), this.webgl.setPixelRatio(window.devicePixelRatio), this.webgl.setSize(m, a), this.webgl.domElement.style.display = "block", t.appendChild(this.webgl.domElement), this.controls = new q(this.camera, this.webgl.domElement), this.controls.enablePan = !1, this.controls.enableDamping = !0, this.controls.dampingFactor = 0.08;
  }
  render(t, m = 1, a = 0, b = 0, y = !1, M = 0.01, e = 1, i = !1) {
    var x;
    const A = t.length, p = A > 0 ? t[0].length : 0;
    if (A === 0 || p === 0)
      return;
    const f = Math.max(1e-6, m), g = Math.max(1e-6, f + M);
    if (this.mesh) {
      const l = this.mesh.material;
      (x = l.map) == null || x.dispose(), l.dispose(), this.mesh.geometry.dispose(), this.scene.remove(this.mesh), this.mesh = null;
    }
    if (this.linesObj && (this.linesObj.material.dispose(), this.linesObj.geometry.dispose(), this.scene.remove(this.linesObj), this.linesObj = null), i && y) {
      const l = new Float32Array(A * p * 6), c = new Float32Array(A * p * 6);
      for (let R = 0; R < A; R++)
        for (let O = 0; O < p; O++) {
          const j = R * p + O, L = t[R][O] ?? 0, G = Math.min(1, Math.max(0, (L + M) / g)) * e, B = Math.min(1, Math.max(0, L / f)), z = (O + 0.5) / p * Math.PI, $ = (R + 0.5) / A * Math.PI, k = -Math.sin($) * Math.cos(z), H = Math.cos($), X = Math.sin($) * Math.sin(z);
          l[j * 6] = 0, l[j * 6 + 1] = 0, l[j * 6 + 2] = 0, l[j * 6 + 3] = k * G, l[j * 6 + 4] = H * G, l[j * 6 + 5] = X * G, c[j * 6] = B, c[j * 6 + 1] = B, c[j * 6 + 2] = B, c[j * 6 + 3] = B, c[j * 6 + 4] = B, c[j * 6 + 5] = B;
        }
      const d = new s.BufferGeometry();
      d.setAttribute("position", new s.BufferAttribute(l, 3)), d.setAttribute("color", new s.BufferAttribute(c, 3));
      const E = new s.LineBasicMaterial({ vertexColors: !0 });
      this.linesObj = new s.LineSegments(d, E), this.scene.add(this.linesObj);
      return;
    }
    const o = Z(p, a), I = Z(A, b), F = p * N, P = A * N, w = F * 2, n = document.createElement("canvas");
    n.width = w, n.height = P;
    const h = n.getContext("2d"), S = h.createImageData(w, P);
    for (let l = 0; l < P; l++) {
      const c = I[l];
      for (let d = 0; d < w; d++) {
        const E = d < F ? t[c][o[d]] ?? 0 : 0, R = Math.round(Math.min(1, Math.max(0, E / f)) * 255), O = (l * w + d) * 4;
        S.data[O] = S.data[O + 1] = S.data[O + 2] = R, S.data[O + 3] = 255;
      }
    }
    h.putImageData(S, 0, 0);
    const C = new s.CanvasTexture(n);
    C.magFilter = s.NearestFilter, C.minFilter = s.NearestFilter, C.colorSpace = s.SRGBColorSpace;
    const r = new s.SphereGeometry(1, w, P);
    if (y) {
      const l = Math.min(1, Math.max(0, M / g)) * e, c = r.attributes.position;
      for (let d = 0; d <= P; d++) {
        const E = I[Math.min(d, P - 1)];
        for (let R = 0; R <= w; R++) {
          const O = d * (w + 1) + R;
          let j;
          if (R < F) {
            const $ = o[Math.min(R, F - 1)];
            j = Math.min(1, Math.max(0, ((t[E][$] ?? 0) + M) / g)) * e;
          } else
            j = l;
          const L = c.getX(O), G = c.getY(O), B = c.getZ(O), z = Math.sqrt(L * L + G * G + B * B);
          z > 1e-6 && c.setXYZ(O, L / z * j, G / z * j, B / z * j);
        }
      }
      c.needsUpdate = !0, r.computeVertexNormals();
    }
    const v = new s.MeshBasicMaterial({ map: C });
    this.mesh = new s.Mesh(r, v), this.scene.add(this.mesh);
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
    this.stop(), this.controls.dispose(), this.webgl.dispose(), this.webgl.domElement.remove();
  }
}
function Z(u, t) {
  const m = u * N, a = Math.PI / (2 * u);
  let b = 0;
  const y = new Float32Array(u);
  for (let o = 0; o < u; o++) {
    const I = (o + 0.5) / u * Math.PI;
    y[o] = 1 / (Math.sin(I) + a), b += y[o];
  }
  const M = b / u;
  let e = 0;
  const i = new Float32Array(u);
  for (let o = 0; o < u; o++) {
    const I = y[o] / M;
    i[o] = Math.max(1, N * (1 + (I - 1) * t)), e += i[o];
  }
  const A = m / e, p = new Uint16Array(m);
  let f = 0, g = 0;
  for (let o = 0; o < u; o++) {
    const I = i[o] * A + f, F = Math.max(1, Math.round(I));
    f = I - F;
    for (let P = 0; P < F && g < m; P++)
      p[g++] = o;
  }
  for (; g < m; )
    p[g++] = u - 1;
  return p;
}
class K {
  constructor(t) {
    this.mesh = null, this.linesObj = null, this.animId = null, this.scene = new s.Scene();
    const m = t.clientWidth, a = t.clientHeight;
    this.camera = new s.PerspectiveCamera(45, m / a, 0.1, 100), this.camera.position.set(0, -2.2, 2.2), this.camera.lookAt(0, 0, 0), this.webgl = new s.WebGLRenderer({ antialias: !1, alpha: !0 }), this.webgl.setPixelRatio(window.devicePixelRatio), this.webgl.setSize(m, a), this.webgl.domElement.style.display = "block", t.appendChild(this.webgl.domElement), this.controls = new q(this.camera, this.webgl.domElement), this.controls.enablePan = !1, this.controls.enableDamping = !0, this.controls.dampingFactor = 0.08, this.controls.target.set(0, 0, 0);
  }
  render(t, m = 1, a = 0.01, b = 1, y = !1) {
    const M = t.length, e = M > 0 ? t[0].length : 0;
    if (M === 0 || e === 0)
      return;
    this.mesh && (this.mesh.material.dispose(), this.mesh.geometry.dispose(), this.scene.remove(this.mesh), this.mesh = null), this.linesObj && (this.linesObj.material.dispose(), this.linesObj.geometry.dispose(), this.scene.remove(this.linesObj), this.linesObj = null);
    const i = Math.max(1e-6, m), A = Math.max(1e-6, i + a), p = e / M, f = p >= 1 ? 2 : 2 * p, g = p >= 1 ? 2 / p : 2;
    if (y) {
      const w = new Float32Array(M * e * 6), n = new Float32Array(M * e * 6);
      for (let C = 0; C < M; C++)
        for (let r = 0; r < e; r++) {
          const v = C * e + r, x = t[C][r] ?? 0, l = Math.min(1, Math.max(0, (x + a) / A)) * b, c = Math.min(1, Math.max(0, x / i)), d = -f / 2 + (r + 0.5) * (f / e), E = g / 2 - (C + 0.5) * (g / M);
          w[v * 6] = d, w[v * 6 + 1] = E, w[v * 6 + 2] = 0, w[v * 6 + 3] = d, w[v * 6 + 4] = E, w[v * 6 + 5] = l, n[v * 6] = c, n[v * 6 + 1] = c, n[v * 6 + 2] = c, n[v * 6 + 3] = c, n[v * 6 + 4] = c, n[v * 6 + 5] = c;
        }
      const h = new s.BufferGeometry();
      h.setAttribute("position", new s.BufferAttribute(w, 3)), h.setAttribute("color", new s.BufferAttribute(n, 3));
      const S = new s.LineBasicMaterial({ vertexColors: !0 });
      this.linesObj = new s.LineSegments(h, S), this.scene.add(this.linesObj);
      return;
    }
    const o = new s.PlaneGeometry(f, g, e - 1, M - 1), I = o.attributes.position, F = new Float32Array(I.count * 3);
    for (let w = 0; w < M; w++)
      for (let n = 0; n < e; n++) {
        const h = w * e + n, S = t[w][n] ?? 0, C = Math.min(1, Math.max(0, (S + a) / A)) * b;
        I.setZ(h, C);
        const r = Math.min(1, Math.max(0, S / i));
        F[h * 3] = r, F[h * 3 + 1] = r, F[h * 3 + 2] = r;
      }
    I.needsUpdate = !0, o.computeVertexNormals(), o.setAttribute("color", new s.BufferAttribute(F, 3));
    const P = new s.MeshBasicMaterial({ vertexColors: !0 });
    this.mesh = new s.Mesh(o, P), this.scene.add(this.mesh);
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
    this.stop(), this.controls.dispose(), this.webgl.dispose(), this.webgl.domElement.remove();
  }
}
export {
  K as GridRenderer3D,
  J as HemisphereRenderer,
  D as PIXEL_SIZE,
  _ as SphereRenderer,
  T as clear,
  V as render,
  Y as renderBars
};
