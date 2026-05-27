/**
 * backend/server.ts
 *
 * Rendermate backend — a minimal Bun HTTP server.
 *
 * Routes:
 *   GET  /api/grid          → reads the active GridPayload (uploaded or data/grid.json)
 *   GET  /api/grid/list     → returns names of all .json files in data/
 *   GET  /api/grid/:name    → reads data/<name>.json and returns it as JSON
 *   POST /api/grid/upload   → accepts a JSON body, stores it in memory as the active grid
 *   GET  /health            → returns 200 OK (useful for scripted health checks)
 *
 * Pipeline integration:
 *   Write a JSON file to `data/grid.json` in the project root.
 *   The file must conform to the GridPayload interface (see shared/types.ts).
 *   Hit the Reload button in the UI to fetch the latest version.
 *
 * Production:
 *   Run `bun run build` in frontend/ to produce a static build in frontend/dist/.
 *   Then serve those files from this server by adding a static file handler below.
 */

import type { GridPayload } from "../shared/types";
import path from "path";
import fs from "fs/promises";

const PORT      = parseInt(process.env.PORT ?? "3000", 10);
const DATA_DIR  = path.resolve(import.meta.dir, "../data");
const DATA_FILE = path.join(DATA_DIR, "grid.json");

// ── In-memory override ────────────────────────────────────────────────────────
// When a user uploads a file via POST /api/grid/upload, it is stored here and
// takes precedence over data/grid.json until the server restarts or another
// file is loaded.

let _uploadedPayload: GridPayload | null = null;

// ── CORS headers (permissive for local dev) ───────────────────────────────────

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function jsonError(status: number, message: string): Response {
  return jsonResponse({ error: message }, status);
}

/**
 * Validate that a parsed value looks like a GridPayload.
 * Returns an error string if invalid, or null if valid.
 */
function validatePayload(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) {
    return "Payload must be a JSON object.";
  }
  const p = payload as Record<string, unknown>;
  if (!Array.isArray(p.grid) || p.grid.length === 0) {
    return "Payload must contain a non-empty 'grid' array.";
  }
  return null;
}

/**
 * Read and parse a GridPayload from a file path.
 * Returns [payload, null] on success, [null, errorMessage] on failure.
 */
async function readPayloadFile(filePath: string): Promise<[GridPayload | null, string | null]> {
  try {
    const file = Bun.file(filePath);
    if (!(await file.exists())) {
      return [null, `File not found: ${filePath}`];
    }
    const raw     = await file.text();
    const payload = JSON.parse(raw) as GridPayload;
    const err     = validatePayload(payload);
    if (err) return [null, err];
    return [payload, null];
  } catch (e) {
    return [null, e instanceof Error ? e.message : String(e)];
  }
}

// ── Request handler ───────────────────────────────────────────────────────────

Bun.serve({
  port: PORT,

  async fetch(req: Request): Promise<Response> {
    const url    = new URL(req.url);
    const method = req.method.toUpperCase();

    // Handle CORS preflight.
    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // ── GET /api/grid/list ────────────────────────────────────────────────────
    // Returns an array of dataset names (filenames without .json extension)
    // found in the data/ directory.
    if (method === "GET" && url.pathname === "/api/grid/list") {
      try {
        const entries = await fs.readdir(DATA_DIR);
        const names   = entries
          .filter(f => f.endsWith(".json"))
          .map(f => f.slice(0, -5)); // strip .json
        return jsonResponse({ datasets: names });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return jsonError(500, `Failed to list data directory: ${msg}`);
      }
    }

    // ── POST /api/grid/upload ─────────────────────────────────────────────────
    // Accepts a JSON body conforming to GridPayload, stores it in memory.
    if (method === "POST" && url.pathname === "/api/grid/upload") {
      try {
        const body    = await req.text();
        const payload = JSON.parse(body) as GridPayload;
        const err     = validatePayload(payload);
        if (err) return jsonError(422, err);

        _uploadedPayload = payload;
        return jsonResponse({ ok: true, rows: payload.grid.length, cols: payload.grid[0]?.length ?? 0 });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return jsonError(400, `Invalid JSON: ${msg}`);
      }
    }

    // ── GET /api/grid/:name ───────────────────────────────────────────────────
    // Loads a named dataset from data/<name>.json.
    // The name must be a plain filename token (no slashes, no ..).
    const namedMatch = url.pathname.match(/^\/api\/grid\/([A-Za-z0-9_\-]+)$/);
    if (method === "GET" && namedMatch) {
      const name     = namedMatch[1];
      const filePath = path.join(DATA_DIR, `${name}.json`);

      // Prevent path traversal — ensure resolved path stays inside DATA_DIR.
      if (!filePath.startsWith(DATA_DIR + path.sep) && filePath !== DATA_DIR) {
        return jsonError(400, "Invalid dataset name.");
      }

      const [payload, err] = await readPayloadFile(filePath);
      if (err) return jsonError(404, err);
      return jsonResponse(payload!);
    }

    // ── GET /api/grid ─────────────────────────────────────────────────────────
    // Returns the active payload: uploaded > data/grid.json.
    if (method === "GET" && url.pathname === "/api/grid") {
      // Prefer in-memory upload.
      if (_uploadedPayload) {
        return jsonResponse(_uploadedPayload);
      }

      const [payload, err] = await readPayloadFile(DATA_FILE);
      if (err) {
        // Distinguish "file missing" (404) from other errors (500).
        const status = err.includes("not found") ? 404 : 500;
        return jsonError(status, status === 404 ? `Data file not found: ${DATA_FILE}` : `Failed to read data file: ${err}`);
      }
      return jsonResponse(payload!);
    }

    // ── GET /health ───────────────────────────────────────────────────────────
    if (method === "GET" && url.pathname === "/health") {
      return jsonResponse({ status: "ok" });
    }

    // ── 404 fallback ──────────────────────────────────────────────────────────
    return jsonError(404, `No route for ${method} ${url.pathname}`);
  },
});

console.log(`Rendermate backend listening on http://localhost:${PORT}`);
