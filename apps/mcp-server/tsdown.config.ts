import { defineConfig } from "tsdown";

export default defineConfig({
  entry: "src/index.ts",
  format: "esm",
  platform: "node",
  fixedExtension: false,
  dts: false,
  deps: {
    alwaysBundle: ["@ipo-pulse/core"],
  },
});