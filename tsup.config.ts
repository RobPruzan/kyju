import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["src/index.tsx"],
    format: ["esm"],
    dts: true,
    outDir: "dist",
    external: ["react", "react-dom"],
    sourcemap: false,
    clean: false,
    tsconfig: "tsconfig.json",
    loader: {
      ".css": "text",
    },
  },
  {
    entry: ["src/auto.ts"],
    format: ["iife"],
    outDir: "dist",
    define: {
      "process.env.NODE_ENV": '"production"', // or "development"
    },
    sourcemap: false,
    clean: true,
    tsconfig: "tsconfig.json",
    loader: {
      ".css": "text",
    },
  },
]);
