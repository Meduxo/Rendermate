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
 */

import type { GridPayload } from "@shared/types";
import * as history from "./historyStore";
import { render, clear } from "./renderer";

// ── DOM references ────────────────────────────────────────────────────────────

const canvas     = document.getElementById("grid")       as HTMLCanvasElement;
const slider     = document.getElementById("scale-slider") as HTMLInputElement;
const btnReload  = document.getElementById("btn-reload")   as HTMLButtonElement;
const btnBack    = document.getElementById("btn-back")     as HTMLButtonElement;
const btnForward = document.getElementById("btn-forward")  as HTMLButtonElement;
const historyPos = document.getElementById("history-pos")  as HTMLSpanElement;
const statusEl   = document.getElementById("status")       as HTMLDivElement;

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
    setStatus("");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    setStatus(`Error: ${msg}`, true);
  }
}

// ── Event listeners ───────────────────────────────────────────────────────────

// Scale slider — re-render without fetching.
slider.addEventListener("input", () => {
  renderCurrent();
});

// Reload — fetch fresh data, reset scale to 1.
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

// ── Initial load ──────────────────────────────────────────────────────────────

void loadGrid();
