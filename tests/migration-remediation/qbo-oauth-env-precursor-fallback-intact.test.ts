/**
 * Precursor must not remove legacy QBO fallbacks (that is PR #315).
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("qbo oauth env precursor keeps legacy fallbacks", () => {
  it("token-resolver still references erp/quickbooks_connections fallbacks", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "lib/erp/quickbooks/token-resolver.ts"),
      "utf8",
    );
    expect(src).toMatch(/erp_connections/);
    expect(src).toMatch(/quickbooks_connections/);
    expect(src).toMatch(/loadFromErpTable/);
  });

  it("adapter saveConnection still dual-writes legacy tables", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "lib/erp-adapters/quickbooks-adapter.js"),
      "utf8",
    );
    expect(src).toMatch(/erp_connections/);
    expect(src).toMatch(/quickbooks_connections/);
  });

  it("no bulk UPDATE of provider_environment in changed writers", () => {
    const roots = [
      "lib/integrations/accounting/persist-canonical-connection-grant.ts",
      "lib/integrations/quickbooks/persist-authenticated-grant.ts",
      "lib/erp/quickbooks/oauth-environment-state.ts",
      "app/api/quickbooks/callback/route.js",
      "app/api/quickbooks/connect/route.js",
    ];
    for (const rel of roots) {
      const src = fs.readFileSync(path.join(process.cwd(), rel), "utf8");
      expect(src).not.toMatch(/UPDATE\s+.*accounting_connections[\s\S]*provider_environment\s*=\s*'production'/i);
      expect(src).not.toMatch(/\.update\(\s*\{\s*provider_environment:\s*["']production["']/);
    }
  });

  it("JE-3D capabilities remain OFF", () => {
    const policy = fs.readFileSync(
      path.join(process.cwd(), "lib/journal-entry-governance/je3d-activation-policy.ts"),
      "utf8",
    );
    expect(policy).toMatch(/CREATE_SANDBOX_JE:\s*false/);
    expect(policy).toMatch(/VERIFY_SANDBOX_JE:\s*false/);
    expect(policy).toMatch(/PREPARE_SANDBOX_JE:\s*false/);
  });
});
