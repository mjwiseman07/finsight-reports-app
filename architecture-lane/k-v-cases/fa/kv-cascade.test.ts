import { describe, it } from "vitest";
import { executable, spawnPass } from "../../../tests/_helpers/spawnPass";

describe("kv-fa cascade", () => {
  it("verify-fa-wave-2", () => {
    spawnPass("node", ["scripts/verify-fa-wave-2.js"]);
  });
});
