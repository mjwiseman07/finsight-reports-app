import { describe, it, expect } from "vitest";
import { TIE_OUT_KINDS } from "@/lib/audit-ready/tie-out-kind-classifier";
import {
  getEmitter,
  SHIPPED_EMITTER_KINDS,
} from "../registry";

const SHIPPED = [
  "bs_account_recon",
  "fixed_asset_rollforward",
  "bs_recon_summary",
  "ap_aging",
  "ar_aging",
  "inventory",
  "grni",
] as const;

describe("EMITTER_REGISTRY", () => {
  it("resolves all 7 shipped kinds", () => {
    expect(SHIPPED_EMITTER_KINDS).toHaveLength(7);
    for (const kind of SHIPPED) {
      const emitter = getEmitter(kind);
      expect(emitter).not.toBeNull();
      expect(emitter!.kind).toBe(kind);
    }
  });

  it("returns null for the 7 unshipped kinds", () => {
    const unshipped = TIE_OUT_KINDS.filter(
      (k) => !(SHIPPED as readonly string[]).includes(k),
    );
    expect(unshipped).toHaveLength(7);
    for (const kind of unshipped) {
      expect(getEmitter(kind)).toBeNull();
    }
  });
});
