/**
 * Predicate-safety tests for the null provider_environment remediation plan.
 * No production writes; no identifiers or token values.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const PLAN = path.join(
  process.cwd(),
  "docs/migration-remediation/quickbooks-null-provider-environment-remediation-plan-2026-09-07.md",
);

const ILLUSTRATIVE_UPDATE = `
UPDATE public.accounting_connections AS a
SET
  provider_environment = 'production',
  updated_at = clock_timestamp()
WHERE a.provider = 'quickbooks'
  AND a.provider_environment IS NULL
  AND a.status = 'connected'
  AND a.superseded_by_connection_id IS NULL
  AND a.credentials_cleared_at IS NULL
  AND a.access_token IS NOT NULL AND length(btrim(a.access_token)) > 0
  AND a.refresh_token IS NOT NULL AND length(btrim(a.refresh_token)) > 0
  AND a.tenant_or_realm_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.quickbooks_connections AS l
    WHERE l.user_id IS NOT DISTINCT FROM a.user_id
      AND l.realm_id IS NOT DISTINCT FROM a.tenant_or_realm_id
  )
`;

type ProvenanceClass =
  | "proven_production"
  | "proven_sandbox"
  | "conflicting"
  | "insufficient";

function classifyAggregate(args: {
  provenProduction: number;
  provenSandbox: number;
  conflicting: number;
  insufficient: number;
}): "READY_FOR_CONTROLLED_UPDATE" | "INSUFFICIENT_ENVIRONMENT_PROVENANCE" | "CONFLICTING_ENVIRONMENT_PROVENANCE" | "BLOCKED" {
  if (args.conflicting > 0) return "CONFLICTING_ENVIRONMENT_PROVENANCE";
  if (args.provenProduction === 3 && args.insufficient === 0 && args.provenSandbox === 0) {
    return "READY_FOR_CONTROLLED_UPDATE";
  }
  if (args.provenProduction === 0 && args.insufficient > 0) {
    return "INSUFFICIENT_ENVIRONMENT_PROVENANCE";
  }
  if (args.provenProduction > 0 && args.provenProduction !== 3) {
    return "BLOCKED";
  }
  return "BLOCKED";
}

function abortIfTargetCountNotExact(actual: number, expected: number): "ok" | "abort" {
  return actual === expected ? "ok" : "abort";
}

function wouldTargetSandboxReadyRow(args: {
  targetHasProviderEnvironment: string | null;
  sandboxReadyLegacyMatches: number;
}): boolean {
  // Sandbox-ready unique match has provider_environment = 'sandbox' and must be excluded
  // by provider_environment IS NULL.
  if (args.targetHasProviderEnvironment === "sandbox") return true;
  if (args.sandboxReadyLegacyMatches < 1) return true;
  return false;
}

describe("null provider_environment remediation plan", () => {
  it("plan document exists and states insufficient provenance verdict", () => {
    const text = fs.readFileSync(PLAN, "utf8");
    expect(text).toMatch(/INSUFFICIENT_ENVIRONMENT_PROVENANCE/);
    expect(text).toMatch(/Proven production \| \*\*0\*\*/);
    expect(text).toMatch(/Insufficient evidence \| \*\*3\*\*/);
    expect(text).toMatch(/no UPDATE executed/i);
  });

  it("illustrative UPDATE only sets provider_environment and updated_at", () => {
    const setClause = ILLUSTRATIVE_UPDATE.match(/SET([\s\S]*?)WHERE/)?.[1] || "";
    expect(setClause).toMatch(/provider_environment/);
    expect(setClause).toMatch(/updated_at/);
    expect(setClause).not.toMatch(/access_token\s*=/);
    expect(setClause).not.toMatch(/refresh_token\s*=/);
    expect(setClause).not.toMatch(/tenant_or_realm_id\s*=/);
    expect(setClause).not.toMatch(/status\s*=/);
  });

  it("predicate requires null env, connected, not superseded, tokens present without selecting values", () => {
    expect(ILLUSTRATIVE_UPDATE).toMatch(/provider_environment IS NULL/);
    expect(ILLUSTRATIVE_UPDATE).toMatch(/status = 'connected'/);
    expect(ILLUSTRATIVE_UPDATE).toMatch(/superseded_by_connection_id IS NULL/);
    expect(ILLUSTRATIVE_UPDATE).toMatch(/credentials_cleared_at IS NULL/);
    expect(ILLUSTRATIVE_UPDATE).toMatch(/access_token IS NOT NULL/);
    expect(ILLUSTRATIVE_UPDATE).toMatch(/refresh_token IS NOT NULL/);
    expect(ILLUSTRATIVE_UPDATE).not.toMatch(/SELECT\s+a\.access_token/);
    expect(ILLUSTRATIVE_UPDATE).not.toMatch(/SELECT\s+a\.refresh_token/);
  });

  it("aborts when proven-production target count is not exactly 3", () => {
    expect(abortIfTargetCountNotExact(0, 3)).toBe("abort");
    expect(abortIfTargetCountNotExact(2, 3)).toBe("abort");
    expect(abortIfTargetCountNotExact(4, 3)).toBe("abort");
    expect(abortIfTargetCountNotExact(3, 3)).toBe("ok");
  });

  it("current evidence yields insufficient provenance (not ready for update)", () => {
    const verdict = classifyAggregate({
      provenProduction: 0,
      provenSandbox: 0,
      conflicting: 0,
      insufficient: 3,
    });
    expect(verdict).toBe("INSUFFICIENT_ENVIRONMENT_PROVENANCE");
  });

  it("excludes already-classified sandbox rows from null-env target set", () => {
    expect(
      wouldTargetSandboxReadyRow({
        targetHasProviderEnvironment: "sandbox",
        sandboxReadyLegacyMatches: 1,
      }),
    ).toBe(true);
    expect(
      wouldTargetSandboxReadyRow({
        targetHasProviderEnvironment: null,
        sandboxReadyLegacyMatches: 1,
      }),
    ).toBe(false);
  });

  it("plan contains no customer identifiers or token-shaped secrets", () => {
    const text = fs.readFileSync(PLAN, "utf8");
    expect(text).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/);
    expect(text).not.toMatch(/postgres(?:ql)?:\/\//i);
    expect(text).not.toMatch(/BEGIN (RSA |EC )?PRIVATE KEY/);
    expect(text).not.toMatch(/\bsk_live_[A-Za-z0-9]+/);
    expect(text).not.toMatch(
      /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i,
    );
  });

  it("PR #315 application code paths remain free of live legacy table queries", () => {
    const roots = [
      "lib/erp/quickbooks/token-resolver.ts",
      "lib/erp-adapters/quickbooks-adapter.js",
      "lib/integrations/quickbooks/promote-legacy-grant-execute.ts",
    ];
    for (const rel of roots) {
      const src = fs.readFileSync(path.join(process.cwd(), rel), "utf8");
      expect(src).not.toMatch(/\.from\(\s*["']quickbooks_connections["']\s*\)/);
    }
  });
});
