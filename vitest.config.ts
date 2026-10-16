import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Remove once the first real test file exists (T04).
    passWithNoTests: true,
  },
});
