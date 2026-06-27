import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts", "architecture-lane/**/*.test.ts"],
    testTimeout: 120_000,
  },
});
