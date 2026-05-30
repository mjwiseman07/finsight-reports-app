import {
  ownerEmailTemplateSpec,
  ownerPackageScopeRules,
  ownerSuggestedQuestions,
} from "./executive-delivery-architecture";

export const OWNER_PERSONA_ID = "business-owner";

export const ownerBriefStatuses = [
  "scheduled",
  "queued",
  "processing",
  "awaiting approval",
  "sent",
  "failed",
];

export function getOwnerPackageScope(packageLevel = "essential") {
  return (
    ownerPackageScopeRules.find((rule) => rule.packageKey === packageLevel) ||
    ownerPackageScopeRules[0]
  );
}

export function sanitizeOwnerQuestion(question) {
  return String(question || "").trim().slice(0, 600);
}

export function isOwnerQuestionAllowed(question) {
  const sanitized = sanitizeOwnerQuestion(question);
  return sanitized.length >= 3 && sanitized.length <= 600;
}

export function buildOwnerAskUrl({ baseUrl, briefId, token }) {
  const url = new URL(`/owner/ask/${encodeURIComponent(briefId)}`, baseUrl);
  if (token) url.searchParams.set("token", token);
  return url.toString();
}

export function buildOwnerReportUrl({ baseUrl, briefId, token }) {
  const url = new URL(`/api/owner/briefs/${encodeURIComponent(briefId)}/report`, baseUrl);
  if (token) url.searchParams.set("token", token);
  return url.toString();
}

export function buildOwnerWeeklyBriefEmail({
  ownerName = "there",
  companyName = "your business",
  briefId,
  baseUrl,
  magicToken,
  packageLevel = "essential",
  metrics = {},
}) {
  const askUrl = buildOwnerAskUrl({ baseUrl, briefId, token: magicToken });
  const reportUrl = buildOwnerReportUrl({ baseUrl, briefId, token: magicToken });
  const scope = getOwnerPackageScope(packageLevel);
  const cards = [
    ["Business Health", metrics.businessHealthScore || "Ready for review"],
    ["Cash", metrics.cashPosition || "Review current cash position"],
    ["Revenue", metrics.revenueTrend || "Review revenue trend"],
    ["Profit", metrics.profitTrend || "Review profit trend"],
    ["Payroll", metrics.payrollStatus || "Review payroll and FTE status"],
    ["Collections", metrics.collectionsStatus || "Review customer collections"],
  ];

  const text = [
    `Hello ${ownerName},`,
    "",
    `Here is the weekly business snapshot for ${companyName}.`,
    "",
    ...cards.map(([label, value]) => `${label}: ${value}`),
    "",
    `Top Risk: ${metrics.topRisk || "No top risk has been approved for owner delivery yet."}`,
    `Top Opportunity: ${metrics.topOpportunity || "No top opportunity has been approved for owner delivery yet."}`,
    `Recommended Focus: ${metrics.recommendedFocus || "Review cash, profit, payroll, and collections this week."}`,
    "",
    metrics.executiveSummary || "Advisacor will summarize the owner-facing financial story after the backend intelligence job completes.",
    "",
    `Ask Advisacor About This Report: ${askUrl}`,
    `View Full Report: ${reportUrl}`,
    "",
    `Package scope: ${scope.packageName} includes ${scope.scope.join(", ")}.`,
  ].join("\n");

  const cardHtml = cards
    .map(
      ([label, value]) =>
        `<td style="display:block;width:100%;box-sizing:border-box;padding:12px 0;"><div style="border:1px solid #E5E7EB;border-radius:16px;padding:16px;"><div style="font-size:12px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:.08em;">${escapeHtml(label)}</div><div style="margin-top:6px;font-size:18px;font-weight:800;color:#111827;">${escapeHtml(value)}</div></div></td>`,
    )
    .join("");

  const html = `<!doctype html>
<html>
  <body style="margin:0;background:#F5F7FA;font-family:Inter,Arial,sans-serif;color:#111827;">
    <div style="max-width:640px;margin:0 auto;padding:28px 16px;">
      <div style="background:#FFFFFF;border:1px solid #E5E7EB;border-radius:24px;padding:28px;">
        <div style="font-size:13px;font-weight:800;color:#FF7A1A;text-transform:uppercase;letter-spacing:.12em;">Advisacor Executive Brief</div>
        <h1 style="margin:10px 0 8px;font-size:28px;line-height:1.15;color:#0A1020;">Here is your weekly business snapshot.</h1>
        <p style="margin:0 0 20px;color:#4B5563;line-height:1.6;">Hello ${escapeHtml(ownerName)}, here is the owner-focused view for ${escapeHtml(companyName)}.</p>
        <table role="presentation" width="100%" style="border-collapse:collapse;">${cardHtml}</table>
        <div style="margin-top:20px;border-top:1px solid #E5E7EB;padding-top:20px;">
          <p style="margin:0 0 10px;"><strong>Top Risk:</strong> ${escapeHtml(metrics.topRisk || "No top risk has been approved for owner delivery yet.")}</p>
          <p style="margin:0 0 10px;"><strong>Top Opportunity:</strong> ${escapeHtml(metrics.topOpportunity || "No top opportunity has been approved for owner delivery yet.")}</p>
          <p style="margin:0;"><strong>Recommended Focus:</strong> ${escapeHtml(metrics.recommendedFocus || "Review cash, profit, payroll, and collections this week.")}</p>
        </div>
        <p style="margin:20px 0 0;color:#374151;line-height:1.6;">${escapeHtml(metrics.executiveSummary || "Advisacor will summarize the owner-facing financial story after the backend intelligence job completes.")}</p>
        <div style="margin-top:24px;">
          <a href="${escapeHtml(askUrl)}" style="display:block;text-align:center;background:#FF7A1A;color:#FFFFFF;text-decoration:none;border-radius:16px;padding:14px 18px;font-weight:800;">${escapeHtml(ownerEmailTemplateSpec.primaryCta)}</a>
          <a href="${escapeHtml(reportUrl)}" style="display:block;text-align:center;margin-top:10px;color:#1E6BFF;text-decoration:none;font-weight:700;">${escapeHtml(ownerEmailTemplateSpec.secondaryCta)}</a>
        </div>
        <p style="margin:22px 0 0;font-size:12px;color:#6B7280;line-height:1.5;">This brief is limited to ${escapeHtml(scope.packageName)} scope and is intended for business-owner review.</p>
      </div>
    </div>
  </body>
</html>`;

  return {
    subject: ownerEmailTemplateSpec.weeklySubject,
    text,
    html,
    suggestedQuestions: ownerSuggestedQuestions,
  };
}

export function buildOwnerMonthlyPackageEmail({
  ownerName = "there",
  companyName = "your business",
  briefId,
  baseUrl,
  magicToken,
  packageLevel = "essential",
  summary = "Your monthly executive package is ready for review.",
  kpis = [],
  focusAreas = [],
}) {
  const askUrl = buildOwnerAskUrl({ baseUrl, briefId, token: magicToken });
  const reportUrl = buildOwnerReportUrl({ baseUrl, briefId, token: magicToken });
  const scope = getOwnerPackageScope(packageLevel);
  const kpiText = kpis.length ? kpis.map((item) => `- ${item}`).join("\n") : "- Cash, revenue, profit, payroll, and collections are ready for owner review.";
  const focusText = focusAreas.length ? focusAreas.map((item) => `- ${item}`).join("\n") : "- Review the top risk, top opportunity, and recommended management focus.";

  return {
    subject: ownerEmailTemplateSpec.monthlySubject,
    text: [
      `Hello ${ownerName},`,
      "",
      `${summary}`,
      "",
      "Key KPI summary:",
      kpiText,
      "",
      "Top management focus areas:",
      focusText,
      "",
      `Ask Advisacor About This Report: ${askUrl}`,
      `View PDF Package: ${reportUrl}`,
      `View PowerPoint Package: ${reportUrl}`,
      "",
      `Package scope: ${scope.packageName} includes ${scope.scope.join(", ")}.`,
    ].join("\n"),
    html: `<!doctype html><html><body style="margin:0;background:#F5F7FA;font-family:Inter,Arial,sans-serif;color:#111827;"><div style="max-width:640px;margin:0 auto;padding:28px 16px;"><div style="background:#FFFFFF;border:1px solid #E5E7EB;border-radius:24px;padding:28px;"><div style="font-size:13px;font-weight:800;color:#FF7A1A;text-transform:uppercase;letter-spacing:.12em;">Advisacor Monthly Executive Package</div><h1 style="margin:10px 0 8px;font-size:28px;line-height:1.15;color:#0A1020;">Your monthly package is ready.</h1><p style="color:#374151;line-height:1.6;">Hello ${escapeHtml(ownerName)}, ${escapeHtml(summary)}</p><p><strong>Company:</strong> ${escapeHtml(companyName)}</p><p><strong>Package scope:</strong> ${escapeHtml(scope.packageName)}</p><div style="margin-top:24px;"><a href="${escapeHtml(askUrl)}" style="display:block;text-align:center;background:#FF7A1A;color:#FFFFFF;text-decoration:none;border-radius:16px;padding:14px 18px;font-weight:800;">Ask Advisacor About This Report</a><a href="${escapeHtml(reportUrl)}" style="display:block;text-align:center;margin-top:10px;color:#1E6BFF;text-decoration:none;font-weight:700;">View Full Report</a></div></div></div></body></html>`,
  };
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
