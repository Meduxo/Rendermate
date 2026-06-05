import type { GridPayload } from "@shared/types";
import type { HistoryEntry, HistoryState } from "./types";

export class HistoryStore {
  private _seq = 0;
  private _state: HistoryState = { entries: [], cursor: -1 };
  private _listeners: Array<(state: HistoryState) => void> = [];

  private _notify(): void {
    const snap: HistoryState = { ...this._state, entries: [...this._state.entries] };
    for (const fn of this._listeners) fn(snap);
  }

  subscribe(fn: (state: HistoryState) => void): () => void {
    this._listeners.push(fn);
    fn({ ...this._state, entries: [...this._state.entries] });
    return () => {
      const idx = this._listeners.indexOf(fn);
      if (idx !== -1) this._listeners.splice(idx, 1);
    };
  }

  push(payload: GridPayload): void {
    const entry: HistoryEntry = { seq: ++this._seq, payload, loadedAt: new Date() };
    this._state.entries = this._state.entries.slice(0, this._state.cursor + 1);
    this._state.entries.push(entry);
    this._state.cursor = this._state.entries.length - 1;
    this._notify();
  }

  back(): void {
    if (!this.canGoBack()) return;
    this._state = { ...this._state, cursor: this._state.cursor - 1 };
    this._notify();
  }

  forward(): void {
    if (!this.canGoForward()) return;
    this._state = { ...this._state, cursor: this._state.cursor + 1 };
    this._notify();
  }

  current(): HistoryEntry | null {
    const s = this._state;
    if (s.cursor < 0 || s.cursor >= s.entries.length) return null;
    return s.entries[s.cursor];
  }

  canGoBack(): boolean    { return this._state.cursor > 0; }
  canGoForward(): boolean { return this._state.cursor < this._state.entries.length - 1; }
  size(): number          { return this._state.entries.length; }
}
