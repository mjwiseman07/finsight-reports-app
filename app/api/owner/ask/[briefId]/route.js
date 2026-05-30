import { NextResponse } from "next/server";
import { getOwnerPackageScope } from "../../../../../lib/owner-executive-brief";
import { rateLimit } from "../../../../../lib/rate-limit";
import { auditOwnerEvent, resolveOwnerBriefAccess } from "../../../../../lib/owner-security";
import { isOwnerQuestionAllowed, sanitizeOwnerQuestion } from "../../../../../lib/owner-executive-brief";

const OWNER_FORBIDDEN_TOPICS = [
  "journal entry",
  "je testing",
  "cutoff",
  "reserve calculation",
  "technical schedule",
  "audit",
  "preparer diagnostic",
];

function buildOwnerFriendlyAnswer({ question, brief }) {
  const normalizedQuestion = question.toLowerCase();
  const scope = getOwnerPackageScope(brief.package_level);
  const summary =
    brief.owner_summary ||
    "The owner-facing summary for this report has not been generated yet. Once the background intelligence job completes, Advisacor will answer from the approved business snapshot for this company and period.";

  if (OWNER_FORBIDDEN_TOPICS.some((topic) => normalizedQuestion.includes(topic))) {
    return {
      answer:
        "This owner workspace keeps the answer focused on what matters for running the business. I can explain the business impact in plain English, but preparer-only accounting diagnostics are not shown here.",
      scope: scope.packageName,
    };
  }

  return {
    answer: [
      summary,
      "",
      "Based on the owner-approved report context, focus first on cash, profit movement, payroll pressure, and customer collections. If one of those is moving the wrong direction, that should be the management priority for the week.",
    ].join("\n"),
    scope: scope.packageName,
  };
}

export async function POST(request, context) {
  const rateLimitResponse = rateLimit(request, { key: "owner-ask", limit: 12, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  const { briefId } = await context.params;
  const access = await resolveOwnerBriefAccess(request, briefId);
  if (access.response) return access.response;

  const body = await request.json().catch(() => ({}));
  const question = sanitizeOwnerQuestion(body.question);

  if (!isOwnerQuestionAllowed(question)) {
    return NextResponse.json({ error: "Please ask a short business question about this report." }, { status: 400 });
  }

  const response = buildOwnerFriendlyAnswer({ question, brief: access.brief });

  await auditOwnerEvent({
    eventType: "owner_question_asked",
    briefId,
    companyId: access.brief.company_id,
    ownerUserId: access.ownerUserId,
    metadata: {
      auth_mode: access.authMode,
      question_length: question.length,
      package_level: access.brief.package_level,
    },
  });

  await auditOwnerEvent({
    eventType: "owner_ai_response_generated",
    briefId,
    companyId: access.brief.company_id,
    ownerUserId: access.ownerUserId,
    metadata: {
      auth_mode: access.authMode,
      package_level: access.brief.package_level,
    },
  });

  return NextResponse.json({
    question,
    answer: response.answer,
    package_scope: response.scope,
  });
}
