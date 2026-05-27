/**
 * frontend/src/types.ts
 *
 * Re-exports the shared data contract types and adds frontend-only types.
 */

export type { Grid, GridPayload } from "@shared/types";

/**
 * A single entry in the history stack.
 * Wraps a GridPayload with a monotonically increasing sequence number
 * so entries can be uniquely identified even if the grid data is identical.
 */
export interface HistoryEntry {
  /** Auto-assigned sequence number (1-based). */
  seq: number;
  /** The grid payload as received from the backend. */
  payload: import("@shared/types").GridPayload;
  /** Wall-clock time when this entry was loaded into the frontend. */
  loadedAt: Date;
}

/**
 * The full history state managed by historyStore.
 */
export interface HistoryState {
  /** All loaded entries, oldest first. */
  entries: HistoryEntry[];
  /** Index of the currently displayed entry (0-based). */
  cursor: number;
}
