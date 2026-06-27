import { describe, it } from "vitest";
import { spawnPass } from "../../../tests/_helpers/spawnPass";

describe("kv-gc cascade", () => {
  it("gc-2 verify", () => {
    spawnPass("node", [
      "node_modules/vitest/vitest.mjs",
      "run",
      "tests/verticals/govcon/gc-2.verify.test.ts",
    ]);
  });
});
