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
      "lib/je-evidence/__tests__/**/*.test.ts",
      "lib/accruals/__tests__/**/*.test.ts",
      "architecture-lane/**/*.test.ts",
    ],
    testTimeout: 120_000,
  },
});
