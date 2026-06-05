import { HistoryStore } from "./historyStore";
import { SphereRenderer } from "./sphereRenderer";
import { HemisphereRenderer } from "./hemisphereRenderer";
import { GridRenderer3D } from "./gridRenderer3D";
// ── DOM refs — per-slot arrays (index 0 = Object A, index 1 = Object B) ──────
const g = (id) => document.getElementById(id);
const btnBack = [g("btn-back-1"), g("btn-back-2")];
const historyPos = [g("history-pos-1"), g("history-pos-2")];
const btnForward = [g("btn-forward-1"), g("btn-forward-2")];
const btnReload = [g("btn-reload-1"), g("btn-reload-2")];
const normalizeChecks = [g("normalize-check-1"), g("normalize-check-2")];
const satPoints = [g("sat-point-1"), g("sat-point-2")];
const datasetSelects = [g("dataset-select-1"), g("dataset-select-2")];
const fileInputs = [g("file-input-1"), g("file-input-2")];
const linesChecks = [g("lines-check-1"), g("lines-check-2")];
const reliefChecks = [g("relief-check-1"), g("relief-check-2")];
const reliefDivs = [g("relief-controls-1"), g("relief-controls-2")];
const reliefOffsets = [g("relief-offset-1"), g("relief-offset-2")];
const reliefMaxhSliders = [g("relief-maxh-slider-1"), g("relief-maxh-slider-2")];
const reliefMaxhVals = [g("relief-maxh-val-1"), g("relief-maxh-val-2")];
const hemiDivs = [g("hemi-controls-1"), g("hemi-controls-2")];
const fisheyeXSliders = [g("fisheye-x-slider-1"), g("fisheye-x-slider-2")];
const fisheyeYSliders = [g("fisheye-y-slider-1"), g("fisheye-y-slider-2")];
const fisheyeXVals = [g("fisheye-x-val-1"), g("fisheye-x-val-2")];
const fisheyeYVals = [g("fisheye-y-val-1"), g("fisheye-y-val-2")];
// ── Shared DOM refs ───────────────────────────────────────────────────────────
const statusEl = g("status");
const grid3dContainer = g("grid3d-container");
const hemiContainer = g("hemi-container");
const sphereWrap = g("sphere-wrap");
const sphereContainer = g("sphere-container");
const sphereMap = g("sphere-map");
const btnViewGrid = g("btn-view-grid");
const btnViewSphere = g("btn-view-sphere");
const btnViewHemi = g("btn-view-hemi");
// ── Helpers ───────────────────────────────────────────────────────────────────
function setStatus(msg, isError = false) {
    statusEl.textContent = msg;
    statusEl.className = isError ? "error" : "";
}
const currentSatPoint = (s) => parseFloat(satPoints[s].value);
const currentOffset = (s) => parseFloat(reliefOffsets[s].value);
const currentMaxHeight = (s) => parseFloat(reliefMaxhSliders[s].value);
const currentFisheyeX = (s) => parseFloat(fisheyeXSliders[s].value);
const currentFisheyeY = (s) => parseFloat(fisheyeYSliders[s].value);
let viewMode = "grid";
let sphereRenderer = null;
let hemiRenderer = null;
let gridRenderer3D = null;
// Per-slot render state
const reliefState = [false, false];
const linesState = [false, false];
// ── History — one store per slot ──────────────────────────────────────────────
const histories = [new HistoryStore(), new HistoryStore()];
// ── Rendering ─────────────────────────────────────────────────────────────────
function renderSlot(s) {
    const entry = histories[s].current();
    if (!entry)
        return;
    const grid = entry.payload.grid;
    const slot = s;
    const disp = reliefState[s];
    const lns = linesState[s];
    const sp = currentSatPoint(s);
    const off = currentOffset(s);
    const maxH = currentMaxHeight(s);
    if (viewMode === "grid") {
        gridRenderer3D?.render(slot, grid, sp, off, maxH, lns);
    }
    else if (viewMode === "sphere") {
        sphereRenderer?.render(slot, grid, sp, disp, off, maxH, lns);
    }
    else {
        hemiRenderer?.render(slot, grid, sp, currentFisheyeX(s), currentFisheyeY(s), disp, off, maxH, lns);
    }
}
function renderAll() {
    renderSlot(0);
    renderSlot(1);
}
// ── View switching ────────────────────────────────────────────────────────────
function setView(mode) {
    viewMode = mode;
    grid3dContainer.style.display = "none";
    sphereWrap.style.display = "none";
    hemiContainer.style.display = "none";
    btnViewGrid.classList.toggle("btn-active", mode === "grid");
    btnViewSphere.classList.toggle("btn-active", mode === "sphere");
    btnViewHemi.classList.toggle("btn-active", mode === "hemisphere");
    // Fisheye controls visible only in hemisphere mode
    for (let s = 0; s < 2; s++) {
        hemiDivs[s].classList.toggle("visible", mode === "hemisphere");
    }
    if (mode === "grid") {
        grid3dContainer.style.display = "block";
        sphereRenderer?.stop();
        hemiRenderer?.stop();
        if (!gridRenderer3D)
            gridRenderer3D = new GridRenderer3D(grid3dContainer);
        gridRenderer3D.start();
    }
    else if (mode === "sphere") {
        sphereWrap.style.display = "flex";
        gridRenderer3D?.stop();
        hemiRenderer?.stop();
        if (!sphereRenderer)
            sphereRenderer = new SphereRenderer(sphereContainer, sphereMap);
        sphereRenderer.start();
    }
    else {
        hemiContainer.style.display = "block";
        gridRenderer3D?.stop();
        sphereRenderer?.stop();
        if (!hemiRenderer)
            hemiRenderer = new HemisphereRenderer(hemiContainer);
        hemiRenderer.start();
    }
    renderAll();
}
// ── Default offset / saturation point ────────────────────────────────────────
function applySatPoint(s, grid) {
    let max = -Infinity;
    for (const row of grid)
        for (const v of row)
            if (v > max)
                max = v;
    satPoints[s].value = (max > 0 ? max : 1).toFixed(4);
}
function applyDefaultOffset(s, grid) {
    let min = Infinity;
    for (const row of grid)
        for (const v of row)
            if (v < min)
                min = v;
    reliefOffsets[s].value = (0.01 - min).toFixed(4);
    if (normalizeChecks[s].checked)
        applySatPoint(s, grid);
}
// ── Data fetching ─────────────────────────────────────────────────────────────
async function loadGrid(s) {
    setStatus("Loading…");
    try {
        const res = await fetch("/api/grid");
        if (res.status === 404) {
            setStatus("No data — write a GridPayload JSON to data/grid.json, then Reload.");
            return;
        }
        if (!res.ok)
            throw new Error(`Server responded with ${res.status} ${res.statusText}`);
        const payload = (await res.json());
        if (!Array.isArray(payload.grid) || payload.grid.length === 0) {
            setStatus("No data — grid array is empty.");
            return;
        }
        histories[s].push(payload);
        applyDefaultOffset(s, payload.grid);
        setStatus(payload.meta?.label ? `A: Loaded ${payload.meta.label}` : "");
    }
    catch (err) {
        setStatus(`Error: ${err instanceof Error ? err.message : String(err)}`, true);
    }
}
async function loadNamedDataset(s, name) {
    setStatus(`Loading "${name}"…`);
    try {
        const res = await fetch(`/api/grid/${encodeURIComponent(name)}`);
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error ?? `${res.status} ${res.statusText}`);
        }
        const payload = (await res.json());
        if (!Array.isArray(payload.grid) || payload.grid.length === 0) {
            setStatus("Dataset grid array is empty.");
            return;
        }
        histories[s].push(payload);
        applyDefaultOffset(s, payload.grid);
        setStatus(payload.meta?.label ? `Loaded: ${payload.meta.label}` : `Loaded: ${name}`);
    }
    catch (err) {
        setStatus(`Error: ${err instanceof Error ? err.message : String(err)}`, true);
    }
}
async function handleFileUpload(s, file) {
    setStatus(`Reading "${file.name}"…`);
    try {
        let payload;
        try {
            payload = JSON.parse(await file.text());
        }
        catch (e) {
            throw new Error(`"${file.name}" is not valid JSON: ${e.message}`);
        }
        if (!Array.isArray(payload.grid) || payload.grid.length === 0)
            throw new Error(`"${file.name}" must contain a non-empty "grid" array.`);
        if (!payload.meta?.label)
            payload = { ...payload, meta: { ...payload.meta, label: file.name.replace(/\.json$/i, "") } };
        setStatus(`Uploading "${file.name}"…`);
        const res = await fetch("/api/grid/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error ?? `Upload failed: ${res.status} ${res.statusText}`);
        }
        await loadGrid(s);
    }
    catch (err) {
        setStatus(`Error: ${err instanceof Error ? err.message : String(err)}`, true);
    }
    finally {
        fileInputs[s].value = "";
    }
}
async function populateDatasetList() {
    try {
        const res = await fetch("/api/grid/list");
        if (!res.ok)
            return;
        const body = (await res.json());
        for (const sel of datasetSelects) {
            while (sel.options.length > 1)
                sel.remove(1);
            for (const name of body.datasets ?? []) {
                const opt = document.createElement("option");
                opt.value = opt.textContent = name;
                sel.appendChild(opt);
            }
        }
    }
    catch { /* backend unavailable */ }
}
// ── Event listeners — wired in a loop for both slots ─────────────────────────
for (let s = 0; s < 2; s++) {
    // History subscription — re-render on every state change
    histories[s].subscribe((state) => {
        const total = state.entries.length;
        const pos = total === 0 ? 0 : state.cursor + 1;
        historyPos[s].textContent = `${pos} / ${total}`;
        btnBack[s].disabled = state.cursor <= 0;
        btnForward[s].disabled = state.cursor >= total - 1;
        renderSlot(s);
    });
    // Navigation
    btnBack[s].addEventListener("click", () => histories[s].back());
    btnForward[s].addEventListener("click", () => histories[s].forward());
    btnReload[s].addEventListener("click", () => { void loadGrid(s); });
    // Normalize checkbox
    normalizeChecks[s].addEventListener("change", () => {
        satPoints[s].disabled = normalizeChecks[s].checked;
        if (normalizeChecks[s].checked) {
            const entry = histories[s].current();
            if (entry)
                applySatPoint(s, entry.payload.grid);
        }
        renderSlot(s);
    });
    // Saturation point
    satPoints[s].addEventListener("input", () => renderSlot(s));
    // Dataset select
    datasetSelects[s].addEventListener("change", () => {
        const name = datasetSelects[s].value;
        if (!name)
            return;
        datasetSelects[s].value = "";
        void loadNamedDataset(s, name);
    });
    // File picker
    fileInputs[s].addEventListener("change", () => {
        const file = fileInputs[s].files?.[0];
        if (file)
            void handleFileUpload(s, file);
    });
    // Lines checkbox
    linesChecks[s].addEventListener("change", () => {
        linesState[s] = linesChecks[s].checked;
        renderSlot(s);
    });
    // Relief checkbox
    reliefChecks[s].addEventListener("change", () => {
        reliefState[s] = reliefChecks[s].checked;
        reliefDivs[s].classList.toggle("visible", reliefState[s]);
        renderSlot(s);
    });
    // Relief controls
    reliefOffsets[s].addEventListener("input", () => renderSlot(s));
    reliefMaxhSliders[s].addEventListener("input", () => {
        reliefMaxhVals[s].textContent = currentMaxHeight(s).toFixed(1);
        renderSlot(s);
    });
    // Fisheye
    fisheyeXSliders[s].addEventListener("input", () => {
        fisheyeXVals[s].textContent = currentFisheyeX(s).toFixed(2);
        renderSlot(s);
    });
    fisheyeYSliders[s].addEventListener("input", () => {
        fisheyeYVals[s].textContent = currentFisheyeY(s).toFixed(2);
        renderSlot(s);
    });
}
// ── View toggle ───────────────────────────────────────────────────────────────
btnViewGrid.addEventListener("click", () => setView("grid"));
btnViewSphere.addEventListener("click", () => setView("sphere"));
btnViewHemi.addEventListener("click", () => setView("hemisphere"));
// ── Initial load ──────────────────────────────────────────────────────────────
void populateDatasetList();
setView("grid");
void loadGrid(0);
