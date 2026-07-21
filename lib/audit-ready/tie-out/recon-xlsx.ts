import * as XLSX from "xlsx";
import type { QboGlActivityRow } from "./qbo-reports";

export type RenderBsAccountReconXlsxInput = {
  engagementId: string;
  accountId: string;
  accountName: string;
  accountType: string;
  periodStart: string;
  periodEnd: string;
  beginningBalanceCents: number;
  endingBalanceCents: number;
  glEndingBalanceCents: number;
  tieVarianceCents: number;
  activity: QboGlActivityRow[];
  totalsClassification: string;
};

const centsToDollars = (c: number) => c / 100;

/**
 * Render an XLSX buffer for a BS account recon.
 * Sheet 1 = Recon (cover + summary)
 * Sheet 2 = Activity (every transaction with running balance)
 */
export async function renderBsAccountReconXlsx(
  input: RenderBsAccountReconXlsxInput,
): Promise<Buffer> {
  const wb = XLSX.utils.book_new();
  // Sheet 1: Recon cover
  const coverRows = [
    ["Balance Sheet Account Reconciliation"],
    [],
    ["Engagement ID", input.engagementId],
    ["Account", `${input.accountName} (${input.accountId})`],
    ["Account Type", input.accountType],
    ["Period Start", input.periodStart],
    ["Period End", input.periodEnd],
    [],
    ["Beginning Balance", centsToDollars(input.beginningBalanceCents)],
    [
      "Net Activity",
      centsToDollars(input.endingBalanceCents - input.beginningBalanceCents),
    ],
    [
      "Ending Balance (from GL detail)",
      centsToDollars(input.endingBalanceCents),
    ],
    [
      "GL Ending Balance (from Trial Balance)",
      centsToDollars(input.glEndingBalanceCents),
    ],
    ["Tie-Out Variance", centsToDollars(input.tieVarianceCents)],
    ["Classification", input.totalsClassification],
    [],
    ["Activity Row Count", input.activity.length],
  ];
  const wsCover = XLSX.utils.aoa_to_sheet(coverRows);
  wsCover["!cols"] = [{ wch: 40 }, { wch: 30 }];
  for (const ref of ["B9", "B10", "B11", "B12", "B13"]) {
    if (wsCover[ref]) {
      wsCover[ref].z = "$#,##0.00;[Red]($#,##0.00)";
    }
  }
  XLSX.utils.book_append_sheet(wb, wsCover, "Recon");
  // Sheet 2: Activity detail
  const header = [
    "Ordinal",
    "Date",
    "Type",
    "Doc #",
    "Name",
    "Memo",
    "Split Account",
    "Debit",
    "Credit",
    "Net",
    "Running Balance",
  ];
  let running = input.beginningBalanceCents;
  const activityRows = [
    header,
    [
      0,
      input.periodStart,
      "Beginning Balance",
      "",
      "",
      "",
      "",
      0,
      0,
      0,
      centsToDollars(input.beginningBalanceCents),
    ],
    ...input.activity.map((r, i) => {
      running += r.netCents;
      return [
        i + 1,
        r.txnDate ?? "",
        r.txnType ?? "",
        r.docNumber ?? "",
        r.name ?? "",
        r.memo ?? "",
        r.splitAccount ?? "",
        centsToDollars(r.debitCents),
        centsToDollars(r.creditCents),
        centsToDollars(r.netCents),
        centsToDollars(running),
      ];
    }),
    [
      input.activity.length + 1,
      input.periodEnd,
      "Ending Balance",
      "",
      "",
      "",
      "",
      0,
      0,
      0,
      centsToDollars(input.endingBalanceCents),
    ],
  ];
  const wsActivity = XLSX.utils.aoa_to_sheet(activityRows);
  wsActivity["!cols"] = [
    { wch: 8 },
    { wch: 12 },
    { wch: 18 },
    { wch: 12 },
    { wch: 22 },
    { wch: 30 },
    { wch: 22 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
  ];
  const range = XLSX.utils.decode_range(wsActivity["!ref"]!);
  for (let R = 1; R <= range.e.r; R++) {
    for (const col of [7, 8, 9, 10]) {
      const ref = XLSX.utils.encode_cell({ r: R, c: col });
      if (wsActivity[ref] && typeof wsActivity[ref].v === "number") {
        wsActivity[ref].z = "$#,##0.00;[Red]($#,##0.00)";
      }
    }
  }
  XLSX.utils.book_append_sheet(wb, wsActivity, "Activity");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
}
