import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";
import { resolve } from "node:path";
import dts from "vite-plugin-dts";

const dir = fileURLToPath(new URL(".", import.meta.url));
const libOut = resolve(dir, "../lib");

export default defineConfig({
  plugins: [
    dts({
      entryRoot: "src",
      outDir: libOut,
      include: ["src/index.ts", "src/renderer.ts", "src/sphereRenderer.ts",
                "src/hemisphereRenderer.ts", "src/gridRenderer3D.ts",
                "../shared/types.ts"],
      rollupTypes: true,
    }),
  ],
  resolve: {
    alias: {
      "@shared": fileURLToPath(new URL("../shared", import.meta.url)),
    },
  },
  build: {
    lib: {
      entry: resolve(dir, "src/index.ts"),
      formats: ["es"],
      // Force .js extension so the root package.json can use a stable name
      fileName: () => "rendermate.js",
    },
    rollupOptions: {
      // three is a peer dependency — don't bundle it
      external: ["three", /^three\/.*/],
    },
    outDir: libOut,
    emptyOutDir: true,
  },
});
