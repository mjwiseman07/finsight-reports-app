import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { assertPriorDryRunEvidencePublished } = require(
  "../../scripts/security/ra-pro-accounting-automation-prior-dry-run-gates",
);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { assertAuthorizationPublished } = require(
  "../../scripts/security/ra-pro-accounting-automation-apply-core",
);

const ROOT = process.cwd();
const AUTH = "docs/security/ra-pro-accounting-automation-apply/TOOLING_AUTHORIZATION.json";

function auth() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, AUTH), "utf8")) as {
    publication: {
      status: string;
      required_pre_apply_live_evidence_sha256: string | null;
    };
    prior_dry_run_publication: { status: string; evidence_sha256: string };
  };
}

describe("RA Pro accounting-automation prior dry-run publication", () => {
  it("loads the reviewed git blob and still leaves apply unauthorized", () => {
    const published = auth();
    expect(published.publication.status).toBe("PUBLISHED");
    expect(published.publication.required_pre_apply_live_evidence_sha256).toBe(
      "bf42b0c83b1604d2bb627e97807cc7ed7fa32a172ec0508046c1012c9f0ec6cf",
    );
    expect(published.prior_dry_run_publication.status).toBe("PUBLISHED");
    expect(assertPriorDryRunEvidencePublished({ auth: published, cwd: ROOT })).toMatchObject({
      sha256: "f89c3e701703d199f56577a65ae6f28b5ba120be45ee482f2ab75c284d763d18",
      bytes: 5100,
      apply_authorized: false,
    });
    expect(() => assertAuthorizationPublished({})).toThrow(
      /APPLY_REMAINS_BLOCKED_BEFORE_CREDENTIALS|PRE_APPLY_LIVE_EXPIRED/,
    );
  });

  it("rejects path and environment overrides before blob loading", () => {
    const published = auth();
    expect(() =>
      assertPriorDryRunEvidencePublished({
        auth: published,
        cwd: ROOT,
        priorDryRunEvidencePath: "x",
      }),
    ).toThrow(/PATH_OVERRIDE_FORBIDDEN/);
    expect(() =>
      assertPriorDryRunEvidencePublished({
        auth: published,
        cwd: ROOT,
        env: { RA_PRO_ACCOUNTING_AUTOMATION_PRIOR_DRY_RUN_EVIDENCE_SHA256: "0" },
      }),
    ).toThrow(/ENV_OVERRIDE_FORBIDDEN/);
  });
});
