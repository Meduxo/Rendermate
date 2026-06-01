/**
 * frontend/src/main.ts
 *
 * Application entry point.
 *
 * Responsibilities:
 * - Fetch grid data from the backend API.
 * - Push fetched data into the history store.
 * - Subscribe to history state changes and re-render accordingly.
 * - Wire up the scale slider, reload button, and history navigation buttons.
 * - Populate the built-in dataset <select> from GET /api/grid/list.
 * - Handle local file selection via <input type="file"> and POST /api/grid/upload.
 */
import * as history from "./historyStore";
import { render, renderBars, clear } from "./renderer";
import { SphereRenderer } from "./sphereRenderer";
import { HemisphereRenderer } from "./hemisphereRenderer";
import { GridRenderer3D } from "./gridRenderer3D";
// ── DOM references ────────────────────────────────────────────────────────────
const canvas = document.getElementById("grid");
const normalizeCheck = document.getElementById("normalize-check");
const satPointInput = document.getElementById("sat-point");
const btnReload = document.getElementById("btn-reload");
const btnBack = document.getElementById("btn-back");
const btnForward = document.getElementById("btn-forward");
const historyPos = document.getElementById("history-pos");
const statusEl = document.getElementById("status");
const datasetSelect = document.getElementById("dataset-select");
const fileInput = document.getElementById("file-input");
const sphereWrap = document.getElementById("sphere-wrap");
const sphereContainer = document.getElementById("sphere-container");
const sphereMap = document.getElementById("sphere-map");
const hemiContainer = document.getElementById("hemi-container");
const hemiControls = document.getElementById("hemi-controls");
const fisheyeXSlider = document.getElementById("fisheye-x-slider");
const fisheyeYSlider = document.getElementById("fisheye-y-slider");
const fisheyeXVal = document.getElementById("fisheye-x-val");
const fisheyeYVal = document.getElementById("fisheye-y-val");
const btnViewGrid = document.getElementById("btn-view-grid");
const btnViewSphere = document.getElementById("btn-view-sphere");
const btnViewHemi = document.getElementById("btn-view-hemi");
const linesCheck = document.getElementById("lines-check");
const grid3dContainer = document.getElementById("grid3d-container");
const reliefCheck = document.getElementById("relief-check");
const reliefControls = document.getElementById("relief-controls");
const reliefOffset = document.getElementById("relief-offset");
const reliefMaxhSlider = document.getElementById("relief-maxh-slider");
const reliefMaxhVal = document.getElementById("relief-maxh-val");
// ── Helpers ───────────────────────────────────────────────────────────────────
function setStatus(msg, isError = false) {
    statusEl.textContent = msg;
    statusEl.className = isError ? "error" : "";
}
function currentSatPoint() {
    return parseFloat(satPointInput.value);
}
function currentFisheyeX() {
    return parseFloat(fisheyeXSlider.value);
}
function currentFisheyeY() {
    return parseFloat(fisheyeYSlider.value);
}
function currentOffset() {
    return parseFloat(reliefOffset.value);
}
function currentMaxHeight() {
    return parseFloat(reliefMaxhSlider.value);
}
function currentRelief() {
    return viewMode === "grid" ? reliefState.grid
        : viewMode === "sphere" ? reliefState.sphere
            : reliefState.hemi;
}
let viewMode = "grid";
let sphereRenderer = null;
let hemiRenderer = null;
let gridRenderer3D_ = null;
const reliefState = { grid: false, sphere: false, hemi: false };
const linesState = { grid: false, sphere: false, hemi: false };
function currentLines() {
    return viewMode === "grid" ? linesState.grid
        : viewMode === "sphere" ? linesState.sphere
            : linesState.hemi;
}
function setView(mode) {
    viewMode = mode;
    // Hide everything.
    canvas.style.display = "none";
    grid3dContainer.style.display = "none";
    sphereWrap.style.display = "none";
    hemiContainer.style.display = "none";
    hemiControls.style.display = "none";
    btnViewGrid.classList.remove("btn-active");
    btnViewSphere.classList.remove("btn-active");
    btnViewHemi.classList.remove("btn-active");
    // Sync relief and lines controls to this view's state.
    const disp = currentRelief();
    reliefCheck.checked = disp;
    reliefControls.style.display = disp ? "flex" : "none";
    linesCheck.checked = currentLines();
    if (mode === "grid") {
        btnViewGrid.classList.add("btn-active");
        sphereRenderer?.stop();
        hemiRenderer?.stop();
        if (disp) {
            grid3dContainer.style.display = "block";
            if (!gridRenderer3D_)
                gridRenderer3D_ = new GridRenderer3D(grid3dContainer);
            gridRenderer3D_.start();
        }
        else {
            canvas.style.display = "block";
            gridRenderer3D_?.stop();
        }
    }
    else if (mode === "sphere") {
        sphereWrap.style.display = "flex";
        btnViewSphere.classList.add("btn-active");
        hemiRenderer?.stop();
        gridRenderer3D_?.stop();
        if (!sphereRenderer)
            sphereRenderer = new SphereRenderer(sphereContainer, sphereMap);
        sphereRenderer.start();
    }
    else {
        hemiContainer.style.display = "block";
        hemiControls.style.display = "flex";
        btnViewHemi.classList.add("btn-active");
        sphereRenderer?.stop();
        gridRenderer3D_?.stop();
        if (!hemiRenderer)
            hemiRenderer = new HemisphereRenderer(hemiContainer);
        hemiRenderer.start();
    }
    renderCurrent();
}
// ── Rendering ─────────────────────────────────────────────────────────────────
/**
 * Re-render the active view from the current history entry and scale.
 * Called whenever the history cursor moves OR the slider changes.
 */
function renderCurrent() {
    const entry = history.current();
    if (!entry) {
        clear(canvas);
        return;
    }
    const disp = currentRelief();
    const lns = currentLines();
    const off = currentOffset();
    const maxH = currentMaxHeight();
    if (viewMode === "grid") {
        if (disp) {
            gridRenderer3D_?.render(entry.payload.grid, currentSatPoint(), off, maxH, lns);
        }
        else {
            if (lns)
                renderBars(canvas, entry.payload.grid, currentSatPoint());
            else
                render(canvas, entry.payload.grid, currentSatPoint());
        }
    }
    else if (viewMode === "sphere") {
        sphereRenderer?.render(entry.payload.grid, currentSatPoint(), disp, off, maxH, lns);
    }
    else {
        hemiRenderer?.render(entry.payload.grid, currentSatPoint(), currentFisheyeX(), currentFisheyeY(), disp, off, maxH, lns);
    }
}
// ── History subscription ──────────────────────────────────────────────────────
history.subscribe((state) => {
    const total = state.entries.length;
    const pos = total === 0 ? 0 : state.cursor + 1;
    historyPos.textContent = `${pos} / ${total}`;
    btnBack.disabled = !history.canGoBack();
    btnForward.disabled = !history.canGoForward();
    renderCurrent();
});
// ── Relief offset auto-compute ────────────────────────────────────────────────
function applySatPoint(grid) {
    let max = -Infinity;
    for (const row of grid)
        for (const v of row)
            if (v > max)
                max = v;
    satPointInput.value = (max > 0 ? max : 1).toFixed(4);
}
function applyDefaultOffset(grid) {
    let min = Infinity;
    for (const row of grid)
        for (const v of row)
            if (v < min)
                min = v;
    reliefOffset.value = (0.01 - min).toFixed(4);
    if (normalizeCheck.checked)
        applySatPoint(grid);
}
// ── Data fetching ─────────────────────────────────────────────────────────────
/**
 * Fetch the current grid from the backend and push it onto the history stack.
 * Displays a status message on error.
 */
async function loadGrid() {
    setStatus("Loading…");
    try {
        const res = await fetch("/api/grid");
        // 404 means no data file exists yet — show the empty state, not an error.
        if (res.status === 404) {
            setStatus("No data — write a GridPayload JSON to data/grid.json, then Reload.");
            clear(canvas);
            return;
        }
        if (!res.ok) {
            throw new Error(`Server responded with ${res.status} ${res.statusText}`);
        }
        const payload = (await res.json());
        if (!Array.isArray(payload.grid) || payload.grid.length === 0) {
            setStatus("No data — grid array is empty.");
            clear(canvas);
            return;
        }
        history.push(payload);
        applyDefaultOffset(payload.grid);
        setStatus(payload.meta?.label ? `Loaded: ${payload.meta.label}` : "");
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setStatus(`Error: ${msg}`, true);
    }
}
/**
 * Fetch a named built-in dataset from GET /api/grid/:name and push it onto
 * the history stack.
 */
async function loadNamedDataset(name) {
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
            clear(canvas);
            return;
        }
        history.push(payload);
        applyDefaultOffset(payload.grid);
        setStatus(payload.meta?.label ? `Loaded: ${payload.meta.label}` : `Loaded: ${name}`);
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setStatus(`Error: ${msg}`, true);
    }
}
/**
 * Populate the dataset <select> by fetching GET /api/grid/list.
 * Silently skips if the endpoint is unavailable (e.g. backend not running).
 */
async function populateDatasetList() {
    try {
        const res = await fetch("/api/grid/list");
        if (!res.ok)
            return;
        const body = (await res.json());
        const names = body.datasets ?? [];
        // Remove any previously injected options (keep the placeholder).
        while (datasetSelect.options.length > 1) {
            datasetSelect.remove(1);
        }
        for (const name of names) {
            const opt = document.createElement("option");
            opt.value = name;
            opt.textContent = name;
            datasetSelect.appendChild(opt);
        }
    }
    catch {
        // Backend not available — leave the select empty.
    }
}
/**
 * Read a local JSON file chosen by the user, upload it to the backend via
 * POST /api/grid/upload, then load the active grid.
 */
async function handleFileUpload(file) {
    setStatus(`Reading "${file.name}"…`);
    try {
        const text = await file.text();
        // Parse locally first so we can give a friendly error before hitting the network.
        let payload;
        try {
            payload = JSON.parse(text);
        }
        catch (e) {
            throw new Error(`"${file.name}" is not valid JSON: ${e.message}`);
        }
        if (!Array.isArray(payload.grid) || payload.grid.length === 0) {
            throw new Error(`"${file.name}" must contain a non-empty "grid" array.`);
        }
        // Attach the filename as a label if the payload has no label yet.
        if (!payload.meta?.label) {
            payload = {
                ...payload,
                meta: { ...payload.meta, label: file.name.replace(/\.json$/i, "") },
            };
        }
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
        // Now fetch the active grid (which is the just-uploaded payload).
        await loadGrid();
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setStatus(`Error: ${msg}`, true);
    }
    finally {
        // Reset the input so the same file can be re-selected.
        fileInput.value = "";
    }
}
// ── Event listeners ───────────────────────────────────────────────────────────
btnViewGrid.addEventListener("click", () => setView("grid"));
btnViewSphere.addEventListener("click", () => setView("sphere"));
btnViewHemi.addEventListener("click", () => setView("hemisphere"));
// Lens sliders — re-render hemisphere without re-fetching.
fisheyeXSlider.addEventListener("input", () => {
    fisheyeXVal.textContent = currentFisheyeX().toFixed(2);
    renderCurrent();
});
fisheyeYSlider.addEventListener("input", () => {
    fisheyeYVal.textContent = currentFisheyeY().toFixed(2);
    renderCurrent();
});
// Lines button — per-view toggle.
linesCheck.addEventListener("change", () => {
    const on = linesCheck.checked;
    if (viewMode === "grid")
        linesState.grid = on;
    else if (viewMode === "sphere")
        linesState.sphere = on;
    else
        linesState.hemi = on;
    renderCurrent();
});
// Relief checkbox — toggle per-view state; swap canvas ↔ 3D container for grid.
reliefCheck.addEventListener("change", () => {
    const on = reliefCheck.checked;
    if (viewMode === "grid")
        reliefState.grid = on;
    else if (viewMode === "sphere")
        reliefState.sphere = on;
    else
        reliefState.hemi = on;
    reliefControls.style.display = on ? "flex" : "none";
    if (viewMode === "grid") {
        if (on) {
            canvas.style.display = "none";
            grid3dContainer.style.display = "block";
            if (!gridRenderer3D_)
                gridRenderer3D_ = new GridRenderer3D(grid3dContainer);
            gridRenderer3D_.start();
        }
        else {
            grid3dContainer.style.display = "none";
            gridRenderer3D_?.stop();
            canvas.style.display = "block";
        }
    }
    renderCurrent();
});
// Relief offset — re-render on change.
reliefOffset.addEventListener("input", () => { renderCurrent(); });
// Relief max-height slider.
reliefMaxhSlider.addEventListener("input", () => {
    reliefMaxhVal.textContent = currentMaxHeight().toFixed(1);
    renderCurrent();
});
// Normalize checkbox — auto-sets saturation point when checked.
normalizeCheck.addEventListener("change", () => {
    satPointInput.disabled = normalizeCheck.checked;
    if (normalizeCheck.checked) {
        const entry = history.current();
        if (entry)
            applySatPoint(entry.payload.grid);
    }
    renderCurrent();
});
// Saturation point — re-render on manual edit.
satPointInput.addEventListener("input", () => { renderCurrent(); });
// Reload — fetch fresh data from the server.
btnReload.addEventListener("click", () => {
    void loadGrid();
});
// History navigation — move cursor, re-render.
btnBack.addEventListener("click", () => {
    history.back();
    // renderCurrent() is called via the history subscription above.
});
btnForward.addEventListener("click", () => {
    history.forward();
    // renderCurrent() is called via the history subscription above.
});
// Dataset select — load the chosen built-in dataset.
datasetSelect.addEventListener("change", () => {
    const name = datasetSelect.value;
    if (!name)
        return;
    // Reset to placeholder so the same item can be re-selected later.
    datasetSelect.value = "";
    void loadNamedDataset(name);
});
// File input — triggered when the user picks a file via the label/button.
fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (!file)
        return;
    void handleFileUpload(file);
});
// ── Initial load ──────────────────────────────────────────────────────────────
void populateDatasetList();
void loadGrid();
