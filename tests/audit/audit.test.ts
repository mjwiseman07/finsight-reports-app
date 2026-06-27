import { describe, it } from "vitest";
import { spawnPass } from "../_helpers/spawnPass";

describe("audit cascade", () => {
  it("audit log foundation", () => {
    spawnPass("node", ["scripts/run-audit-log-tests.js"]);
  });

  it("memory cache audit channel", () => {
    spawnPass("node", ["scripts/run-memory-cache-tests.js"]);
  });
});
