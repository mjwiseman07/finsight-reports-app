import type { JeIntentSignal, JePreviewPayload, PulseJeAskResponse } from "./types";
import { strictResolveAccount } from "./account-resolver";
import { validateJEPayload } from "@/lib/erp/quickbooks/je-validator";
import { resolveQBOTokenForFirmClient } from "@/lib/erp/quickbooks/token-resolver";
import type { JEPayload } from "@/lib/erp/types";

type Ctx = {
  firmClientId: string;
  companyId: string;
  homeCurrencyCode: string;
  actorUserId: string;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export async function buildPulseJePreview(
  intent: JeIntentSignal,
  ctx: Ctx,
): Promise<PulseJeAskResponse> {
  if (intent.kind !== "reclass") {
    return {
      pulse_je: "insufficient_info",
      missing: ["from_account", "to_account", "amount"],
      message:
        'I couldn\'t confidently identify a journal entry. Try: "Move $5,138.29 from Taxes to Accounting Fees".',
    };
  }

  const missing: Array<"amount" | "from_account" | "to_account"> = [];
  if (!intent.hints.amount) missing.push("amount");
  if (!intent.hints.from_account_phrase) missing.push("from_account");
  if (!intent.hints.to_account_phrase) missing.push("to_account");
  if (missing.length) {
    return {
      pulse_je: "insufficient_info",
      missing,
      message: `I need: ${missing.join(", ")}. Try phrasing it like: "Move $5,138.29 from Taxes to Accounting Fees".`,
    };
  }

  const from = await strictResolveAccount(
    ctx.firmClientId,
    intent.hints.from_account_phrase!,
  );
  if (from.status === "not_found") {
    return {
      pulse_je: "not_found",
      subject: "from",
      searched_phrase: from.searched_phrase,
      message: `I couldn't find an account matching "${from.searched_phrase}". Check the exact name or fully-qualified path.`,
    };
  }
  if (from.status === "ambiguous") {
    return {
      pulse_je: "picker",
      question: "which account did you mean?",
      subject: "from",
      candidates: from.candidates,
      hint_phrase: intent.hints.from_account_phrase!,
    };
  }

  const to = await strictResolveAccount(ctx.firmClientId, intent.hints.to_account_phrase!);
  if (to.status === "not_found") {
    return {
      pulse_je: "not_found",
      subject: "to",
      searched_phrase: to.searched_phrase,
      message: `I couldn't find an account matching "${to.searched_phrase}". Check the exact name or fully-qualified path.`,
    };
  }
  if (to.status === "ambiguous") {
    return {
      pulse_je: "picker",
      question: "which account did you mean?",
      subject: "to",
      candidates: to.candidates,
      hint_phrase: intent.hints.to_account_phrase!,
    };
  }

  const amt = round2(intent.hints.amount!);
  const lines = [
    {
      side: "Debit" as const,
      amount: amt,
      account_qbo_id: to.account.qbo_id,
      account_name: to.account.fully_qualified_name,
    },
    {
      side: "Credit" as const,
      amount: amt,
      account_qbo_id: from.account.qbo_id,
      account_name: from.account.fully_qualified_name,
    },
  ];

  const preview: JePreviewPayload = {
    intent_signal: intent,
    txn_date_iso: intent.hints.txn_date_iso || new Date().toISOString().slice(0, 10),
    memo: intent.hints.memo || `Reclassification: ${from.account.name} → ${to.account.name}`,
    currency_code: ctx.homeCurrencyCode,
    lines,
    balance_check: { total_debits: amt, total_credits: amt, balanced: true },
    validation: { status: "ok", messages: [] },
    meta: {
      firm_client_id: ctx.firmClientId,
      company_id: ctx.companyId,
      resolver_ttl_seconds: from.resolver_ttl_seconds,
      resolver_from_cache: from.resolver_from_cache && to.resolver_from_cache,
    },
  };

  // Run the shipped validator (real signature — do not change je-validator.ts).
  try {
    const token = await resolveQBOTokenForFirmClient(ctx.firmClientId);
    if (!token?.accessToken || !token.realmId) {
      preview.validation = {
        status: "warning",
        messages: ["validator_unavailable:no_qbo_token"],
      };
    } else {
      const payload: JEPayload = {
        transaction_date: preview.txn_date_iso,
        narration: preview.memo,
        currency: preview.currency_code,
        lines: preview.lines.map((l) => ({
          posting_type: l.side,
          amount: l.amount,
          account_id: l.account_qbo_id,
        })),
      };
      const v = await validateJEPayload(
        ctx.firmClientId,
        payload,
        token.realmId,
        token.accessToken,
        preview.currency_code,
        ctx.homeCurrencyCode,
        ctx.actorUserId,
      );
      if (!v.valid) {
        const detail =
          v.details !== undefined ? ` (${JSON.stringify(v.details)})` : "";
        preview.validation = {
          status: "error",
          messages: [`${v.reason}${detail}`],
        };
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "unknown";
    preview.validation = {
      status: "warning",
      messages: [`validator_unavailable:${message}`],
    };
  }

  return { pulse_je: "preview", preview };
}
