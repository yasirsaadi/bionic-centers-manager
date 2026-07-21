import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      output: {
        // Keep the heavyweight, rarely-used libraries OUT of the entry chunk:
        // exports (xlsx/jspdf) and charts (recharts/d3) only download when a
        // page that actually uses them is opened. This is the main first-load
        // speed lever — the entry bundle was ~630KB gzipped with everything
        // fused together.
        manualChunks(id: string) {
          // Rollup virtual modules (\0commonjsHelpers etc.) are shared by
          // everything — pin them to the always-loaded vendor chunk, or they
          // get colocated inside vendor-pdf and statically chain the entry
          // (and every page) to the heavy pdf bundle.
          if (id.startsWith("\0")) return "vendor";
          if (id.includes("node_modules")) {
            // NOTE deliberately NO separate react chunk: splitting the react
            // runtime away from the libraries that touch it at module-eval
            // time created a chunk-initialization cycle in production
            // ("Cannot read properties of undefined (reading useLayoutEffect)"
            // = white page). React lives inside the shared `vendor` chunk with
            // everything that needs it, so initialization order is guaranteed.
            if (id.includes("/xlsx/")) return "vendor-xlsx";
            if (id.includes("/jspdf") || id.includes("html2canvas") || id.includes("purify")) return "vendor-pdf";
            if (id.includes("/recharts/") || id.includes("/d3-") || id.includes("victory-vendor")) return "vendor-charts";
            if (id.includes("framer-motion")) return "vendor-motion";
            // Everything else (radix, tanstack, drizzle, zod, …) shares ONE
            // vendor chunk. Crucially this is where rollup's shared interop
            // helpers land — without it they get colocated inside the first
            // heavy chunk (vendor-pdf), statically chaining the ENTRY to the
            // pdf/charts bundles and silently undoing the whole split.
            return "vendor";
          }
          return undefined;
        },
      },
    },
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
