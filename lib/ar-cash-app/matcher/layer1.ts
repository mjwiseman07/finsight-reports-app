/**
 * Layer 1 — Deterministic Matcher (pure function, no I/O).
 */
import { normalizeInvoiceRef } from "../normalization/invoice-ref";
import { normalizePayerName, payerTokenOverlap } from "../normalization/payer-name";

export interface OpenInvoice {
  id: string;
  doc_number: string;
  balance: number;
  currency: string;
  customer_id: string;
  customer_name: string | null;
  customer_email_domain: string | null;
}

export interface RemittanceLineInput {
  invoice_reference: string | null;
  amount_paid: number;
}

export interface PaymentInput {
  id: string;
  amount_received: number;
  currency: string;
  payer_name_raw: string | null;
  sender_email_domain: string | null;
  payment_date: string;
  remittance_lines?: RemittanceLineInput[];
}

export interface MatchCandidate {
  invoice_id: string;
  matched_amount: number;
  match_strategy:
    | "exact_ref_exact_amt"
    | "exact_ref_tolerance"
    | "exact_amt_open_invoice"
    | "remittance_line_ref"
    | "single_open_invoice_exact_amt"
    | "payer_domain_scoped_ref_amt";
  confidence: number;
  tolerance_used_cents: number;
  tolerance_used_days: number;
  rationale: string;
}

export interface MatcherConfig {
  exact_amount_tolerance_cents: number;
  enable_single_open_invoice_shortcut: boolean;
}

export interface MatcherResult {
  candidates: MatchCandidate[];
  pairing_method:
    | "exact_ref"
    | "exact_amount_date"
    | "payer_email_domain"
    | "manual"
    | "unpaired";
}

export function matchLayer1(
  payment: PaymentInput,
  openInvoices: OpenInvoice[],
  config: MatcherConfig,
): MatcherResult {
  const sameCurrencyInvoices = openInvoices.filter((i) => i.currency === payment.currency);
  if (sameCurrencyInvoices.length === 0) {
    return { candidates: [], pairing_method: "unpaired" };
  }

  const cents = (n: number) => Math.round(n * 100);
  const paymentCents = cents(payment.amount_received);
  const tol = config.exact_amount_tolerance_cents;

  const domainScoped = payment.sender_email_domain
    ? sameCurrencyInvoices.filter(
        (i) => i.customer_email_domain === payment.sender_email_domain,
      )
    : [];
  const scoped = domainScoped.length > 0 ? domainScoped : sameCurrencyInvoices;

  if (payment.remittance_lines && payment.remittance_lines.length >= 2) {
    const lineMatches: MatchCandidate[] = [];
    let sumCents = 0;
    let allMatched = true;

    for (const line of payment.remittance_lines) {
      const normRef = normalizeInvoiceRef(line.invoice_reference);
      if (!normRef) {
        allMatched = false;
        break;
      }
      const invoice = scoped.find((i) => normalizeInvoiceRef(i.doc_number) === normRef);
      if (!invoice) {
        allMatched = false;
        break;
      }
      const lineCents = cents(line.amount_paid);
      lineMatches.push({
        invoice_id: invoice.id,
        matched_amount: line.amount_paid,
        match_strategy: "remittance_line_ref",
        confidence: 1.0,
        tolerance_used_cents: 0,
        tolerance_used_days: 0,
        rationale: `Remittance line ${lineMatches.length + 1} matches ${invoice.doc_number} (${normRef}) exactly.`,
      });
      sumCents += lineCents;
    }

    if (allMatched && Math.abs(sumCents - paymentCents) <= tol) {
      return {
        candidates: lineMatches,
        pairing_method:
          payment.sender_email_domain && domainScoped.length > 0
            ? "payer_email_domain"
            : "exact_ref",
      };
    }
  }

  if (payment.remittance_lines && payment.remittance_lines.length === 1) {
    const line = payment.remittance_lines[0];
    const normRef = normalizeInvoiceRef(line.invoice_reference);
    if (normRef) {
      const invoice = scoped.find((i) => normalizeInvoiceRef(i.doc_number) === normRef);
      if (invoice) {
        const invCents = cents(invoice.balance);
        if (Math.abs(paymentCents - invCents) <= tol) {
          const strategy =
            domainScoped.length > 0 ? "payer_domain_scoped_ref_amt" : "exact_ref_exact_amt";
          return {
            candidates: [
              {
                invoice_id: invoice.id,
                matched_amount: payment.amount_received,
                match_strategy: strategy,
                confidence: 1.0,
                tolerance_used_cents: Math.abs(paymentCents - invCents),
                tolerance_used_days: 0,
                rationale: `Invoice ${invoice.doc_number} matches remittance ref ${normRef}; amount ${payment.amount_received} == balance ${invoice.balance}${domainScoped.length > 0 ? " (customer scoped by sender domain)" : ""}.`,
              },
            ],
            pairing_method: domainScoped.length > 0 ? "payer_email_domain" : "exact_ref",
          };
        }
        if (tol > 0 && Math.abs(paymentCents - invCents) <= tol) {
          return {
            candidates: [
              {
                invoice_id: invoice.id,
                matched_amount: payment.amount_received,
                match_strategy: "exact_ref_tolerance",
                confidence: 0.99,
                tolerance_used_cents: Math.abs(paymentCents - invCents),
                tolerance_used_days: 0,
                rationale: `Invoice ${invoice.doc_number} ref matches; amount off by ${Math.abs(paymentCents - invCents)}¢ within tolerance ${tol}.`,
              },
            ],
            pairing_method: "exact_ref",
          };
        }
      }
    }
  }

  if (config.enable_single_open_invoice_shortcut) {
    const normPayerName = normalizePayerName(payment.payer_name_raw);
    const candidateCustomers = new Map<string, OpenInvoice[]>();
    for (const inv of scoped) {
      if (!candidateCustomers.has(inv.customer_id)) candidateCustomers.set(inv.customer_id, []);
      candidateCustomers.get(inv.customer_id)!.push(inv);
    }

    let resolvedCustomerInvoices: OpenInvoice[] | null = null;

    if (payment.sender_email_domain) {
      const domainMatches = [...candidateCustomers.entries()].filter(
        ([, invs]) => invs[0].customer_email_domain === payment.sender_email_domain,
      );
      if (domainMatches.length === 1) {
        resolvedCustomerInvoices = domainMatches[0][1];
      }
    }

    if (!resolvedCustomerInvoices && normPayerName) {
      const nameMatches = [...candidateCustomers.entries()].filter(([, invs]) => {
        const custName = normalizePayerName(invs[0].customer_name);
        return payerTokenOverlap(normPayerName, custName) >= 0.9;
      });
      if (nameMatches.length === 1) {
        resolvedCustomerInvoices = nameMatches[0][1];
      }
    }

    if (resolvedCustomerInvoices && resolvedCustomerInvoices.length === 1) {
      const inv = resolvedCustomerInvoices[0];
      if (Math.abs(cents(inv.balance) - paymentCents) <= tol) {
        return {
          candidates: [
            {
              invoice_id: inv.id,
              matched_amount: payment.amount_received,
              match_strategy: "single_open_invoice_exact_amt",
              confidence: 1.0,
              tolerance_used_cents: 0,
              tolerance_used_days: 0,
              rationale: `Customer has exactly 1 open invoice (${inv.doc_number}) with matching balance ${inv.balance}.`,
            },
          ],
          pairing_method: payment.sender_email_domain ? "payer_email_domain" : "exact_amount_date",
        };
      }
    }
  }

  const amountMatches = scoped.filter((i) => Math.abs(cents(i.balance) - paymentCents) <= tol);
  if (amountMatches.length === 1) {
    const inv = amountMatches[0];
    const normPayerName = normalizePayerName(payment.payer_name_raw);
    const custName = normalizePayerName(inv.customer_name);
    const overlap = payerTokenOverlap(normPayerName, custName);
    if (overlap >= 0.9) {
      return {
        candidates: [
          {
            invoice_id: inv.id,
            matched_amount: payment.amount_received,
            match_strategy: "exact_amt_open_invoice",
            confidence: 1.0,
            tolerance_used_cents: 0,
            tolerance_used_days: 0,
            rationale: `Amount ${payment.amount_received} uniquely matches invoice ${inv.doc_number}; payer name token overlap ${overlap.toFixed(2)}.`,
          },
        ],
        pairing_method: "exact_amount_date",
      };
    }
  }

  return { candidates: [], pairing_method: "unpaired" };
}
