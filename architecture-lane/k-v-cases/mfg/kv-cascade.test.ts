import { describe, it } from "vitest";
import { spawnPass } from "../../../tests/_helpers/spawnPass";

describe("kv-mfg cascade", () => {
  it("mfg-2 kv", () => {
    spawnPass("node", [
      "node_modules/vitest/vitest.mjs",
      "run",
      "tests/verticals/manufacturing/mfg-2.kv.test.ts",
    ]);
  });
});
