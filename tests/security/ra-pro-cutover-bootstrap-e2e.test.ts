/**
 * Thin RA Pro cutover bootstrap materialize smoke — no production contact.
 * Full seal-verified bootstrap e2e waits for freeze pin publication.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const BOOTSTRAP = "scripts/security/bootstrap-ra-pro-cutover-apply.ps1";
const ENTER = "scripts/security/enter-ra-pro-cutover-apply.ps1";
const AUTH = "docs/security/ra-pro-cutover-apply/TOOLING_AUTHORIZATION.json";
const isWin = process.platform === "win32";

describe("RA Pro cutover bootstrap materialize (thin)", () => {
  it("bootstrap + enter scripts exist and reference RA Pro channels", () => {
    const boot = fs.readFileSync(path.join(ROOT, BOOTSTRAP), "utf8");
    const enter = fs.readFileSync(path.join(ROOT, ENTER), "utf8");
    expect(boot).toMatch(/RA_PRO_CUTOVER_APPLY_DATABASE_URL/);
    expect(boot).toMatch(/ra-pro-cutover-applicator\.standalone\.cjs/);
    expect(enter).toMatch(/native_bootstrap|bootstrap-ra-pro-cutover-apply/);
    expect(enter).toMatch(/RA_PRO_CUTOVER/);
  });

  it("TOOLING_AUTHORIZATION keeps prior dry-run pins unpublished", () => {
    const auth = JSON.parse(fs.readFileSync(path.join(ROOT, AUTH), "utf8"));
    expect(auth.published_prior_dry_run.status).toBe("UNPUBLISHED");
    expect(auth.required_prior_dry_run_evidence_sha256).toBeNull();
    expect(auth.required_prior_dry_run_freeze).toBeNull();
    expect(auth.migration_blob_oid).toBe("d36f5e2c50f7bab956c3191723c0e8a223279df5");
  });

  it.skipIf(!isWin)("can materialize bootstrap script bytes to a temp path", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ra-pro-boot-"));
    const dest = path.join(dir, "bootstrap.ps1");
    const src = fs.readFileSync(path.join(ROOT, BOOTSTRAP));
    fs.writeFileSync(dest, src);
    expect(fs.statSync(dest).size).toBe(src.length);
    const escaped = dest.replace(/'/g, "''");
    const r = spawnSync(
      path.join(process.env.SystemRoot || "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe"),
      ["-NoProfile", "-NonInteractive", "-Command", `Test-Path -LiteralPath '${escaped}'`],
      { encoding: "utf8", windowsHide: true, timeout: 15000 },
    );
    expect(r.status).toBe(0);
    expect(String(r.stdout).trim().toLowerCase()).toMatch(/true/);
  });
});
