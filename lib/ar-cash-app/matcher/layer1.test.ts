import { describe, test, expect } from "vitest";
import { matchLayer1, type OpenInvoice, type PaymentInput, type MatcherConfig } from "./layer1";

const cfg: MatcherConfig = {
  exact_amount_tolerance_cents: 0,
  enable_single_open_invoice_shortcut: true,
};

function inv(overrides: Partial<OpenInvoice>): OpenInvoice {
  return {
    id: "inv-1",
    doc_number: "INV-4521",
    balance: 750,
    currency: "USD",
    customer_id: "cust-1",
    customer_name: "Acme Corporation",
    customer_email_domain: "acmecorp.com",
    ...overrides,
  };
}

function pay(overrides: Partial<PaymentInput>): PaymentInput {
  return {
    id: "pay-1",
    amount_received: 750,
    currency: "USD",
    payer_name_raw: "ACME CORP LLC",
    sender_email_domain: null,
    payment_date: "2026-07-05",
    ...overrides,
  };
}

describe("matchLayer1", () => {
  test("exact_ref_exact_amt single line hits", () => {
    const r = matchLayer1(
      pay({ remittance_lines: [{ invoice_reference: "INV-4521", amount_paid: 750 }] }),
      [inv({})],
      cfg,
    );
    expect(r.candidates).toHaveLength(1);
    expect(r.candidates[0].match_strategy).toBe("exact_ref_exact_amt");
    expect(r.candidates[0].confidence).toBe(1.0);
  });

  test("payer_domain_scoped_ref_amt when sender_email_domain matches", () => {
    const r = matchLayer1(
      pay({
        sender_email_domain: "acmecorp.com",
        remittance_lines: [{ invoice_reference: "INV-4521", amount_paid: 750 }],
      }),
      [
        inv({}),
        inv({
          id: "inv-2",
          doc_number: "INV-4521",
          customer_id: "cust-2",
          customer_email_domain: "other.com",
        }),
      ],
      cfg,
    );
    expect(r.candidates).toHaveLength(1);
    expect(r.candidates[0].match_strategy).toBe("payer_domain_scoped_ref_amt");
    expect(r.candidates[0].invoice_id).toBe("inv-1");
    expect(r.pairing_method).toBe("payer_email_domain");
  });

  test("remittance_line_ref multi-line sum equals payment", () => {
    const r = matchLayer1(
      pay({
        amount_received: 1250,
        remittance_lines: [
          { invoice_reference: "INV-4521", amount_paid: 750 },
          { invoice_reference: "INV-4522", amount_paid: 500 },
        ],
      }),
      [inv({}), inv({ id: "inv-2", doc_number: "INV-4522", balance: 500 })],
      cfg,
    );
    expect(r.candidates).toHaveLength(2);
    expect(r.candidates.every((c) => c.match_strategy === "remittance_line_ref")).toBe(true);
  });

  test("single_open_invoice_exact_amt via domain resolution", () => {
    const r = matchLayer1(
      pay({ amount_received: 750, sender_email_domain: "acmecorp.com" }),
      [inv({})],
      cfg,
    );
    expect(r.candidates).toHaveLength(1);
    expect(r.candidates[0].match_strategy).toBe("single_open_invoice_exact_amt");
  });

  test("single_open_invoice_exact_amt via payer name overlap ≥ 0.9", () => {
    const r = matchLayer1(
      pay({ amount_received: 750, payer_name_raw: "ACME CORPORATION" }),
      [inv({ customer_name: "Acme Corporation" })],
      cfg,
    );
    expect(r.candidates).toHaveLength(1);
    expect(r.candidates[0].match_strategy).toBe("single_open_invoice_exact_amt");
  });

  test("exact_amt_open_invoice with high name overlap", () => {
    const r = matchLayer1(
      pay({ amount_received: 750, payer_name_raw: "FISHER SCIENTIFIC", sender_email_domain: null }),
      [
        inv({ customer_name: "Fisher Scientific Co", customer_email_domain: null }),
        inv({
          id: "inv-2",
          doc_number: "INV-9999",
          balance: 999,
          customer_id: "cust-2",
          customer_name: "Other Corp",
          customer_email_domain: null,
        }),
        inv({
          id: "inv-3",
          doc_number: "INV-8888",
          balance: 800,
          customer_id: "cust-3",
          customer_name: "Third Corp",
          customer_email_domain: null,
        }),
      ],
      { ...cfg, enable_single_open_invoice_shortcut: false },
    );
    expect(r.candidates).toHaveLength(1);
    expect(r.candidates[0].match_strategy).toBe("exact_amt_open_invoice");
  });

  test("currency mismatch returns no match", () => {
    const r = matchLayer1(pay({ currency: "EUR" }), [inv({ currency: "USD" })], cfg);
    expect(r.candidates).toEqual([]);
    expect(r.pairing_method).toBe("unpaired");
  });

  test("amount off by 1 cent with zero tolerance = no match", () => {
    const r = matchLayer1(
      pay({
        amount_received: 749.99,
        remittance_lines: [{ invoice_reference: "INV-4521", amount_paid: 749.99 }],
      }),
      [inv({})],
      cfg,
    );
    expect(r.candidates).toEqual([]);
  });

  test("empty open invoice list returns no match", () => {
    const r = matchLayer1(pay({}), [], cfg);
    expect(r.candidates).toEqual([]);
  });

  test("ambiguous amount match (2 invoices same amount) = no match", () => {
    const r = matchLayer1(
      pay({ payer_name_raw: null, sender_email_domain: null }),
      [
        inv({ id: "inv-a", balance: 750, customer_name: "A Corp" }),
        inv({
          id: "inv-b",
          balance: 750,
          customer_id: "cust-b",
          customer_name: "B Corp",
        }),
      ],
      cfg,
    );
    expect(r.candidates).toEqual([]);
  });

  test("shortcut disabled skips single_open_invoice strategy", () => {
    const r = matchLayer1(
      pay({ amount_received: 750, sender_email_domain: "acmecorp.com" }),
      [inv({})],
      { ...cfg, enable_single_open_invoice_shortcut: false },
    );
    expect(r.candidates[0].match_strategy).toBe("exact_amt_open_invoice");
  });

  test("tolerance > 0 catches penny discrepancy", () => {
    const r = matchLayer1(
      pay({
        amount_received: 749.99,
        remittance_lines: [{ invoice_reference: "INV-4521", amount_paid: 749.99 }],
      }),
      [inv({ balance: 750 })],
      { ...cfg, exact_amount_tolerance_cents: 1 },
    );
    expect(r.candidates).toHaveLength(1);
    expect(r.candidates[0].tolerance_used_cents).toBe(1);
  });

  test("zero amount payment returns no match", () => {
    const r = matchLayer1(pay({ amount_received: 0 }), [inv({})], cfg);
    expect(r.candidates).toEqual([]);
  });

  test("negative amount (refund) returns no match at Layer 1", () => {
    const r = matchLayer1(pay({ amount_received: -750 }), [inv({})], cfg);
    expect(r.candidates).toEqual([]);
  });

  test("normalized ref with prefix + zeros still matches", () => {
    const r = matchLayer1(
      pay({
        remittance_lines: [{ invoice_reference: "invoice #0004521", amount_paid: 750 }],
      }),
      [inv({ doc_number: "INV-4521" })],
      cfg,
    );
    expect(r.candidates).toHaveLength(1);
    expect(r.candidates[0].match_strategy).toBe("exact_ref_exact_amt");
  });
});
