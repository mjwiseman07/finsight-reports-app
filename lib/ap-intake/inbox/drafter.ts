import { isPermanentExclusionIntent } from "./exclusions";
import type { ApInboxIntent } from "./intent";
import { redactBankLikeNumbers } from "./redaction";

export type VendorAccountState = {
  openInvoices: Array<{ id: string; amount_cents: number; due_date: string | null }>;
  openCreditsCents: number;
  prepaymentBalanceCents: number;
};

export type DraftInput = {
  firmId: string;
  messageId: string;
  intent: ApInboxIntent;
  subject: string | null;
  bodyText: string;
  senderAddress: string;
  vendorAccountState: VendorAccountState;
  toneProfileId?: string | null;
  modelId: string;
};

export type DraftOutput = {
  draft_body_text: string;
  draft_body_html: string | null;
  intent_at_draft_time: ApInboxIntent;
  model_id: string;
  tone_profile_id: string | null;
};

export interface Drafter {
  draft(input: DraftInput): Promise<DraftOutput | null>;
}

export class TemplateDrafter implements Drafter {
  async draft(input: DraftInput): Promise<DraftOutput | null> {
    if (isPermanentExclusionIntent(input.intent)) {
      return null;
    }
    const body = buildTemplateBody(input);
    return {
      draft_body_text: redactBankLikeNumbers(body),
      draft_body_html: null,
      intent_at_draft_time: input.intent,
      model_id: input.modelId,
      tone_profile_id: input.toneProfileId ?? null,
    };
  }
}

function buildTemplateBody(input: DraftInput): string {
  const openCount = input.vendorAccountState.openInvoices.length;
  switch (input.intent) {
    case "statement_request":
      return `Thanks for reaching out. We currently show ${openCount} open invoice(s) on your account. A detailed statement will follow from our AP team.`;
    case "payment_status":
      return `Thanks for the note. Our AP team will confirm current payment status for the referenced invoice(s) and follow up shortly.`;
    case "invoice_inquiry":
      return `Thanks for the inquiry. Our AP team is reviewing the invoice you referenced and will respond with details.`;
    case "invoice_submission":
      return `Thank you for submitting the invoice. It has been received and queued for review by our AP team.`;
    case "credit_request":
      return `Thanks for reaching out about a credit. Our AP team will review the request and follow up.`;
    case "dispute":
      return `Thanks for flagging this. Our AP team is investigating the discrepancy and will respond with next steps.`;
    default:
      return `Thanks for reaching out. Our AP team has received your message and will follow up.`;
  }
}

export function makeDefaultDrafter(): Drafter {
  return new TemplateDrafter();
}
