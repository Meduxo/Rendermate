import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

/**
 * Vite configuration for the Rendermate frontend.
 *
 * Key points:
 * - `/api/*` requests are proxied to the Bun backend on port 3000 during dev.
 *   In production, the Bun server serves both the static build and the API.
 * - The `@shared` alias maps to `../shared` so frontend code can import
 *   shared types without relative path gymnastics.
 * - Uses `import.meta.url` (ESM-native) instead of `__dirname` (CJS) to
 *   avoid the Vite CJS Node API deprecation warning.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@shared": fileURLToPath(new URL("../shared", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
