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
  // {
  //   entry: ["src/auto.ts"],
  //   format: ["iife"],
  //   outDir: "dist",
  //   sourcemap: false,
  //   clean: true,
  //   tsconfig: "tsconfig.json",
  //   loader: {
  //     ".css": "text",
  //   },
  //   onSuccess: "npm run build && node ./src/build-success.js",
  // },
]);
