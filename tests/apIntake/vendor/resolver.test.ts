import { describe, it, expect } from "vitest";
import { resolveVendor } from "@/lib/ap-intake/vendor/resolver";
import type { IntakeHandlerContext } from "@/lib/intake/types";

function makeCtx(
  mirrorRows: Array<{
    id: string;
    display_name: string;
    normalized_name: string;
    metaphone_code: string;
    last_synced_at: string;
  }>,
): IntakeHandlerContext {
  return {
    supabase: {
      from: (_table: string) => ({
        select: () => ({
          eq: () => ({
            eq: () => Promise.resolve({ data: mirrorRows, error: null }),
          }),
        }),
      }),
    } as never,
    message: {
      id: "msg-1",
      firm_id: "firm-1",
      company_id: "co-1",
      firm_client_id: "fc-1",
      source_channel: "postmark_inbound",
      source_message_id: "pm-1",
      recipient_address: null,
      recipient_prefix: null,
      recipient_firm_slug: null,
      recipient_token: null,
      sender_email: null,
      sender_domain: "acme.com",
      subject: null,
      received_at: new Date().toISOString(),
      raw_body_text: null,
      raw_body_html: null,
      raw_headers: null,
      raw_payload: null,
      content_hash: "h",
    },
    attachments: [],
  };
}

const now = new Date().toISOString();

describe("resolveVendor", () => {
  it("exact match", async () => {
    const ctx = makeCtx([
      {
        id: "v1",
        display_name: "Acme Inc",
        normalized_name: "acme",
        metaphone_code: "AKM",
        last_synced_at: now,
      },
    ]);
    const out = await resolveVendor(ctx, "Acme Inc\nInvoice 123\n");
    expect(out.method).toBe("exact");
    expect(out.resolved_vendor_id).toBe("v1");
  });

  it("fuzzy candidate above 0.85 threshold", async () => {
    const ctx = makeCtx([
      {
        id: "v1",
        display_name: "Acme Widgets",
        normalized_name: "acme widgets",
        metaphone_code: "AKMWJTS",
        last_synced_at: now,
      },
    ]);
    const out = await resolveVendor(ctx, "Acme Widget\nInvoice 123\n");
    expect(out.method).toBe("fuzzy_candidate");
    expect(out.candidate_ids).toContain("v1");
    expect(out.confidence ?? 0).toBeGreaterThanOrEqual(0.85);
  });

  it("no match emits quarantine signal", async () => {
    const ctx = makeCtx([
      {
        id: "v1",
        display_name: "Acme",
        normalized_name: "acme",
        metaphone_code: "AKM",
        last_synced_at: now,
      },
    ]);
    const out = await resolveVendor(ctx, "Zzzznexus Corp\n");
    expect(out.method).toBe("no_match");
    expect(out.signals.some((s) => s.code === "no_match_route_to_quarantine")).toBe(true);
  });

  it("emits stale mirror INFO when last sync > 24h", async () => {
    const old = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
    const ctx = makeCtx([
      {
        id: "v1",
        display_name: "Acme",
        normalized_name: "acme",
        metaphone_code: "AKM",
        last_synced_at: old,
      },
    ]);
    const out = await resolveVendor(ctx, "Acme\n");
    expect(out.signals.some((s) => s.code === "vendor_mirror_stale")).toBe(true);
  });
});
