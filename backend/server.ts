/**
 * backend/server.ts
 *
 * Rendermate backend — a minimal Bun HTTP server.
 *
 * Routes:
 *   GET /api/grid   → reads data/grid.json and returns it as JSON
 *   GET /health     → returns 200 OK (useful for scripted health checks)
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

const PORT      = parseInt(process.env.PORT ?? "3000", 10);
const DATA_FILE = path.resolve(import.meta.dir, "../data/grid.json");

// ── CORS headers (permissive for local dev) ───────────────────────────────────

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

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

    // ── GET /api/grid ─────────────────────────────────────────────────────────
    if (method === "GET" && url.pathname === "/api/grid") {
      try {
        const file = Bun.file(DATA_FILE);

        if (!(await file.exists())) {
          return jsonError(404, `Data file not found: ${DATA_FILE}`);
        }

        const raw     = await file.text();
        const payload = JSON.parse(raw) as GridPayload;

        // Basic validation — ensure the grid field is a non-empty 2D array.
        if (!Array.isArray(payload.grid) || payload.grid.length === 0) {
          return jsonError(422, "grid.json must contain a non-empty 'grid' array.");
        }

        return new Response(JSON.stringify(payload), {
          status:  200,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return jsonError(500, `Failed to read data file: ${msg}`);
      }
    }

    // ── GET /health ───────────────────────────────────────────────────────────
    if (method === "GET" && url.pathname === "/health") {
      return new Response(JSON.stringify({ status: "ok" }), {
        status:  200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // ── 404 fallback ──────────────────────────────────────────────────────────
    return jsonError(404, `No route for ${method} ${url.pathname}`);
  },
});

console.log(`Rendermate backend listening on http://localhost:${PORT}`);

// ── Helpers ───────────────────────────────────────────────────────────────────

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
