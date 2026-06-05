export class HistoryStore {
    constructor() {
        this._seq = 0;
        this._state = { entries: [], cursor: -1 };
        this._listeners = [];
    }
    _notify() {
        const snap = { ...this._state, entries: [...this._state.entries] };
        for (const fn of this._listeners)
            fn(snap);
    }
    subscribe(fn) {
        this._listeners.push(fn);
        fn({ ...this._state, entries: [...this._state.entries] });
        return () => {
            const idx = this._listeners.indexOf(fn);
            if (idx !== -1)
                this._listeners.splice(idx, 1);
        };
    }
    push(payload) {
        const entry = { seq: ++this._seq, payload, loadedAt: new Date() };
        this._state.entries = this._state.entries.slice(0, this._state.cursor + 1);
        this._state.entries.push(entry);
        this._state.cursor = this._state.entries.length - 1;
        this._notify();
    }
    back() {
        if (!this.canGoBack())
            return;
        this._state = { ...this._state, cursor: this._state.cursor - 1 };
        this._notify();
    }
    forward() {
        if (!this.canGoForward())
            return;
        this._state = { ...this._state, cursor: this._state.cursor + 1 };
        this._notify();
    }
    current() {
        const s = this._state;
        if (s.cursor < 0 || s.cursor >= s.entries.length)
            return null;
        return s.entries[s.cursor];
    }
    canGoBack() { return this._state.cursor > 0; }
    canGoForward() { return this._state.cursor < this._state.entries.length - 1; }
    size() { return this._state.entries.length; }
}
