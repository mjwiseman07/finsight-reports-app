import type { ApInboxIntent } from "./intent";
import { isApInboxIntent } from "./intent";

export type RawMessage = {
  channel: "email" | "voice" | "sms" | "messaging";
  subject?: string | null;
  body_text: string;
  sender_address: string;
  attachments?: unknown[];
};

export type ClassifiedIntent = {
  intent: ApInboxIntent;
  confidence: number;
};

export interface IntentClassifier {
  classifyMessage(message: RawMessage): Promise<ClassifiedIntent>;
}

export class DeterministicKeywordClassifier implements IntentClassifier {
  async classifyMessage(message: RawMessage): Promise<ClassifiedIntent> {
    try {
      const hay = `${message.subject ?? ""}\n${message.body_text}`.toLowerCase();
      if (/\b(wire\s+transfer|initiate\s+wire|send\s+wire)\b/.test(hay)) {
        return { intent: "wire_transfer_initiation", confidence: 0.9 };
      }
      if (/\b(change\s+(bank|account)|new\s+banking|update\s+(bank|routing|account\s+number))\b/.test(hay)) {
        return { intent: "bank_change_request", confidence: 0.9 };
      }
      if (/\b(send\s+refund|remit\s+refund|refund\s+(wire|ach))\b/.test(hay)) {
        return { intent: "refund_transmission_request", confidence: 0.9 };
      }
      if (/\b(refund|refunded|money\s+back)\b/.test(hay)) {
        return { intent: "refund_request", confidence: 0.75 };
      }
      if (/\b(credit\s+memo|issue\s+credit|apply\s+credit)\b/.test(hay)) {
        return { intent: "credit_request", confidence: 0.7 };
      }
      if (/\b(dispute|disputing|discrepancy|wrong\s+amount)\b/.test(hay)) {
        return { intent: "dispute", confidence: 0.7 };
      }
      if (/\b(statement|aging\s+report|open\s+balance)\b/.test(hay)) {
        return { intent: "statement_request", confidence: 0.7 };
      }
      if (/\b(payment\s+status|has\s+(this|the\s+bill)\s+been\s+paid|when\s+(will|do)\s+you\s+pay)\b/.test(hay)) {
        return { intent: "payment_status", confidence: 0.7 };
      }
      if (/\b(inquiry|question\s+about\s+invoice|status\s+of\s+invoice)\b/.test(hay)) {
        return { intent: "invoice_inquiry", confidence: 0.6 };
      }
      if (/\b(invoice|please\s+find\s+attached|new\s+bill)\b/.test(hay) || (message.attachments ?? []).length > 0) {
        return { intent: "invoice_submission", confidence: 0.6 };
      }
      return { intent: "generic", confidence: 0.0 };
    } catch {
      return { intent: "generic", confidence: 0.0 };
    }
  }
}

export function makeDefaultClassifier(): IntentClassifier {
  return new DeterministicKeywordClassifier();
}

export function normalizeClassifierOutput(raw: unknown): ClassifiedIntent {
  if (raw && typeof raw === "object") {
    const parsed = raw as { intent?: unknown; confidence?: unknown };
    const intent = isApInboxIntent(parsed.intent) ? parsed.intent : "generic";
    const c = typeof parsed.confidence === "number" ? parsed.confidence : 0;
    const confidence = Math.max(0, Math.min(1, c));
    return { intent, confidence };
  }
  return { intent: "generic", confidence: 0 };
}
