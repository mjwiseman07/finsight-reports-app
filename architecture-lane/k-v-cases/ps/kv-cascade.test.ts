import { describe, it } from "vitest";
import { spawnPass } from "../../../tests/_helpers/spawnPass";

describe("kv-ps cascade", () => {
  it("ps-2 verify", () => {
    spawnPass("node", [
      "node_modules/vitest/vitest.mjs",
      "run",
      "tests/verticals/profservices/ps-2.verify.test.ts",
    ]);
  });
});
