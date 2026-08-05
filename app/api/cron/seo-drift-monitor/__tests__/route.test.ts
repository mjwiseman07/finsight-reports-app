/**
 * Phase MEM_LIFECYCLE Block 8 — SEO drift monitor route integration tests.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/pilot-lifecycle/issue-recorder", () => ({
  recordIssue: vi.fn().mockResolvedValue({
    id: "i1",
    deduped: false,
    sentryEventId: null,
  }),
}));

import { recordIssue } from "@/lib/pilot-lifecycle/issue-recorder";
import { GET } from "../route";

describe("SEO drift monitor route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-cron-secret";
    vi.stubGlobal("fetch", vi.fn());
  });

  it("returns 401 without valid bearer token", async () => {
    const req = new Request("https://advisacor.com/api/cron/seo-drift-monitor");
    const res = await GET(req as never);
    expect(res.status).toBe(401);
  });

  it("returns ok when all probes pass", async () => {
    const apexRedirect = new Response(null, {
      status: 308,
      headers: { location: "https://advisacor.com/" },
    });
    vi.mocked(fetch).mockImplementation(((url: string | URL) => {
      const u = String(url);
      if (u.startsWith("https://www.advisacor.com")) {
        return Promise.resolve(apexRedirect);
      }
      const html = `<html><head><link rel="canonical" href="${u}" /></head></html>`;
      return Promise.resolve(new Response(html, { status: 200 }));
    }) as typeof fetch);

    const req = new Request("https://advisacor.com/api/cron/seo-drift-monitor", {
      headers: { authorization: "Bearer test-cron-secret" },
    });
    const res = await GET(req as never);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.failed).toBe(0);
  });

  it("records lifecycle_issues when apex redirect broken", async () => {
    vi.mocked(fetch).mockImplementation(((url: string | URL) => {
      const u = String(url);
      if (u.startsWith("https://www.advisacor.com")) {
        return Promise.resolve(new Response("<html></html>", { status: 200 }));
      }
      const html = `<html><head><link rel="canonical" href="${u}" /></head></html>`;
      return Promise.resolve(new Response(html, { status: 200 }));
    }) as typeof fetch);

    const req = new Request("https://advisacor.com/api/cron/seo-drift-monitor", {
      headers: { authorization: "Bearer test-cron-secret" },
    });
    await GET(req as never);
    expect(recordIssue).toHaveBeenCalledWith(
      expect.objectContaining({
        issueKind: "marketing.seo.drift",
        level: "fatal",
        message: expect.stringContaining("apex redirect broken"),
        tags: expect.objectContaining({
          category: "marketing.seo.drift",
        }),
      }),
    );
  });
});
