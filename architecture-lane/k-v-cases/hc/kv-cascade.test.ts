import { describe, it } from "vitest";
import { spawnPass } from "../../../tests/_helpers/spawnPass";

describe("kv-hc cascade", () => {
  it("hc-2 verify", () => {
    spawnPass("node", [
      "node_modules/vitest/vitest.mjs",
      "run",
      "tests/verticals/healthcare/hc-2.verify.test.ts",
    ]);
  });
});
