import { describe, expect, it } from "vitest";
import {
  JE_REUSE_ENV,
  PR312_SKIP_CONTRACT,
  validatePr312DisposableUrl,
  buildPr312ChildEnv,
  buildSuiteMirroredConnectionString,
  buildLoopbackSslmodeDisableHandoffUrl,
  probeChildEnvHandoff,
  authorizePr312VitestLaunch,
  captureSkipDiagnosisFromStructuredCounts,
  sanitizePgErrorMessage,
  nonReversibleFingerprint,
  redactUrl,
} from "../../scripts/migration-remediation/option-d-pr312-env-handoff.js";
import {
  evaluateVitestStructuredResult,
  EXPECTED_PR312_TEST_TITLES,
  PR312_COMMIT,
  PR312_SUITE_BLOB,
} from "../../scripts/migration-remediation/option-d-vitest-result-gate.js";

const LOCAL_OK = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

describe("Option D PR312 env handoff", () => {
  it("pins the updated PR #312 commit and suite blob", () => {
    expect(PR312_COMMIT).toBe("7f387fe0b662e07ad271ee9db7311eeb45eafc25");
    expect(PR312_SUITE_BLOB).toBe("d4afe0584d089d4ad50d479b81a369ca6dbdd168");
    expect(PR312_SKIP_CONTRACT.suiteCommit).toBe(PR312_COMMIT);
    expect(PR312_SKIP_CONTRACT.suiteBlob).toBe(PR312_SUITE_BLOB);
  });

  it("accepts verified loopback disposable URL and fingerprints without credentials", () => {
    const check = validatePr312DisposableUrl(LOCAL_OK);
    expect(check.ok).toBe(true);
    expect(check.redacted).toBe("host=127.0.0.1;port=54322;db=postgres");
    expect(check.fingerprint).toMatch(/^[a-f0-9]{16}$/);
    expect(check.fingerprint).toBe(nonReversibleFingerprint(LOCAL_OK));
    expect(JSON.stringify(check)).not.toMatch(/postgres:postgres/);
  });

  it("rejects remote/cloud/pooled/production/non-loopback URLs", () => {
    const cases = [
      "postgresql://postgres:postgres@db.xyz.supabase.co:5432/postgres",
      "postgresql://postgres:postgres@aws-0-us-east-1.pooler.supabase.com:6543/postgres",
      "postgresql://postgres:postgres@192.168.1.10:54322/postgres",
      "postgresql://postgres:postgres@jzmdgwwiestcmmeuhhkr.supabase.co:5432/postgres",
    ];
    for (const url of cases) {
      const check = validatePr312DisposableUrl(url);
      expect(check.ok).toBe(false);
      expect(JSON.stringify(check)).not.toMatch(/:[^:@/]+@/);
    }
  });

  it("rejects incorrect port or database name", () => {
    const badPort = validatePr312DisposableUrl(
      "postgresql://postgres:postgres@127.0.0.1:5432/postgres",
    );
    expect(badPort.ok).toBe(false);
    expect(badPort.failures.some((f) => f.rule === "unexpected_database_port")).toBe(
      true,
    );

    const badDb = validatePr312DisposableUrl(
      "postgresql://postgres:postgres@127.0.0.1:54322/app",
    );
    expect(badDb.ok).toBe(false);
    expect(badDb.failures.some((f) => f.rule === "unexpected_database_name")).toBe(
      true,
    );
  });

  it("sets verified JE_REUSE with sslmode=disable and overrides/rejects inherited value", () => {
    const inherited =
      "postgresql://postgres:cloudpass@127.0.0.1:54322/postgres";
    const built = buildPr312ChildEnv({
      verifiedUrl: LOCAL_OK,
      parentEnv: {
        PATH: "/usr/bin",
        [JE_REUSE_ENV]: inherited,
        SECRET_TOKEN: "must-not-forward",
        OPTION_D_DATABASE_URL: LOCAL_OK,
      },
    });
    expect(built.ok).toBe(true);
    expect(built.env[JE_REUSE_ENV]).toMatch(/sslmode=disable/);
    expect(built.env[JE_REUSE_ENV]).toContain("127.0.0.1:54322/postgres");
    expect(built.handoff.sslmodeDisableAppended).toBe(true);
    expect(built.env.SECRET_TOKEN).toBeUndefined();
    expect(built.env.OPTION_D_DATABASE_URL).toBeUndefined();
    expect(built.handoff.inheritedWasPresent).toBe(true);
    expect(built.handoff.inheritedValueRejected).toBe(true);
    expect(built.handoff.credentialsIncludedInEvidence).toBe(false);
    expect(built.handoff.redacted).not.toMatch(/postgres:postgres/);
    const envProbe = probeChildEnvHandoff(built.env);
    expect(envProbe.ok).toBe(true);
    expect(envProbe.sslmodeDisable).toBe(true);
  });

  it("blocks missing verified URL before Vitest (would cause describe.skip)", () => {
    const built = buildPr312ChildEnv({ verifiedUrl: "", parentEnv: { PATH: "x" } });
    expect(built.ok).toBe(false);
    expect(built.failures.some((f) => f.rule === "missing_verified_url_for_child_env")).toBe(
      true,
    );
  });

  it("historical TLS strip helper still deletes sslmode; handoff appends disable", () => {
    const mirrored = buildSuiteMirroredConnectionString(
      "postgresql://postgres:postgres@127.0.0.1:54322/postgres?sslmode=require",
    );
    expect(mirrored).not.toMatch(/sslmode/);
    expect(mirrored).toContain("127.0.0.1:54322/postgres");

    const handoff = buildLoopbackSslmodeDisableHandoffUrl(LOCAL_OK);
    expect(handoff.ok).toBe(true);
    expect(handoff.url).toMatch(/sslmode=disable/);
  });

  it("redacts credentials from pg error messages and redactUrl", () => {
    const msg = sanitizePgErrorMessage(
      'connect to postgresql://postgres:s3cret@127.0.0.1:54322/postgres failed password=s3cret',
    );
    expect(msg).not.toMatch(/s3cret/);
    expect(msg).toMatch(/\[redacted/);
    expect(redactUrl(LOCAL_OK)).toBe("host=127.0.0.1;port=54322;db=postgres");
  });

  it("blocks launch when same-run candidate replay or security did not PASS", async () => {
    const blocked = await authorizePr312VitestLaunch({
      databaseUrl: LOCAL_OK,
      candidateReplayPassed: false,
      securityImmutabilityPassed: true,
      isolatedContextOk: true,
      parentEnv: { PATH: process.env.PATH },
      connectivityTimeoutMs: 50,
      pgProbeTimeoutMs: 50,
    });
    expect(blocked.ok).toBe(false);
    expect(
      blocked.failures.some((f) => f.rule === "candidate_replay_not_passed_same_run"),
    ).toBe(true);

    const blockedSec = await authorizePr312VitestLaunch({
      databaseUrl: LOCAL_OK,
      candidateReplayPassed: true,
      securityImmutabilityPassed: false,
      isolatedContextOk: true,
      parentEnv: { PATH: process.env.PATH },
      connectivityTimeoutMs: 50,
      pgProbeTimeoutMs: 50,
    });
    expect(blockedSec.ok).toBe(false);
    expect(
      blockedSec.failures.some(
        (f) => f.rule === "security_immutability_not_passed_same_run",
      ),
    ).toBe(true);
  });

  it("blocks launch when URL is missing (describe.skip path)", async () => {
    const blocked = await authorizePr312VitestLaunch({
      databaseUrl: "",
      candidateReplayPassed: true,
      securityImmutabilityPassed: true,
      isolatedContextOk: true,
      parentEnv: { PATH: process.env.PATH },
    });
    expect(blocked.ok).toBe(false);
    expect(
      blocked.failures.some((f) => f.rule === "missing_url_would_cause_describe_skip"),
    ).toBe(true);
    expect(blocked.childEnv).toBeNull();
  });

  it("blocks launch when disposable TCP/pg is unreachable (04g class)", async () => {
    const blocked = await authorizePr312VitestLaunch({
      databaseUrl: "postgresql://postgres:postgres@127.0.0.1:59999/postgres",
      expectedPort: 59999,
      candidateReplayPassed: true,
      securityImmutabilityPassed: true,
      isolatedContextOk: true,
      parentEnv: { PATH: process.env.PATH },
      connectivityTimeoutMs: 200,
      pgProbeTimeoutMs: 200,
    });
    expect(blocked.ok).toBe(false);
    expect(
      blocked.failures.some(
        (f) =>
          f.rule === "connectivity_failed" ||
          f.rule === "connectivity_timeout" ||
          f.rule === "suite_mirrored_pg_connect_failed",
      ),
    ).toBe(true);
    expect(JSON.stringify(blocked)).not.toMatch(/postgres:postgres/);
  });

  it("classifies 04g beforeAll-skip vs describe.skip signatures safely", () => {
    const beforeAllSkip = captureSkipDiagnosisFromStructuredCounts({
      counts: { total: 12, skipped: 12, passed: 0, failed: 0 },
      numFailedTestSuites: 2,
      assertionTitles: EXPECTED_PR312_TEST_TITLES.map((title) => ({
        title,
        status: "skipped",
      })),
    });
    expect(beforeAllSkip.classification).toBe(
      "beforeAll_connect_failure_reported_as_skipped",
    );
    expect(beforeAllSkip.matches04g).toBe(true);
    expect(beforeAllSkip.evidenceSafe).toBe(true);

    const describeSkip = captureSkipDiagnosisFromStructuredCounts({
      counts: { total: 13, skipped: 12, passed: 1, failed: 0 },
      numFailedTestSuites: 0,
      assertionTitles: [
        ...EXPECTED_PR312_TEST_TITLES.map((title) => ({
          title,
          status: "skipped",
        })),
        {
          title: PR312_SKIP_CONTRACT.blockedSentinelWhenUrlFalsy,
          status: "passed",
        },
      ],
    });
    expect(describeSkip.classification).toBe("describe_skip_je_reuse_falsy");
    expect(describeSkip.matches04g).toBe(false);
  });

  it("keeps all-skipped and partial-skipped structured results as FAIL", () => {
    const allSkipped = evaluateVitestStructuredResult({
      success: false,
      numFailedTestSuites: 2,
      testResults: [
        {
          name: "suite",
          status: "failed",
          assertionResults: EXPECTED_PR312_TEST_TITLES.map((title) => ({
            title,
            fullName: title,
            status: "skipped",
          })),
        },
      ],
    });
    expect(allSkipped.ok).toBe(false);
    expect(allSkipped.failures.some((f) => f.rule === "skipped_present")).toBe(true);
    expect(allSkipped.failures.some((f) => f.rule === "all_skipped_cannot_pass")).toBe(
      true,
    );

    const partial = evaluateVitestStructuredResult({
      success: false,
      testResults: [
        {
          name: "suite",
          assertionResults: [
            {
              title: EXPECTED_PR312_TEST_TITLES[0],
              fullName: EXPECTED_PR312_TEST_TITLES[0],
              status: "passed",
            },
            {
              title: EXPECTED_PR312_TEST_TITLES[1],
              fullName: EXPECTED_PR312_TEST_TITLES[1],
              status: "skipped",
            },
            ...EXPECTED_PR312_TEST_TITLES.slice(2).map((title) => ({
              title,
              fullName: title,
              status: "passed",
            })),
          ],
        },
      ],
    });
    expect(partial.ok).toBe(false);
    expect(partial.failures.some((f) => f.rule === "skipped_present")).toBe(true);
  });
});
