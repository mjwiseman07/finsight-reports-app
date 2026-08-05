import { NextRequest, NextResponse } from "next/server";
import { recordIssue } from "@/lib/pilot-lifecycle/issue-recorder";
import {
  CANONICAL_PROBES,
  probeApexRedirect,
  probeCanonical,
} from "@/lib/pilot-lifecycle/seo-drift-probes";

/**
 * Phase MEM_LIFECYCLE Block 8 — SEO drift monitor.
 *
 * Writes marketing.seo.drift rows into lifecycle_issues (Block 6 sink).
 * Uses Block 6 recordIssue (fingerprint / level / issue_kind) — not a
 * paste-invented category/severity API.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const results: Array<{
    target: string;
    ok: boolean;
    reason?: string;
    status?: number;
    extra?: string;
  }> = [];

  for (const target of CANONICAL_PROBES) {
    const r = await probeCanonical(target);
    results.push({
      target: target.url,
      ok: r.ok,
      reason: r.reason,
      status: r.status,
      extra: r.found,
    });
    if (!r.ok) {
      await recordIssue({
        fingerprint: `seo-drift:canonical|${target.url}|${r.reason ?? ""}`,
        level: r.reason === "non-200" ? "fatal" : "warning",
        issueKind: "marketing.seo.drift",
        companyId: null,
        firmId: null,
        tags: {
          category: "marketing.seo.drift",
          probe: "canonical",
        },
        extra: {
          target: target.url,
          expected_canonical: target.expectedCanonical,
          reason: r.reason,
          status: r.status,
          found_canonical: r.found,
        },
        message: `SEO drift: ${target.url} — ${r.reason ?? "unknown"}`,
      });
    }
  }

  const apexResult = await probeApexRedirect();
  results.push({
    target: "https://www.advisacor.com/",
    ok: apexResult.ok,
    reason: apexResult.reason,
    status: apexResult.status,
    extra: apexResult.location,
  });
  if (!apexResult.ok) {
    await recordIssue({
      fingerprint: `seo-drift:apex|${apexResult.reason ?? ""}`,
      level: "fatal",
      issueKind: "marketing.seo.drift",
      companyId: null,
      firmId: null,
      tags: {
        category: "marketing.seo.drift",
        probe: "apex_redirect",
      },
      extra: {
        target: "https://www.advisacor.com/",
        expected: "308 → https://advisacor.com/",
        reason: apexResult.reason,
        status: apexResult.status,
        location: apexResult.location,
      },
      message: `SEO drift: apex redirect broken — ${apexResult.reason ?? "unknown"}`,
    });
  }

  const failed = results.filter((r) => !r.ok);
  return NextResponse.json({
    ok: failed.length === 0,
    checked: results.length,
    failed: failed.length,
    results,
  });
}
