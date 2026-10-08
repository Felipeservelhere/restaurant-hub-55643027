// Build estático (SPA) do Cadastros-aba — servido pelo Apache via iframe.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: here,
  base: "./",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": resolve(here, "../src"),
    },
  },
  build: {
    outDir: resolve(here, "../dist"),
    emptyOutDir: true,
  },
});
