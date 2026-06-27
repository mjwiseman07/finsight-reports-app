import { describe, it } from "vitest";
import { spawnPass } from "../../../tests/_helpers/spawnPass";

describe("kv-saas cascade", () => {
  it("saas-1 k-v poison cases", () => {
    spawnPass("node", ["architecture-lane/verifiers/verify-saas-1.js"]);
  });

  it("saas-2 verify", () => {
    spawnPass("node", [
      "node_modules/vitest/vitest.mjs",
      "run",
      "tests/verticals/saas/saas-2.verify.test.ts",
    ]);
  });
});
