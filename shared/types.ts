/**
 * shared/types.ts
 *
 * Types shared between the frontend and backend.
 * Both sides import from here so the data contract is defined exactly once.
 */

/**
 * A 2D grid of float values, each in the range [0, 1].
 * Rows = grid.length, Cols = grid[0].length.
 */
export type Grid = number[][];

/**
 * The JSON payload returned by GET /api/grid.
 *
 * The `meta` field is optional and intentionally open-ended — pipelines
 * may attach any metadata they like without breaking the renderer.
 */
export interface GridPayload {
  /** The 2D array of float values to visualize. */
  grid: Grid;

  /** Optional metadata attached by the data source. */
  meta?: {
    /** Human-readable label for this dataset (e.g. "epoch_42_activations"). */
    label?: string;
    /** ISO 8601 timestamp of when this data was produced. */
    timestamp?: string;
    /** Any additional key/value pairs the pipeline wants to attach. */
    [key: string]: unknown;
  };
}
