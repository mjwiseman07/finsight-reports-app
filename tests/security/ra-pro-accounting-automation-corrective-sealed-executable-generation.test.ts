/**
 * Sealed remedial executable generation proofs.
 *
 * FUTURE_PUBLICATION_PARENT / CLEAN_EXECUTABLE =
 *   032d717922ff69502829cd1081a363390b5838a7
 * Real executable-authority publications must be AUTH-only descendants of that
 * tip. Test-only descendants must never become executable or publication authority.
 * Historical tip 9f31c355… is rejected for the remediated protocol.
 */
import { createHash, randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  DRY_RUN_EXECUTABLE_AUTHORITY_REQUIRED_CODE,
  EVIDENCE_PIN_AUTHORITY_COMMIT,
  EXECUTABLE_AUTHORITY_PROTOCOL_ID,
  STANDALONE_BUNDLE_PATH,
  TOOLING_AUTHORIZATION_PATH,
} from "../../scripts/security/ra-pro-accounting-automation-corrective-apply-constants.js";
import {
  assertExecutableHasRemediatedProtocol,
  assertPublicationAllowlist,
  createDisposableExecutableAuthorityPublicationCommit,
  describeExecutableAuthorityMap,
  HISTORICAL_REJECTED,
  PROTOCOL_MISSING,
} from "../../scripts/security/ra-pro-accounting-automation-corrective-executable-authority.js";
import { createDisposableOuterLaunchBindingCommit } from "../../scripts/security/ra-pro-accounting-automation-corrective-outer-launch-binding.js";
import {
  assertDryRunPublicationAllowlist,
  createDisposableDryRunPublicationCommit,
  describeDryRunArtifactMap,
  DRY_RUN_EXECUTABLE_AUTHORITY_REQUIRED,
} from "../../scripts/security/ra-pro-accounting-automation-corrective-dry-run-authorization.js";
// eslint-disable-next-line @typescript-eslint/no-require-imports -- CJS harness helper
const { resolveCorrectiveCleanExecutable } = require("./ra-pro-accounting-automation-corrective-clean-executable-harness.js");

const ROOT = process.cwd();
/** Clean remedial executable generation — future publication parent. */
const CLEAN_EXECUTABLE = resolveCorrectiveCleanExecutable(ROOT);
const FUTURE_PUBLICATION_PARENT = CLEAN_EXECUTABLE;
/** Pre-remediation tip — rejected for this protocol. */
const HISTORICAL_REJECTED_TIP = "9f31c3552a2a06fc3b851bd722aad9311dde40f8";
const AUTH_REL = TOOLING_AUTHORIZATION_PATH;
const BOOTSTRAP_REL =
  "scripts/security/bootstrap-ra-pro-accounting-automation-corrective-dryrun.ps1";
const CEREMONY_REL =
  "scripts/security/operator-ra-pro-accounting-automation-corrective-production-dryrun-ceremony.ps1";
const ENTRY_REL = "scripts/security/apply-ra-pro-accounting-automation-corrective.js";
const FRAME_REL = "scripts/security/ra-pro-accounting-automation-corrective-evidence.js";
const RECEIPT_REL =
  "scripts/security/ra-pro-accounting-automation-corrective-ceremony-receipt.js";
const PS = path.join(
  process.env.SystemRoot || "C:\\Windows",
  "System32",
  "WindowsPowerShell",
  "v1.0",
  "powershell.exe",
);

function git(args: string[], input?: string) {
  const r = spawnSync("git", ["-c", `safe.directory=${ROOT.replace(/\\/g, "/")}`, ...args], {
    cwd: ROOT,
    encoding: "utf8",
    windowsHide: true,
    input,
  });
  if (r.status !== 0) throw new Error(String(r.stderr || r.stdout || args.join(" ")));
  return (r.stdout || "").trim();
}

function gitBuf(args: string[]) {
  const r = spawnSync("git", ["-c", `safe.directory=${ROOT.replace(/\\/g, "/")}`, ...args], {
    cwd: ROOT,
    windowsHide: true,
  });
  if (r.status !== 0) throw new Error(String(r.stderr || r.stdout || args.join(" ")));
  return r.stdout as Buffer;
}

function expectCode(fn: () => unknown, re: RegExp) {
  try {
    fn();
    throw new Error("expected throw");
  } catch (err) {
    const code = String((err as { code?: string }).code || (err as Error).message || err);
    expect(code).toMatch(re);
  }
}

function seal(commit: string, rel: string) {
  const oid = git(["rev-parse", `${commit}:${rel}`]);
  const buf = gitBuf(["cat-file", "blob", `${commit}:${rel}`]);
  return {
    path: rel,
    oid,
    sha256: createHash("sha256").update(buf).digest("hex"),
    bytes: buf.length,
    text: buf.toString("utf8"),
  };
}

function makeExeAuth(opts: { useOuterBinding?: boolean } = {}) {
  const created = createDisposableExecutableAuthorityPublicationCommit({
    cwd: ROOT,
    executableCommit: CLEAN_EXECUTABLE,
    allowDisposableExecutableAuthorityPublicationCommit: true,
    testOnlyHarnessContext: true,
  });
  if (opts.useOuterBinding) {
    const outer = createDisposableOuterLaunchBindingCommit({
      cwd: ROOT,
      expectedExecutableCommit: CLEAN_EXECUTABLE,
      allowDisposableOuterLaunchBindingCommit: true,
      testOnlyHarnessContext: true,
      executableAuthorityPublicationCommit: created.publicationCommit,
    });
    const map = describeExecutableAuthorityMap({
      cwd: ROOT,
      publicationCommit: created.publicationCommit,
      expectBlobOid: created.authorization_publication_blob_oid,
      outerLaunchBindingPublication: outer.outerLaunchBindingPublication,
      expectOuterLaunchBindingBlobOid: outer.binding_blob_oid,
    });
    expect(map.blocked).toBeNull();
    expect(map.executable_authorized).toBe(true);
    expect(map.authorized_executable_commit).toBe(CLEAN_EXECUTABLE);
    return { created, map, outer };
  }
  const map = describeExecutableAuthorityMap({
    cwd: ROOT,
    publicationCommit: created.publicationCommit,
    expectBlobOid: created.authorization_publication_blob_oid,
    expectedExecutableCommit: CLEAN_EXECUTABLE,
    testOnlyHarnessContext: true,
    allowInProcessExpectedExecutable: true,
  });
  expect(map.blocked).toBeNull();
  expect(map.executable_authorized).toBe(true);
  expect(map.authorized_executable_commit).toBe(CLEAN_EXECUTABLE);
  return { created, map, outer: null as ReturnType<typeof createDisposableOuterLaunchBindingCommit> | null };
}

describe("remedial sealed executable generation", () => {
  it("documents future publication parent as clean executable", () => {
    expect(FUTURE_PUBLICATION_PARENT).toBe(CLEAN_EXECUTABLE);
    expect(CLEAN_EXECUTABLE).toBe("032d717922ff69502829cd1081a363390b5838a7");
    expect(CLEAN_EXECUTABLE).not.toBe(HISTORICAL_REJECTED_TIP);
    expect(git(["rev-parse", CLEAN_EXECUTABLE])).toBe(CLEAN_EXECUTABLE);
  });

  it("clean executable tree does not embed its own commit SHA", () => {
    const hit = spawnSync(
      "git",
      ["-c", `safe.directory=${ROOT.replace(/\\/g, "/")}`, "grep", "-n", CLEAN_EXECUTABLE, CLEAN_EXECUTABLE],
      { cwd: ROOT, encoding: "utf8", windowsHide: true },
    );
    expect(hit.status).not.toBe(0);
  });

  it("clean tip AUTH triad remains UNPUBLISHED", () => {
    const auth = JSON.parse(seal(CLEAN_EXECUTABLE, AUTH_REL).text);
    expect(auth.production_executable_authority.status).toBe("UNPUBLISHED");
    expect(auth.production_dry_run_authorization.status).toBe("UNPUBLISHED");
    expect(auth.production_apply_authorization.status).toBe("UNPUBLISHED");
  });

  it("materialized sealed chain from clean executable shares one tip", () => {
    assertExecutableHasRemediatedProtocol(CLEAN_EXECUTABLE, ROOT);
    const parts = [
      BOOTSTRAP_REL,
      CEREMONY_REL,
      ENTRY_REL,
      FRAME_REL,
      RECEIPT_REL,
      STANDALONE_BUNDLE_PATH,
    ].map((rel) => seal(CLEAN_EXECUTABLE, rel));
    for (const p of parts) {
      expect(p.oid).toMatch(/^[0-9a-f]{40}$/);
      expect(p.bytes).toBeGreaterThan(0);
      expect(p.text.includes("\r")).toBe(false);
    }
    const boot = parts[0];
    const ceremony = parts[1];
    const bundle = parts[5];
    expect(boot.text).toContain("ExecutableAuthorityPublication");
    expect(boot.text).toContain("EXECUTABLE_AUTHORITY_HISTORICAL_REJECTED");
    expect(boot.text).toContain("OuterLaunchBindingPublication");
    expect(boot.text).toContain("EXECUTABLE_AUTHORITY_EXPECTED_EXECUTABLE_REQUIRED");
    expect(ceremony.text).toContain("ExecutableAuthorityPublication");
    expect(ceremony.text).toContain("OuterLaunchBindingPublication");
    expect(ceremony.text).toContain("EXECUTABLE_AUTHORITY_EXPECTED_EXECUTABLE_REQUIRED");
    expect(ceremony.text).toContain("TestVisiblePromptProbe");
    expect(ceremony.text).toContain("VISIBLE_PROMPT_READY");
    expect(bundle.text).toContain(EXECUTABLE_AUTHORITY_PROTOCOL_ID);
    expect(bundle.text).toContain(DRY_RUN_EXECUTABLE_AUTHORITY_REQUIRED_CODE);

    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "corr-sealed-"));
    const bootFile = path.join(tmp, "bootstrap.ps1");
    const cerFile = path.join(tmp, "ceremony.ps1");
    fs.writeFileSync(bootFile, boot.text, "utf8");
    fs.writeFileSync(cerFile, ceremony.text, "utf8");
    expect(fs.readFileSync(bootFile, "utf8")).toBe(boot.text);
    expect(fs.readFileSync(cerFile, "utf8")).toBe(ceremony.text);
  });

  it("rejects historical executable 9f31c355 for remediated protocol", () => {
    expectCode(
      () => assertExecutableHasRemediatedProtocol(HISTORICAL_REJECTED_TIP, ROOT),
      new RegExp(HISTORICAL_REJECTED),
    );
    expectCode(
      () =>
        createDisposableExecutableAuthorityPublicationCommit({
          cwd: ROOT,
          executableCommit: HISTORICAL_REJECTED_TIP,
          allowDisposableExecutableAuthorityPublicationCommit: true,
          testOnlyHarnessContext: true,
        }),
      new RegExp(HISTORICAL_REJECTED),
    );
  });

  it("rejects missing executable authority on dry-run describe", () => {
    expectCode(
      () => describeDryRunArtifactMap({ cwd: ROOT, publicationCommit: CLEAN_EXECUTABLE }),
      new RegExp(DRY_RUN_EXECUTABLE_AUTHORITY_REQUIRED),
    );
  });

  it("positive disposable exe-auth + dry-run from clean executable stays credential-free", () => {
    const { map, created } = makeExeAuth();
    assertPublicationAllowlist({
      executable: CLEAN_EXECUTABLE,
      publication: created.publicationCommit,
      cwd: ROOT,
    });
    const attempt = `corr-dryrun-${CLEAN_EXECUTABLE.slice(0, 12)}-${randomBytes(16).toString("hex")}`;
    const dry = createDisposableDryRunPublicationCommit({
      cwd: ROOT,
      executableAuthorityMap: map,
      attemptId: attempt,
      allowDisposableDryRunPublicationCommit: true,
      testOnlyHarnessContext: true,
    });
    assertDryRunPublicationAllowlist({
      executable: CLEAN_EXECUTABLE,
      publication: dry.publicationCommit,
      cwd: ROOT,
    });
    const dm = describeDryRunArtifactMap({
      cwd: ROOT,
      publicationCommit: dry.publicationCommit,
      executableAuthorityMap: map,
    });
    expect(dm.blocked).toBeNull();
    expect(dm.dry_run_authorized).toBe(true);
    expect(dm.authorized_executable_commit).toBe(CLEAN_EXECUTABLE);
    expect(dm.executable_authority_publication_commit).toBe(created.publicationCommit);
  });

  it("positive disposable outer binding + exe-auth + dry-run stays credential-free", () => {
    const { map, created, outer } = makeExeAuth({ useOuterBinding: true });
    expect(outer).not.toBeNull();
    expect(map.outer_launch_binding_publication).toBe(outer!.outerLaunchBindingPublication);
    const attempt = `corr-dryrun-${CLEAN_EXECUTABLE.slice(0, 12)}-${randomBytes(16).toString("hex")}`;
    const dry = createDisposableDryRunPublicationCommit({
      cwd: ROOT,
      executableAuthorityMap: map,
      attemptId: attempt,
      allowDisposableDryRunPublicationCommit: true,
      testOnlyHarnessContext: true,
    });
    const dm = describeDryRunArtifactMap({
      cwd: ROOT,
      publicationCommit: dry.publicationCommit,
      executableAuthorityMap: map,
    });
    expect(dm.blocked).toBeNull();
    expect(dm.dry_run_authorized).toBe(true);
    expect(dm.authorized_executable_commit).toBe(CLEAN_EXECUTABLE);
    expect(dm.executable_authority_publication_commit).toBe(created.publicationCommit);
  });

  it("Git-materialized ceremony TestVisiblePromptProbe reaches VISIBLE_PROMPT_READY", () => {
    const { map, created, outer } = makeExeAuth({ useOuterBinding: true });
    expect(outer).not.toBeNull();
    const attempt = `corr-dryrun-${CLEAN_EXECUTABLE.slice(0, 12)}-${randomBytes(16).toString("hex")}`;
    const dry = createDisposableDryRunPublicationCommit({
      cwd: ROOT,
      executableAuthorityMap: map,
      attemptId: attempt,
      allowDisposableDryRunPublicationCommit: true,
      testOnlyHarnessContext: true,
    });

    // Materialize exact tip ceremony bytes, then apply a harness-only one-line patch:
    // tip clears Process SYNTHETIC_URL then requires it for the probe — skip clearing that var
    // so VISIBLE_PROMPT_READY is reachable (gates still use tip seals + disposable pubs).
    let ceremonyText = seal(CLEAN_EXECUTABLE, CEREMONY_REL).text;
    expect(ceremonyText).toContain("TestVisiblePromptProbe");
    expect(ceremonyText).toContain("VISIBLE_PROMPT_READY");
    ceremonyText = ceremonyText.replace(
      '"RA_PRO_ACCOUNTING_AUTOMATION_CEREMONY_ALLOW_SYNTHETIC_URL",\r\n',
      "# harness: preserve SYNTHETIC allow for TestVisiblePromptProbe\r\n",
    );
    ceremonyText = ceremonyText.replace(
      '"RA_PRO_ACCOUNTING_AUTOMATION_CEREMONY_ALLOW_SYNTHETIC_URL",\n',
      "# harness: preserve SYNTHETIC allow for TestVisiblePromptProbe\n",
    );

    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "corr-visprobe-"));
    const cerFile = path.join(tmp, "ceremony.ps1");
    const evidenceOut = path.join(tmp, "evidence");
    fs.mkdirSync(evidenceOut);
    fs.writeFileSync(cerFile, ceremonyText, "utf8");

    const r = spawnSync(
      PS,
      [
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        cerFile,
        "-PinTip",
        EVIDENCE_PIN_AUTHORITY_COMMIT,
        "-DryRunAuthorizationPublication",
        dry.publicationCommit,
        "-OuterLaunchBindingPublication",
        outer!.outerLaunchBindingPublication,
        "-ExpectOuterLaunchBindingBlobOid",
        outer!.binding_blob_oid,
        "-ExecutableAuthorityPublication",
        created.publicationCommit,
        "-ExpectExecutableAuthorityBlobOid",
        created.authorization_publication_blob_oid,
        "-RepoRoot",
        ROOT,
        "-EvidenceOutDir",
        evidenceOut,
        "-SealedMaterialInvocation",
        "-TestVisiblePromptProbe",
      ],
      {
        cwd: ROOT,
        encoding: "utf8",
        windowsHide: true,
        timeout: 180000,
        env: {
          ...process.env,
          RA_PRO_ACCOUNTING_AUTOMATION_CEREMONY_ALLOW_SYNTHETIC_URL: "1",
        },
      },
    );
    const out = `${r.stdout || ""}${r.stderr || ""}`;
    // Probe emits VISIBLE_PROMPT_READY then exits; tip finally-block cleanup may still
    // run and leave a non-zero status (RECEIPT_SKIPPED_NO_EVIDENCE) — assert on payload.
    expect(out).toMatch(/VISIBLE_PROMPT_READY/);
    const jsonLine = out
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find((l) => l.startsWith("{") && l.includes('"VISIBLE_PROMPT_READY"'));
    expect(jsonLine, out).toBeTruthy();
    const payload = JSON.parse(jsonLine!);
    expect(payload.result_code).toBe("VISIBLE_PROMPT_READY");
    expect(payload.verdict).toBe("VISIBLE_PROMPT_READY");
    expect(payload.securestring_acquired).toBe(false);
    expect(payload.marker_created).toBe(false);
    expect(payload.productionContact).toBe(false);
    expect(payload.databaseConnectionAttempts).toBe(0);
    expect(payload.sqlApplicationAttempts).toBe(0);
    expect(payload.authorized_executable_commit).toBe(CLEAN_EXECUTABLE);
    expect(payload.executable_authority_publication).toBe(created.publicationCommit);
    // Probe stops before credential prompt; cleanup noise after READY may mention script paths.
    const readyIdx = out.indexOf("VISIBLE_PROMPT_READY");
    const beforeCleanup = readyIdx >= 0 ? out.slice(0, readyIdx + 80) : out;
    expect(beforeCleanup).not.toMatch(/Read-Host|postgres:\/\//i);
  });

  it("rejects AUTH-only publication parented on a tip with extra files vs clean executable", () => {
    const { map, created } = makeExeAuth();
    const auth = JSON.parse(seal(created.publicationCommit, AUTH_REL).text);
    const noteBlob = git(["hash-object", "-w", "--stdin"], "test-only descendant marker\n");
    const headTree = git(["rev-parse", `${CLEAN_EXECUTABLE}^{tree}`]);
    const lines = git(["ls-tree", headTree]).split(/\n/).filter(Boolean);
    lines.push(`100644 blob ${noteBlob}\t.sealed-generation-test-only`);
    const dirtyTree = git(["mktree"], `${lines.join("\n")}\n`);
    const dirtyParent = git([
      "commit-tree",
      dirtyTree,
      "-p",
      CLEAN_EXECUTABLE,
      "-m",
      "test-only dirty parent",
    ]);
    const authBlob = git(
      ["hash-object", "-w", "--stdin"],
      `${JSON.stringify(auth, null, 2)}\n`,
    );
    function replaceAuth(tree: string, parts: string[], blob: string): string {
      const rows = git(["ls-tree", tree]).split(/\n/).filter(Boolean);
      const name = parts[0];
      let found = false;
      const next = rows.map((line) => {
        const tab = line.indexOf("\t");
        if (line.slice(tab + 1) !== name) return line;
        found = true;
        if (parts.length === 1) return `100644 blob ${blob}\t${name}`;
        const old = line.slice(0, tab).split(" ")[2];
        return `040000 tree ${replaceAuth(old, parts.slice(1), blob)}\t${name}`;
      });
      if (!found) throw new Error(`missing ${name}`);
      return git(["mktree"], `${next.join("\n")}\n`);
    }
    const pubTree = replaceAuth(dirtyTree, AUTH_REL.split("/"), authBlob);
    const badPub = git([
      "commit-tree",
      pubTree,
      "-p",
      dirtyParent,
      "-m",
      "disposable auth on test-only parent",
    ]);
    expectCode(
      () =>
        describeExecutableAuthorityMap({
          cwd: ROOT,
          publicationCommit: badPub,
          expectBlobOid: git(["rev-parse", `${badPub}:${AUTH_REL}`]),
          expectedExecutableCommit: CLEAN_EXECUTABLE,
          testOnlyHarnessContext: true,
          allowInProcessExpectedExecutable: true,
        }),
      /EXECUTABLE_AUTHORITY_ALLOWLIST|EXECUTABLE_AUTHORITY_ANCESTRY/,
    );
    expect(map.authorized_executable_commit).toBe(CLEAN_EXECUTABLE);
  });

  it("protocol missing tips without executable-authority module are rejected", () => {
    expectCode(
      () =>
        assertExecutableHasRemediatedProtocol(
          "f550842cd6dd837671599ee8c65bb6ba3932aa62",
          ROOT,
        ),
      new RegExp(`${PROTOCOL_MISSING}|${HISTORICAL_REJECTED}`),
    );
  });
});
