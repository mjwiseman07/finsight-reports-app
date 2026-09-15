import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  JE_3D_FIRST_CONTROLLED_CREATE_ACTIVATION_POLICY,
  resolveJe3dActivationPolicy,
} from "../../lib/journal-entry-governance/je3d-first-controlled-create-activation";
import { PRODUCTION_JE_ACTIVATION_POLICY } from "../../lib/journal-entry-governance/production-activation-policy";
import { SERVICE_ROLE_RPC_IDENTITY_ALLOWLIST } from "../../scripts/migration-remediation/esc-privilege-remediation.js";

const ROOT = path.resolve(__dirname, "../..");

const JE_DISPATCH_NAMES = [
  "apply_journal_entry_provider_dispatch_started",
  "apply_journal_entry_provider_posted",
  "apply_journal_entry_provider_post_unknown",
  "apply_journal_entry_provider_precommit_failed",
] as const;

describe("ESC dormant dispatch safety (grants ≠ activation)", () => {
  it("sandbox PREPARE/CREATE/VERIFY remain default OFF; kill switch engaged", () => {
    const policy = resolveJe3dActivationPolicy();
    expect(policy.capabilities.CREATE_SANDBOX_JE).toBe(false);
    expect(policy.capabilities.VERIFY_SANDBOX_JE).toBe(false);
    expect(policy.capabilities.PREPARE_SANDBOX_JE).toBe(false);
    expect(policy.memoryWriteAllowed).toBe(false);
    expect(policy.workerAllowed).toBe(false);
    expect(policy.governedAutoAllowed).toBe(false);
    expect(policy.productionAllowed).toBe(false);
    expect(policy.sandboxDispatchKillSwitch).toBe(true);
    expect(JE_3D_FIRST_CONTROLLED_CREATE_ACTIVATION_POLICY.sandboxDispatchKillSwitch).toBe(true);
  });

  it("production CREATE/VERIFY remain OFF with production kill switch engaged", () => {
    expect(PRODUCTION_JE_ACTIVATION_POLICY.capabilities.CREATE_PRODUCTION_JE).toBe(false);
    expect(PRODUCTION_JE_ACTIVATION_POLICY.capabilities.VERIFY_PRODUCTION_JE).toBe(false);
    expect(PRODUCTION_JE_ACTIVATION_POLICY.productionDispatchKillSwitch).toBe(true);
    expect(PRODUCTION_JE_ACTIVATION_POLICY.memoryProjectionAllowed).toBe(false);
    expect(PRODUCTION_JE_ACTIVATION_POLICY.workerAllowed).toBe(false);
    expect(PRODUCTION_JE_ACTIVATION_POLICY.governedAutoAllowed).toBe(false);
  });

  it("JE dispatch repository uses service-role admin only and does not flip capabilities", () => {
    const src = fs.readFileSync(
      path.join(ROOT, "lib/journal-entry-governance/provider-dispatch-repository.ts"),
      "utf8",
    );
    expect(src).toContain("getSupabaseAdmin()");
    expect(src).not.toMatch(/createBrowserClient|createClient\(/);
    expect(src).not.toMatch(/CREATE_SANDBOX_JE\s*=\s*true/);
    expect(src).not.toMatch(/VERIFY_SANDBOX_JE\s*=\s*true/);
    expect(src).not.toMatch(/PREPARE_SANDBOX_JE\s*=\s*true/);
    expect(src).not.toMatch(/sandboxDispatchKillSwitch\s*=\s*false/);
    expect(src).not.toMatch(/process\.env\.[A-Z0-9_]*(CREATE|VERIFY|PREPARE|KILL)/);
    for (const name of JE_DISPATCH_NAMES) {
      expect(src).toContain(`"${name}"`);
    }
  });

  it("exact-identity allowlist grants do not mutate activation policy source files", () => {
    const activation = fs.readFileSync(
      path.join(ROOT, "lib/journal-entry-governance/je3d-first-controlled-create-activation.ts"),
      "utf8",
    );
    const production = fs.readFileSync(
      path.join(ROOT, "lib/journal-entry-governance/production-activation-policy.ts"),
      "utf8",
    );
    expect(activation).toMatch(/CREATE_SANDBOX_JE:\s*false/);
    expect(activation).toMatch(/VERIFY_SANDBOX_JE:\s*false/);
    expect(activation).toMatch(/PREPARE_SANDBOX_JE:\s*false/);
    expect(activation).toMatch(/sandboxDispatchKillSwitch:\s*true/);
    expect(production).toMatch(/CREATE_PRODUCTION_JE:\s*false/);
    expect(production).toMatch(/VERIFY_PRODUCTION_JE:\s*false/);
    expect(production).toMatch(/productionDispatchKillSwitch:\s*true/);
    for (const id of SERVICE_ROLE_RPC_IDENTITY_ALLOWLIST) {
      expect(activation).not.toContain(id);
      expect(production).not.toContain(id);
    }
  });

  it("builder/remediation scripts do not enable capabilities or call providers", () => {
    const builder = fs.readFileSync(
      path.join(ROOT, "scripts/migration-remediation/build-executable-squash-candidate.js"),
      "utf8",
    );
    const rem = fs.readFileSync(
      path.join(ROOT, "scripts/migration-remediation/esc-privilege-remediation.js"),
      "utf8",
    );
    for (const src of [builder, rem]) {
      expect(src).not.toMatch(/CREATE_SANDBOX_JE:\s*true/);
      expect(src).not.toMatch(/quickbooks\.api\.intuit\.com/);
      expect(src).not.toMatch(/oauth2\/v1\/tokens/);
      expect(src).not.toMatch(/provider\.post|qbo\.post/i);
    }
  });
});
