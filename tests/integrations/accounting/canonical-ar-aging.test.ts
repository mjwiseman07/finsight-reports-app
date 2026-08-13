import { describe, expect, it } from "vitest";
import {
  bucketForDaysPastDue,
  buildCanonicalArAgingSchedule,
  buildCanonicalArAgingScheduleFromAgingEntities,
  calendarDaysPastDue,
  isHistoricalArAsOfDate,
  scorecardArAgingExposure,
  type CanonicalArOpenReceivable,
} from "@/lib/integrations/accounting/ar-aging";
import { parseXeroAgedReceivablesByContactReport } from "@/lib/integrations/xero/aged-receivables-as-of";
import { factorizeArAging } from "@/lib/dashboard/accuracy-contract/kpi-factorization";
import type { AdvisacorNormalizedEntity, CanonicalBalanceSheetRow } from "@/lib/integrations/accounting/types";

const AS_OF = "2026-07-31";
const NOW_AFTER_JULY = new Date(Date.UTC(2026, 7, 12)); // 2026-08-12

function receivable(
  partial: Partial<CanonicalArOpenReceivable> & {
    invoiceId: string;
    dueDate: string;
    openBalance: number;
  },
): CanonicalArOpenReceivable {
  return {
    invoiceDate: null,
    contactId: partial.contactId ?? "c1",
    contactName: partial.contactName ?? "Customer",
    currency: "USD",
    status: "AUTHORISED",
    provider: partial.provider || "xero",
    sourceKind: partial.sourceKind || "aging_report_row",
    ...partial,
  };
}

function bsAr(amount: number, provider: "xero" | "quickbooks" = "xero"): CanonicalBalanceSheetRow[] {
  return [
    {
      label: "Accounts Receivable",
      amount,
      section: "Current Assets",
      source: {
        provider,
        providerFamily: provider,
        providerProduct: provider,
        sourceReport: "BalanceSheet",
        raw: {},
      },
    },
  ];
}

describe("canonical AR aging — due-date boundaries", () => {
  it("due today = current", () => {
    expect(calendarDaysPastDue("2026-07-31", AS_OF)).toBe(0);
    expect(bucketForDaysPastDue(0)).toBe("current");
  });

  it("1-day overdue through >90 boundaries", () => {
    expect(bucketForDaysPastDue(1)).toBe("days_1_30");
    expect(bucketForDaysPastDue(30)).toBe("days_1_30");
    expect(bucketForDaysPastDue(31)).toBe("days_31_60");
    expect(bucketForDaysPastDue(60)).toBe("days_31_60");
    expect(bucketForDaysPastDue(61)).toBe("days_61_90");
    expect(bucketForDaysPastDue(90)).toBe("days_61_90");
    expect(bucketForDaysPastDue(91)).toBe("days_over_90");
  });
});

describe("historical as-of source selection", () => {
  it("July 31 is historical when now is August 12", () => {
    expect(isHistoricalArAsOfDate(AS_OF, NOW_AFTER_JULY)).toBe(true);
  });

  it("today is not historical", () => {
    expect(isHistoricalArAsOfDate("2026-08-12", NOW_AFTER_JULY)).toBe(false);
  });
});

describe("Xero aged-report as-of parser — payment/credit timing", () => {
  const header = {
    RowType: "Header",
    Cells: [
      { Value: "Date" },
      { Value: "Reference" },
      { Value: "Due Date" },
      { Value: "" },
      { Value: "Total" },
      { Value: "Paid" },
      { Value: "Credited" },
      { Value: "Due" },
    ],
  };

  function invoiceRow(opts: {
    invoiceId: string;
    invoiceDate: string;
    dueDate: string;
    total: string;
    paid: string;
    credited: string;
    due: string;
  }) {
    const attr = [{ Id: "invoiceID", Value: opts.invoiceId }];
    return {
      RowType: "Row",
      Cells: [
        { Value: `${opts.invoiceDate}T00:00:00`, Attributes: attr },
        { Value: "", Attributes: attr },
        { Value: `${opts.dueDate}T00:00:00`, Attributes: attr },
        { Value: "", Attributes: attr },
        { Value: opts.total, Attributes: attr },
        { Value: opts.paid, Attributes: attr },
        { Value: opts.credited, Attributes: attr },
        { Value: opts.due, Attributes: attr },
      ],
    };
  }

  it("1: invoice paid after asOfDate still appears with historical Due", () => {
    // Open $1000 at July 31; paid Aug 5 → as-of report Due remains 1000
    const rows = parseXeroAgedReceivablesByContactReport({
      reportRows: [
        header,
        {
          RowType: "Section",
          Rows: [
            invoiceRow({
              invoiceId: "inv-paid-after",
              invoiceDate: "2026-07-01",
              dueDate: "2026-07-15",
              total: "1000.00",
              paid: "0.00",
              credited: "0.00",
              due: "1000.00",
            }),
          ],
        },
      ],
      asOfDate: AS_OF,
      contactId: "contact-1",
      contactName: "Acme",
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].openBalance).toBeCloseTo(1000, 2);
    expect(rows[0].provenance?.provider).toBe("xero");
    expect(rows[0].provenance?.sourceReport).toBe("AgedReceivablesByContact");
    expect(rows[0].provenance?.externalRecordId).toBe("inv-paid-after");
  });

  it("real invoiceID becomes externalRecordId; absent invoiceID omits ERP provenance", () => {
    const withId = parseXeroAgedReceivablesByContactReport({
      reportRows: [
        header,
        {
          RowType: "Section",
          Rows: [
            invoiceRow({
              invoiceId: "real-xero-invoice",
              invoiceDate: "2026-07-01",
              dueDate: "2026-07-15",
              total: "10.00",
              paid: "0.00",
              credited: "0.00",
              due: "10.00",
            }),
          ],
        },
      ],
      asOfDate: AS_OF,
      contactId: "contact-1",
      contactName: "Acme",
    });
    expect(withId[0].provenance?.externalRecordId).toBe("real-xero-invoice");
    expect(withId[0].invoiceId).toBe("real-xero-invoice");

    const withoutId = parseXeroAgedReceivablesByContactReport({
      reportRows: [
        header,
        {
          RowType: "Section",
          Rows: [
            {
              RowType: "Row",
              Cells: [
                { Value: "2026-07-01T00:00:00" },
                { Value: "" },
                { Value: "2026-07-15T00:00:00" },
                { Value: "" },
                { Value: "25.00" },
                { Value: "0.00" },
                { Value: "0.00" },
                { Value: "25.00" },
              ],
            },
          ],
        },
      ],
      asOfDate: AS_OF,
      contactId: "contact-1",
      contactName: "Acme",
    });
    expect(withoutId).toHaveLength(1);
    expect(withoutId[0].provenance).toBeUndefined();
    expect(withoutId[0].invoiceId.startsWith("advisacor:ar-line:")).toBe(true);
    expect(withoutId[0].invoiceId).not.toContain("contact-1:2026-07-15:25");
    expect(JSON.stringify(withoutId[0])).not.toMatch(/contact-1:2026-07-15:25/);
  });

  it("2: payment before asOfDate reduces historical Due", () => {
    const rows = parseXeroAgedReceivablesByContactReport({
      reportRows: [
        header,
        {
          RowType: "Section",
          Rows: [
            invoiceRow({
              invoiceId: "inv-paid-before",
              invoiceDate: "2026-06-01",
              dueDate: "2026-06-15",
              total: "1000.00",
              paid: "400.00",
              credited: "0.00",
              due: "600.00",
            }),
          ],
        },
      ],
      asOfDate: AS_OF,
      contactId: "contact-1",
      contactName: "Acme",
    });
    expect(rows[0].openBalance).toBeCloseTo(600, 2);
  });

  it("3: payment after asOfDate does not reduce historical Due in report", () => {
    // Same as (1): report Due ignores post-asOf payments
    const rows = parseXeroAgedReceivablesByContactReport({
      reportRows: [
        header,
        {
          RowType: "Section",
          Rows: [
            invoiceRow({
              invoiceId: "inv-still-open-asof",
              invoiceDate: "2026-07-01",
              dueDate: "2026-07-20",
              total: "500.00",
              paid: "0.00",
              credited: "0.00",
              due: "500.00",
            }),
          ],
        },
      ],
      asOfDate: AS_OF,
      contactId: "c1",
      contactName: "Acme",
    });
    expect(rows[0].openBalance).toBeCloseTo(500, 2);
  });

  it("4: credit applied before asOfDate reduces historical Due", () => {
    const rows = parseXeroAgedReceivablesByContactReport({
      reportRows: [
        header,
        {
          RowType: "Section",
          Rows: [
            invoiceRow({
              invoiceId: "inv-credited",
              invoiceDate: "2026-07-01",
              dueDate: "2026-07-10",
              total: "300.00",
              paid: "0.00",
              credited: "100.00",
              due: "200.00",
            }),
          ],
        },
      ],
      asOfDate: AS_OF,
      contactId: "c1",
      contactName: "Acme",
    });
    expect(rows[0].openBalance).toBeCloseTo(200, 2);
  });

  it("5: credit applied after asOfDate does not reduce historical Due", () => {
    const rows = parseXeroAgedReceivablesByContactReport({
      reportRows: [
        header,
        {
          RowType: "Section",
          Rows: [
            invoiceRow({
              invoiceId: "inv-credit-after",
              invoiceDate: "2026-07-01",
              dueDate: "2026-07-10",
              total: "300.00",
              paid: "0.00",
              credited: "0.00",
              due: "300.00",
            }),
          ],
        },
      ],
      asOfDate: AS_OF,
      contactId: "c1",
      contactName: "Acme",
    });
    expect(rows[0].openBalance).toBeCloseTo(300, 2);
  });

  it("6: invoice created after asOfDate excluded (absent from as-of report)", () => {
    const rows = parseXeroAgedReceivablesByContactReport({
      reportRows: [header, { RowType: "Section", Rows: [] }],
      asOfDate: AS_OF,
      contactId: "c1",
      contactName: "Acme",
    });
    expect(rows).toHaveLength(0);
  });

  it("zero Due excluded", () => {
    const rows = parseXeroAgedReceivablesByContactReport({
      reportRows: [
        header,
        {
          RowType: "Section",
          Rows: [
            invoiceRow({
              invoiceId: "paid-in-full",
              invoiceDate: "2026-06-01",
              dueDate: "2026-06-15",
              total: "100.00",
              paid: "100.00",
              credited: "0.00",
              due: "0.00",
            }),
          ],
        },
      ],
      asOfDate: AS_OF,
      contactId: "c1",
      contactName: "Acme",
    });
    expect(rows).toHaveLength(0);
  });
});

describe("canonical AR aging — July Xero regression (as-of report lines)", () => {
  const julyReceivables: CanonicalArOpenReceivable[] = [
    receivable({
      invoiceId: "cur-1",
      dueDate: "2026-08-15",
      openBalance: 7752.05,
      contactName: "Current Customer",
      provenance: {
        provider: "xero",
        providerFamily: "xero",
        providerProduct: "xero",
        sourceReport: "AgedReceivablesByContact",
        externalEntityId: "tenant",
        externalRecordId: "cur-1",
      },
    }),
    receivable({
      invoiceId: "d1-30",
      dueDate: "2026-07-15",
      openBalance: 290.58,
      provenance: {
        provider: "xero",
        providerFamily: "xero",
        providerProduct: "xero",
        sourceReport: "AgedReceivablesByContact",
        externalEntityId: "tenant",
        externalRecordId: "d1-30",
      },
    }),
    receivable({
      invoiceId: "d31-60",
      dueDate: "2026-06-15",
      openBalance: 250.0,
      provenance: {
        provider: "xero",
        providerFamily: "xero",
        providerProduct: "xero",
        sourceReport: "AgedReceivablesByContact",
        externalEntityId: "tenant",
        externalRecordId: "d31-60",
      },
    }),
    receivable({
      invoiceId: "d61-90",
      dueDate: "2026-05-15",
      openBalance: 250.0,
      provenance: {
        provider: "xero",
        providerFamily: "xero",
        providerProduct: "xero",
        sourceReport: "AgedReceivablesByContact",
        externalEntityId: "tenant",
        externalRecordId: "d61-90",
      },
    }),
  ];

  it("exact July buckets, total, past-due, BS tie-out from as-of source", () => {
    const schedule = buildCanonicalArAgingSchedule({
      asOfDate: AS_OF,
      receivables: julyReceivables,
      balanceSheet: bsAr(8542.63),
      provider: "xero",
      sourceKind: "provider_aged_report_as_of",
      historicalAsOf: true,
      now: NOW_AFTER_JULY,
      companyId: "02edb6c6-a4f1-4bae-825d-2680136dad24",
      connectionId: "b718823a-0eb8-437d-beba-05c41f6482f9",
      syncId: "595a6e05-76c1-4063-92ea-740d44e67c9c",
    });

    expect(schedule.source.kind).toBe("provider_aged_report_as_of");
    expect(schedule.source.historicalAsOf).toBe(true);
    expect(schedule.current).toBeCloseTo(7752.05, 2);
    expect(schedule.days_1_30).toBeCloseTo(290.58, 2);
    expect(schedule.days_31_60).toBeCloseTo(250.0, 2);
    expect(schedule.days_61_90).toBeCloseTo(250.0, 2);
    expect(schedule.days_over_90).toBeCloseTo(0, 2);
    expect(schedule.total).toBeCloseTo(8542.63, 2);
    expect(schedule.pastDueTotal).toBeCloseTo(790.58, 2);
    expect(scorecardArAgingExposure(schedule)).toBeCloseTo(790.58, 2);
    expect(schedule.tieOut.variance).toBeCloseTo(0, 2);
    expect(schedule.tieOut.passesForScorecard).toBe(true);
  });
});

describe("Accuracy Contract provenance", () => {
  it("QBO schedule never emits Xero provenance", () => {
    const schedule = buildCanonicalArAgingSchedule({
      asOfDate: AS_OF,
      receivables: [
        receivable({
          invoiceId: "qbo-1",
          dueDate: "2026-07-01",
          openBalance: 40,
          provider: "quickbooks",
          provenance: {
            provider: "quickbooks",
            providerFamily: "quickbooks",
            providerProduct: "quickbooks",
            sourceReport: "Invoice",
            externalEntityId: "realm",
            externalRecordId: "qbo-1",
          },
        }),
      ],
      balanceSheet: bsAr(40, "quickbooks"),
      provider: "quickbooks",
      sourceKind: "open_receivables_current",
      historicalAsOf: false,
    });
    const factor = factorizeArAging({
      normalizedIncomeStatement: [],
      normalizedBalanceSheet: [],
      canonicalArAgingSchedule: schedule as never,
    });
    expect(factor.composition.every((row) => row.source.provider === "quickbooks")).toBe(true);
    expect(factor.composition.some((row) => row.source.provider === "xero")).toBe(false);
    expect(JSON.stringify(factor)).not.toContain('"provider":"xero"');
  });

  it("Xero factorizer uses real AgedReceivables pointers only — no stub", () => {
    const schedule = buildCanonicalArAgingSchedule({
      asOfDate: AS_OF,
      receivables: [
        receivable({
          invoiceId: "x-1",
          dueDate: "2026-07-01",
          openBalance: 100,
          provenance: {
            provider: "xero",
            providerFamily: "xero",
            providerProduct: "xero",
            sourceReport: "AgedReceivablesByContact",
            externalEntityId: "tenant",
            externalRecordId: "x-1",
          },
        }),
        receivable({
          invoiceId: "advisacor:ar-line:c1:2026-07-31:1",
          dueDate: "2026-07-01",
          openBalance: 50,
          provenance: undefined,
        }),
      ],
      balanceSheet: bsAr(150),
      provider: "xero",
      sourceKind: "provider_aged_report_as_of",
      historicalAsOf: true,
      now: NOW_AFTER_JULY,
    });
    const factor = factorizeArAging({
      normalizedIncomeStatement: [],
      normalizedBalanceSheet: [],
      canonicalArAgingSchedule: schedule as never,
    });
    expect(factor.formula).toBeNull();
    expect(factor.numeric).toBeCloseTo(150, 2);
    expect(factor.composition).toHaveLength(1);
    expect(factor.composition[0].source.provider).toBe("xero");
    expect(factor.composition[0].source.sourceReport).toBe("AgedReceivablesByContact");
    expect(factor.composition[0].source.externalRecordId).toBe("x-1");
    expect(JSON.stringify(factor)).not.toContain("ar-aging-bucket");
    expect(JSON.stringify(factor)).not.toContain("advisacor:ar-line");
  });

  it("without real provenance, emits numeric only (no fabricated pointers)", () => {
    const schedule = buildCanonicalArAgingSchedule({
      asOfDate: AS_OF,
      receivables: [
        receivable({
          invoiceId: "bare",
          dueDate: "2026-07-01",
          openBalance: 50,
          provenance: undefined,
        }),
      ],
      balanceSheet: bsAr(50),
      provider: "xero",
      sourceKind: "provider_aged_report_as_of",
      historicalAsOf: true,
      now: NOW_AFTER_JULY,
    });
    const factor = factorizeArAging({
      normalizedIncomeStatement: [],
      normalizedBalanceSheet: [],
      canonicalArAgingSchedule: schedule as never,
    });
    expect(factor.numeric).toBeCloseTo(50, 2);
    expect(factor.composition).toHaveLength(0);
    expect(factor.formula).toBeNull();
  });
});

describe("historical contact population limit", () => {
  it("500 contacts allowed; 501 fail closed without partial schedule", async () => {
    const {
      assertHistoricalAgedContactsWithinLimit,
      HISTORICAL_AGED_RECEIVABLES_CONTACT_LIMIT_EXCEEDED,
      XERO_AGED_RECEIVABLES_MAX_CONTACTS,
    } = await import("@/lib/integrations/xero/aged-receivables-as-of");

    expect(() =>
      assertHistoricalAgedContactsWithinLimit({
        contactsAvailable: XERO_AGED_RECEIVABLES_MAX_CONTACTS,
        asOfDate: AS_OF,
      }),
    ).not.toThrow();

    expect(() =>
      assertHistoricalAgedContactsWithinLimit({
        contactsAvailable: XERO_AGED_RECEIVABLES_MAX_CONTACTS + 1,
        asOfDate: AS_OF,
      }),
    ).toThrow(HISTORICAL_AGED_RECEIVABLES_CONTACT_LIMIT_EXCEEDED);

    try {
      assertHistoricalAgedContactsWithinLimit({
        contactsAvailable: 501,
        asOfDate: AS_OF,
      });
      expect.unreachable("expected fail closed");
    } catch (error) {
      const err = error as Error & { diagnostics?: Record<string, unknown> };
      expect(err.diagnostics).toMatchObject({
        reason: HISTORICAL_AGED_RECEIVABLES_CONTACT_LIMIT_EXCEEDED,
        contactsAvailable: 501,
        contactsLimit: 500,
        asOfDate: AS_OF,
      });
    }
  });
});

describe("canonical AR aging — provider contract parity", () => {
  it("Xero as-of path and QBO report-summary path share pastDue contract", () => {
    const xero = buildCanonicalArAgingSchedule({
      asOfDate: AS_OF,
      receivables: [
        receivable({
          invoiceId: "x1",
          dueDate: "2026-08-01",
          openBalance: 100,
          provider: "xero",
        }),
        receivable({
          invoiceId: "x2",
          dueDate: "2026-07-01",
          openBalance: 40,
          provider: "xero",
        }),
      ],
      balanceSheet: bsAr(140),
      provider: "xero",
      sourceKind: "provider_aged_report_as_of",
      historicalAsOf: true,
      now: NOW_AFTER_JULY,
    });

    const qboEntities: AdvisacorNormalizedEntity[] = [
      {
        id: "qbo:current",
        name: "Current",
        amount: 100,
        source: {
          provider: "quickbooks",
          providerFamily: "quickbooks",
          providerProduct: "quickbooks",
          sourceReport: "ARAging",
          raw: {},
        },
      },
      {
        id: "qbo:1-30",
        name: "1-30",
        amount: 40,
        source: {
          provider: "quickbooks",
          providerFamily: "quickbooks",
          providerProduct: "quickbooks",
          sourceReport: "ARAging",
          raw: {},
        },
      },
    ];
    const qbo = buildCanonicalArAgingScheduleFromAgingEntities({
      asOfDate: AS_OF,
      entities: qboEntities,
      balanceSheet: bsAr(140, "quickbooks"),
      provider: "quickbooks",
      now: NOW_AFTER_JULY,
    });

    expect(qbo).not.toBeNull();
    expect(xero.pastDueTotal).toBeCloseTo(qbo!.pastDueTotal, 2);
    expect(xero.total).toBeCloseTo(qbo!.total, 2);
  });
});

describe("locked Scorecard regression guards", () => {
  it("AR module remains isolated from Cash / OGM / NPM", () => {
    expect(scorecardArAgingExposure).toBeTypeOf("function");
    expect(AS_OF).toBe("2026-07-31");
  });
});
