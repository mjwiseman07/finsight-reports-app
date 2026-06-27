import { describe, it } from "vitest";
import { spawnPass } from "../../../tests/_helpers/spawnPass";

describe("kv-con cascade", () => {
  it("con-2 verify", () => {
    spawnPass("node", [
      "node_modules/vitest/vitest.mjs",
      "run",
      "tests/verticals/construction/con-2.verify.test.ts",
    ]);
  });
});
