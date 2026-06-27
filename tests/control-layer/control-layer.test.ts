import { describe, it } from "vitest";
import { spawnPass } from "../_helpers/spawnPass";

describe("control-layer cascade", () => {
  it("escalation audit retrofit", () => {
    spawnPass("node", ["scripts/run-escalation-audit-tests.js"]);
  });

  it("panel decision audit retrofit", () => {
    spawnPass("node", ["scripts/run-panel-decision-audit-tests.js"]);
  });

  it("org-edge audit retrofit", () => {
    spawnPass("node", ["scripts/run-org-edge-audit-tests.js"]);
  });
});
