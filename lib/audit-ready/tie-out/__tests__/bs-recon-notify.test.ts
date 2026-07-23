import { describe, expect, it, vi, beforeEach } from "vitest";

const createSignedUrl = vi.fn().mockResolvedValue({
  data: { signedUrl: "https://storage.example/signed.pdf" },
  error: null,
});
const getUserById = vi.fn();
const fromMock = vi.fn();

vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
  getSupportEmail: () => "support@advisacor.com",
}));

vi.mock("@/lib/founder-alerts.js", () => ({
  sendFounderAlert: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/supabase-admin.js", () => ({
  getSupabaseAdmin: () => ({
    storage: { from: () => ({ createSignedUrl }) },
    auth: { admin: { getUserById } },
    from: fromMock,
  }),
}));

import { sendEmail } from "@/lib/email";
import { sendFounderAlert } from "@/lib/founder-alerts.js";
import {
  sendBsReconTieEmail,
  sendBsReconKickoutEmail,
  sendBsReconFailureAlert,
} from "../bs-recon-notify";

beforeEach(() => {
  vi.clearAllMocks();
  createSignedUrl.mockResolvedValue({
    data: { signedUrl: "https://storage.example/signed.pdf" },
    error: null,
  });
});

describe("sendBsReconTieEmail", () => {
  it("includes client name, as-of date, and account count in subject/body", async () => {
    await sendBsReconTieEmail({
      toEmail: "bookkeeper@example.com",
      clientName: "Acme Corp",
      asOfDate: "2026-07-31",
      accountCount: 14,
      engagementId: "eng-1",
      artifactId: "art-1",
      pdfObjectKey: "eng-1/summary/2026-07-31/pdf/abc.pdf",
    });
    expect(sendEmail).toHaveBeenCalledTimes(1);
    const call = (sendEmail as unknown as { mock: { calls: unknown[][] } })
      .mock.calls[0][0] as {
      to: string[];
      from: string;
      text: string;
      subject: string;
      html: string;
    };
    expect(call.to).toEqual(["bookkeeper@example.com"]);
    expect(call.from).toBeTruthy();
    expect(call.text).toBeTruthy();
    expect(call.subject).toContain("Acme Corp");
    expect(call.subject).toContain("July 31, 2026");
    expect(call.html).toContain("14 accounts reconciled");
    expect(call.html).toContain("$0.00 variance");
    expect(call.html).toContain("/audit-ready/tie-out/eng-1/summary/art-1");
    expect(call.html).toContain("https://storage.example/signed.pdf");
  });
});

describe("sendBsReconKickoutEmail", () => {
  it("formats variance amounts and includes both CTAs", async () => {
    await sendBsReconKickoutEmail({
      toEmail: "bookkeeper@example.com",
      clientName: "Acme Corp",
      asOfDate: "2026-07-31",
      kickoutCount: 3,
      totalsVarianceCents: 12345,
      bsEquationVarianceCents: 6789,
      engagementId: "eng-1",
      artifactId: "art-1",
      pdfObjectKey: "eng-1/summary/2026-07-31/pdf/abc.pdf",
    });
    expect(sendEmail).toHaveBeenCalledTimes(1);
    const call = (sendEmail as unknown as { mock: { calls: unknown[][] } })
      .mock.calls[0][0] as {
      subject: string;
      html: string;
      to: string[];
      text: string;
    };
    expect(call.to).toEqual(["bookkeeper@example.com"]);
    expect(call.text).toBeTruthy();
    expect(call.subject).toContain("Needs Review");
    expect(call.html).toContain("$123.45");
    expect(call.html).toContain("$67.89");
    expect(call.html).toContain("3 accounts");
  });
});

describe("sendBsReconFailureAlert", () => {
  it("calls sendFounderAlert with error details", async () => {
    await sendBsReconFailureAlert({
      clientName: "Acme Corp",
      engagementId: "eng-1",
      asOfDate: "2026-07-31",
      error: new Error("boom"),
    });
    expect(sendFounderAlert).toHaveBeenCalledTimes(1);
    const arg = (
      sendFounderAlert as unknown as { mock: { calls: unknown[][] } }
    ).mock.calls[0][0] as {
      subject: string;
      body: string;
      context: { engagementId: string };
    };
    expect(arg.subject).toContain("Cron Failure");
    expect(arg.subject).toContain("Acme Corp");
    expect(arg.body).toContain("boom");
    expect(arg.context.engagementId).toBe("eng-1");
  });
});
