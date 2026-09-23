import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const collectionAuth = require("../../scripts/security/ra-pro-accounting-automation-corrective-collection-authorization");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const preconditionGates = require("../../scripts/security/ra-pro-accounting-automation-corrective-precondition-gates");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const collector = require("../../scripts/security/ra-pro-accounting-automation-corrective-evidence-collector");

const ROOT = process.cwd();
const AUTH_REL = collectionAuth.AUTH_REL;
const STALE = collectionAuth.REJECTED_STALE_COLLECTION_TIP_DBDCE968;

/** Immutable unpublished executable tip (parent of the reviewed AUTH-only publication). */
const UNPUBLISHED_EXECUTABLE = "2617f2e4075a9b7b59bc2b3c9c4c3239fc3efc94";
/** Reviewed AUTH-only collection-authorization publication (not replaced by later test-only heads). */
const AUTHORIZATION_PUBLICATION = "15732f7034596e64f724901d15225efa257f08c5";
const AUTHORIZATION_BLOB_OID = "cd94d9bd32f23125e149e40ee90c185aa02d3321";

const PRECONDITION_FIXTURE =
  "tests/security/helpers/fixtures/ra-pro-accounting-automation-corrective-precondition-synthetic.json";
const REJECTED_ARTIFACT =
  ".tmp/corrective-evidence-collection-fresh-46eb75ef/RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_PRECONDITION_EVIDENCE_V1.json";

function codeOf(err: unknown) {
  return String((err as { code?: string; message?: string }).code || (err as Error).message || "");
}

function expectCode(fn: () => unknown, code: string) {
  try {
    fn();
  } catch (err) {
    expect(codeOf(err)).toMatch(new RegExp(code));
    return;
  }
  throw new Error(`expected throw matching ${code}`);
}

function gitEnv(cwd: string) {
  const env = { ...process.env } as Record<string, string>;
  const n = Number(env.GIT_CONFIG_COUNT || 0);
  env.GIT_CONFIG_COUNT = String(n + 1);
  env[`GIT_CONFIG_KEY_${n}`] = "safe.directory";
  env[`GIT_CONFIG_VALUE_${n}`] = path.resolve(cwd).replace(/\\/g, "/");
  env.GIT_AUTHOR_NAME = "ra-acct-corrective-collection-test";
  env.GIT_AUTHOR_EMAIL = "ra-acct-corrective-collection-test@invalid";
  env.GIT_COMMITTER_NAME = env.GIT_AUTHOR_NAME;
  env.GIT_COMMITTER_EMAIL = env.GIT_AUTHOR_EMAIL;
  return env;
}

function git(args: string[], cwd = ROOT) {
  return execFileSync("git", args, { cwd, env: gitEnv(cwd), encoding: "utf8" }).trim();
}

function assertUnpublishedExecutableBlob() {
  const raw = git(["cat-file", "blob", `${UNPUBLISHED_EXECUTABLE}:${AUTH_REL}`]);
  const auth = JSON.parse(raw);
  expect(auth?.production_collection_authorization?.status).toBe("UNPUBLISHED");
  expect(auth?.production_collection_authorization?.collection_authorized).toBe(false);
}

describe("corrective collection authorization (non-circular)", () => {
  it("unpublished executable tip blocks before production contact", () => {
    assertUnpublishedExecutableBlob();
    const map = collectionAuth.describeCollectionArtifactMap({
      cwd: ROOT,
      publicationCommit: UNPUBLISHED_EXECUTABLE,
    });
    expect(map.collection_authorized).toBe(false);
    expect(map.blocked).toBe(collectionAuth.BLOCKED_UNPUBLISHED);
    expectCode(
      () =>
        collectionAuth.assertCollectionAuthorityBeforeObservation({
          cwd: ROOT,
          publicationCommit: UNPUBLISHED_EXECUTABLE,
        }),
      collectionAuth.BLOCKED_UNPUBLISHED,
    );
  });

  it("rejects stale dbdce968 as authorized_executable_commit", () => {
    expectCode(
      () =>
        collectionAuth.assertNotCircularPin(
          "b".repeat(40),
          STALE,
          JSON.stringify({ authorized_executable_commit: STALE }),
        ),
      "COLLECTION_AUTHORIZATION_REJECTED_STALE_TIP",
    );
  });

  it("rejects circular publication self-seal in AUTH blob text", () => {
    const publication = "c".repeat(40);
    expectCode(
      () =>
        collectionAuth.assertNotCircularPin(
          publication,
          "d".repeat(40),
          JSON.stringify({ note: `mentions ${publication}` }),
        ),
      "COLLECTION_AUTHORIZATION_CIRCULAR_TIP",
    );
  });

  it("accepts a synthetic one-object descendant publication offline and rejects worktree substitute", () => {
    assertUnpublishedExecutableBlob();
    const created = collectionAuth.createDisposableCollectionPublicationCommit({
      allowDisposablePublicationCommit: true,
      cwd: ROOT,
      executableCommit: UNPUBLISHED_EXECUTABLE,
    });
    expect(created.headUnchanged).toBe(true);
    expect(created.executableCommit).toBe(UNPUBLISHED_EXECUTABLE);
    expect(created.publicationCommit).not.toBe(UNPUBLISHED_EXECUTABLE);
    expect(created.publicationCommit).not.toBe(AUTHORIZATION_PUBLICATION);

    const map = collectionAuth.describeCollectionArtifactMap({
      cwd: ROOT,
      publicationCommit: created.publicationCommit,
    });
    expect(map.blocked).toBeNull();
    expect(map.collection_authorized).toBe(true);
    expect(map.authorized_executable_commit).toBe(UNPUBLISHED_EXECUTABLE);
    expect(map.authorization_publication_blob_oid).toBe(created.authorization_publication_blob_oid);

    const tipAuth = JSON.parse(git(["cat-file", "blob", `${UNPUBLISHED_EXECUTABLE}:${AUTH_REL}`]));
    const poisoned = structuredClone(tipAuth);
    poisoned.production_collection_authorization = {
      ...tipAuth.production_collection_authorization,
      status: "AUTHORIZED",
      collection_authorized: true,
      authorized_executable_commit: "e".repeat(40),
    };
    expectCode(
      () =>
        collectionAuth.describeCollectionArtifactMap({
          cwd: ROOT,
          publicationCommit: created.publicationCommit,
          auth: poisoned,
        }),
      "COLLECTION_AUTHORIZATION_WORKTREE_SUBSTITUTE",
    );

    // Publication equal to executable remains unpublished/blocked (no AUTH-only descendant).
    expect(
      collectionAuth.describeCollectionArtifactMap({
        cwd: ROOT,
        publicationCommit: UNPUBLISHED_EXECUTABLE,
      }).blocked,
    ).toBe(collectionAuth.BLOCKED_UNPUBLISHED);

    // Exact reviewed AUTH-only publication is accepted offline (credential-free map).
    const reviewed = collectionAuth.describeCollectionArtifactMap({
      cwd: ROOT,
      publicationCommit: AUTHORIZATION_PUBLICATION,
    });
    expect(reviewed.blocked).toBeNull();
    expect(reviewed.collection_authorized).toBe(true);
    expect(reviewed.authorized_executable_commit).toBe(UNPUBLISHED_EXECUTABLE);
    expect(reviewed.authorization_publication_blob_oid).toBe(AUTHORIZATION_BLOB_OID);
    expect(reviewed.publication_commit).toBe(AUTHORIZATION_PUBLICATION);

    // Later test-only PR HEAD is not executable authority and not the reviewed publication.
    const head = git(["rev-parse", "HEAD"]).toLowerCase();
    expect(head).not.toBe(UNPUBLISHED_EXECUTABLE);
    if (head !== AUTHORIZATION_PUBLICATION) {
      expectCode(
        () =>
          collectionAuth.describeCollectionArtifactMap({
            cwd: ROOT,
            publicationCommit: head,
          }),
        "COLLECTION_AUTHORIZATION_ALLOWLIST|COLLECTION_AUTHORIZATION_ANCESTRY|COLLECTION_REMAINS_BLOCKED",
      );
    }
  });

  it("wrong ancestry / circular self-pin fails closed", () => {
    assertUnpublishedExecutableBlob();
    const created = collectionAuth.createDisposableCollectionPublicationCommit({
      allowDisposablePublicationCommit: true,
      cwd: ROOT,
      executableCommit: UNPUBLISHED_EXECUTABLE,
    });
    expect(created.publicationCommit).not.toBe(STALE);
    expectCode(
      () =>
        collectionAuth.assertNotCircularPin(created.publicationCommit, created.publicationCommit, "{}"),
      "COLLECTION_AUTHORIZATION_CIRCULAR_TIP",
    );
  });

  it("self-attested collection_tooling_tip cannot affect authority validation", () => {
    const evidence = JSON.parse(fs.readFileSync(path.join(ROOT, PRECONDITION_FIXTURE), "utf8"));
    const authz = evidence.authorization as Record<string, string>;
    const expected = {
      authorized_executable_commit: authz.authorized_executable_commit,
      authorization_publication_commit: authz.authorization_publication_commit,
      authorization_publication_blob_oid: authz.authorization_publication_blob_oid,
    };
    evidence.attestations = {
      ...(evidence.attestations || {}),
      collection_tooling_tip: STALE,
    };
    expect(() =>
      preconditionGates.validateCorrectivePreconditionEvidence(evidence, {
        now: "2026-09-21T12:00:00Z",
        expected,
      }),
    ).not.toThrow();
  });

  it("historical rejected artifacts cannot validate under new bindings", () => {
    if (!fs.existsSync(path.join(ROOT, REJECTED_ARTIFACT))) return;
    const rejected = JSON.parse(fs.readFileSync(path.join(ROOT, REJECTED_ARTIFACT), "utf8"));
    expectCode(
      () =>
        preconditionGates.validateCorrectivePreconditionEvidence(rejected, {
          now: "2026-09-23T02:00:00Z",
          expected: {
            authorized_executable_commit: "a".repeat(40),
            authorization_publication_commit: "b".repeat(40),
            authorization_publication_blob_oid: "c".repeat(40),
          },
        }),
      "CORRECTIVE_PRECONDITION_",
    );
  });

  it("collector production channel is blocked while unpublished", () => {
    expectCode(
      () =>
        collector.buildCorrectivePreconditionEvidence(
          {
            source_channel_classification: "fresh_read_only_supabase_select",
            independently_observed: {
              database_readonly: { privilege_surfaces: {}, objects: {} },
              automation_gate: {
                key: "ENABLE_RA_PRO_ACCOUNTING_AUTOMATION",
                production_presence: "absent",
                production_key_name_authority: "vercel_production_exact_key_names",
                effective_state: "closed",
                value_read: false,
              },
            },
          },
          {
            source_channel_classification: "fresh_read_only_supabase_select",
            cwd: ROOT,
            publicationCommit: UNPUBLISHED_EXECUTABLE,
          },
        ),
      collectionAuth.BLOCKED_UNPUBLISHED,
    );
  });

  it("recheck fails when publication ref swaps after preflight pins", () => {
    assertUnpublishedExecutableBlob();
    const created = collectionAuth.createDisposableCollectionPublicationCommit({
      allowDisposablePublicationCommit: true,
      cwd: ROOT,
      executableCommit: UNPUBLISHED_EXECUTABLE,
    });
    const map = collectionAuth.describeCollectionArtifactMap({
      cwd: ROOT,
      publicationCommit: created.publicationCommit,
    });
    const other = collectionAuth.createDisposableCollectionPublicationCommit({
      allowDisposablePublicationCommit: true,
      cwd: ROOT,
      executableCommit: UNPUBLISHED_EXECUTABLE,
    });
    expectCode(
      () =>
        collectionAuth.recheckCollectionAuthorizationPin({
          cwd: ROOT,
          expectExecutable: map.authorized_executable_commit,
          expectCommit: other.publicationCommit,
          expectBlobOid: map.authorization_publication_blob_oid,
          expectBundleOid: map.bundle_oid,
        }),
      "COLLECTION_AUTHORIZATION_PIN_MISMATCH|COLLECTION_AUTHORIZATION_BUNDLE_MISMATCH|COLLECTION_AUTHORIZATION_ANCESTRY",
    );
  });
});
