import { describe, it } from "vitest";
import { spawnPass } from "../../../tests/_helpers/spawnPass";

describe("kv-rtl cascade", () => {
  it("rtl-2 kv", () => {
    spawnPass("node", [
      "node_modules/vitest/vitest.mjs",
      "run",
      "tests/verticals/retail/rtl-2.kv.test.ts",
    ]);
  });
});
