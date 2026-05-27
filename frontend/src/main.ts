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

import type { GridPayload } from "@shared/types";
import * as history from "./historyStore";
import { render, clear } from "./renderer";

// ── DOM references ────────────────────────────────────────────────────────────

const canvas        = document.getElementById("grid")           as HTMLCanvasElement;
const slider        = document.getElementById("scale-slider")   as HTMLInputElement;
const btnReload     = document.getElementById("btn-reload")     as HTMLButtonElement;
const btnBack       = document.getElementById("btn-back")       as HTMLButtonElement;
const btnForward    = document.getElementById("btn-forward")    as HTMLButtonElement;
const historyPos    = document.getElementById("history-pos")    as HTMLSpanElement;
const statusEl      = document.getElementById("status")         as HTMLDivElement;
const datasetSelect = document.getElementById("dataset-select") as HTMLSelectElement;
const fileInput     = document.getElementById("file-input")     as HTMLInputElement;

// ── Helpers ───────────────────────────────────────────────────────────────────

function setStatus(msg: string, isError = false): void {
  statusEl.textContent = msg;
  statusEl.className   = isError ? "error" : "";
}

function currentScale(): number {
  return parseFloat(slider.value);
}

// ── Rendering ─────────────────────────────────────────────────────────────────

/**
 * Re-render the canvas from the current history entry and current scale.
 * Called whenever the history cursor moves OR the slider changes.
 */
function renderCurrent(): void {
  const entry = history.current();
  if (!entry) {
    clear(canvas);
    return;
  }
  render(canvas, entry.payload.grid, currentScale());
}

// ── History subscription ──────────────────────────────────────────────────────

history.subscribe((state) => {
  const total  = state.entries.length;
  const pos    = total === 0 ? 0 : state.cursor + 1;

  historyPos.textContent   = `${pos} / ${total}`;
  btnBack.disabled         = !history.canGoBack();
  btnForward.disabled      = !history.canGoForward();

  renderCurrent();
});

// ── Data fetching ─────────────────────────────────────────────────────────────

/**
 * Fetch the current grid from the backend and push it onto the history stack.
 * Displays a status message on error.
 */
async function loadGrid(): Promise<void> {
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

    const payload = (await res.json()) as GridPayload;

    if (!Array.isArray(payload.grid) || payload.grid.length === 0) {
      setStatus("No data — grid array is empty.");
      clear(canvas);
      return;
    }

    history.push(payload);
    setStatus(payload.meta?.label ? `Loaded: ${payload.meta.label}` : "");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    setStatus(`Error: ${msg}`, true);
  }
}

/**
 * Fetch a named built-in dataset from GET /api/grid/:name and push it onto
 * the history stack.
 */
async function loadNamedDataset(name: string): Promise<void> {
  setStatus(`Loading "${name}"…`);
  try {
    const res = await fetch(`/api/grid/${encodeURIComponent(name)}`);

    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(body.error ?? `${res.status} ${res.statusText}`);
    }

    const payload = (await res.json()) as GridPayload;

    if (!Array.isArray(payload.grid) || payload.grid.length === 0) {
      setStatus("Dataset grid array is empty.");
      clear(canvas);
      return;
    }

    history.push(payload);
    setStatus(payload.meta?.label ? `Loaded: ${payload.meta.label}` : `Loaded: ${name}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    setStatus(`Error: ${msg}`, true);
  }
}

/**
 * Populate the dataset <select> by fetching GET /api/grid/list.
 * Silently skips if the endpoint is unavailable (e.g. backend not running).
 */
async function populateDatasetList(): Promise<void> {
  try {
    const res = await fetch("/api/grid/list");
    if (!res.ok) return;

    const body = (await res.json()) as { datasets: string[] };
    const names = body.datasets ?? [];

    // Remove any previously injected options (keep the placeholder).
    while (datasetSelect.options.length > 1) {
      datasetSelect.remove(1);
    }

    for (const name of names) {
      const opt   = document.createElement("option");
      opt.value   = name;
      opt.textContent = name;
      datasetSelect.appendChild(opt);
    }
  } catch {
    // Backend not available — leave the select empty.
  }
}

/**
 * Read a local JSON file chosen by the user, upload it to the backend via
 * POST /api/grid/upload, then load the active grid.
 */
async function handleFileUpload(file: File): Promise<void> {
  setStatus(`Reading "${file.name}"…`);
  try {
    const text = await file.text();

    // Parse locally first so we can give a friendly error before hitting the network.
    let payload: GridPayload;
    try {
      payload = JSON.parse(text) as GridPayload;
    } catch (e) {
      throw new Error(`"${file.name}" is not valid JSON: ${(e as Error).message}`);
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
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(body.error ?? `Upload failed: ${res.status} ${res.statusText}`);
    }

    // Now fetch the active grid (which is the just-uploaded payload).
    await loadGrid();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    setStatus(`Error: ${msg}`, true);
  } finally {
    // Reset the input so the same file can be re-selected.
    fileInput.value = "";
  }
}

// ── Event listeners ───────────────────────────────────────────────────────────

// Scale slider — re-render without fetching.
slider.addEventListener("input", () => {
  renderCurrent();
});

// Reload — fetch fresh data from the server, reset scale to 1.
btnReload.addEventListener("click", () => {
  slider.value = "1";
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
  if (!name) return;
  // Reset to placeholder so the same item can be re-selected later.
  datasetSelect.value = "";
  slider.value = "1";
  void loadNamedDataset(name);
});

// File input — triggered when the user picks a file via the label/button.
fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  if (!file) return;
  slider.value = "1";
  void handleFileUpload(file);
});

// ── Initial load ──────────────────────────────────────────────────────────────

void populateDatasetList();
void loadGrid();
