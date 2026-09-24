import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  // =====================================================
  // DEVELOPMENT SERVER
  // =====================================================
  server: {
    port: 3000,
    host: "0.0.0.0",
  },

  // =====================================================
  // BUILD
  // =====================================================
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
  },

  // =====================================================
  // RESOLVE
  // =====================================================
  resolve: {
    extensions: [".mjs", ".js", ".jsx", ".json", ".ts", ".tsx"],
  },
});
