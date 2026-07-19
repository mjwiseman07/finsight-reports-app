import { invokeClaude } from "../llm/anthropic-driver";
import type { WorkflowSignalBundle } from "./workflow-signals";

export interface PrefillDraft {
  subject: string;
  description: string;
  category: "Bug Report" | "Support Issue" | "Feature Request";
  priority: "Critical" | "High" | "Standard";
  confidence: "high" | "medium" | "low";
  attribution: {
    signals_used: string[];
    parent_ticket_id: string | null;
    parent_correlation_id: string | null;
  };
}

const VALID_CATEGORIES = new Set(["Bug Report", "Support Issue", "Feature Request"]);
const VALID_PRIORITIES = new Set(["Critical", "High", "Standard"]);
const VALID_CONFIDENCES = new Set(["high", "medium", "low"]);

const SYSTEM_PROMPT = `You are helping a small business owner draft a support ticket for their accounting software (Advisacor). You will see a bundle of recent signals about what happened to them. Compose a subject and description IN THEIR VOICE — first person, non-technical, no jargon. The customer does not know what a "realm ID" or "CDC" or "HTTP 401" is. Translate technical signals into what they experienced.

Return JSON only with this shape:
{
  "subject": "<=100 chars, sentence case, no quotes",
  "description": "<=800 chars, 2-4 sentences, first person, natural",
  "category": "Bug Report" | "Support Issue" | "Feature Request",
  "priority": "Critical" | "High" | "Standard",
  "confidence": "high" | "medium" | "low"
}

Rules:
- Never mention "realm ID", "intuit_tid", "HTTP", status codes, endpoints, or any technical identifier
- Priority=Critical only if the customer cannot proceed with their work
- Priority=High for account/connection issues that block core workflows
- Priority=Standard for everything else
- Category=Bug Report when signals suggest broken behavior; Support Issue for account/access/data questions; Feature Request only if the referrer clearly indicates a new capability request
- If signals conflict or you are unsure, set confidence=low and keep the draft generic
- Return ONLY the JSON object, no prose before or after.`;

function truncate(s: string | undefined, max: number): string {
  const v = typeof s === "string" ? s.trim() : "";
  return v.slice(0, max);
}

function buildStaticDraftFromContextOnly(bundle: WorkflowSignalBundle): PrefillDraft {
  const ctx = bundle.contextParam || "using Advisacor";
  return {
    subject: `Question about ${ctx.slice(0, 60)}`.slice(0, 100),
    description: `I was on ${ctx} and wanted to ask about something.`.slice(0, 800),
    category: "Support Issue",
    priority: "Standard",
    confidence: "low",
    attribution: {
      signals_used: ["referrer_context"],
      parent_ticket_id: null,
      parent_correlation_id: null,
    },
  };
}

async function invokeWithTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return await Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("haiku_timeout")), ms)),
  ]);
}

export async function composePrefillDraft(bundle: WorkflowSignalBundle): Promise<PrefillDraft | null> {
  if (bundle.signals.length === 0 && !bundle.mostRecentAutoFiledTicket && !bundle.contextParam) {
    return null;
  }

  const onlyContext =
    bundle.signals.length === 1 &&
    bundle.signals[0].kind === "referrer_context" &&
    !bundle.mostRecentAutoFiledTicket;
  if (onlyContext) return buildStaticDraftFromContextOnly(bundle);

  try {
    const claudeResp = await invokeWithTimeout(
      invokeClaude({
        tier: "haiku",
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Signal bundle for this customer:\n${JSON.stringify(bundle, null, 2)}\n\nCompose the ticket draft.`,
          },
        ],
        maxTokens: 400,
        temperature: 0.3,
        jsonMode: true,
      }),
      4000,
    );

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(claudeResp.text.trim());
    } catch {
      console.warn("[prefill] haiku returned non-json", claudeResp.text.slice(0, 200));
      return null;
    }

    const subject = truncate(String(parsed.subject || ""), 100);
    const description = truncate(String(parsed.description || ""), 800);
    if (!subject || !description) return null;

    const category = VALID_CATEGORIES.has(String(parsed.category))
      ? (parsed.category as PrefillDraft["category"])
      : "Support Issue";
    const priority = VALID_PRIORITIES.has(String(parsed.priority))
      ? (parsed.priority as PrefillDraft["priority"])
      : "Standard";
    const confidence = VALID_CONFIDENCES.has(String(parsed.confidence))
      ? (parsed.confidence as PrefillDraft["confidence"])
      : "low";

    return {
      subject,
      description,
      category,
      priority,
      confidence,
      attribution: {
        signals_used: [...new Set(bundle.signals.map((s) => s.kind))],
        parent_ticket_id: bundle.mostRecentAutoFiledTicket?.ticket_id ?? null,
        parent_correlation_id: bundle.mostRecentAutoFiledTicket?.correlation_id ?? null,
      },
    };
  } catch (err) {
    console.warn("[prefill] haiku call failed", err instanceof Error ? err.message : err);
    return null;
  }
}
