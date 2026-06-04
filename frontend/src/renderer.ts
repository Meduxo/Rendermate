/**
 * frontend/src/renderer.ts
 *
 * Pure canvas rendering module.
 *
 * This module has NO side effects beyond drawing to the provided canvas.
 * It does not fetch data, does not read the DOM, and does not maintain state.
 * All inputs are explicit parameters.
 */

import type { Grid } from "./lib-types";

/** Size of each grid cell in CSS/physical pixels. */
export const PIXEL_SIZE = 8;

/**
 * Render a 2D grid of float values onto a canvas element.
 *
 * @param canvas    - The target HTMLCanvasElement. Its dimensions are set here.
 * @param grid      - 2D array of floats. Each value should be in [0, 1];
 *                    values outside this range are clamped.
 * @param scale     - Global multiplier applied before clamping (default 1.0).
 *                    Allows brightening/darkening the entire image.
 */
export function render(
  canvas: HTMLCanvasElement,
  grid: Grid,
  satPoint = 1.0,
): void {
  const rows = grid.length;
  const cols = rows > 0 ? grid[0].length : 0;

  // Resize canvas to exactly fit the grid — no gaps, no borders.
  canvas.width  = cols * PIXEL_SIZE;
  canvas.height = rows * PIXEL_SIZE;

  if (rows === 0 || cols === 0) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not acquire 2D canvas context.");

  const sp = Math.max(1e-6, satPoint);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const raw     = grid[r][c] ?? 0;
      const clamped = Math.min(1, Math.max(0, raw / sp));
      const byte    = Math.round(clamped * 255);

      ctx.fillStyle = `rgb(${byte},${byte},${byte})`;
      ctx.fillRect(c * PIXEL_SIZE, r * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
    }
  }
}

/**
 * Render each cell as a bottom-aligned vertical bar sized to its value.
 * Canvas dimensions match the normal render() layout (cols × rows × PIXEL_SIZE).
 */
export function renderBars(
  canvas: HTMLCanvasElement,
  grid: Grid,
  satPoint = 1.0,
): void {
  const rows = grid.length;
  const cols = rows > 0 ? grid[0].length : 0;

  canvas.width  = cols * PIXEL_SIZE;
  canvas.height = rows * PIXEL_SIZE;

  if (rows === 0 || cols === 0) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not acquire 2D canvas context.");

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const sp = Math.max(1e-6, satPoint);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const raw     = grid[r][c] ?? 0;
      const clamped = Math.min(1, Math.max(0, raw / sp));
      const byte    = Math.round(clamped * 255);
      const barH    = Math.round(clamped * PIXEL_SIZE);
      if (barH <= 0) continue;

      ctx.fillStyle = `rgb(${byte},${byte},${byte})`;
      ctx.fillRect(
        c * PIXEL_SIZE,
        (r + 1) * PIXEL_SIZE - barH,
        PIXEL_SIZE,
        barH,
      );
    }
  }
}

/**
 * Clear the canvas and reset its dimensions to zero.
 * Called when there is no data to display.
 */
export function clear(canvas: HTMLCanvasElement): void {
  canvas.width  = 0;
  canvas.height = 0;
}
