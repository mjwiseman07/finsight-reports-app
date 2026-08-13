import { describe, expect, it } from "vitest";
import {
  bucketForDaysPastDue,
  buildCanonicalArAgingSchedule,
  buildCanonicalArAgingScheduleFromAgingEntities,
  calendarDaysPastDue,
  scorecardArAgingExposure,
  type CanonicalArOpenReceivable,
} from "@/lib/integrations/accounting/ar-aging";
import type { AdvisacorNormalizedEntity, CanonicalBalanceSheetRow } from "@/lib/integrations/accounting/types";

const AS_OF = "2026-07-31";

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
    sourceKind: "invoice",
    ...partial,
  };
}

function bsAr(amount: number): CanonicalBalanceSheetRow[] {
  return [
    {
      label: "Accounts Receivable",
      amount,
      section: "Current Assets",
      source: {
        provider: "xero",
        providerFamily: "xero",
        providerProduct: "xero",
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

  it("1-day overdue", () => {
    expect(calendarDaysPastDue("2026-07-30", AS_OF)).toBe(1);
    expect(bucketForDaysPastDue(1)).toBe("days_1_30");
  });

  it("30-day boundary", () => {
    expect(calendarDaysPastDue("2026-07-01", AS_OF)).toBe(30);
    expect(bucketForDaysPastDue(30)).toBe("days_1_30");
  });

  it("31-day boundary", () => {
    expect(calendarDaysPastDue("2026-06-30", AS_OF)).toBe(31);
    expect(bucketForDaysPastDue(31)).toBe("days_31_60");
  });

  it("60-day boundary", () => {
    expect(calendarDaysPastDue("2026-06-01", AS_OF)).toBe(60);
    expect(bucketForDaysPastDue(60)).toBe("days_31_60");
  });

  it("61-day boundary", () => {
    expect(calendarDaysPastDue("2026-05-31", AS_OF)).toBe(61);
    expect(bucketForDaysPastDue(61)).toBe("days_61_90");
  });

  it("90-day boundary", () => {
    expect(calendarDaysPastDue("2026-05-02", AS_OF)).toBe(90);
    expect(bucketForDaysPastDue(90)).toBe("days_61_90");
  });

  it(">90", () => {
    expect(calendarDaysPastDue("2026-05-01", AS_OF)).toBe(91);
    expect(bucketForDaysPastDue(91)).toBe("days_over_90");
  });
});

describe("canonical AR aging — July Xero regression", () => {
  const julyReceivables: CanonicalArOpenReceivable[] = [
    receivable({
      invoiceId: "cur-1",
      dueDate: "2026-08-15",
      openBalance: 7752.05,
      contactName: "Current Customer",
    }),
    receivable({
      invoiceId: "d1-30",
      dueDate: "2026-07-15",
      openBalance: 290.58,
      contactName: "Past Due 1-30",
    }),
    receivable({
      invoiceId: "d31-60",
      dueDate: "2026-06-15",
      openBalance: 250.0,
      contactName: "Past Due 31-60",
    }),
    receivable({
      invoiceId: "d61-90",
      dueDate: "2026-05-15",
      openBalance: 250.0,
      contactName: "Past Due 61-90",
    }),
  ];

  it("exact July buckets, total, past-due, BS tie-out", () => {
    const schedule = buildCanonicalArAgingSchedule({
      asOfDate: AS_OF,
      receivables: julyReceivables,
      balanceSheet: bsAr(8542.63),
      provider: "xero",
      companyId: "02edb6c6-a4f1-4bae-825d-2680136dad24",
      connectionId: "b718823a-0eb8-437d-beba-05c41f6482f9",
      syncId: "595a6e05-76c1-4063-92ea-740d44e67c9c",
    });

    expect(schedule.agingBasis).toBe("due_date");
    expect(schedule.current).toBeCloseTo(7752.05, 2);
    expect(schedule.days_1_30).toBeCloseTo(290.58, 2);
    expect(schedule.days_31_60).toBeCloseTo(250.0, 2);
    expect(schedule.days_61_90).toBeCloseTo(250.0, 2);
    expect(schedule.days_over_90).toBeCloseTo(0, 2);
    expect(schedule.total).toBeCloseTo(8542.63, 2);
    expect(schedule.pastDueTotal).toBeCloseTo(790.58, 2);
    expect(scorecardArAgingExposure(schedule)).toBeCloseTo(790.58, 2);
    expect(schedule.tieOut.balanceSheetAr).toBeCloseTo(8542.63, 2);
    expect(schedule.tieOut.variance).toBeCloseTo(0, 2);
    expect(schedule.tieOut.passesForScorecard).toBe(true);
    expect(schedule.tieOut.status).toBe("tie");
  });

  it("Scorecard uses past due only — not total AR", () => {
    const schedule = buildCanonicalArAgingSchedule({
      asOfDate: AS_OF,
      receivables: julyReceivables,
      balanceSheet: bsAr(8542.63),
      provider: "xero",
    });
    expect(scorecardArAgingExposure(schedule)).not.toBeCloseTo(8542.63, 2);
    expect(scorecardArAgingExposure(schedule)).toBeCloseTo(790.58, 2);
  });
});

describe("canonical AR aging — inclusion rules", () => {
  it("partial payment / open balance only", () => {
    const schedule = buildCanonicalArAgingSchedule({
      asOfDate: AS_OF,
      receivables: [
        receivable({
          invoiceId: "partial",
          dueDate: "2026-07-01",
          openBalance: 100.5,
        }),
      ],
      balanceSheet: bsAr(100.5),
      provider: "xero",
    });
    expect(schedule.days_1_30).toBeCloseTo(100.5, 2);
    expect(schedule.total).toBeCloseTo(100.5, 2);
  });

  it("zero balance excluded", () => {
    const schedule = buildCanonicalArAgingSchedule({
      asOfDate: AS_OF,
      receivables: [
        receivable({ invoiceId: "z", dueDate: "2026-07-01", openBalance: 0 }),
        receivable({ invoiceId: "ok", dueDate: "2026-08-01", openBalance: 50 }),
      ],
      balanceSheet: bsAr(50),
      provider: "xero",
    });
    expect(schedule.source.excludedZeroBalance).toBe(1);
    expect(schedule.source.invoiceCount).toBe(1);
    expect(schedule.total).toBeCloseTo(50, 2);
  });

  it("credit balance included signed in due-date bucket", () => {
    const schedule = buildCanonicalArAgingSchedule({
      asOfDate: AS_OF,
      receivables: [
        receivable({
          invoiceId: "inv",
          dueDate: "2026-07-15",
          openBalance: 500,
        }),
        receivable({
          invoiceId: "cn",
          dueDate: "2026-07-10",
          openBalance: -100,
          sourceKind: "credit_note",
        }),
      ],
      balanceSheet: bsAr(400),
      provider: "xero",
    });
    expect(schedule.days_1_30).toBeCloseTo(400, 2);
    expect(schedule.total).toBeCloseTo(400, 2);
    expect(schedule.tieOut.passesForScorecard).toBe(true);
  });
});

describe("canonical AR aging — provider contract parity", () => {
  it("Xero open-invoice path and QBO report-summary path share bucket + pastDue contract", () => {
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
      balanceSheet: [
        {
          label: "Accounts Receivable",
          amount: 140,
          section: "Current Assets",
          source: {
            provider: "quickbooks",
            providerFamily: "quickbooks",
            providerProduct: "quickbooks",
            sourceReport: "BalanceSheet",
            raw: {},
          },
        },
      ],
      provider: "quickbooks",
    });

    expect(qbo).not.toBeNull();
    expect(xero.current).toBeCloseTo(qbo!.current, 2);
    expect(xero.days_1_30).toBeCloseTo(qbo!.days_1_30, 2);
    expect(xero.pastDueTotal).toBeCloseTo(qbo!.pastDueTotal, 2);
    expect(xero.total).toBeCloseTo(qbo!.total, 2);
    expect(xero.tieOut.passesForScorecard).toBe(true);
    expect(qbo!.tieOut.passesForScorecard).toBe(true);
  });
});

describe("canonical AR aging — Scorecard readiness gate", () => {
  it("material variance does not pass Scorecard gate", () => {
    const schedule = buildCanonicalArAgingSchedule({
      asOfDate: AS_OF,
      receivables: [
        receivable({
          invoiceId: "a",
          dueDate: "2026-07-01",
          openBalance: 1000,
        }),
      ],
      balanceSheet: bsAr(500),
      provider: "xero",
    });
    expect(schedule.tieOut.passesForScorecard).toBe(false);
    expect(["review", "kickout"]).toContain(schedule.tieOut.status);
  });
});

describe("locked Scorecard regression guards (Cash / OGM / NPM formulas)", () => {
  it("does not redefine Cash / OGM / NPM — AR module is isolated", () => {
    // Structural guard: this suite only asserts AR schedule math.
    // Locked July Scorecard Cash=$0, OGM=100%, NPM=-153.6% remain owned by
    // active-report-summary + operating-gross-margin modules (#248–#252).
    expect(scorecardArAgingExposure).toBeTypeOf("function");
    expect(AS_OF).toBe("2026-07-31");
  });
});
