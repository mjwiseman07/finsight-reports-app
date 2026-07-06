import type { SupabaseClient } from "@supabase/supabase-js";
import { invokeClaude } from "@/lib/llm/anthropic-driver";
import type { IntakeMessageRecord } from "./types";
import type { HandlerKey } from "./address";

interface ClassifierResult {
  handlerKey: HandlerKey;
  confidence: number;
  floor: number;
  firmId: string;
  companyId: string;
  firmClientId: string | null;
}

/**
 * When the address didn't match and the sender-domain fallback missed, we need
 * a firm-scoped classifier config. Classifier is a signal, not a firm-resolver:
 * only classifies when recipient_firm_slug maps to a provisioned address row.
 */
async function resolveFirmForClassifier(
  supabase: SupabaseClient,
  message: IntakeMessageRecord,
): Promise<{ firmId: string; companyId: string; firmClientId: string | null } | null> {
  if (message.recipient_firm_slug) {
    const { data: addr } = await supabase
      .from("firm_intake_addresses")
      .select("firm_id, company_id")
      .eq("firm_slug", message.recipient_firm_slug)
      .limit(1)
      .maybeSingle();
    if (addr) {
      const { data: fc } = await supabase
        .from("firm_clients")
        .select("id")
        .eq("company_id", addr.company_id)
        .maybeSingle();
      return {
        firmId: addr.firm_id,
        companyId: addr.company_id,
        firmClientId: fc?.id ?? null,
      };
    }
  }
  return null;
}

async function loadSettings(
  supabase: SupabaseClient,
  companyId: string,
): Promise<{
  enabled: boolean;
  tier: "primary" | "toptier" | "haiku";
  floor: number;
  fallbackHandlerKey: HandlerKey | null;
}> {
  const { data } = await supabase
    .from("firm_intake_settings")
    .select("classifier_enabled, classifier_tier, classifier_confidence_floor, fallback_handler_key")
    .eq("company_id", companyId)
    .maybeSingle();
  return {
    enabled: data?.classifier_enabled ?? true,
    tier: (data?.classifier_tier as "primary" | "toptier" | "haiku") ?? "primary",
    floor: data?.classifier_confidence_floor ?? 0.7,
    fallbackHandlerKey: (data?.fallback_handler_key as HandlerKey) ?? null,
  };
}

const CLASSIFIER_SYSTEM = `You are a classifier for a bookkeeping firm's inbound email intake.
Given a sender, subject, and body, classify the message into ONE handler:
- cash_app_remit — remittance advice (customer paid the firm's client; includes invoice references, EDI 820, camt.054, or "payment for invoices ####")
- bills — a vendor invoice or bill FOR the client to pay (from a vendor; has invoice number, PO, amount due)
- docs — any other business document (statement, receipt, contract, tax form, W-9, misc.)
Return JSON only: {"handler":"cash_app_remit"|"bills"|"docs","confidence":0.0-1.0,"rationale":"short reason"}.
Confidence should reflect how sure you are — 1.0 = certain, 0.5 = plausible either way, 0.2 = guess.`;

export async function classifyIntakeMessage(
  supabase: SupabaseClient,
  message: IntakeMessageRecord,
): Promise<ClassifierResult | null> {
  const firmScope = await resolveFirmForClassifier(supabase, message);
  if (!firmScope) return null;

  const settings = await loadSettings(supabase, firmScope.companyId);
  if (!settings.enabled) return null;

  const userPrompt = [
    `Sender: ${message.sender_email ?? "(unknown)"}`,
    `Subject: ${message.subject ?? "(no subject)"}`,
    `Body:\n${(message.raw_body_text ?? "").slice(0, 4000)}`,
  ].join("\n\n");

  let raw: string;
  try {
    const response = await invokeClaude({
      tier: settings.tier,
      system: CLASSIFIER_SYSTEM,
      messages: [{ role: "user", content: userPrompt }],
      maxTokens: 200,
    });
    raw = response.text;
  } catch {
    if (settings.fallbackHandlerKey) {
      return {
        handlerKey: settings.fallbackHandlerKey,
        confidence: settings.floor,
        floor: settings.floor,
        ...firmScope,
      };
    }
    return null;
  }

  let parsed: { handler?: string; confidence?: number } | null = null;
  try {
    const stripped = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
    parsed = JSON.parse(stripped);
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        parsed = JSON.parse(m[0]);
      } catch {
        /* fall through */
      }
    }
  }

  if (!parsed || !parsed.handler || typeof parsed.confidence !== "number") {
    return null;
  }

  const handlerKey = parsed.handler as HandlerKey;
  if (!["cash_app_remit", "bills", "docs"].includes(handlerKey)) return null;

  return {
    handlerKey,
    confidence: parsed.confidence,
    floor: settings.floor,
    ...firmScope,
  };
}
