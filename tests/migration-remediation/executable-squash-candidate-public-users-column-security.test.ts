import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  PUBLIC_USERS_COLUMN_CONTRACT,
  assertNoUsersAnonAllGrant,
  assertNoUsersAuthenticatedTableUpdate,
} from "../../scripts/migration-remediation/esc-privilege-remediation.js";

const ROOT = path.resolve(__dirname, "../..");
const PKG = path.join(ROOT, "supabase/migrations-draft/executable-squash-candidate");
const MANIFEST = path.join(PKG, "MANIFEST.json");
const CONTRACT = path.join(
  ROOT,
  "docs/migration-remediation/evidence/executable-squash-candidate-public-users-column-contract.json",
);

const PROTECTED = [
  "id",
  "email",
  "stripe_customer_id",
  "subscription_status",
  "trial_used",
  "reports_generated",
  "ip_address_signup",
  "created_at",
  "first_name",
  "last_name",
  "business_name",
];

function stripComments(sql: string) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, "").replace(/--.*$/gm, "");
}

describe("public.users column privilege contract (ESC)", () => {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
  const foundations = fs.readFileSync(
    path.join(ROOT, manifest.entries.find((e: { version: string }) => e.version === "20260907010010").path),
    "utf8",
  );
  const contractDoc = JSON.parse(fs.readFileSync(CONTRACT, "utf8"));

  it("contract classifies every derived-baseline column and allowlist is empty", () => {
    expect(PUBLIC_USERS_COLUMN_CONTRACT.authenticatedUpdateFullyRevoked).toBe(true);
    expect(PUBLIC_USERS_COLUMN_CONTRACT.authenticatedUpdateAllowlist).toEqual([]);
    expect(PUBLIC_USERS_COLUMN_CONTRACT.authenticatedTablePrivileges).toEqual(["SELECT"]);
    for (const col of PROTECTED) {
      expect(PUBLIC_USERS_COLUMN_CONTRACT.columns[col], col).toBeTruthy();
      expect(PUBLIC_USERS_COLUMN_CONTRACT.columns[col].userEditable).toBe(false);
    }
    expect(contractDoc.contract.authenticatedUpdateFullyRevoked).toBe(true);
  });

  it("module SQL enforces SELECT-only authenticated and denies anon/PUBLIC", () => {
    expect(assertNoUsersAnonAllGrant(foundations)).toBe(true);
    expect(assertNoUsersAuthenticatedTableUpdate(foundations)).toBe(true);
    const cleaned = stripComments(foundations);
    expect(cleaned).toMatch(/GRANT\s+SELECT\s+ON\s+TABLE\s+public\.users\s+TO\s+authenticated/i);
    expect(cleaned).toMatch(/REVOKE\s+UPDATE\s+ON\s+TABLE\s+public\.users\s+FROM\s+authenticated/i);
    expect(cleaned).toMatch(/REVOKE\s+ALL\s+ON\s+TABLE\s+public\.users\s+FROM\s+anon/i);
    expect(cleaned).toMatch(/REVOKE\s+ALL\s+ON\s+TABLE\s+public\.users\s+FROM\s+PUBLIC/i);
    expect(cleaned).toMatch(/GRANT\s+ALL\s+ON\s+TABLE\s+public\.users\s+TO\s+service_role/i);
    expect(cleaned).not.toMatch(/GRANT\s+[^(;]*\bINSERT\b[^(;]*ON\s+TABLE\s+public\.users\s+TO\s+authenticated/i);
    expect(cleaned).not.toMatch(/GRANT\s+[^(;]*\bDELETE\b[^(;]*ON\s+TABLE\s+public\.users\s+TO\s+authenticated/i);
  });

  it("own-row RLS remains and incomplete classification fails closed", () => {
    expect(foundations).toMatch(/Users can read own record/);
    expect(foundations).toMatch(/Users can update own record/);
    expect(foundations).toMatch(/auth\.uid\(\)\s*=\s*id/);
    // Future column not in contract must not become editable by empty allowlist policy
    expect(PUBLIC_USERS_COLUMN_CONTRACT.authenticatedUpdateAllowlist.includes("future_col" as never)).toBe(
      false,
    );
    const unclassified = Object.values(PUBLIC_USERS_COLUMN_CONTRACT.columns).filter(
      (c: { userEditable?: boolean; class?: string }) => c.userEditable === undefined || !c.class,
    );
    expect(unclassified).toEqual([]);
  });
});
