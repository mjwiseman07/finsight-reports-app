import { describe, it } from "vitest";
import { spawnPass } from "../_helpers/spawnPass";

describe("doctrine cascade", () => {
  it("resolver + role-adapter doctrine tests", () => {
    spawnPass("node", ["scripts/run-resolver-tests.js"]);
  });
});
