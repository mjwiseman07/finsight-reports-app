import { sendEmail, getSupportEmail } from "@/lib/email";
import { sendFounderAlert } from "@/lib/founder-alerts.js";
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://advisacor.com";
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days — cron-safe TTL
const STORAGE_BUCKET = "audit-ready-recons";

function fromAddress(): string {
  return (
    process.env.BS_RECON_FROM_EMAIL ||
    process.env.GAP2_FROM_EMAIL ||
    `Advisacor <${getSupportEmail()}>`
  );
}

function formatCents(cents: number): string {
  const dollars = cents / 100;
  return dollars.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(iso: string): string {
  // "2026-07-31" → "July 31, 2026"
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

async function generateSignedPdfUrl(params: {
  engagementId: string;
  asOfDate: string;
  pdfObjectKey: string;
}): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(params.pdfObjectKey, SIGNED_URL_TTL_SECONDS);
  if (error) {
    console.error("[bs-recon-notify] Failed to sign PDF URL", {
      engagementId: params.engagementId,
      asOfDate: params.asOfDate,
      error: error.message,
    });
    return null;
  }
  return data?.signedUrl ?? null;
}

function baseEmailHeader(): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #0f172a; font-size: 24px; font-weight: 700; margin: 0;">Advisacor</h1>
      </div>
  `;
}

function baseEmailFooter(): string {
  return `
      <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 12px; text-align: center;">
        <p style="margin: 0;">Advisacor — Continuous Accounting Intelligence</p>
        <p style="margin: 4px 0 0;"><a href="${APP_URL}" style="color: #64748b;">${APP_URL.replace(/^https?:\/\//, "")}</a></p>
      </div>
    </div>
  `;
}

function ctaButton(label: string, href: string, color: string): string {
  return `
    <div style="text-align: center; margin: 24px 0;">
      <a href="${href}" style="display: inline-block; padding: 12px 24px; background-color: ${color}; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">
        ${label}
      </a>
    </div>
  `;
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface BsReconTieEmailParams {
  toEmail: string;
  clientName: string;
  asOfDate: string; // "YYYY-MM-DD"
  accountCount: number;
  engagementId: string;
  artifactId: string;
  pdfObjectKey: string;
}

export async function sendBsReconTieEmail(
  params: BsReconTieEmailParams,
): Promise<void> {
  const summaryUrl = `${APP_URL}/audit-ready/tie-out/${params.engagementId}/summary/${params.artifactId}`;
  const pdfUrl = await generateSignedPdfUrl({
    engagementId: params.engagementId,
    asOfDate: params.asOfDate,
    pdfObjectKey: params.pdfObjectKey,
  });
  const asOfPretty = formatDate(params.asOfDate);
  const subject = `[Advisacor] BS Reconciliation Complete: ${params.clientName} — ${asOfPretty}`;
  const html = `
    ${baseEmailHeader()}
    <h2 style="color: #0f172a; font-size: 20px; margin: 0 0 16px;">Balance Sheet Reconciliation Complete</h2>
    <p style="color: #334155; font-size: 15px; line-height: 1.6;">
      Your balance sheet reconciliation for <strong>${params.clientName}</strong> as of <strong>${asOfPretty}</strong> is complete and ties to <strong>$0.00 variance</strong>.
    </p>
    <p style="color: #334155; font-size: 15px; line-height: 1.6;">
      All ${params.accountCount} accounts reconciled successfully. No follow-up action required.
    </p>
    ${ctaButton("View Summary", summaryUrl, "#C9A961")}
    ${pdfUrl ? ctaButton("Download PDF", pdfUrl, "#0f172a") : ""}
    <p style="color: #64748b; font-size: 13px; line-height: 1.6; margin-top: 24px;">
      This reconciliation was generated automatically by your Audit Ready subscription.
    </p>
    ${baseEmailFooter()}
  `;
  await sendEmail({
    from: fromAddress(),
    to: [params.toEmail],
    subject,
    text: htmlToText(html),
    html,
  });
}

export interface BsReconKickoutEmailParams {
  toEmail: string;
  clientName: string;
  asOfDate: string;
  kickoutCount: number;
  totalsVarianceCents: number;
  bsEquationVarianceCents: number;
  engagementId: string;
  artifactId: string;
  pdfObjectKey: string;
}

export async function sendBsReconKickoutEmail(
  params: BsReconKickoutEmailParams,
): Promise<void> {
  const summaryUrl = `${APP_URL}/audit-ready/tie-out/${params.engagementId}/summary/${params.artifactId}`;
  const pdfUrl = await generateSignedPdfUrl({
    engagementId: params.engagementId,
    asOfDate: params.asOfDate,
    pdfObjectKey: params.pdfObjectKey,
  });
  const asOfPretty = formatDate(params.asOfDate);
  const subject = `[Advisacor] BS Reconciliation Needs Review: ${params.clientName} — ${asOfPretty}`;
  const html = `
    ${baseEmailHeader()}
    <h2 style="color: #0f172a; font-size: 20px; margin: 0 0 16px;">Balance Sheet Reconciliation Needs Review</h2>
    <p style="color: #334155; font-size: 15px; line-height: 1.6;">
      Your balance sheet reconciliation for <strong>${params.clientName}</strong> as of <strong>${asOfPretty}</strong> identified <strong>${params.kickoutCount} account${params.kickoutCount === 1 ? "" : "s"}</strong> requiring review.
    </p>
    <table style="width: 100%; margin: 16px 0; border-collapse: collapse; font-size: 14px;">
      <tr>
        <td style="padding: 8px 0; color: #64748b;">Total variance</td>
        <td style="padding: 8px 0; text-align: right; color: #0f172a; font-weight: 600; font-variant-numeric: tabular-nums;">${formatCents(params.totalsVarianceCents)}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #64748b;">BS equation variance</td>
        <td style="padding: 8px 0; text-align: right; color: #0f172a; font-weight: 600; font-variant-numeric: tabular-nums;">${formatCents(params.bsEquationVarianceCents)}</td>
      </tr>
    </table>
    ${ctaButton("Review Reconciliation", summaryUrl, "#C9A961")}
    ${pdfUrl ? ctaButton("Download PDF", pdfUrl, "#0f172a") : ""}
    <p style="color: #64748b; font-size: 13px; line-height: 1.6; margin-top: 24px;">
      This reconciliation was generated automatically by your Audit Ready subscription.
    </p>
    ${baseEmailFooter()}
  `;
  await sendEmail({
    from: fromAddress(),
    to: [params.toEmail],
    subject,
    text: htmlToText(html),
    html,
  });
}

export interface BsReconFailureAlertParams {
  clientName: string;
  engagementId: string;
  asOfDate: string;
  error: Error;
}

export async function sendBsReconFailureAlert(
  params: BsReconFailureAlertParams,
): Promise<void> {
  await sendFounderAlert({
    // Non-refund path: column is nullable; null is intentional for cron alerts.
    refundRequestId: null,
    subject: `[Cron Failure] BS Recon for ${params.clientName}`,
    subjectLine: `[Cron Failure] BS Recon for ${params.clientName}`,
    body: [
      `BS Reconciliation cron failed for engagement ${params.engagementId} (${params.clientName}).`,
      `As-of date: ${params.asOfDate}`,
      ``,
      `Error: ${params.error.message}`,
      ``,
      `Stack:`,
      params.error.stack ?? "(no stack)",
    ].join("\n"),
    context: {
      cron: "bs_recon_monthly",
      engagementId: params.engagementId,
      clientName: params.clientName,
      asOfDate: params.asOfDate,
    },
  });
}

export interface RecipientResolution {
  email: string | null;
  source: "owner" | "firm_admin" | null;
}

export async function resolveBookkeeperEmail(params: {
  ownerUserId: string | null;
  firmId: string | null;
}): Promise<RecipientResolution> {
  const supabase = getSupabaseAdmin();
  // Path 1: owner_user_id → auth.users.email
  if (params.ownerUserId) {
    const { data, error } = await supabase.auth.admin.getUserById(
      params.ownerUserId,
    );
    if (!error && data?.user?.email) {
      return { email: data.user.email, source: "owner" };
    }
  }
  // Path 2: firm_memberships where firm_id AND role='firm_admin', pick first
  if (params.firmId) {
    const { data: memberships, error: memErr } = await supabase
      .from("firm_memberships")
      .select("user_id")
      .eq("firm_id", params.firmId)
      .eq("role", "firm_admin")
      .limit(1);
    if (!memErr && memberships && memberships.length > 0) {
      const adminUserId = memberships[0].user_id as string;
      const { data: userData, error: userErr } =
        await supabase.auth.admin.getUserById(adminUserId);
      if (!userErr && userData?.user?.email) {
        return { email: userData.user.email, source: "firm_admin" };
      }
    }
  }
  return { email: null, source: null };
}
