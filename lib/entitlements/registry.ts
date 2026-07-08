/**
 * Doc D Add-On Registry
 *
 * The 6 add-on codes, their display metadata, and default pricing hints.
 * Pricing shown here is for internal UI defaults only — authoritative pricing
 * lives in Stripe. Schema is tier-agnostic on purpose.
 */
export const ADDON_CODES = [
  "ap_intake",
  "ap_pay",
  "ar_invoicing",
  "ar_cash_app",
  "ar_collections",
  "voice_collections",
  "quarantine_review",
  "ap_requisitions",
  "ap_baseline_harvest",
  "ap_three_way_match",
  "ap_budget_controls",
  "ap_credit_prepayment",
] as const;

export type AddonCode = (typeof ADDON_CODES)[number];

export function isAddonCode(x: unknown): x is AddonCode {
  return typeof x === "string" && (ADDON_CODES as readonly string[]).includes(x);
}

export interface AddonMetadata {
  code: AddonCode;
  displayName: string;
  description: string;
  category: "ap" | "ar" | "collections";
  standaloneCapable: boolean;
  defaultMonthlyBaseCents: number;
  defaultIncludedVolume: number;
  defaultOverageUnitCents: number;
  volumeUnit: string;
  requiresWave: 1 | 2 | 3;
}

export const ADDON_REGISTRY: Record<AddonCode, AddonMetadata> = {
  ap_intake: {
    code: "ap_intake",
    displayName: "AP Intake",
    description:
      "Bills arrive at bills.[client].advisacor.com. Claude 3.5 extracts, drafts land in the client's ERP for approval.",
    category: "ap",
    standaloneCapable: true,
    defaultMonthlyBaseCents: 9900,
    defaultIncludedVolume: 50,
    defaultOverageUnitCents: 150,
    volumeUnit: "bill",
    requiresWave: 1,
  },
  ap_pay: {
    code: "ap_pay",
    displayName: "AP Pay",
    description:
      "Melio/BILL payment execution with Trustpair fraud screen. Standalone-capable — reads bills from client ERP if AP Intake is off.",
    category: "ap",
    standaloneCapable: true,
    defaultMonthlyBaseCents: 14900,
    defaultIncludedVolume: 25,
    defaultOverageUnitCents: 200,
    volumeUnit: "payment",
    requiresWave: 2,
  },
  ar_invoicing: {
    code: "ar_invoicing",
    displayName: "AR Invoicing",
    description: "Generate and send customer invoices from client ERP data.",
    category: "ar",
    standaloneCapable: true,
    defaultMonthlyBaseCents: 9900,
    defaultIncludedVolume: 50,
    defaultOverageUnitCents: 125,
    volumeUnit: "invoice_sent",
    requiresWave: 1,
  },
  ar_cash_app: {
    code: "ar_cash_app",
    displayName: "AR Cash Application",
    description:
      "Remittance email → remit.[client].advisacor.com → 5-layer matching → auto-apply in ERP.",
    category: "ar",
    standaloneCapable: true,
    defaultMonthlyBaseCents: 14900,
    defaultIncludedVolume: 50,
    defaultOverageUnitCents: 150,
    volumeUnit: "remittance_matched",
    requiresWave: 1,
  },
  ar_collections: {
    code: "ar_collections",
    displayName: "AR Collections",
    description:
      "Janice-led + AI-assisted dunning, aging follow-up, voice-ready. Standalone premium service.",
    category: "collections",
    standaloneCapable: true,
    defaultMonthlyBaseCents: 24900,
    defaultIncludedVolume: 25,
    defaultOverageUnitCents: 800,
    volumeUnit: "account_worked",
    requiresWave: 1,
  },
  voice_collections: {
    code: "voice_collections",
    displayName: "Voice Collections",
    description:
      "AI voice agent activation on top of AR Collections. Wave 3 feature; DB flag is Wave 1-ready.",
    category: "collections",
    standaloneCapable: false,
    defaultMonthlyBaseCents: 9900,
    defaultIncludedVolume: 0,
    defaultOverageUnitCents: 75,
    volumeUnit: "call_minute",
    requiresWave: 3,
  },
  quarantine_review: {
    code: "quarantine_review",
    displayName: "Quarantine Review",
    description:
      "Reviewer surface for AP bills held in quarantine by the immune system (L1-L11). Includes attestation modal, bookkeeper allowlist gate, and full audit trail. Required to release any bill flagged by the L1-L11 immune system.",
    category: "ap",
    standaloneCapable: false,
    defaultMonthlyBaseCents: 4900,
    defaultIncludedVolume: 50,
    defaultOverageUnitCents: 100,
    volumeUnit: "release_attempt",
    requiresWave: 1,
  },
  ap_requisitions: {
    code: "ap_requisitions",
    displayName: "AP Requisitions & Purchase Orders",
    description:
      "Requisition workflow with approval matrix, PO creation, and goods receipt tracking.",
    category: "ap",
    standaloneCapable: false,
    defaultMonthlyBaseCents: 9900,
    defaultIncludedVolume: 0,
    defaultOverageUnitCents: 0,
    volumeUnit: "requisition",
    requiresWave: 1,
  },
  ap_baseline_harvest: {
    code: "ap_baseline_harvest",
    displayName: "AP Baseline Harvest",
    description:
      "One-time import of existing vendors, POs, bills, and goods receipts from QBO or CSV so three-way match starts on Day 1.",
    category: "ap",
    standaloneCapable: false,
    defaultMonthlyBaseCents: 4900,
    defaultIncludedVolume: 0,
    defaultOverageUnitCents: 0,
    volumeUnit: "harvest_run",
    requiresWave: 1,
  },
  ap_three_way_match: {
    code: "ap_three_way_match",
    displayName: "AP Three-Way-Match",
    description:
      "Automatic invoice-to-PO-to-goods-receipt reconciliation with variance and closed-PO quarantine.",
    category: "ap",
    standaloneCapable: false,
    defaultMonthlyBaseCents: 4900,
    defaultIncludedVolume: 0,
    defaultOverageUnitCents: 0,
    volumeUnit: "match_eval",
    requiresWave: 1,
  },
  ap_budget_controls: {
    code: "ap_budget_controls",
    displayName: "AP Budget Controls",
    description:
      "GL-account monthly budget enforcement, vendor spend history, and tolerance-based budget checks on requisitions and bills.",
    category: "ap",
    standaloneCapable: false,
    defaultMonthlyBaseCents: 0,
    defaultIncludedVolume: 0,
    defaultOverageUnitCents: 0,
    volumeUnit: "budget_check",
    requiresWave: 2,
  },
  ap_credit_prepayment: {
    code: "ap_credit_prepayment",
    displayName: "AP Credits & Prepayment",
    description:
      "Vendor credit/debit memos, prepayment sub-ledger, aging sweep, and human-only refund draft reviewer queue.",
    category: "ap",
    standaloneCapable: false,
    defaultMonthlyBaseCents: 4900,
    defaultIncludedVolume: 0,
    defaultOverageUnitCents: 0,
    volumeUnit: "credit_prepayment_event",
    requiresWave: 2,
  },
};

export function getAddonMetadata(code: AddonCode): AddonMetadata {
  return ADDON_REGISTRY[code];
}

export function listAddonCodes(): AddonCode[] {
  return [...ADDON_CODES];
}
