import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("W1c.2 — stub write methods removed from adapters", () => {
  for (const path of [
    "lib/integrations/quickbooks/adapter.ts",
    "lib/integrations/xero/adapter.ts",
  ]) {
    it(`${path} does not import or call withStubWriteMethods`, () => {
      const src = readFileSync(path, "utf8");
      expect(src).not.toMatch(/withStubWriteMethods/);
    });
  }
});
