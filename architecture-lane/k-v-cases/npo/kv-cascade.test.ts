import { describe, it } from "vitest";
import { spawnPass } from "../../../tests/_helpers/spawnPass";

describe("kv-npo cascade", () => {
  it("npo-2 kv", () => {
    spawnPass("node", [
      "node_modules/vitest/vitest.mjs",
      "run",
      "tests/verticals/nonprofit/npo-2.kv.test.ts",
    ]);
  });
});
