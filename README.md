# Rendermate

A local-first, production-grade grid visualization tool. Renders 2D arrays of float values as grayscale pixel grids. Designed as an offline plug-in to external data pipelines.

---

## Architecture

```
main/
├── frontend/          Vite + TypeScript UI
│   └── src/
│       ├── main.ts          Bootstrap: fetch, controls, history wiring
│       ├── renderer.ts      Pure canvas rendering (no I/O)
│       ├── historyStore.ts  In-memory grid history (push/back/forward)
│       └── types.ts         Frontend-local types + re-exports from shared/
│
├── backend/           Bun HTTP server
│   └── server.ts      GET /api/grid — reads data/grid.json
│
├── shared/
│   └── types.ts       GridPayload interface (imported by both sides)
│
└── data/
    └── grid.json      ← your pipeline writes here (gitignored)
```

The frontend and backend are fully decoupled. The UI never knows where data came from — it only speaks the `GridPayload` JSON contract.

---

## Prerequisites

- [Bun](https://bun.sh) ≥ 1.1 — used as runtime, package manager, and backend server

---

## Setup

```bash
# Install frontend dependencies
cd frontend && bun install && cd ..

# Install backend dependencies
cd backend && bun install && cd ..
```

---

## Running (development)

Open two terminals:

```bash
# Terminal 1 — backend (port 3000)
cd backend && bun run dev

# Terminal 2 — frontend (port 5173, proxies /api → localhost:3000)
cd frontend && bun run dev
```

Open **http://localhost:5173** in your browser.

---

## Running (production)

```bash
# Build the frontend
cd frontend && bun run build

# Serve everything from the backend
cd ../backend && bun run start
```

The backend serves the API on port 3000. Point a reverse proxy (nginx, Caddy, etc.) at it, or add a static file handler to `server.ts` to serve `frontend/dist/` directly.

---

## Pipeline Integration

The only thing your pipeline needs to do is write a JSON file:

```bash
# From any language, any process — just write this file:
data/grid.json
```

### File format (`GridPayload`)

```json
{
  "grid": [
    [0.1, 0.5, 0.8, 0.2],
    [0.9, 0.3, 0.6, 0.4]
  ],
  "meta": {
    "label": "epoch_42_layer3_activations",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `grid` | `number[][]` | ✅ | 2D array of floats in `[0, 1]`. Rows × Cols = any size. |
| `meta` | `object` | ❌ | Arbitrary metadata. Ignored by the renderer; preserved in history. |
| `meta.label` | `string` | ❌ | Human-readable name shown in history position indicator (future). |
| `meta.timestamp` | `string` | ❌ | ISO 8601 timestamp of data production. |

After writing the file, click **Reload** in the UI to fetch and display it.

### Python example

```python
import json, pathlib, time

grid = [[float(r * c) / (rows * cols) for c in range(cols)] for r in range(rows)]

payload = {
    "grid": grid,
    "meta": {
        "label": "my_activation_map",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
}

pathlib.Path("data/grid.json").write_text(json.dumps(payload))
```

---

## UI Controls

| Control | Action |
|---|---|
| **← / →** | Navigate backward/forward through loaded grid history |
| **Scale slider** | Multiply all values by 0.0–2.0 before rendering; values above 1 are clamped to white |
| **Reload** | Fetch the current `data/grid.json`, push onto history stack, reset scale to 1.0 |

### History behaviour

- Every **Reload** pushes a new entry onto the history stack.
- **←** and **→** navigate the stack without re-fetching from the server.
- If you navigate backward and then Reload, the "future" entries are discarded (same as browser history).
- History is in-memory only — it resets on page refresh.

---

## Extending

| Goal | Where to change |
|---|---|
| Different colormap (e.g. viridis) | [`frontend/src/renderer.ts`](frontend/src/renderer.ts) — replace the `rgb(byte,byte,byte)` line |
| Larger/smaller pixels | [`frontend/src/renderer.ts`](frontend/src/renderer.ts) — change `PIXEL_SIZE` |
| Read from a database instead of a file | [`backend/server.ts`](backend/server.ts) — swap `Bun.file()` for a DB query |
| Stream live updates | Add a `GET /api/grid/stream` SSE endpoint in `server.ts`; subscribe in `main.ts` |
| Persist history across reloads | Serialize `historyStore` state to `localStorage` in [`frontend/src/historyStore.ts`](frontend/src/historyStore.ts) |
| Add a colormap selector | Add a `<select>` in `index.html`; pass the chosen map name to `renderer.ts` |
