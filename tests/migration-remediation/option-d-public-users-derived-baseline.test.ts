import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  evaluateDerivedBaseline,
  DERIVED_SQL,
  CONTRACT,
  DERIVED_FILENAME,
} from "../../scripts/migration-remediation/audit-option-d-public-users-derived-baseline.js";
import {
  evaluateManifestAuthorization,
  resolveGitHead,
  sha256Buffer,
} from "../../scripts/migration-remediation/option-d-manifest-authorization.js";

const ROOT = path.resolve(__dirname, "../..");
const MANIFEST = path.join(ROOT, "docs/migration-remediation/option-d-replay-manifest.json");
const ASSEMBLE = path.join(ROOT, "scripts/migration-remediation/assemble-option-d-replay.js");

const GOOD_SQL = fs.readFileSync(DERIVED_SQL, "utf8");

function withTempSql(sql: string, mutateContract?: (c: Record<string, unknown>) => void) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pu-derived-"));
  const sqlPath = path.join(dir, "derived.sql");
  const contractPath = path.join(dir, "contract.json");
  fs.writeFileSync(sqlPath, sql);
  const contract = JSON.parse(fs.readFileSync(CONTRACT, "utf8"));
  const crypto = require("node:crypto");
  contract.derivedSqlSha256 = crypto.createHash("sha256").update(sql, "utf8").digest("hex");
  contract.derivedSqlBytes = Buffer.byteLength(sql, "utf8");
  if (mutateContract) mutateContract(contract);
  fs.writeFileSync(contractPath, JSON.stringify(contract, null, 2));
  return { dir, sqlPath, contractPath };
}

describe("Option D public.users derived baseline", () => {
  it("authoritative derived artifact passes the gate", () => {
    const result = evaluateDerivedBaseline();
    expect(result.ok).toBe(true);
    expect(result.derivationComplete).toBe(true);
    expect(result.unresolvedCount).toBe(0);
    expect(result.derivedSqlSha256).toBe(
      "14f67dd2b70300ab058a7635bd265f75847e6ca7a24d3087358844f102c71850",
    );
  });

  it("contract declares derived (not recovered original) and no row data", () => {
    const c = JSON.parse(fs.readFileSync(CONTRACT, "utf8"));
    expect(c.artifactKind).toBe("derived_baseline_not_recovered_original_sql");
    expect(c.contains_data_rows).toBe(false);
    expect(c.originalCreatorSqlAvailable).toBe(false);
    expect(c.noCredentialsEmailsUserIdsOrRowValues).toBe(true);
    expect(c.unresolvedElements).toEqual([]);
    expect(c.derivationComplete).toBe(true);
  });

  it("rejects substituting auth.users for public.users", () => {
    const bad = GOOD_SQL.replace(/public\.users/g, "auth.users");
    const { dir, sqlPath, contractPath } = withTempSql(bad);
    try {
      const r = evaluateDerivedBaseline({ sqlPath, contractPath });
      expect(r.ok).toBe(false);
      expect(
        r.failures.some(
          (f) =>
            f.rule === "substituted_or_created_auth_users" ||
            f.rule === "missing_create_public_users",
        ),
      ).toBe(true);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rejects missing or incorrect auth.users foreign key", () => {
    const bad = GOOD_SQL.replace(
      /CONSTRAINT users_id_fkey FOREIGN KEY \(id\) REFERENCES auth\.users\(id\)/,
      "CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES public.companies(id)",
    );
    const { dir, sqlPath, contractPath } = withTempSql(bad);
    try {
      const r = evaluateDerivedBaseline({ sqlPath, contractPath });
      expect(r.ok).toBe(false);
      expect(r.failures.some((f) => f.rule === "missing_or_incorrect_auth_users_fkey")).toBe(true);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rejects missing RLS", () => {
    const bad = GOOD_SQL.replace(
      /ALTER TABLE public\.users ENABLE ROW LEVEL SECURITY;/,
      "-- RLS removed",
    );
    const { dir, sqlPath, contractPath } = withTempSql(bad);
    try {
      const r = evaluateDerivedBaseline({ sqlPath, contractPath });
      expect(r.ok).toBe(false);
      expect(r.failures.some((f) => f.rule === "rls_not_enabled")).toBe(true);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rejects overbroad FOR ALL policy and INSERT policy", () => {
    const bad =
      GOOD_SQL +
      `\nCREATE POLICY "wide" ON public.users FOR ALL USING (true);\n` +
      `CREATE POLICY "ins" ON public.users FOR INSERT WITH CHECK (true);\n`;
    const { dir, sqlPath, contractPath } = withTempSql(bad);
    try {
      const r = evaluateDerivedBaseline({ sqlPath, contractPath });
      expect(r.ok).toBe(false);
      expect(r.failures.some((f) => f.rule === "overbroad_for_all_policy")).toBe(true);
      expect(r.failures.some((f) => f.rule === "unexpected_insert_policy")).toBe(true);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rejects authorization based on editable user metadata", () => {
    const bad =
      GOOD_SQL +
      `\n-- bad: USING ((raw_user_meta_data->>'role') = 'admin')\n` +
      `CREATE POLICY "meta" ON public.users FOR SELECT USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');\n`;
    // Force metadata token into SQL for the gate's raw_user_meta_data check
    const worse = bad.replace(
      'USING ((auth.jwt() -> \'user_metadata\' ->> \'role\') = \'admin\')',
      "USING ((raw_user_meta_data->>'role') = 'admin')",
    );
    const { dir, sqlPath, contractPath } = withTempSql(worse);
    try {
      const r = evaluateDerivedBaseline({ sqlPath, contractPath });
      expect(r.ok).toBe(false);
      expect(
        r.failures.some((f) => f.rule === "authorization_or_policy_uses_editable_user_metadata"),
      ).toBe(true);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rejects unsafe SECURITY DEFINER / later objects folded into baseline", () => {
    const bad =
      GOOD_SQL +
      `\nCREATE FUNCTION public.handle_new_auth_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN RETURN NEW; END; $$;\n` +
      `CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();\n`;
    const { dir, sqlPath, contractPath } = withTempSql(bad);
    try {
      const r = evaluateDerivedBaseline({ sqlPath, contractPath });
      expect(r.ok).toBe(false);
      expect(r.failures.some((f) => f.rule === "later_function_folded_into_baseline")).toBe(true);
      expect(r.failures.some((f) => f.rule === "later_trigger_folded_into_baseline")).toBe(true);
      expect(r.failures.some((f) => f.rule === "unexpected_security_definer_in_baseline")).toBe(
        true,
      );
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rejects user-row INSERT/COPY/UPDATE", () => {
    const bad = GOOD_SQL + `\nINSERT INTO public.users (id, email) VALUES (gen_random_uuid(), 'x');\n`;
    const { dir, sqlPath, contractPath } = withTempSql(bad);
    try {
      const r = evaluateDerivedBaseline({ sqlPath, contractPath });
      expect(r.ok).toBe(false);
      expect(r.failures.some((f) => f.rule === "user_row_dml_present")).toBe(true);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rejects unresolved derivation / incomplete contract", () => {
    const { dir, sqlPath, contractPath } = withTempSql(GOOD_SQL, (c) => {
      c.derivationComplete = false;
      c.unresolvedElements = ["column.mystery"];
    });
    try {
      const r = evaluateDerivedBaseline({ sqlPath, contractPath });
      expect(r.ok).toBe(false);
      expect(r.failures.some((f) => f.rule === "derivation_incomplete")).toBe(true);
      expect(r.failures.some((f) => f.rule === "unresolved_derivation_elements")).toBe(true);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("assembled set places derived baseline before order-107 consumer", () => {
    execFileSync(process.execPath, [ASSEMBLE], { cwd: ROOT, stdio: "pipe" });
    const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
    const derived = manifest.entries.find(
      (e: { assembledFilename: string }) => e.assembledFilename === DERIVED_FILENAME,
    );
    const consumer = manifest.entries.find(
      (e: { assembledFilename: string }) =>
        e.assembledFilename === "20260727000100_users_auth_trigger_single_writer.sql",
    );
    expect(derived).toBeDefined();
    expect(consumer).toBeDefined();
    expect(derived.order).toBeLessThan(consumer.order);
    expect(manifest.counts.totalAssembled).toBe(150);
    expect(manifest.counts.derivedPublicUsersBaseline).toBe(1);
  });

  it("changed manifest bytes require new runtime authorization", () => {
    const head = resolveGitHead(ROOT)!;
    const auth = evaluateManifestAuthorization({
      expectedSha256: "0".repeat(64),
      authorizedCommit: head,
      currentHead: head,
      requireCommitBinding: true,
    });
    expect(auth.ok).toBe(false);
    expect(auth.failures.some((f: { rule: string }) => f.rule === "manifest_sha256_mismatch")).toBe(
      true,
    );
  });
});
