import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@/lib": path.resolve(__dirname, "src/lib"),
      "@/usability-tests": path.resolve(__dirname, "src/usability-tests"),
      "@": path.resolve(__dirname),
    },
  },
});
