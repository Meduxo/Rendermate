/**
 * frontend/src/historyStore.ts
 *
 * Manages the in-memory history of loaded grid states.
 *
 * Design principles:
 * - Pure module-level state (no framework, no global object pollution).
 * - All mutations go through exported functions — no direct state access.
 * - Navigation (back/forward) never triggers a network request.
 * - Pushing a new entry while the cursor is not at the end truncates the
 *   "future" entries, matching the behaviour of browser history.
 */

import type { GridPayload } from "@shared/types";
import type { HistoryEntry, HistoryState } from "./types";

// ── Internal state ────────────────────────────────────────────────────────────

let _seq    = 0;
let _state: HistoryState = { entries: [], cursor: -1 };

/** Registered listeners called whenever the history state changes. */
const _listeners: Array<(state: HistoryState) => void> = [];

// ── Private helpers ───────────────────────────────────────────────────────────

function _notify(): void {
  // Provide a shallow copy so listeners cannot mutate internal state.
  const snapshot: HistoryState = { ..._state, entries: [..._state.entries] };
  for (const fn of _listeners) fn(snapshot);
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Subscribe to history state changes.
 * The callback is invoked immediately with the current state, then on every
 * subsequent change.
 *
 * @returns An unsubscribe function.
 */
export function subscribe(fn: (state: HistoryState) => void): () => void {
  _listeners.push(fn);
  fn({ ..._state, entries: [..._state.entries] }); // immediate call
  return () => {
    const idx = _listeners.indexOf(fn);
    if (idx !== -1) _listeners.splice(idx, 1);
  };
}

/**
 * Push a new GridPayload onto the history stack.
 *
 * If the cursor is not at the end of the stack (i.e. the user navigated
 * backward before reloading), all entries after the cursor are discarded
 * before appending the new one.
 */
export function push(payload: GridPayload): void {
  const entry: HistoryEntry = {
    seq:      ++_seq,
    payload,
    loadedAt: new Date(),
  };

  // Truncate any "future" entries beyond the current cursor.
  _state.entries = _state.entries.slice(0, _state.cursor + 1);
  _state.entries.push(entry);
  _state.cursor = _state.entries.length - 1;

  _notify();
}

/**
 * Move the cursor one step backward in history.
 * No-op if already at the oldest entry.
 */
export function back(): void {
  if (!canGoBack()) return;
  _state = { ..._state, cursor: _state.cursor - 1 };
  _notify();
}

/**
 * Move the cursor one step forward in history.
 * No-op if already at the newest entry.
 */
export function forward(): void {
  if (!canGoForward()) return;
  _state = { ..._state, cursor: _state.cursor + 1 };
  _notify();
}

/** Returns the entry at the current cursor position, or `null` if empty. */
export function current(): HistoryEntry | null {
  if (_state.cursor < 0 || _state.cursor >= _state.entries.length) return null;
  return _state.entries[_state.cursor];
}

/** True if the cursor can move backward. */
export function canGoBack(): boolean {
  return _state.cursor > 0;
}

/** True if the cursor can move forward. */
export function canGoForward(): boolean {
  return _state.cursor < _state.entries.length - 1;
}

/** Total number of entries in the history stack. */
export function size(): number {
  return _state.entries.length;
}
