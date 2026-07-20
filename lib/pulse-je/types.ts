// Types for conversational-JE preview flow. Additive-only.
// No dependency on the JE poster — this module only *reads* to build a preview.

export type JeIntentSignal = {
  kind: "reclass" | "post" | "unclear";
  raw_text: string;
  confidence: number; // 0..1
  hints: {
    amount?: number;
    from_account_phrase?: string;
    to_account_phrase?: string;
    memo?: string;
    txn_date_iso?: string;
  };
};

export type ResolvedAccountCandidate = {
  qbo_id: string;
  fully_qualified_name: string;
  name: string;
  account_type: string;
  account_sub_type?: string;
  currency_code?: string;
  active: boolean;
  match_kind: "exact" | "case_insensitive_exact" | "fully_qualified_exact" | "fuzzy";
  match_score: number;
};

export type StrictAccountResolution =
  | { status: "resolved"; account: ResolvedAccountCandidate }
  | { status: "ambiguous"; candidates: ResolvedAccountCandidate[] }
  | { status: "not_found"; searched_phrase: string };

export type JePreviewLine = {
  side: "Debit" | "Credit";
  amount: number;
  account_qbo_id: string;
  account_name: string;
};

export type JePreviewPayload = {
  intent_signal: JeIntentSignal;
  txn_date_iso: string;
  memo: string;
  currency_code: string;
  lines: JePreviewLine[];
  balance_check: { total_debits: number; total_credits: number; balanced: boolean };
  validation: {
    status: "ok" | "warning" | "error";
    messages: string[];
  };
  meta: {
    firm_client_id: string;
    company_id: string;
    resolver_ttl_seconds: number;
    resolver_from_cache: boolean;
  };
};

export type PulseJeAskResponse =
  | { pulse_je: "preview"; preview: JePreviewPayload }
  | {
      pulse_je: "picker";
      question: "which account did you mean?";
      subject: "from" | "to";
      candidates: ResolvedAccountCandidate[];
      hint_phrase: string;
    }
  | {
      pulse_je: "not_found";
      subject: "from" | "to";
      searched_phrase: string;
      message: string;
    }
  | {
      pulse_je: "insufficient_info";
      missing: Array<"amount" | "from_account" | "to_account">;
      message: string;
    }
  | {
      pulse_je: "not_entitled";
      message: string;
    };
