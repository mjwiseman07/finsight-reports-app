import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    // Mirror the tsconfig "@/*" path alias so tests can import modules that use
    // it (e.g. lib/recurring/review-service.ts → "@/lib/supabase-admin.js").
    alias: {
      "@": rootDir,
    },
  },
  test: {
    include: [
      "tests/**/*.test.ts",
      "tests/**/*.test.tsx",
      "lib/je-evidence/__tests__/**/*.test.ts",
      "lib/accruals/__tests__/**/*.test.ts",
      "lib/ar-cash-app/**/*.test.ts",
      "lib/cash-app/**/*.test.ts",
      "lib/intake/**/*.test.ts",
      "lib/ap-intake/**/*.test.ts",
      "lib/format/__tests__/**/*.test.ts",
      "tests/apIntake/**/*.test.ts",
      "app/**/*.test.ts",
      "app/**/*.test.tsx",
      "architecture-lane/**/*.test.ts",
      "__tests__/**/*.test.ts",
      "__tests__/**/*.test.js",
    ],
    testTimeout: 120_000,
    environment: "node",
  },
});
