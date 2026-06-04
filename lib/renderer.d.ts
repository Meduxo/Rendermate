import { Grid } from './lib-types';
/** Size of each grid cell in CSS/physical pixels. */
export declare const PIXEL_SIZE = 8;
/**
 * Render a 2D grid of float values onto a canvas element.
 *
 * @param canvas    - The target HTMLCanvasElement. Its dimensions are set here.
 * @param grid      - 2D array of floats. Each value should be in [0, 1];
 *                    values outside this range are clamped.
 * @param scale     - Global multiplier applied before clamping (default 1.0).
 *                    Allows brightening/darkening the entire image.
 */
export declare function render(canvas: HTMLCanvasElement, grid: Grid, satPoint?: number): void;
/**
 * Render each cell as a bottom-aligned vertical bar sized to its value.
 * Canvas dimensions match the normal render() layout (cols × rows × PIXEL_SIZE).
 */
export declare function renderBars(canvas: HTMLCanvasElement, grid: Grid, satPoint?: number): void;
/**
 * Clear the canvas and reset its dimensions to zero.
 * Called when there is no data to display.
 */
export declare function clear(canvas: HTMLCanvasElement): void;
