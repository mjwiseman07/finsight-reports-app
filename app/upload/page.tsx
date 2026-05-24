"use client";

import { useMemo, useState, type ReactNode } from "react";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ParsedFile = {
  name: string;
  rows: unknown[][];
};

type MatchedLine = {
  metric: string;
  label: string;
  value: number;
};

type KPIs = {
  revenue: number;
  cogs: number;
  grossProfit: number;
  expenses: number;
  netIncome: number;
  cash: number;
  accountsReceivable: number;
  totalAssets: number;
  totalEquity: number;
  matches: MatchedLine[];
};

type StatementRow = {
  label: string;
  amount: number | null;
};

type PackageTier = "essential" | "professional" | "virtualCfo";
type UploadTier = PackageTier;
type ThresholdLogic = "both" | "either";
type FluxSeverity = "High" | "Moderate" | "Low";

type UploadReport = {
  id: string;
  tier: UploadTier;
  label: string;
  description: string;
  required: boolean;
  omitted: boolean;
  data: ParsedFile | null;
  onFile: (file: File) => void | Promise<void>;
  onRemove: () => void;
  onOmitChange: (omitted: boolean) => void;
};

type APKpis = {
  total: number;
  current: number;
  days1To30: number;
  days31To60: number;
  days61To90: number;
  days90Plus: number;
};

type AgingKpis = APKpis;

type InventoryItem = {
  name: string;
  quantity: number;
  value: number;
};

type InventoryKpis = {
  totalValue: number;
  totalQuantity: number;
  topByValue: InventoryItem[];
  topByQuantity: InventoryItem[];
};

type FixedAssetMatch = {
  metric: string;
  label: string;
  value: number | null;
};

type FixedAssetKpis = {
  totalFixedAssets: number;
  accumulatedDepreciation: number;
  netBookValue: number;
  depreciationExpense: number | null;
  fixedAssetsToTotalAssets: number;
  depreciationToFixedAssets: number;
  netBookValueToTotalAssets: number;
  matches: FixedAssetMatch[];
};

type FixedAssetChangeRow = {
  metric: string;
  current: number;
  prior: number;
  change: number;
  interpretation: string;
};

type FluxAccount = {
  accountNumber: string;
  accountName: string;
  amount: number;
};

type FluxRow = {
  accountNumber: string;
  accountName: string;
  currentAmount: number;
  priorAmount: number;
  dollarVariance: number;
  percentVariance: number | null;
  direction: string;
  severity: FluxSeverity;
  flagReason: string;
};

type FluxSettings = {
  dollarThreshold: number;
  percentThreshold: number;
  logic: ThresholdLogic;
  includeZeroActivity: boolean;
};

const PACKAGE_LABELS: Record<PackageTier, string> = {
  essential: "Essential",
  professional: "Professional",
  virtualCfo: "Virtual CFO",
};
const PREVIEW_COLUMN_LIMIT = 10;

function isProfessionalOrHigher(tier: PackageTier) {
  return tier === "professional" || tier === "virtualCfo";
}

function isVirtualCfo(tier: PackageTier) {
  return tier === "virtualCfo";
}

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) return "";

  const amount = Math.round(value);
  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));

  return amount < 0 ? `($${formatted})` : `$${formatted}`;
}

function formatMoney(value: number | null | undefined) {
  return formatCurrency(value ?? 0);
}

function formatOptionalCurrency(value: number | null | undefined, fallback = "Not found") {
  return value === null || value === undefined ? fallback : formatCurrency(value);
}

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return "";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined) return "";
  const percentValue = Math.abs(value) <= 1 ? value * 100 : value;
  const formatted = `${Math.abs(percentValue).toFixed(1)}%`;
  return percentValue < 0 ? `(${formatted})` : formatted;
}

function formatRate(value: number | null | undefined) {
  if (value === null || value === undefined) return "";
  return value.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
}

function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;

  const text = String(value)
    .replace(/\$/g, "")
    .replace(/,/g, "")
    .replace(/\((.*?)\)/g, "-$1")
    .replace(/^=/, "")
    .trim();
  const numericText = text.replace(/[^0-9.-]/g, "");

  if (!/\d/.test(numericText)) return null;

  const number = Number(numericText);
  return Number.isFinite(number) ? number : null;
}

function getLastNumericValue(row: unknown[]) {
  for (let index = row.length - 1; index >= 1; index--) {
    const value = parseNumber(row[index]);
    if (value !== null) return value;
  }

  return null;
}

function calculateKPIs(plData: ParsedFile | null, bsData: ParsedFile | null): KPIs {
  const matches: MatchedLine[] = [];

  const findExact = (rows: unknown[][], metric: string, labels: string[]) => {
    const normalizedLabels = labels.map((label) => normalizeStatementLabel(label));

    for (const targetLabel of normalizedLabels) {
      for (const row of rows) {
        const rawLabel = String(row[0] || "").trim();
        const label = normalizeStatementLabel(rawLabel);

        if (label === targetLabel) {
          const value = getLastNumericValue(row);

          if (value !== null) {
            matches.push({ metric, label: rawLabel, value });
            return value;
          }
        }
      }
    }

    matches.push({ metric, label: "Not found", value: 0 });
    return 0;
  };

  const revenue = findExact(plData?.rows || [], "Revenue", ["Total Income"]);
  const cogs = findExact(plData?.rows || [], "COGS", ["Total Cost of Goods Sold"]);
  const grossProfit = findExact(plData?.rows || [], "Gross Profit", ["Gross Profit"]);
  const expenses = findExact(plData?.rows || [], "Expenses", [
    "Total Operating Expenses",
    "Total Expenses",
    "Total Expense",
    "Total Operating Expense",
    "Operating Expenses",
  ]);
  const netIncome = findExact(plData?.rows || [], "Net Income", ["Net Income"]);
  const cash = findExact(bsData?.rows || [], "Cash", ["Total Bank Accounts"]);
  const accountsReceivable = findExact(bsData?.rows || [], "Accounts Receivable", [
    "Total Accounts Receivable",
    "Accounts Receivable",
    "Accounts Receivable (A/R)",
    "A/R",
    "Trade Accounts Receivable",
  ]);
  const totalAssets = findExact(bsData?.rows || [], "Total Assets", ["TOTAL ASSETS"]);
  const totalEquity = findExact(bsData?.rows || [], "Total Equity", ["Total Equity"]);

  return {
    revenue,
    cogs,
    grossProfit,
    expenses,
    netIncome,
    cash,
    accountsReceivable,
    totalAssets,
    totalEquity,
    matches,
  };
}

function buildExecutiveSummary(kpis: KPIs, netMargin: number, fixedAssetKpis?: FixedAssetKpis | null) {
  const grossMargin = kpis.revenue ? (kpis.grossProfit / kpis.revenue) * 100 : 0;
  const expenseRatio = kpis.revenue ? (kpis.expenses / kpis.revenue) * 100 : 0;
  const cashToAssets = kpis.totalAssets ? (kpis.cash / kpis.totalAssets) * 100 : 0;
  const hasFixedAssets = Boolean(fixedAssetKpis && fixedAssetKpis.totalFixedAssets);
  const fixedAssetSummary = hasFixedAssets
    ? ` Fixed asset detail shows ${formatCurrency(
        fixedAssetKpis?.totalFixedAssets,
      )} in original fixed assets, ${formatCurrency(
        fixedAssetKpis?.accumulatedDepreciation,
      )} in accumulated depreciation, and ${formatCurrency(
        fixedAssetKpis?.netBookValue,
      )} in net book value.`
    : "";

  return {
    paragraph: `The business generated ${formatMoney(kpis.revenue)} in revenue with ${formatMoney(
      kpis.grossProfit,
    )} in gross profit and ${formatMoney(kpis.netIncome)} in net income. Operating expenses totaled ${formatMoney(
      kpis.expenses,
    )}, resulting in a net margin of ${netMargin.toFixed(
      1,
    )}%. The balance sheet shows ${formatMoney(kpis.cash)} in cash, ${formatMoney(
      kpis.accountsReceivable,
    )} in accounts receivable, and ${formatMoney(
      kpis.totalAssets,
    )} in total assets, providing a snapshot of liquidity and overall financial position.${fixedAssetSummary}`,
    highlights: [
      `Revenue totaled ${formatMoney(kpis.revenue)} for the uploaded period.`,
      `Gross profit was ${formatMoney(kpis.grossProfit)}, representing a gross margin of ${grossMargin.toFixed(1)}%.`,
      `Net income was ${formatMoney(kpis.netIncome)}, with a net margin of ${netMargin.toFixed(1)}%.`,
      `Cash on hand was ${formatMoney(kpis.cash)}, equal to ${cashToAssets.toFixed(1)}% of total assets.`,
      ...(hasFixedAssets
        ? [`Net book value of fixed assets was ${formatCurrency(fixedAssetKpis?.netBookValue)}.`]
        : []),
    ],
    watchItems: [
      `Expenses totaled ${formatMoney(kpis.expenses)}, or ${expenseRatio.toFixed(1)}% of revenue.`,
      `Accounts receivable was ${formatMoney(kpis.accountsReceivable)}, which should be monitored for collection timing.`,
      netMargin < 10
        ? "Net margin is below 10%, suggesting profitability may need closer review."
        : "Net margin is positive, but should still be tracked against monthly targets.",
      kpis.cash < kpis.accountsReceivable
        ? "Accounts receivable exceeds cash, making collections an important near-term focus."
        : "Cash exceeds accounts receivable, supporting a stronger liquidity position.",
    ],
  };
}

function evaluateFormula(formula: string, cellMap: Record<string, unknown>): number {
  let expression = formula.replace(/^=/, "");

  expression = expression.replace(/[A-Z]+[0-9]+/g, (cellRef) => {
    const rawValue = cellMap[cellRef];

    if (typeof rawValue === "string" && rawValue.startsWith("=")) {
      return String(evaluateFormula(rawValue, cellMap));
    }

    return String(parseNumber(rawValue) || 0);
  });

  if (!/^[0-9+\-*/().\s]+$/.test(expression)) return parseNumber(formula) || 0;

  try {
    return Function(`"use strict"; return (${expression})`)();
  } catch {
    return parseNumber(formula) || 0;
  }
}

function extractRowsFromWorksheet(sheet: XLSX.WorkSheet): unknown[][] {
  const range = XLSX.utils.decode_range(sheet["!ref"] || "A1:B1");
  const cellMap: Record<string, unknown> = {};

  for (let row = range.s.r; row <= range.e.r; row++) {
    for (let col = range.s.c; col <= range.e.c; col++) {
      const address = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = sheet[address];

      if (!cell) continue;

      cellMap[address] = cell.f ? `=${cell.f}` : cell.v;
    }
  }

  const rows: unknown[][] = [];

  for (let row = range.s.r; row <= range.e.r; row++) {
    const currentRow: unknown[] = [];

    for (let col = range.s.c; col <= range.e.c; col++) {
      const address = XLSX.utils.encode_cell({ r: row, c: col });
      const rawValue = cellMap[address];

      if (typeof rawValue === "string" && rawValue.startsWith("=")) {
        currentRow.push(evaluateFormula(rawValue, cellMap));
      } else {
        currentRow.push(rawValue || "");
      }
    }

    rows.push(currentRow);
  }

  return rows;
}

function normalizeHeader(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function findHeaderIndex(row: unknown[], patterns: string[]) {
  return row.findIndex((cell) => {
    const text = normalizeHeader(cell);
    return patterns.some((pattern) => text.includes(pattern));
  });
}

function findExactHeaderIndex(row: unknown[], labels: string[]) {
  const normalizedLabels = labels.map((label) => normalizeHeader(label));
  return row.findIndex((cell) => normalizedLabels.includes(normalizeHeader(cell)));
}

function sumColumn(rows: unknown[][], columnIndex: number) {
  if (columnIndex < 0) return 0;
  return rows.reduce((total, row) => total + (parseNumber(row[columnIndex]) || 0), 0);
}

function calculateAgingKpis(data: ParsedFile | null): AgingKpis {
  if (!data) {
    return {
      total: 0,
      current: 0,
      days1To30: 0,
      days31To60: 0,
      days61To90: 0,
      days90Plus: 0,
    };
  }

  const headerIndex = data.rows.findIndex((row) =>
    row.some((cell) => normalizeHeader(cell).includes("current")),
  );
  const headers = data.rows[headerIndex] || [];
  const dataRows = headerIndex >= 0 ? data.rows.slice(headerIndex + 1) : data.rows;
  const totalRow = dataRows.find((row) => normalizeHeader(row[0]) === "total");

  const currentIndex = findHeaderIndex(headers, ["current"]);
  const days1To30Index = findHeaderIndex(headers, ["1 - 30", "1-30"]);
  const days31To60Index = findHeaderIndex(headers, ["31 - 60", "31-60"]);
  const days61To90Index = findHeaderIndex(headers, ["61 - 90", "61-90"]);
  const days90PlusIndex = findHeaderIndex(headers, ["91 and over", "90+", ">90"]);
  const totalIndex = findHeaderIndex(headers, ["total"]);

  const valueFromTotalRow = (index: number) =>
    totalRow && index >= 0 ? parseNumber(totalRow[index]) || 0 : sumColumn(dataRows, index);

  const current = valueFromTotalRow(currentIndex);
  const days1To30 = valueFromTotalRow(days1To30Index);
  const days31To60 = valueFromTotalRow(days31To60Index);
  const days61To90 = valueFromTotalRow(days61To90Index);
  const days90Plus = valueFromTotalRow(days90PlusIndex);
  const total =
    valueFromTotalRow(totalIndex) || current + days1To30 + days31To60 + days61To90 + days90Plus;

  return { total, current, days1To30, days31To60, days61To90, days90Plus };
}

function calculateAPKpis(apData: ParsedFile | null): APKpis {
  return calculateAgingKpis(apData);
}

function calculateInventoryKpis(inventoryData: ParsedFile | null): InventoryKpis {
  if (!inventoryData) {
    return {
      totalValue: 0,
      totalQuantity: 0,
      topByValue: [],
      topByQuantity: [],
    };
  }

  const headerIndex = inventoryData.rows.findIndex((row) =>
    row.some((cell) => {
      const text = normalizeHeader(cell);
      return text.includes("qty") || text.includes("quantity") || text.includes("on hand");
    }),
  );

  const headers = inventoryData.rows[headerIndex] || [];
  const dataRows = headerIndex >= 0 ? inventoryData.rows.slice(headerIndex + 1) : inventoryData.rows;

  const nameIndex = findHeaderIndex(headers, ["item", "product", "name"]);
  const quantityIndex = findHeaderIndex(headers, ["qty", "quantity", "on hand"]);
  const valueIndex = findHeaderIndex(headers, [
    "asset value",
    "inventory value",
    "total value",
    "value",
  ]);

  const items = dataRows
    .map((row) => ({
      name: String(row[nameIndex >= 0 ? nameIndex : 0] || "").trim(),
      quantity: parseNumber(row[quantityIndex]) || 0,
      value: parseNumber(row[valueIndex]) || 0,
    }))
    .filter((item) => item.name && item.name.toLowerCase() !== "total");

  return {
    totalValue: items.reduce((total, item) => total + item.value, 0),
    totalQuantity: items.reduce((total, item) => total + item.quantity, 0),
    topByValue: [...items].sort((a, b) => b.value - a.value).slice(0, 5),
    topByQuantity: [...items].sort((a, b) => b.quantity - a.quantity).slice(0, 5),
  };
}

function calculateFixedAssetKpis(
  fixedAssetData: ParsedFile | null,
  totalAssets: number,
  plData: ParsedFile | null,
): FixedAssetKpis {
  const depreciationExpenseFromPl = findStatementMatch(plData, [
    "Depreciation Expense",
    "Depreciation",
    "Amortization Expense",
    "Depreciation & Amortization",
    "Depreciation and Amortization",
  ]);
  const emptyKpis = {
    totalFixedAssets: 0,
    accumulatedDepreciation: 0,
    netBookValue: 0,
    depreciationExpense: depreciationExpenseFromPl?.amount ?? null,
    fixedAssetsToTotalAssets: 0,
    depreciationToFixedAssets: 0,
    netBookValueToTotalAssets: 0,
    matches: [] as FixedAssetMatch[],
  };

  if (!fixedAssetData) return emptyKpis;

  const headerIndex = fixedAssetData.rows.findIndex((row) => {
    const hasAssetColumn = findExactHeaderIndex(row, ["Asset", "Asset Name", "Description"]) >= 0;
    const hasValueColumn =
      findExactHeaderIndex(row, ["Original Cost", "Cost", "Net Book Value", "Book Value"]) >= 0;

    return hasAssetColumn && hasValueColumn;
  });

  if (headerIndex >= 0) {
    const headers = fixedAssetData.rows[headerIndex] || [];
    const dataRows = fixedAssetData.rows.slice(headerIndex + 1);
    const originalCostIndex = findExactHeaderIndex(headers, ["Original Cost", "Cost"]);
    const accumulatedDepreciationIndex = findExactHeaderIndex(headers, [
      "Accumulated Depreciation",
    ]);
    const depreciationExpenseIndex = findExactHeaderIndex(headers, [
      "Depreciation Expense",
      "Depreciation",
    ]);
    const netBookValueIndex = findExactHeaderIndex(headers, ["Net Book Value", "Book Value"]);

    if (
      originalCostIndex >= 0 ||
      accumulatedDepreciationIndex >= 0 ||
      depreciationExpenseIndex >= 0 ||
      netBookValueIndex >= 0
    ) {
      const totalFixedAssets = sumColumn(dataRows, originalCostIndex);
      const accumulatedDepreciation = sumColumn(dataRows, accumulatedDepreciationIndex);
      const depreciationExpenseFromFixedAssetDetail =
        depreciationExpenseIndex >= 0 ? sumColumn(dataRows, depreciationExpenseIndex) : null;
      const depreciationExpense =
        depreciationExpenseFromPl?.amount ?? depreciationExpenseFromFixedAssetDetail;
      const netBookValue =
        netBookValueIndex >= 0
          ? sumColumn(dataRows, netBookValueIndex)
          : accumulatedDepreciation > 0
            ? totalFixedAssets - accumulatedDepreciation
            : totalFixedAssets + accumulatedDepreciation;
      const matches: FixedAssetMatch[] = [
        {
          metric: "Total Fixed Assets",
          label:
            originalCostIndex >= 0
              ? `Calculated from ${String(headers[originalCostIndex])} column`
              : "Not found",
          value: totalFixedAssets,
        },
        {
          metric: "Accumulated Depreciation",
          label:
            accumulatedDepreciationIndex >= 0
              ? `Calculated from ${String(headers[accumulatedDepreciationIndex])} column`
              : "Not found",
          value: accumulatedDepreciation,
        },
        {
          metric: "Depreciation Expense",
          label: depreciationExpenseFromPl
            ? `Matched P&L row: ${depreciationExpenseFromPl.label}`
            : depreciationExpenseIndex >= 0
              ? `Calculated from ${String(headers[depreciationExpenseIndex])} column`
              : "Depreciation expense not provided in uploaded reports.",
          value: depreciationExpense,
        },
        {
          metric: "Net Book Value",
          label:
            netBookValueIndex >= 0
              ? `Calculated from ${String(headers[netBookValueIndex])} column`
              : "Calculated from Original Cost and Accumulated Depreciation columns",
          value: netBookValue,
        },
      ];

      return {
        totalFixedAssets,
        accumulatedDepreciation,
        netBookValue,
        depreciationExpense,
        fixedAssetsToTotalAssets: totalAssets ? (totalFixedAssets / totalAssets) * 100 : 0,
        depreciationToFixedAssets: totalFixedAssets
          ? (Math.abs(accumulatedDepreciation) / totalFixedAssets) * 100
          : 0,
        netBookValueToTotalAssets: totalAssets ? (netBookValue / totalAssets) * 100 : 0,
        matches,
      };
    }
  }

  const rows = getStatementRows(fixedAssetData);
  const matches: FixedAssetMatch[] = [];

  const findByLabels = (metric: string, labels: string[]) => {
    const found = rows.find((row) =>
      labels.some((label) => normalizeStatementLabel(row.label).includes(label.toLowerCase())),
    );

    const value = found?.amount || 0;
    matches.push({ metric, label: found?.label || "Not found", value });
    return value;
  };

  const assetCategoryTotal = rows
    .filter((row) =>
      [
        "fixed assets",
        "furniture and equipment",
        "machinery and equipment",
        "vehicles",
        "leasehold improvements",
        "original cost",
      ].some((label) => normalizeStatementLabel(row.label).includes(label)),
    )
    .reduce((total, row) => total + (row.amount || 0), 0);

  const totalFixedAssets =
    findByLabels("Total Fixed Assets", ["total fixed assets", "fixed assets", "original cost"]) ||
    assetCategoryTotal;
  const accumulatedDepreciation = findByLabels("Accumulated Depreciation", [
    "accumulated depreciation",
  ]);
  const depreciationExpense = depreciationExpenseFromPl?.amount ?? null;
  matches.push({
    metric: "Depreciation Expense",
    label: depreciationExpenseFromPl
      ? `Matched P&L row: ${depreciationExpenseFromPl.label}`
      : "Depreciation expense not provided in uploaded reports.",
    value: depreciationExpense,
  });
  const netBookValue =
    findByLabels("Net Book Value", ["net book value", "book value"]) ||
    (accumulatedDepreciation > 0
      ? totalFixedAssets - accumulatedDepreciation
      : totalFixedAssets + accumulatedDepreciation);

  return {
    totalFixedAssets,
    accumulatedDepreciation,
    netBookValue,
    depreciationExpense,
    fixedAssetsToTotalAssets: totalAssets ? (totalFixedAssets / totalAssets) * 100 : 0,
    depreciationToFixedAssets: totalFixedAssets
      ? (Math.abs(accumulatedDepreciation) / totalFixedAssets) * 100
      : 0,
    netBookValueToTotalAssets: totalAssets ? (netBookValue / totalAssets) * 100 : 0,
    matches,
  };
}

function getFixedAssetChangeRows(
  current: FixedAssetKpis,
  prior: FixedAssetKpis,
): FixedAssetChangeRow[] {
  const buildRow = (
    metric: string,
    priorValue: number,
    currentValue: number,
    positiveInterpretation: string,
    negativeInterpretation: string,
    flatInterpretation: string,
  ) => {
    const change = currentValue - priorValue;

    return {
      metric,
      current: currentValue,
      prior: priorValue,
      change,
      interpretation:
        change > 0 ? positiveInterpretation : change < 0 ? negativeInterpretation : flatInterpretation,
    };
  };
  const fixedAssetCostChange = current.totalFixedAssets - prior.totalFixedAssets;

  return [
    buildRow(
      "Total fixed asset cost change",
      prior.totalFixedAssets,
      current.totalFixedAssets,
      `Fixed assets increased by ${formatCurrency(fixedAssetCostChange)}, indicating net additions during the period.`,
      `Fixed assets decreased by ${formatCurrency(Math.abs(fixedAssetCostChange))}, indicating possible disposals or reclassification.`,
      "No net fixed asset additions or disposals were identified.",
    ),
    buildRow(
      "Fixed asset additions",
      prior.totalFixedAssets,
      current.totalFixedAssets,
      `Fixed assets increased by ${formatCurrency(fixedAssetCostChange)}, indicating net additions during the period.`,
      `Fixed assets decreased by ${formatCurrency(Math.abs(fixedAssetCostChange))}, indicating possible disposals or reclassification.`,
      "No net additions were identified from the uploaded reports.",
    ),
    buildRow(
      "Fixed asset disposals",
      prior.totalFixedAssets,
      current.totalFixedAssets,
      `Fixed assets increased by ${formatCurrency(fixedAssetCostChange)}, indicating net additions during the period.`,
      `Fixed assets decreased by ${formatCurrency(Math.abs(fixedAssetCostChange))}, indicating possible disposals or reclassification.`,
      "No net disposals were identified from the uploaded reports.",
    ),
    buildRow(
      "Accumulated depreciation change",
      prior.accumulatedDepreciation,
      current.accumulatedDepreciation,
      `Accumulated depreciation increased by ${formatCurrency(
        Math.abs(Math.abs(current.accumulatedDepreciation) - Math.abs(prior.accumulatedDepreciation)),
      )}, meaning the depreciation reserve increased.`,
      `Accumulated depreciation decreased by ${formatCurrency(
        Math.abs(Math.abs(current.accumulatedDepreciation) - Math.abs(prior.accumulatedDepreciation)),
      )}, which may indicate disposals or reclassification.`,
      "Accumulated depreciation was unchanged.",
    ),
    buildRow(
      "Net book value change",
      prior.netBookValue,
      current.netBookValue,
      `Net book value increased by ${formatCurrency(
        current.netBookValue - prior.netBookValue,
      )}, suggesting additions exceeded depreciation and disposals.`,
      `Net book value decreased by ${formatCurrency(
        Math.abs(current.netBookValue - prior.netBookValue),
      )}, suggesting depreciation or disposals exceeded additions.`,
      "Net book value was unchanged.",
    ),
  ];
}

function getStatementRows(data: ParsedFile | null): StatementRow[] {
  if (!data) return [];

  return data.rows
    .map((row) => ({
      label: String(row[0] || "").trim(),
      amount: getLastNumericValue(row),
    }))
    .filter((row) => row.label && row.amount !== null);
}

function findStatementAmount(rows: StatementRow[], labels: string[]) {
  const normalizedLabels = labels.map((label) => normalizeStatementLabel(label));
  return (
    rows.find((row) => normalizedLabels.includes(normalizeStatementLabel(row.label)))?.amount || 0
  );
}

function findStatementMatch(data: ParsedFile | null, labels: string[]) {
  const normalizedLabels = labels.map((label) => normalizeStatementLabel(label));

  for (const row of data?.rows || []) {
    const value = getLastNumericValue(row);

    if (value === null) continue;

    for (const cell of row) {
      const label = normalizeStatementLabel(String(cell || ""));

      if (normalizedLabels.includes(label)) {
        return { label: String(cell || "").trim(), amount: value };
      }
    }
  }

  return null;
}

function getBalanceSheetSection(label: string) {
  const normalized = normalizeStatementLabel(label);

  if (["liabilities & equity", "liabilities and equity"].includes(normalized)) return null;

  if (
    [
      "bank accounts",
      "cash",
      "checking",
      "savings",
      "accounts receivable",
      "total accounts receivable",
      "inventory asset",
      "prepaid insurance",
      "other current assets",
      "total current assets",
      "total bank accounts",
    ].some((pattern) => normalized.includes(pattern))
  ) {
    return "Current Assets";
  }

  if (
    [
      "fixed assets",
      "accumulated depreciation",
      "net book value",
      "net fixed assets",
      "equipment",
      "vehicles",
      "leasehold improvements",
      "machinery",
      "furniture",
    ].some((pattern) => normalized.includes(pattern))
  ) {
    return "Fixed Assets";
  }

  if (
    [
      "accounts payable",
      "credit cards",
      "line of credit",
      "current portion",
      "payroll liabilities",
      "sales tax payable",
      "other current liabilities",
      "total current liabilities",
      "current liability",
      "due within one year",
    ].some((pattern) => normalized.includes(pattern))
  ) {
    return "Current Liabilities";
  }

  if (
    normalized.includes("long-term") ||
    normalized.includes("long term") ||
    normalized.includes("notes payable") ||
    normalized.includes("loan payable")
  ) {
    return "Long-Term Liabilities";
  }

  if (
    normalized === "equity" ||
    normalized.includes("total equity") ||
    normalized.includes("retained earnings") ||
    normalized.includes("owner's equity") ||
    normalized.includes("owners equity")
  ) {
    return "Equity";
  }
  return null;
}

function getCurrentAssetTotal(rows: StatementRow[]) {
  const explicitTotal = findStatementAmount(rows, ["Total Current Assets"]);
  if (explicitTotal) return explicitTotal;

  return rows.reduce((total, row) => {
    const normalized = normalizeStatementLabel(row.label);
    const allowedTotalRows = [
      "total bank accounts",
      "total accounts receivable",
      "total other current assets",
    ];
    if (normalized.startsWith("total") && !allowedTotalRows.includes(normalized)) return total;
    return getBalanceSheetSection(row.label) === "Current Assets" ? total + (row.amount || 0) : total;
  }, 0);
}

function getCurrentLiabilityTotal(rows: StatementRow[]) {
  const explicitTotal = findStatementAmount(rows, ["Total Current Liabilities"]);
  if (explicitTotal) return explicitTotal;

  return rows.reduce((total, row) => {
    const normalized = normalizeStatementLabel(row.label);
    const allowedTotalRows = [
      "total accounts payable",
      "total credit cards",
      "total other current liabilities",
    ];
    if (normalized.startsWith("total") && !allowedTotalRows.includes(normalized)) return total;
    return getBalanceSheetSection(row.label) === "Current Liabilities" ? total + (row.amount || 0) : total;
  }, 0);
}

function normalizeStatementLabel(label: string) {
  return label.trim().toLowerCase().replace(/\s+/g, " ");
}

function getDedupedStatementRows(rows: StatementRow[]) {
  const lastIndexByLabel = new Map<string, number>();

  rows.forEach((row, index) => {
    lastIndexByLabel.set(normalizeStatementLabel(row.label), index);
  });

  return rows.filter((row, index) => lastIndexByLabel.get(normalizeStatementLabel(row.label)) === index);
}

function getStatementRowType(label: string) {
  const normalized = normalizeStatementLabel(label);
  const sectionLabels = [
    "income",
    "cost of goods sold",
    "operating expenses",
    "expenses",
    "assets",
    "liabilities",
    "liabilities & equity",
    "liabilities and equity",
    "equity",
  ];
  const majorTotalLabels = [
    "total income",
    "total cost of goods sold",
    "gross profit",
    "total expenses",
    "net income",
  ];
  const calculatedValueLabels = ["net book value", "net fixed assets"];
  const grandTotalLabels = [
    "total assets",
    "total liabilities",
    "total equity",
    "total liabilities & equity",
    "total liabilities and equity",
  ];

  if (sectionLabels.includes(normalized)) return "section";
  if (calculatedValueLabels.includes(normalized)) return "calculated-value";
  if (grandTotalLabels.includes(normalized)) return "grand-total";
  if (majorTotalLabels.includes(normalized)) return "major-total";
  if (normalized.startsWith("total")) return "subtotal";
  return "detail";
}

function getBalanceSheetRowsWithNetBookValue(data: ParsedFile) {
  const previewRows = data.rows.slice(0, 25).map((row) => [...row]);
  const comparisonHeader = previewRows.find((row) => isComparisonHeaderRow(row));
  const isComparisonBalanceSheet = Boolean(comparisonHeader);

  if (isComparisonBalanceSheet) {
    return addBalanceSheetPreviewSections(getBalanceSheetComparisonRowsWithNetBookValue(previewRows));
  }

  const statementRows = getStatementRows(data);
  const netBookValueRow = statementRows.find((row) =>
    ["net book value", "net fixed assets"].includes(normalizeStatementLabel(row.label)),
  );
  const existingNetBookPreviewIndex = previewRows.findIndex((row) =>
    ["net book value", "net fixed assets"].includes(normalizeStatementLabel(String(row[0] || ""))),
  );
  const fixedAssets = findStatementAmount(statementRows, [
    "Total Fixed Assets",
    "Fixed Assets",
    "Original Cost",
  ]);
  const accumulatedDepreciation = findStatementAmount(statementRows, [
    "Accumulated Depreciation",
    "Total Accumulated Depreciation",
  ]);

  if (!fixedAssets && !accumulatedDepreciation && !netBookValueRow) {
    return addBalanceSheetPreviewSections(previewRows);
  }

  const netBookValue = netBookValueRow?.amount ?? fixedAssets - Math.abs(accumulatedDepreciation);
  const netBookValuePreviewRow = ["Net Book Value", netBookValue];
  const rowsWithoutExistingNetBookValue =
    existingNetBookPreviewIndex >= 0
      ? previewRows.filter((_, index) => index !== existingNetBookPreviewIndex)
      : previewRows;
  const accumulatedDepreciationPreviewIndex = rowsWithoutExistingNetBookValue.findIndex((row) =>
    normalizeStatementLabel(String(row[0] || "")).includes("accumulated depreciation"),
  );
  const insertionIndex =
    accumulatedDepreciationPreviewIndex >= 0
      ? Math.min(accumulatedDepreciationPreviewIndex + 1, rowsWithoutExistingNetBookValue.length)
      : rowsWithoutExistingNetBookValue.length;

  rowsWithoutExistingNetBookValue.splice(insertionIndex, 0, netBookValuePreviewRow);
  return addBalanceSheetPreviewSections(rowsWithoutExistingNetBookValue);
}

function getBalanceSheetComparisonRowsWithNetBookValue(rows: unknown[][]) {
  const existingNetBookValueIndex = rows.findIndex((row) =>
    ["net book value", "net fixed assets"].includes(normalizeStatementLabel(String(row[0] || ""))),
  );
  const fixedAssetRow = rows.find((row) => normalizeStatementLabel(String(row[0] || "")) === "fixed assets");
  const accumulatedDepreciationRow = rows.find((row) =>
    normalizeStatementLabel(String(row[0] || "")).includes("accumulated depreciation"),
  );

  if (!fixedAssetRow || !accumulatedDepreciationRow) return rows;

  const rowsWithoutExistingNetBookValue =
    existingNetBookValueIndex >= 0 ? rows.filter((_, index) => index !== existingNetBookValueIndex) : rows;
  const accumulatedDepreciationIndex = rowsWithoutExistingNetBookValue.findIndex((row) =>
    normalizeStatementLabel(String(row[0] || "")).includes("accumulated depreciation"),
  );
  const headerRow = rowsWithoutExistingNetBookValue.find((row) => isComparisonHeaderRow(row)) || [];
  const netBookValueRow = fixedAssetRow.map((cell, index) => {
    if (index === 0) return "Net Book Value";

    const fixedAssetValue = parseNumber(cell);
    const accumulatedDepreciationValue = parseNumber(accumulatedDepreciationRow[index]);
    const columnHeader = normalizeHeader(headerRow[index]);

    if (fixedAssetValue === null && accumulatedDepreciationValue === null) return "";
    if (columnHeader.includes("%")) return "";

    return (fixedAssetValue || 0) + (accumulatedDepreciationValue || 0);
  });
  const currentNetBookValue = parseNumber(netBookValueRow[1]);
  const priorNetBookValue = parseNumber(netBookValueRow[2]);
  const priorYearNetBookValue = parseNumber(netBookValueRow[5]);

  if (currentNetBookValue !== null && priorNetBookValue !== null) {
    netBookValueRow[3] = currentNetBookValue - priorNetBookValue;
    netBookValueRow[4] = priorNetBookValue ? ((currentNetBookValue - priorNetBookValue) / Math.abs(priorNetBookValue)) * 100 : "";
  }

  if (currentNetBookValue !== null && priorYearNetBookValue !== null) {
    netBookValueRow[6] = currentNetBookValue - priorYearNetBookValue;
    netBookValueRow[7] = priorYearNetBookValue
      ? ((currentNetBookValue - priorYearNetBookValue) / Math.abs(priorYearNetBookValue)) * 100
      : "";
  }

  rowsWithoutExistingNetBookValue.splice(
    accumulatedDepreciationIndex >= 0 ? accumulatedDepreciationIndex + 1 : rowsWithoutExistingNetBookValue.length,
    0,
    netBookValueRow,
  );

  return recalculateBalanceSheetComparisonLiabilityEquityTotals(rowsWithoutExistingNetBookValue);
}

function buildComparisonTotalRow(label: string, values: number[]) {
  const current = values[1] || 0;
  const priorMonth = values[2] || 0;
  const priorYear = values[5] || 0;

  return [
    label,
    current,
    priorMonth,
    current - priorMonth,
    priorMonth ? ((current - priorMonth) / Math.abs(priorMonth)) * 100 : 0,
    priorYear,
    current - priorYear,
    priorYear ? ((current - priorYear) / Math.abs(priorYear)) * 100 : 0,
  ];
}

function addComparisonDetailRowToTotals(totals: number[], row: unknown[]) {
  [1, 2, 5].forEach((index) => {
    totals[index] += parseNumber(row[index]) || 0;
  });
}

function recalculateBalanceSheetComparisonLiabilityEquityTotals(rows: unknown[][]) {
  const totals = {
    liabilities: Array(8).fill(0) as number[],
    equity: Array(8).fill(0) as number[],
  };
  const detailCounts = {
    liabilities: 0,
    equity: 0,
  };
  const sourceTotalEquityRow = rows.find(
    (row) => normalizeStatementLabel(String(row[0] || "")) === "total equity",
  );
  let activeSection: "assets" | "liabilities" | "equity" | null = null;

  rows.forEach((row) => {
    const normalized = normalizeStatementLabel(String(row[0] || ""));
    const label = String(row[0] || "");

    if (normalized === "assets") {
      activeSection = "assets";
      return;
    }

    if (
      normalized === "liabilities & equity" ||
      normalized === "liabilities and equity" ||
      normalized === "liabilities" ||
      normalized === "current liabilities" ||
      normalized === "long-term liabilities" ||
      normalized === "long term liabilities"
    ) {
      activeSection = "liabilities";
      return;
    }

    if (normalized === "equity") {
      activeSection = "equity";
      return;
    }

    if (
      !activeSection ||
      activeSection === "assets" ||
      normalized.startsWith("total") ||
      getPreviewMetaRowType(row, 0) !== null ||
      isComparisonHeaderRow(row)
    ) {
      return;
    }

    addComparisonDetailRowToTotals(totals[activeSection], row);
    detailCounts[activeSection] += 1;
  });

  const totalLiabilitiesRow = buildComparisonTotalRow("Total Liabilities", totals.liabilities);
  const sourceEquityTotals = Array(8).fill(0) as number[];
  if (sourceTotalEquityRow) {
    [1, 2, 5].forEach((index) => {
      sourceEquityTotals[index] = parseNumber(sourceTotalEquityRow[index]) || 0;
    });
  }
  const totalEquityRow = buildComparisonTotalRow(
    "Total Equity",
    detailCounts.equity > 0 ? totals.equity : sourceEquityTotals,
  );
  const totalLiabilitiesAndEquity = buildComparisonTotalRow(
    "TOTAL LIABILITIES & EQUITY",
    totalLiabilitiesRow.map((value, index) => (parseNumber(value) || 0) + (parseNumber(totalEquityRow[index]) || 0)),
  );

  return rows.map((row) => {
    const normalized = normalizeStatementLabel(String(row[0] || ""));

    if (normalized === "total liabilities") return totalLiabilitiesRow;
    if (normalized === "total equity") return totalEquityRow;
    if (normalized === "total liabilities & equity" || normalized === "total liabilities and equity") {
      return totalLiabilitiesAndEquity;
    }

    return row;
  });
}

function addBalanceSheetPreviewSections(rows: unknown[][]) {
  const sectionOrder = [
    "Current Assets",
    "Fixed Assets",
    "Current Liabilities",
    "Long-Term Liabilities",
    "Equity",
  ];
  const seen = new Set<string>();
  const enhancedRows: unknown[][] = [];

  rows.forEach((row) => {
    const label = String(row[0] || "");
    const normalized = normalizeStatementLabel(label);
    const section = getBalanceSheetSection(label);
    const isExplicitSection = sectionOrder.some((item) => normalizeStatementLabel(item) === normalized);

    if (section && !seen.has(section) && !isExplicitSection) {
      enhancedRows.push([section]);
      seen.add(section);
    }

    if (isExplicitSection) seen.add(section || label);
    enhancedRows.push(row);
  });

  return enhancedRows;
}

function getBalanceSheetStatementRowsWithNetBookValue(data: ParsedFile | null) {
  const rows = getStatementRows(data).map((row) => ({ ...row }));
  const existingNetBookValueRow = rows.find((row) =>
    ["net book value", "net fixed assets"].includes(normalizeStatementLabel(row.label)),
  );
  const fixedAssets = findStatementAmount(rows, ["Total Fixed Assets", "Fixed Assets", "Original Cost"]);
  const accumulatedDepreciation = findStatementAmount(rows, [
    "Accumulated Depreciation",
    "Total Accumulated Depreciation",
  ]);

  if (!fixedAssets && !accumulatedDepreciation && !existingNetBookValueRow) {
    return addBalanceSheetStatementSections(rows);
  }

  const rowsWithoutExistingNetBookValue = rows
    .filter(
      (row) =>
        !["net book value", "net fixed assets"].includes(normalizeStatementLabel(row.label)),
    )
    .map((row) =>
      normalizeStatementLabel(row.label).includes("accumulated depreciation")
        ? { ...row, amount: -Math.abs(row.amount || 0) }
        : row,
    );
  const accumulatedDepreciationIndex = rowsWithoutExistingNetBookValue.findIndex((row) =>
    normalizeStatementLabel(row.label).includes("accumulated depreciation"),
  );
  const insertionIndex =
    accumulatedDepreciationIndex >= 0
      ? Math.min(accumulatedDepreciationIndex + 1, rowsWithoutExistingNetBookValue.length)
      : rowsWithoutExistingNetBookValue.length;
  const netBookValue =
    existingNetBookValueRow?.amount ?? fixedAssets - Math.abs(accumulatedDepreciation);

  rowsWithoutExistingNetBookValue.splice(insertionIndex, 0, {
    label: "Net Book Value",
    amount: netBookValue,
  });

  return addBalanceSheetStatementSections(rowsWithoutExistingNetBookValue);
}

function addBalanceSheetStatementSections(rows: StatementRow[]) {
  const sectionOrder = [
    "Current Assets",
    "Fixed Assets",
    "Current Liabilities",
    "Long-Term Liabilities",
    "Equity",
  ];
  const seen = new Set<string>();
  const enhancedRows: StatementRow[] = [];

  rows.forEach((row) => {
    const normalized = normalizeStatementLabel(row.label);
    const section = getBalanceSheetSection(row.label);
    const isExplicitSection = sectionOrder.some((item) => normalizeStatementLabel(item) === normalized);

    if (section && !seen.has(section) && !isExplicitSection) {
      enhancedRows.push({ label: section, amount: null });
      seen.add(section);
    }

    if (isExplicitSection) seen.add(section || row.label);
    enhancedRows.push(row);
  });

  return enhancedRows;
}

function getPreviewRows(title: string, data: ParsedFile) {
  const rows = title.toLowerCase().includes("balance sheet")
    ? getBalanceSheetRowsWithNetBookValue(data)
    : data.rows.slice(0, 25);
  const normalizedTitle = title.toLowerCase();
  const isComparisonPreview =
    normalizedTitle.includes("comparison") || rows.some((row) => isComparisonHeaderRow(row));
  const isStatementPreview =
    !isComparisonPreview &&
    (normalizedTitle.includes("profit") ||
      normalizedTitle.includes("loss") ||
      normalizedTitle.includes("balance sheet"));
  const hasAmountHeader = rows.some(
    (row) => normalizeHeader(row[0]).includes("line item") && normalizeHeader(row[1]).includes("amount"),
  );

  if (isStatementPreview && !hasAmountHeader) {
    const firstSectionIndex = rows.findIndex((row) => getStatementRowType(String(row[0] || "")) === "section");
    const insertionIndex = firstSectionIndex >= 0 ? firstSectionIndex : Math.min(3, rows.length);
    const withHeader = [...rows];
    withHeader.splice(insertionIndex, 0, ["Line Item", "Amount"]);
    return withHeader;
  }

  return rows;
}

function getPreviewRowType(row: unknown[]) {
  if (row.length === 1 && getBalanceSheetSection(String(row[0] || ""))) return "section";
  return getStatementRowType(String(row[0] || ""));
}

function isComparisonHeaderRow(row: unknown[]) {
  const normalizedCells = row.map((cell) => normalizeHeader(cell));
  return normalizedCells.some((cell) => cell.includes("% change") || cell.includes("yoy % change"));
}

function getPreviewMetaRowType(row: unknown[], rowIndex: number) {
  const filledCells = row.map((cell) => String(cell || "").trim()).filter(Boolean);
  if (rowIndex > 2 || filledCells.length !== 1) return null;
  if (rowIndex === 0) return "company";
  if (rowIndex === 1) return "report";
  return "period";
}

function isDateOrPeriodLabel(value: unknown) {
  const text = String(value || "").trim();
  if (!text) return false;
  return (
    /^\d{4}$/.test(text) ||
    /^(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{4}$/i.test(text) ||
    /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(text) ||
    /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/.test(text) ||
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\b/i.test(text)
  );
}

function isAgingBucketLabel(value: unknown) {
  const text = normalizeHeader(value).replace(/\s+/g, "");
  return ["current", "1-30", "31-60", "61-90", "90+", "91andover", ">90", "total"].includes(text);
}

function isHeaderRow(row: unknown[]) {
  const cells = row.map((cell) => String(cell || "").trim()).filter(Boolean);
  if (cells.length === 0) return true;

  const normalizedCells = cells.map((cell) => normalizeHeader(cell));
  const hasGlHeader =
    normalizedCells.includes("date") &&
    normalizedCells.includes("account") &&
    normalizedCells.includes("memo") &&
    (normalizedCells.includes("debit") || normalizedCells.includes("credit"));
  if (hasGlHeader) return true;

  const headerTerms = [
    "customer",
    "vendor",
    "account",
    "line item",
    "item",
    "memo",
    "date",
    "type",
    "num",
    "name",
    "1-30",
    "31-60",
    "61-90",
    "90+",
    "total",
    "amount",
    "balance",
    "asset",
    "acquired",
    "part number",
    "description",
    "quantity",
    "qty",
    "value",
    "cost",
    "average cost",
    "original cost",
    "actual",
    "budget",
    "variance",
    "% variance",
    "change",
    "$ change",
    "% change",
    "yoy",
    "yoy $ change",
    "yoy % change",
    "percent",
    "interest rate",
    "rate",
    "sales",
    "depreciation",
    "net book value",
  ];
  const headerMatches = normalizedCells.filter((cell) =>
    headerTerms.some((term) => cell === term || cell.includes(term)),
  ).length;

  return headerMatches >= Math.min(2, cells.length) || normalizedCells.every(isAgingBucketLabel);
}

function isPercentCell(row: unknown[], cellIndex: number, value: unknown) {
  const text = String(value || "").trim();
  if (!text.includes("%")) return false;
  return !isHeaderRow(row) && cellIndex > 0 && parseNumber(value) !== null;
}

function getColumnLabel(headers: unknown[], cellIndex: number) {
  const directHeader = normalizeHeader(headers[cellIndex]);
  if (directHeader) return directHeader;

  const priorHeader = normalizeHeader(headers[cellIndex - 1]);
  if (priorHeader.includes("part number") && priorHeader.includes("description")) {
    return "description";
  }

  return "";
}

function isCurrencyColumn(columnLabel: string) {
  const normalized = normalizeHeader(columnLabel);
  if (!normalized) return false;

  const compact = normalized.replace(/\s+/g, "");
  const currencyColumns = [
    "amount",
    "value",
    "inventory value",
    "average cost",
    "original cost",
    "cost",
    "accumulated depreciation",
    "net book value",
    "book value",
    "actual",
    "budget",
    "over/(under) budget",
    "over/under budget",
    "current",
    "1-30",
    "1 - 30",
    "31-60",
    "31 - 60",
    "61-90",
    "61 - 90",
    "90+",
    "91 and over",
    "total",
    "debit",
    "credit",
    "balance",
  ];

  return currencyColumns.some((label) => {
    const compactLabel = label.replace(/\s+/g, "");
    return (
      normalized === label ||
      normalized.includes(label) ||
      compact === compactLabel ||
      compact.includes(compactLabel)
    );
  });
}

function isNumberColumn(columnLabel: string) {
  const normalized = normalizeHeader(columnLabel);
  return ["qty", "quantity", "quantity on hand", "on hand"].some(
    (label) => normalized === label || normalized.includes(label),
  );
}

function isPercentColumn(columnLabel: string) {
  const normalized = normalizeHeader(columnLabel);
  return ["% variance", "variance %", "percent", "margin %", "% change", "yoy % change"].some(
    (label) => normalized === label || normalized.includes(label),
  );
}

function isRateColumn(columnLabel: string) {
  const normalized = normalizeHeader(columnLabel);
  return ["interest rate", "rate"].some((label) => normalized === label || normalized.includes(label));
}

function isTextColumn(columnLabel: string) {
  const normalized = normalizeHeader(columnLabel);
  return [
    "customer",
    "vendor",
    "account",
    "account name",
    "memo",
    "date",
    "type",
    "num",
    "name",
    "asset",
    "asset name",
    "acquired",
    "description",
    "item",
    "product",
    "part",
    "part number",
  ].some((label) => normalized === label || normalized.includes(label));
}

function isStatementAmountCell(row: unknown[], cellIndex: number, value: unknown) {
  if (cellIndex === 0) return false;
  if (parseNumber(value) === null) return false;
  const rowLabel = String(row[0] || "").trim();

  return Boolean(rowLabel) && !isDateOrPeriodLabel(rowLabel) && !isHeaderRow(row);
}

function isNumericFinancialCell(
  row: unknown[],
  cellIndex: number,
  value: unknown,
  headers: unknown[] = [],
) {
  const text = String(value || "").trim();
  if (!text) return false;
  if (cellIndex === 0) return false;
  if (isHeaderRow(row)) return false;
  if (isDateOrPeriodLabel(value) || isAgingBucketLabel(value)) return false;
  if (text.includes("%")) return false;

  const parsedValue = parseNumber(value);
  if (parsedValue === null) return false;

  const columnLabel = getColumnLabel(headers, cellIndex);
  if (
    isTextColumn(columnLabel) ||
    isPercentColumn(columnLabel) ||
    isRateColumn(columnLabel) ||
    isNumberColumn(columnLabel)
  ) {
    return false;
  }
  if (isCurrencyColumn(columnLabel)) return true;

  return isStatementAmountCell(row, cellIndex, value);
}

function formatTableCell(value: unknown, columnName: unknown, row: unknown[], rowIndex: number) {
  const text = String(value || "");
  if (!text) return "";
  const rowLabel = String(row[0] || "");
  const columnLabel = normalizeHeader(columnName);
  const parsedValue = parseNumber(value);

  if (rowIndex >= 0 && isHeaderRow(row)) return text;
  if (isDateOrPeriodLabel(value) || isAgingBucketLabel(value)) return text;
  if (parsedValue === null) return text;

  if (isPercentColumn(columnLabel) || String(value).includes("%")) {
    return formatPercent(parsedValue);
  }

  if (isRateColumn(columnLabel)) {
    return formatRate(parsedValue);
  }

  if (isNumberColumn(columnLabel)) {
    return formatNumber(parsedValue);
  }

  if (isCurrencyColumn(columnLabel)) {
    const displayValue = normalizeStatementLabel(rowLabel).includes("accumulated depreciation")
      ? -Math.abs(parsedValue)
      : parsedValue;
    return formatCurrency(displayValue);
  }

  return text;
}

function formatPreviewCell(
  row: unknown[],
  cell: unknown,
  cellIndex: number,
  headers: unknown[] = [],
  rowIndex = -1,
  previewTitle = "",
) {
  const parsedValue = parseNumber(cell);
  const normalizedPreviewTitle = previewTitle.toLowerCase();
  const isAgingPreview = normalizedPreviewTitle.includes("aging");
  const isInventoryPreview = normalizedPreviewTitle.includes("inventory");
  const isFinancialStatementPreview =
    normalizedPreviewTitle.includes("profit") ||
    normalizedPreviewTitle.includes("loss") ||
    normalizedPreviewTitle.includes("balance sheet");
  const headerColumnName = headers[cellIndex] || "";
  const columnLabel = getColumnLabel(headers, cellIndex);
  const headerIsPercent = isPercentColumn(columnLabel);
  const headerIsRate = isRateColumn(columnLabel);
  const headerIsQuantity = isNumberColumn(columnLabel);
  const headerIsText = isTextColumn(columnLabel);

  if (
    cellIndex > 0 &&
    parsedValue !== null &&
    !isHeaderRow(row) &&
    headerIsPercent
  ) {
    return formatPercent(parsedValue);
  }

  if (cellIndex > 0 && parsedValue !== null && !isHeaderRow(row) && headerIsRate) {
    return formatRate(parsedValue);
  }

  if (isInventoryPreview && !isHeaderRow(row)) {
    if (cellIndex === 0 || cellIndex === 1) return String(cell || "");
    if (parsedValue === null) return String(cell || "");
    if (cellIndex === 2) return formatNumber(parsedValue);
    if (cellIndex >= 3) return formatCurrency(parsedValue);
  }

  if (
    isAgingPreview &&
    cellIndex > 0 &&
    parsedValue !== null &&
    !isHeaderRow(row) &&
    !isAgingBucketLabel(cell)
  ) {
    return formatCurrency(parsedValue);
  }

  if (
    isFinancialStatementPreview &&
    cellIndex > 0 &&
    parsedValue !== null &&
    !isHeaderRow(row) &&
    !isAgingBucketLabel(cell)
  ) {
    const rowLabel = String(row[0] || "");
    const displayValue = normalizeStatementLabel(rowLabel).includes("accumulated depreciation")
      ? -Math.abs(parsedValue)
      : parsedValue;
    return formatCurrency(displayValue);
  }

  if (
    cellIndex > 0 &&
    parsedValue !== null &&
    !isHeaderRow(row) &&
    !isAgingBucketLabel(cell) &&
    !headerIsText &&
    !headerIsQuantity &&
    !headerIsPercent &&
    !headerIsRate
  ) {
    const rowLabel = String(row[0] || "");
    const displayValue = normalizeStatementLabel(rowLabel).includes("accumulated depreciation")
      ? -Math.abs(parsedValue)
      : parsedValue;
    return formatCurrency(displayValue);
  }

  const shouldUseStatementAmount =
    isStatementAmountCell(row, cellIndex, cell) &&
    !headerIsPercent &&
    !headerIsRate &&
    !headerIsQuantity;
  const columnName = shouldUseStatementAmount ? "Amount" : headerColumnName;

  return formatTableCell(cell, columnName, row, rowIndex);
}

function getTopExpenseRows(plData: ParsedFile | null) {
  const rows = getStatementRows(plData);
  const expensesStart = rows.findIndex((row) => row.label.toLowerCase() === "expenses");
  const totalExpensesIndex = rows.findIndex(
    (row) => row.label.toLowerCase() === "total expenses",
  );

  const expenseRows =
    expensesStart >= 0 && totalExpensesIndex > expensesStart
      ? rows.slice(expensesStart + 1, totalExpensesIndex)
      : rows.filter((row) => {
          const label = row.label.toLowerCase();

          return (
            row.amount !== null &&
            row.amount > 0 &&
            !label.includes("total") &&
            !label.includes("income") &&
            !label.includes("gross profit") &&
            !label.includes("net income") &&
            !label.includes("cost of goods sold")
          );
        });

  return expenseRows
    .filter((row) => row.amount !== null && row.amount > 0)
    .sort((a, b) => (b.amount || 0) - (a.amount || 0))
    .slice(0, 5);
}

function interpretNetMargin(value: number) {
  if (value > 20) return "Strong profitability. The company is converting revenue into profit at a healthy rate.";
  if (value >= 10) return "Moderate profitability. Margins are positive, but expense control should be monitored.";
  return "Low profitability. Review pricing, labor costs, and operating expenses.";
}

function interpretGrossMargin(value: number) {
  if (value > 50) return "Strong gross margin. Direct costs are being managed well.";
  if (value >= 30) return "Acceptable gross margin. Monitor labor, materials, and job costing.";
  return "Low gross margin. Review pricing, COGS, and production efficiency.";
}

function interpretExpenseRatio(value: number) {
  if (value < 25) return "Operating expenses are well controlled relative to revenue.";
  if (value <= 40) return "Operating expenses are moderate. Continue monitoring overhead.";
  return "Operating expenses are high. Review administrative costs, subscriptions, insurance, payroll, and discretionary spend.";
}

function interpretCurrentRatio(value: number | null) {
  if (value === null) return "Current assets and current liabilities are needed for a precise calculation.";
  if (value > 2) return "Strong short-term liquidity.";
  if (value >= 1.2) return "Adequate liquidity.";
  return "Potential liquidity risk.";
}

function interpretQuickRatio(value: number | null) {
  if (value === null) return "Current liabilities are needed for a precise calculation.";
  if (value > 1.5) return "Strong near-term liquidity without relying on inventory.";
  if (value >= 1) return "Acceptable liquidity, but cash and receivables should be monitored.";
  return "Potential short-term cash pressure.";
}

function interpretCashToAssets(value: number) {
  if (value > 25) return "Strong cash position relative to total assets.";
  if (value >= 10) return "Moderate cash position.";
  return "Low cash cushion.";
}

function interpretArToAssets(value: number) {
  if (value > 25) return "High AR concentration. Collections should be reviewed closely.";
  if (value >= 10) return "AR is a meaningful part of assets. Monitor aging and collection timing.";
  return "Low AR concentration.";
}

function interpretApToRevenue(value: number) {
  if (value > 15) return "Vendor obligations are elevated relative to revenue. Monitor cash flow and payment timing.";
  if (value >= 5) return "AP is manageable relative to revenue.";
  return "Low vendor obligation burden.";
}

function interpretInventoryToAssets(value: number) {
  if (value > 30) return "Inventory represents a large share of assets. Monitor turnover, obsolete inventory, and purchasing discipline.";
  if (value >= 10) return "Inventory investment appears reasonable.";
  return "Inventory is a smaller portion of the asset base.";
}

function interpretWorkingCapital(value: number | null, revenue: number) {
  if (value === null) return "Current assets and current liabilities are needed for a precise calculation.";
  const tightThreshold = Math.max(Math.abs(revenue) * 0.02, 1000);

  if (value < 0) return "Potential liquidity concern.";
  if (value <= tightThreshold) return "Working capital is tight.";
  return "Positive working capital supports operating flexibility.";
}

function interpretDso(value: number | null) {
  if (value === null) return "DSO requires revenue, accounts receivable, and reporting period days.";
  if (value < 30) return "Collections are strong.";
  if (value <= 60) return "Collections are acceptable but should be monitored.";
  return "Collections may be slow. Review aging buckets and follow-up procedures.";
}

function calculatePeriodDays(startDate: string, endDate: string) {
  if (!startDate || !endDate) return null;

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  const days = Math.floor((end.getTime() - start.getTime()) / millisecondsPerDay) + 1;

  return Number.isFinite(days) && days > 0 ? days : null;
}

function calculateDso(kpis: KPIs, periodDays: number | null) {
  if (!kpis.revenue || !kpis.accountsReceivable || !periodDays) return null;

  const averageDailySales = kpis.revenue / periodDays;
  return averageDailySales ? kpis.accountsReceivable / averageDailySales : null;
}

function buildRatioRows(
  kpis: KPIs,
  netMargin: number,
  bsRows: StatementRow[],
  apKpis: APKpis,
  inventoryKpis: InventoryKpis,
  periodDays: number | null,
) {
  const grossMargin = kpis.revenue ? (kpis.grossProfit / kpis.revenue) * 100 : 0;
  const expenseRatio = kpis.revenue ? (kpis.expenses / kpis.revenue) * 100 : 0;
  const currentAssets = getCurrentAssetTotal(bsRows);
  const currentLiabilities = getCurrentLiabilityTotal(bsRows);
  const currentRatio = currentAssets && currentLiabilities ? currentAssets / currentLiabilities : null;
  const quickRatio = currentLiabilities
    ? (kpis.cash + kpis.accountsReceivable) / currentLiabilities
    : null;
  const cashToAssets = kpis.totalAssets ? (kpis.cash / kpis.totalAssets) * 100 : 0;
  const arToAssets = kpis.totalAssets ? (kpis.accountsReceivable / kpis.totalAssets) * 100 : 0;
  const apToRevenue = kpis.revenue ? (apKpis.total / kpis.revenue) * 100 : 0;
  const inventoryToAssets = kpis.totalAssets
    ? (inventoryKpis.totalValue / kpis.totalAssets) * 100
    : 0;
  const workingCapital =
    currentAssets && currentLiabilities ? currentAssets - currentLiabilities : null;
  const dso = calculateDso(kpis, periodDays);

  return [
    {
      name: "Net Margin",
      formula: "Net Income / Revenue",
      value: `${netMargin.toFixed(1)}%`,
      interpretation: interpretNetMargin(netMargin),
    },
    {
      name: "Gross Margin",
      formula: "Gross Profit / Revenue",
      value: `${grossMargin.toFixed(1)}%`,
      interpretation: interpretGrossMargin(grossMargin),
    },
    {
      name: "Expense Ratio",
      formula: "Total Expenses / Revenue",
      value: `${expenseRatio.toFixed(1)}%`,
      interpretation: interpretExpenseRatio(expenseRatio),
    },
    {
      name: "Current Ratio",
      formula: "Current Assets / Current Liabilities",
      value: currentRatio !== null ? currentRatio.toFixed(2) : "N/A",
      interpretation: interpretCurrentRatio(currentRatio),
    },
    {
      name: "Quick Ratio",
      formula: "(Cash + Accounts Receivable) / Current Liabilities",
      value: quickRatio !== null ? quickRatio.toFixed(2) : "N/A",
      interpretation: interpretQuickRatio(quickRatio),
    },
    {
      name: "Cash to Assets",
      formula: "Cash / Total Assets",
      value: `${cashToAssets.toFixed(1)}%`,
      interpretation: interpretCashToAssets(cashToAssets),
    },
    {
      name: "Accounts Receivable to Assets",
      formula: "Accounts Receivable / Total Assets",
      value: `${arToAssets.toFixed(1)}%`,
      interpretation: interpretArToAssets(arToAssets),
    },
    {
      name: "AP to Revenue",
      formula: "Accounts Payable / Revenue",
      value: `${apToRevenue.toFixed(1)}%`,
      interpretation: interpretApToRevenue(apToRevenue),
    },
    {
      name: "Inventory to Total Assets",
      formula: "Inventory / Total Assets",
      value: `${inventoryToAssets.toFixed(1)}%`,
      interpretation: interpretInventoryToAssets(inventoryToAssets),
    },
    {
      name: "Working Capital Estimate",
      formula: "Current Assets - Current Liabilities",
      value: workingCapital !== null ? formatMoney(workingCapital) : "N/A",
      interpretation: interpretWorkingCapital(workingCapital, kpis.revenue),
    },
    {
      name: "DSO",
      formula: "Accounts Receivable / (Revenue / Period Days)",
      value: dso !== null ? `${dso.toFixed(1)} days` : "N/A",
      interpretation: interpretDso(dso),
    },
  ];
}

function getGlAccounts(data: ParsedFile | null): FluxAccount[] {
  if (!data) return [];

  const headerIndex = data.rows.findIndex((row) =>
    row.some((cell) => {
      const text = normalizeHeader(cell);
      return text.includes("account") || text.includes("amount") || text.includes("balance");
    }),
  );
  const headers = data.rows[headerIndex] || [];
  const dataRows = headerIndex >= 0 ? data.rows.slice(headerIndex + 1) : data.rows;
  const accountNumberIndex = findHeaderIndex(headers, ["account number", "account #", "num"]);
  const accountNameIndex = findHeaderIndex(headers, ["account name", "account"]);
  const amountIndex = findHeaderIndex(headers, ["amount", "balance", "total"]);

  const accounts = new Map<string, FluxAccount>();

  dataRows.forEach((row) => {
    const fallbackLabel = String(row[0] || "").trim();
    const accountNumber =
      String(row[accountNumberIndex] || "").trim() || fallbackLabel.match(/^\d+/)?.[0] || "N/A";
    const accountName =
      String(row[accountNameIndex >= 0 ? accountNameIndex : 0] || "").trim() || fallbackLabel;
    const amount =
      amountIndex >= 0
        ? parseNumber(row[amountIndex]) || 0
        : row.reduce((latest, cell) => parseNumber(cell) ?? latest, 0);

    if (!accountName || accountName.toLowerCase() === "total") return;

    const key = `${accountNumber}-${accountName}`;
    const existing = accounts.get(key);

    accounts.set(key, {
      accountNumber,
      accountName,
      amount: (existing?.amount || 0) + amount,
    });
  });

  return [...accounts.values()];
}

function getFluxRows(
  currentData: ParsedFile | null,
  priorData: ParsedFile | null,
  settings: FluxSettings,
): FluxRow[] {
  const currentAccounts = getGlAccounts(currentData);
  const priorAccounts = getGlAccounts(priorData);
  const accountMap = new Map<string, { current?: FluxAccount; prior?: FluxAccount }>();

  currentAccounts.forEach((account) => {
    accountMap.set(`${account.accountNumber}-${account.accountName}`, { current: account });
  });

  priorAccounts.forEach((account) => {
    const key = `${account.accountNumber}-${account.accountName}`;
    accountMap.set(key, { ...accountMap.get(key), prior: account });
  });

  return [...accountMap.values()]
    .map(({ current, prior }) => {
      const currentAmount = current?.amount || 0;
      const priorAmount = prior?.amount || 0;
      const dollarVariance = currentAmount - priorAmount;
      const percentVariance = priorAmount ? (dollarVariance / Math.abs(priorAmount)) * 100 : null;
      const absoluteDollarVariance = Math.abs(dollarVariance);
      const absolutePercentVariance = Math.abs(percentVariance || 0);
      const dollarPass = absoluteDollarVariance >= settings.dollarThreshold;
      const percentPass = absolutePercentVariance >= settings.percentThreshold;
      const passes = settings.logic === "both" ? dollarPass && percentPass : dollarPass || percentPass;
      const isZeroActivity =
        (priorAmount === 0 && currentAmount > 0) || (currentAmount === 0 && priorAmount > 0);

      let flagReason = "Threshold exceeded";
      if (priorAmount === 0 && currentAmount > 0) flagReason = "New activity";
      if (currentAmount === 0 && priorAmount > 0) flagReason = "Activity stopped";

      let severity: FluxSeverity = "Low";
      if (absolutePercentVariance >= 25 && absoluteDollarVariance >= 10000) severity = "High";
      else if (absolutePercentVariance >= 10 && absoluteDollarVariance >= 5000) severity = "Moderate";

      return {
        accountNumber: current?.accountNumber || prior?.accountNumber || "N/A",
        accountName: current?.accountName || prior?.accountName || "Unknown Account",
        currentAmount,
        priorAmount,
        dollarVariance,
        percentVariance,
        direction: dollarVariance > 0 ? "Increase" : dollarVariance < 0 ? "Decrease" : "No change",
        severity,
        flagReason,
        passes,
        isZeroActivity,
      };
    })
    .filter((row) => row.passes && (settings.includeZeroActivity || !row.isZeroActivity))
    .sort((a, b) => Math.abs(b.dollarVariance) - Math.abs(a.dollarVariance))
    .map(({ passes, isZeroActivity, ...row }) => row);
}

export default function UploadPage() {
  const [packageTier, setPackageTier] = useState<PackageTier>("essential");
  const [hasSelectedPackage, setHasSelectedPackage] = useState(false);
  const [isPackageGenerated, setIsPackageGenerated] = useState(false);
  const [isPackageExported, setIsPackageExported] = useState(false);
  const [kpisConfirmed, setKpisConfirmed] = useState(false);
  const [reviewerNotes, setReviewerNotes] = useState("");
  const [reportingPeriodStart, setReportingPeriodStart] = useState("");
  const [reportingPeriodEnd, setReportingPeriodEnd] = useState("");
  const [manualPeriodDays, setManualPeriodDays] = useState("");
  const [reportsChangedAfterConfirmation, setReportsChangedAfterConfirmation] = useState(false);
  const [omittedReportIds, setOmittedReportIds] = useState<string[]>([]);
  const [plData, setPlData] = useState<ParsedFile | null>(null);
  const [bsData, setBsData] = useState<ParsedFile | null>(null);
  const [arData, setArData] = useState<ParsedFile | null>(null);
  const [apData, setApData] = useState<ParsedFile | null>(null);
  const [inventoryData, setInventoryData] = useState<ParsedFile | null>(null);
  const [customerSalesData, setCustomerSalesData] = useState<ParsedFile | null>(null);
  const [vendorExpenseData, setVendorExpenseData] = useState<ParsedFile | null>(null);
  const [fixedAssetData, setFixedAssetData] = useState<ParsedFile | null>(null);
  const [priorFixedAssetData, setPriorFixedAssetData] = useState<ParsedFile | null>(null);
  const [budgetVsActualData, setBudgetVsActualData] = useState<ParsedFile | null>(null);
  const [priorPeriodPlData, setPriorPeriodPlData] = useState<ParsedFile | null>(null);
  const [priorPeriodBsData, setPriorPeriodBsData] = useState<ParsedFile | null>(null);
  const [cashFlowData, setCashFlowData] = useState<ParsedFile | null>(null);
  const [debtScheduleData, setDebtScheduleData] = useState<ParsedFile | null>(null);
  const [currentMonthGlData, setCurrentMonthGlData] = useState<ParsedFile | null>(null);
  const [priorMonthGlData, setPriorMonthGlData] = useState<ParsedFile | null>(null);
  const [currentQuarterGlData, setCurrentQuarterGlData] = useState<ParsedFile | null>(null);
  const [priorQuarterGlData, setPriorQuarterGlData] = useState<ParsedFile | null>(null);
  const [currentYearGlData, setCurrentYearGlData] = useState<ParsedFile | null>(null);
  const [priorYearGlData, setPriorYearGlData] = useState<ParsedFile | null>(null);
  const [fluxSettings, setFluxSettings] = useState<FluxSettings>({
    dollarThreshold: 5000,
    percentThreshold: 10,
    logic: "both",
    includeZeroActivity: true,
  });

  const resetGeneratedState = () => {
    setIsPackageGenerated(false);
    setIsPackageExported(false);
    if (kpisConfirmed) setReportsChangedAfterConfirmation(true);
    setKpisConfirmed(false);
  };
  const isReportOmitted = (reportId: string) => omittedReportIds.includes(reportId);
  const setReportOmitted = (reportId: string, omitted: boolean) => {
    resetGeneratedState();
    setOmittedReportIds((current) =>
      omitted ? [...new Set([...current, reportId])] : current.filter((id) => id !== reportId),
    );
  };
  const removeReport = (setData: (data: ParsedFile | null) => void, reportId: string) => {
    resetGeneratedState();
    setData(null);
    setOmittedReportIds((current) => current.filter((id) => id !== reportId));
  };

  const parseFile = async (file: File, setData: (data: ParsedFile) => void) => {
    resetGeneratedState();
    const extension = file.name.split(".").pop()?.toLowerCase();

    if (extension === "csv") {
      await new Promise<void>((resolve, reject) => {
        Papa.parse(file, {
          complete: (result) => {
            setData({ name: file.name, rows: result.data as unknown[][] });
            resolve();
          },
          error: reject,
        });
      });
    } else if (extension === "xlsx" || extension === "xls") {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { cellFormula: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = extractRowsFromWorksheet(sheet);

      setData({ name: file.name, rows });
    } else {
      alert("Please upload a CSV or Excel file.");
    }
  };

  const uploadReports: UploadReport[] = [
    {
      id: "pl",
      tier: "essential",
      label: "Profit and Loss",
      description:
        "Export the QuickBooks Profit and Loss report. Used to calculate revenue, COGS, gross profit, expenses, and net income.",
      required: true,
      omitted: isReportOmitted("pl"),
      data: plData,
      onFile: (file) => parseFile(file, setPlData),
      onRemove: () => removeReport(setPlData, "pl"),
      onOmitChange: (omitted) => setReportOmitted("pl", omitted),
    },
    {
      id: "bs",
      tier: "essential",
      label: "Balance Sheet",
      description:
        "Export the QuickBooks Balance Sheet report. Used to calculate cash, receivables, assets, equity, and liquidity metrics.",
      required: true,
      omitted: isReportOmitted("bs"),
      data: bsData,
      onFile: (file) => parseFile(file, setBsData),
      onRemove: () => removeReport(setBsData, "bs"),
      onOmitChange: (omitted) => setReportOmitted("bs", omitted),
    },
    {
      id: "ar",
      tier: "essential",
      label: "Accounts Receivable Aging Summary",
      description:
        "Export the QuickBooks Accounts Receivable Aging Summary report. Supports receivables review, collections, and DSO commentary.",
      required: false,
      omitted: isReportOmitted("ar"),
      data: arData,
      onFile: (file) => parseFile(file, setArData),
      onRemove: () => removeReport(setArData, "ar"),
      onOmitChange: (omitted) => setReportOmitted("ar", omitted),
    },
    {
      id: "ap",
      tier: "essential",
      label: "Accounts Payable Aging Summary",
      description:
        "Export the QuickBooks Accounts Payable Aging Summary report. Supports payables review, vendor obligations, and working capital analysis.",
      required: false,
      omitted: isReportOmitted("ap"),
      data: apData,
      onFile: (file) => parseFile(file, setApData),
      onRemove: () => removeReport(setApData, "ap"),
      onOmitChange: (omitted) => setReportOmitted("ap", omitted),
    },
    {
      id: "inventory",
      tier: "professional",
      label: "Inventory Valuation Summary",
      description:
        "Export the QuickBooks Inventory Valuation Summary report. Adds inventory value, quantity on hand, and top item analytics.",
      required: false,
      omitted: isReportOmitted("inventory"),
      data: inventoryData,
      onFile: (file) => parseFile(file, setInventoryData),
      onRemove: () => removeReport(setInventoryData, "inventory"),
      onOmitChange: (omitted) => setReportOmitted("inventory", omitted),
    },
    {
      id: "customers",
      tier: "professional",
      label: "Sales by Customer Summary",
      description:
        "Export the QuickBooks Sales by Customer Summary report. Adds top customer visibility and customer concentration commentary.",
      required: false,
      omitted: isReportOmitted("customers"),
      data: customerSalesData,
      onFile: (file) => parseFile(file, setCustomerSalesData),
      onRemove: () => removeReport(setCustomerSalesData, "customers"),
      onOmitChange: (omitted) => setReportOmitted("customers", omitted),
    },
    {
      id: "vendors",
      tier: "professional",
      label: "Expenses by Vendor Summary",
      description:
        "Export the QuickBooks Expenses by Vendor Summary report. Adds vendor concentration and expense category analysis.",
      required: false,
      omitted: isReportOmitted("vendors"),
      data: vendorExpenseData,
      onFile: (file) => parseFile(file, setVendorExpenseData),
      onRemove: () => removeReport(setVendorExpenseData, "vendors"),
      onOmitChange: (omitted) => setReportOmitted("vendors", omitted),
    },
    {
      id: "fixed-assets",
      tier: "virtualCfo",
      label: "Fixed Asset Detail / Fixed Asset Register",
      description:
        "Export the QuickBooks Fixed Asset Detail or Fixed Asset Register report. Adds fixed asset, depreciation, and net book value analysis.",
      required: false,
      omitted: isReportOmitted("fixed-assets"),
      data: fixedAssetData,
      onFile: (file) => parseFile(file, setFixedAssetData),
      onRemove: () => removeReport(setFixedAssetData, "fixed-assets"),
      onOmitChange: (omitted) => setReportOmitted("fixed-assets", omitted),
    },
    {
      id: "prior-fixed-assets",
      tier: "virtualCfo",
      label: "Prior Period Fixed Asset Report",
      description:
        "Export the prior period QuickBooks Fixed Asset Detail or Fixed Asset Register report. Used to calculate additions, disposals, depreciation change, and net book value movement.",
      required: false,
      omitted: isReportOmitted("prior-fixed-assets"),
      data: priorFixedAssetData,
      onFile: (file) => parseFile(file, setPriorFixedAssetData),
      onRemove: () => removeReport(setPriorFixedAssetData, "prior-fixed-assets"),
      onOmitChange: (omitted) => setReportOmitted("prior-fixed-assets", omitted),
    },
    {
      id: "budget",
      tier: "virtualCfo",
      label: "Budget vs. Actuals",
      description:
        "Export the QuickBooks Budget vs. Actuals report. Supports variance analysis and budget performance review.",
      required: false,
      omitted: isReportOmitted("budget"),
      data: budgetVsActualData,
      onFile: (file) => parseFile(file, setBudgetVsActualData),
      onRemove: () => removeReport(setBudgetVsActualData, "budget"),
      onOmitChange: (omitted) => setReportOmitted("budget", omitted),
    },
    {
      id: "prior-pl",
      tier: "virtualCfo",
      label: "Profit and Loss Comparison",
      description:
        "Export the QuickBooks Profit and Loss Comparison report. Supports trend, variance, and period-over-period comparison.",
      required: false,
      omitted: isReportOmitted("prior-pl"),
      data: priorPeriodPlData,
      onFile: (file) => parseFile(file, setPriorPeriodPlData),
      onRemove: () => removeReport(setPriorPeriodPlData, "prior-pl"),
      onOmitChange: (omitted) => setReportOmitted("prior-pl", omitted),
    },
    {
      id: "prior-bs",
      tier: "virtualCfo",
      label: "Balance Sheet Comparison",
      description:
        "Export the QuickBooks Balance Sheet Comparison report. Supports balance sheet movement and working capital comparison.",
      required: false,
      omitted: isReportOmitted("prior-bs"),
      data: priorPeriodBsData,
      onFile: (file) => parseFile(file, setPriorPeriodBsData),
      onRemove: () => removeReport(setPriorPeriodBsData, "prior-bs"),
      onOmitChange: (omitted) => setReportOmitted("prior-bs", omitted),
    },
    {
      id: "cash-flow",
      tier: "virtualCfo",
      label: "Statement of Cash Flows",
      description:
        "Export the QuickBooks Statement of Cash Flows report. Supports cash flow review and CFO-level liquidity commentary.",
      required: false,
      omitted: isReportOmitted("cash-flow"),
      data: cashFlowData,
      onFile: (file) => parseFile(file, setCashFlowData),
      onRemove: () => removeReport(setCashFlowData, "cash-flow"),
      onOmitChange: (omitted) => setReportOmitted("cash-flow", omitted),
    },
    {
      id: "debt",
      tier: "virtualCfo",
      label: "Debt Schedule / Loan Detail",
      description:
        "Export a QuickBooks loan detail report or your debt schedule. Supports debt analysis, risk indicators, and leverage commentary.",
      required: false,
      omitted: isReportOmitted("debt"),
      data: debtScheduleData,
      onFile: (file) => parseFile(file, setDebtScheduleData),
      onRemove: () => removeReport(setDebtScheduleData, "debt"),
      onOmitChange: (omitted) => setReportOmitted("debt", omitted),
    },
    {
      id: "current-month-gl",
      tier: "virtualCfo",
      label: "General Ledger - Current Month",
      description:
        "Export the QuickBooks General Ledger for the current month. Used for month-over-month flux analysis.",
      required: false,
      omitted: isReportOmitted("current-month-gl"),
      data: currentMonthGlData,
      onFile: (file) => parseFile(file, setCurrentMonthGlData),
      onRemove: () => removeReport(setCurrentMonthGlData, "current-month-gl"),
      onOmitChange: (omitted) => setReportOmitted("current-month-gl", omitted),
    },
    {
      id: "prior-month-gl",
      tier: "virtualCfo",
      label: "General Ledger - Prior Month",
      description:
        "Export the QuickBooks General Ledger for the prior month. Used as the comparison period for monthly flux analysis.",
      required: false,
      omitted: isReportOmitted("prior-month-gl"),
      data: priorMonthGlData,
      onFile: (file) => parseFile(file, setPriorMonthGlData),
      onRemove: () => removeReport(setPriorMonthGlData, "prior-month-gl"),
      onOmitChange: (omitted) => setReportOmitted("prior-month-gl", omitted),
    },
    {
      id: "current-quarter-gl",
      tier: "virtualCfo",
      label: "General Ledger - Current Quarter",
      description:
        "Export the QuickBooks General Ledger for the current quarter. Used for quarter-over-quarter flux analysis.",
      required: false,
      omitted: isReportOmitted("current-quarter-gl"),
      data: currentQuarterGlData,
      onFile: (file) => parseFile(file, setCurrentQuarterGlData),
      onRemove: () => removeReport(setCurrentQuarterGlData, "current-quarter-gl"),
      onOmitChange: (omitted) => setReportOmitted("current-quarter-gl", omitted),
    },
    {
      id: "prior-quarter-gl",
      tier: "virtualCfo",
      label: "General Ledger - Prior Quarter",
      description:
        "Export the QuickBooks General Ledger for the prior quarter. Used as the comparison period for quarterly flux analysis.",
      required: false,
      omitted: isReportOmitted("prior-quarter-gl"),
      data: priorQuarterGlData,
      onFile: (file) => parseFile(file, setPriorQuarterGlData),
      onRemove: () => removeReport(setPriorQuarterGlData, "prior-quarter-gl"),
      onOmitChange: (omitted) => setReportOmitted("prior-quarter-gl", omitted),
    },
    {
      id: "current-year-gl",
      tier: "virtualCfo",
      label: "General Ledger - Current Year",
      description:
        "Export the QuickBooks General Ledger for the current year. Used for year-over-year flux analysis.",
      required: false,
      omitted: isReportOmitted("current-year-gl"),
      data: currentYearGlData,
      onFile: (file) => parseFile(file, setCurrentYearGlData),
      onRemove: () => removeReport(setCurrentYearGlData, "current-year-gl"),
      onOmitChange: (omitted) => setReportOmitted("current-year-gl", omitted),
    },
    {
      id: "prior-year-gl",
      tier: "virtualCfo",
      label: "General Ledger - Prior Year",
      description:
        "Export the QuickBooks General Ledger for the prior year. Used as the comparison period for annual flux analysis.",
      required: false,
      omitted: isReportOmitted("prior-year-gl"),
      data: priorYearGlData,
      onFile: (file) => parseFile(file, setPriorYearGlData),
      onRemove: () => removeReport(setPriorYearGlData, "prior-year-gl"),
      onOmitChange: (omitted) => setReportOmitted("prior-year-gl", omitted),
    },
  ];
  const selectedReports = uploadReports.filter((report) =>
    isReportAvailable(report.tier, packageTier),
  );
  const uploadedReportsCount = selectedReports.filter(
    (report) => report.required && report.data && !report.omitted,
  ).length;
  const missingReports = selectedReports.filter(
    (report) => report.required && !report.omitted && !report.data,
  );
  const requiredUploadsComplete = hasSelectedPackage && selectedReports.length > 0 && missingReports.length === 0;
  const kpisAvailable = requiredUploadsComplete;
  const canReviewKpis = requiredUploadsComplete;
  const canGeneratePackage = canReviewKpis && kpisAvailable && kpisConfirmed;
  const canPreviewPackage = isPackageGenerated;

  const activePlData = isReportOmitted("pl") ? null : plData;
  const activeBsData = isReportOmitted("bs") ? null : bsData;
  const activeArData = isReportOmitted("ar") ? null : arData;
  const activeApData = isReportOmitted("ap") ? null : apData;
  const activeInventoryData = isReportOmitted("inventory") ? null : inventoryData;
  const activeCustomerSalesData = isReportOmitted("customers") ? null : customerSalesData;
  const activeVendorExpenseData = isReportOmitted("vendors") ? null : vendorExpenseData;
  const activeFixedAssetData = isReportOmitted("fixed-assets") ? null : fixedAssetData;
  const activePriorFixedAssetData = isReportOmitted("prior-fixed-assets") ? null : priorFixedAssetData;
  const activeBudgetVsActualData = isReportOmitted("budget") ? null : budgetVsActualData;
  const activePriorPeriodPlData = isReportOmitted("prior-pl") ? null : priorPeriodPlData;
  const activePriorPeriodBsData = isReportOmitted("prior-bs") ? null : priorPeriodBsData;
  const activeCashFlowData = isReportOmitted("cash-flow") ? null : cashFlowData;
  const activeDebtScheduleData = isReportOmitted("debt") ? null : debtScheduleData;
  const activeCurrentMonthGlData = isReportOmitted("current-month-gl") ? null : currentMonthGlData;
  const activePriorMonthGlData = isReportOmitted("prior-month-gl") ? null : priorMonthGlData;
  const activeCurrentQuarterGlData = isReportOmitted("current-quarter-gl") ? null : currentQuarterGlData;
  const activePriorQuarterGlData = isReportOmitted("prior-quarter-gl") ? null : priorQuarterGlData;
  const activeCurrentYearGlData = isReportOmitted("current-year-gl") ? null : currentYearGlData;
  const activePriorYearGlData = isReportOmitted("prior-year-gl") ? null : priorYearGlData;

  const kpis = calculateKPIs(activePlData, activeBsData);
  const netMargin = kpis.revenue ? (kpis.netIncome / kpis.revenue) * 100 : 0;
  const autoPeriodDays = calculatePeriodDays(reportingPeriodStart, reportingPeriodEnd);
  const manualPeriodDaysValue = parseNumber(manualPeriodDays);
  const reportingPeriodDays =
    manualPeriodDaysValue && manualPeriodDaysValue > 0 ? manualPeriodDaysValue : autoPeriodDays;
  const dso = calculateDso(kpis, reportingPeriodDays);
  const arKpis = calculateAgingKpis(activeArData);
  const apKpis = calculateAPKpis(activeApData);
  const inventoryKpis = calculateInventoryKpis(activeInventoryData);
  const fixedAssetKpis = calculateFixedAssetKpis(activeFixedAssetData, kpis.totalAssets, activePlData);
  const priorFixedAssetKpis = calculateFixedAssetKpis(activePriorFixedAssetData, kpis.totalAssets, null);
  const fixedAssetChangeRows = getFixedAssetChangeRows(fixedAssetKpis, priorFixedAssetKpis);
  const executiveSummary = buildExecutiveSummary(
    kpis,
    netMargin,
    activeFixedAssetData ? fixedAssetKpis : null,
  );
  const reportPeriod = "Current Reporting Period";
  const companyName = "Client Company Name";
  const monthFluxRows = getFluxRows(activeCurrentMonthGlData, activePriorMonthGlData, fluxSettings);
  const quarterFluxRows = getFluxRows(activeCurrentQuarterGlData, activePriorQuarterGlData, fluxSettings);
  const yearFluxRows = getFluxRows(activeCurrentYearGlData, activePriorYearGlData, fluxSettings);
  const ratioRows = buildRatioRows(
    kpis,
    netMargin,
    getStatementRows(activeBsData),
    apKpis,
    inventoryKpis,
    reportingPeriodDays,
  );
  const handlePackageTierChange = (tier: PackageTier) => {
    setPackageTier(tier);
    setHasSelectedPackage(true);
    setIsPackageGenerated(false);
    setIsPackageExported(false);
    setKpisConfirmed(false);
    setReportsChangedAfterConfirmation(false);
  };
  const handleGeneratePackage = () => {
    if (!canGeneratePackage) return;
    setIsPackageGenerated(true);
    setIsPackageExported(false);
  };
  const handleExportPackage = () => {
    setIsPackageExported(true);
    window.print();
  };

  return (
    <>
      <style jsx global>{`
        .chart-card {
          animation: chartFadeIn 500ms ease-out both;
        }

        @keyframes chartFadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media print {
          body {
            background: white !important;
          }

          .app-screen {
            display: none !important;
          }

          .print-package {
            display: block !important;
            background: white !important;
            color: #111827 !important;
            font-family: Arial, sans-serif;
          }

          .print-page {
            min-height: 100vh;
            padding: 48px;
            page-break-after: always;
            break-after: page;
          }

          .print-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }

          .print-page h1 {
            margin-bottom: 8px;
            font-size: 30px;
            color: #111827;
          }

          .print-page h2 {
            margin-top: 28px;
            margin-bottom: 12px;
            font-size: 22px;
            color: #1f2937;
          }

          .print-page h3 {
            margin-top: 22px;
            margin-bottom: 10px;
            font-size: 17px;
            color: #1f2937;
          }

          .print-page p,
          .print-page li {
            font-size: 13px;
            line-height: 1.6;
            color: #374151;
          }

          .print-report-meta,
          .print-grid,
          .print-kpi-card,
          .print-table,
          .print-section-block,
          .print-table tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .print-report-meta {
            margin-bottom: 28px;
            padding-bottom: 18px;
            border-bottom: 2px solid #1d4ed8;
          }

          .print-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 10px;
          }

          .print-kpi-card {
            border: 1px solid #d1d5db;
            border-radius: 8px;
            padding: 10px;
            background: #f9fafb;
          }

          .print-kpi-card span {
            display: block;
            margin-bottom: 3px;
            font-size: 10px;
            color: #6b7280;
          }

          .print-kpi-card strong {
            font-size: 15px;
            color: #111827;
          }

          .print-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 16px;
            font-size: 12px;
          }

          .print-table th,
          .print-table td {
            border: 1px solid #d1d5db;
            padding: 9px;
            text-align: left;
            vertical-align: top;
          }

          .print-table th {
            background: #f3f4f6;
            font-weight: 700;
            color: #111827;
          }

          .statement-header {
            break-after: avoid;
            page-break-after: avoid;
            margin-bottom: 16px;
          }

          .statement-table {
            break-inside: auto;
            page-break-inside: auto;
          }

          .statement-table thead {
            display: table-header-group;
          }

          .statement-table tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .print-statement-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            font-size: 12.5px;
          }

          .print-statement-table th {
            padding: 10px 0;
            border-bottom: 2px solid #111827;
            color: #111827;
            font-weight: 700;
            text-align: left;
          }

          .print-statement-table th:last-child,
          .print-statement-table td:last-child {
            text-align: right;
            font-variant-numeric: tabular-nums;
          }

          .print-statement-table td {
            padding: 7px 0;
            border-bottom: 1px solid #e5e7eb;
            color: #111827;
          }

          .print-statement-section td {
            padding-top: 20px;
            padding-bottom: 7px;
            border-bottom: 1px solid #9ca3af;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }

          .print-statement-detail td:first-child {
            padding-left: 24px;
            color: #374151;
          }

          .print-statement-subtotal td {
            border-top: 1px solid #9ca3af;
            border-bottom: 1px solid #d1d5db;
            background: #f9fafb;
            font-weight: 600;
          }

          .print-statement-calculated-value td {
            border-top: 1px solid #9ca3af;
            border-bottom: 1px solid #d1d5db;
            background: #f8fafc;
            font-weight: 700;
          }

          .print-statement-major-total td {
            padding-top: 10px;
            padding-bottom: 10px;
            border-top: 2px solid #111827;
            border-bottom: 1px solid #6b7280;
            background: #eef2ff;
            font-weight: 800;
          }

          .print-statement-grand-total td {
            padding-top: 11px;
            padding-bottom: 11px;
            border-top: 3px solid #111827;
            border-bottom: 2px solid #111827;
            background: #e5e7eb;
            font-size: 13.5px;
            font-weight: 900;
            text-transform: uppercase;
          }
        }
      `}</style>

      <main className="app-screen min-h-screen bg-[#0B1020] px-6 py-20 text-white">
        <div className="mx-auto max-w-7xl">
          <ImportWorkflow
            packageTier={packageTier}
            hasSelectedPackage={hasSelectedPackage}
            onPackageTierChange={handlePackageTierChange}
            reports={uploadReports}
            uploadedReportsCount={uploadedReportsCount}
            missingReports={missingReports}
            requiredUploadsComplete={requiredUploadsComplete}
            kpisConfirmed={kpisConfirmed}
            reportsChangedAfterConfirmation={reportsChangedAfterConfirmation}
            canGeneratePackage={canGeneratePackage}
            isPackageGenerated={isPackageGenerated}
            isPackageExported={isPackageExported}
            onGeneratePackage={handleGeneratePackage}
            onExportPackage={handleExportPackage}
          />

          {canReviewKpis && (
            <>
              <section className="mt-10 rounded-3xl border border-[#243041] bg-[#111827] p-8 shadow-xl shadow-black/10">
                <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#5B8CFF]">
                  Step 3 - Review & Confirm KPIs
                </p>
                <h2 className="mb-6 text-3xl font-bold">Detected Financial KPIs</h2>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
                  <KpiCard label="Revenue" value={kpis.revenue} />
                  <KpiCard label="COGS" value={kpis.cogs} />
                  <KpiCard label="Gross Profit" value={kpis.grossProfit} />
                  <KpiCard label="Expenses" value={kpis.expenses} />
                  <KpiCard label="Net Income" value={kpis.netIncome} />
                  <KpiCard label="Cash" value={kpis.cash} />
                  <KpiCard label="Accounts Receivable" value={kpis.accountsReceivable} />
                  <KpiCard label="Total Assets" value={kpis.totalAssets} />
                  <KpiCard label="Net Margin" value={netMargin} percent />
                  {activeApData && <KpiCard label="AP Aging Total" value={apKpis.total} />}
                  {isProfessionalOrHigher(packageTier) && activeInventoryData && (
                    <>
                      <KpiCard label="Inventory Value" value={inventoryKpis.totalValue} />
                      <KpiCard label="Inventory Quantity" value={inventoryKpis.totalQuantity} plain />
                    </>
                  )}
                  {isVirtualCfo(packageTier) && activeFixedAssetData && (
                    <>
                      <KpiCard label="Total Fixed Assets" value={fixedAssetKpis.totalFixedAssets} />
                      <KpiCard
                        label="Accumulated Depreciation"
                        value={fixedAssetKpis.accumulatedDepreciation}
                      />
                      <KpiCard label="Net Book Value" value={fixedAssetKpis.netBookValue} />
                    </>
                  )}
                </div>
              </section>

              <DsoSettingsPanel
                startDate={reportingPeriodStart}
                endDate={reportingPeriodEnd}
                manualDays={manualPeriodDays}
                autoDays={autoPeriodDays}
                effectiveDays={reportingPeriodDays}
                onStartDateChange={(value) => {
                  resetGeneratedState();
                  setReportingPeriodStart(value);
                }}
                onEndDateChange={(value) => {
                  resetGeneratedState();
                  setReportingPeriodEnd(value);
                }}
                onManualDaysChange={(value) => {
                  resetGeneratedState();
                  setManualPeriodDays(value);
                }}
              />

              <KpiConfirmationPanel
                packageTier={packageTier}
                kpis={kpis}
                apKpis={apKpis}
                inventoryKpis={inventoryKpis}
                fixedAssetKpis={fixedAssetKpis}
                netMargin={netMargin}
                includeAp={Boolean(activeApData)}
                includeInventory={Boolean(activeInventoryData)}
                includeFixedAssets={Boolean(activeFixedAssetData)}
                dso={dso}
                kpisConfirmed={kpisConfirmed}
                reviewerNotes={reviewerNotes}
                reportsChangedAfterConfirmation={reportsChangedAfterConfirmation}
                onKpisConfirmedChange={(confirmed) => {
                  setKpisConfirmed(confirmed);
                  if (confirmed) setReportsChangedAfterConfirmation(false);
                  if (!confirmed) {
                    setIsPackageGenerated(false);
                    setIsPackageExported(false);
                  }
                }}
                onReviewerNotesChange={setReviewerNotes}
              />

              <ExecutiveSummarySection executiveSummary={executiveSummary} />
              <RatioAnalysisSection ratioRows={ratioRows} />
            </>
          )}

          {canPreviewPackage && (
            <section className="mt-10 rounded-[2rem] border border-[#243041] bg-[#F9FAFB] p-2 text-[#111827] shadow-2xl shadow-black/20">
              <div className="rounded-[1.75rem] bg-white p-8">
                <div className="mb-8 flex flex-col gap-4 border-b border-slate-200 pb-6 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#5B8CFF]">
                      Step 5 - Generated Package Preview
                    </p>
                    <h2 className="text-4xl font-bold tracking-tight">{companyName}</h2>
                    <p className="mt-2 text-base text-slate-600">
                      {reportPeriod} | {PACKAGE_LABELS[packageTier]} Package
                    </p>
                  </div>

                  <p className="text-sm font-semibold text-slate-600">
                    Prepared by FinSight Reports
                  </p>
                </div>

                <div className="mb-8">
                  <h3 className="text-2xl font-bold">Executive Board Package Preview</h3>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                    This preview summarizes the client-ready financial packet generated from the
                    uploaded QuickBooks reports. Export the PDF package when the review is complete.
                  </p>
                </div>

                <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
                  <ReportMetricCard label="Revenue" value={formatMoney(kpis.revenue)} />
                  <ReportMetricCard label="Gross Profit" value={formatMoney(kpis.grossProfit)} />
                  <ReportMetricCard label="Net Income" value={formatMoney(kpis.netIncome)} />
                  <ReportMetricCard label="Cash" value={formatMoney(kpis.cash)} />
                  {activeApData && (
                    <ReportMetricCard label="AP Aging Total" value={formatMoney(apKpis.total)} />
                  )}
                  {isProfessionalOrHigher(packageTier) && activeInventoryData && (
                    <ReportMetricCard
                      label="Inventory Value"
                      value={formatMoney(inventoryKpis.totalValue)}
                    />
                  )}
                  {isVirtualCfo(packageTier) && activeFixedAssetData && (
                    <>
                      <ReportMetricCard
                        label="Fixed Assets"
                        value={formatCurrency(fixedAssetKpis.totalFixedAssets)}
                      />
                      <ReportMetricCard
                        label="Accumulated Depreciation"
                        value={formatCurrency(fixedAssetKpis.accumulatedDepreciation)}
                      />
                      <ReportMetricCard
                        label="Net Book Value"
                        value={formatCurrency(fixedAssetKpis.netBookValue)}
                      />
                    </>
                  )}
                </div>
              </div>
            </section>
          )}

          {canReviewKpis && <BasicChartsSection kpis={kpis} />}

          {canReviewKpis && isProfessionalOrHigher(packageTier) && (
            <>
              {activeInventoryData && <InventoryAnalysisSection inventoryKpis={inventoryKpis} />}
              <ProfessionalPlaceholderSection />
            </>
          )}

          {canReviewKpis && isVirtualCfo(packageTier) && (
            <>
              {activeFixedAssetData && (
                <FixedAssetAnalysisSection
                  fixedAssetKpis={fixedAssetKpis}
                  priorFixedAssetData={activePriorFixedAssetData}
                  changeRows={fixedAssetChangeRows}
                />
              )}
              <VirtualCfoPlaceholderSection />
              <FluxAnalysisPanel
                settings={fluxSettings}
                onSettingsChange={setFluxSettings}
                monthRows={monthFluxRows}
                quarterRows={quarterFluxRows}
                yearRows={yearFluxRows}
              />
            </>
          )}

          {canReviewKpis && (
            <>
              <section className="mt-10 rounded-3xl bg-slate-900 p-8">
                <h2 className="mb-4 text-2xl font-bold">Matched QuickBooks Rows</h2>
                <div className="overflow-x-auto rounded-xl border border-slate-700">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-800">
                      <tr>
                        <th className="px-4 py-3">Metric</th>
                        <th className="px-4 py-3">Matched Row</th>
                        <th className="px-4 py-3">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {kpis.matches.map((match, index) => (
                        <tr key={`${match.metric}-${index}`} className="border-b border-slate-800">
                          <td className="px-4 py-3 text-slate-300">{match.metric}</td>
                          <td className="px-4 py-3 text-slate-300">{match.label}</td>
                          <td className="px-4 py-3 font-semibold">{formatMoney(match.value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <Preview title="Profit & Loss Preview" data={activePlData} />
              <Preview title="Balance Sheet Preview" data={activeBsData} />
              <Preview title="AR Aging Preview" data={activeArData} />
              <Preview title="AP Aging Preview" data={activeApData} />
              {isProfessionalOrHigher(packageTier) && (
                <>
                  <Preview title="Inventory Valuation Preview" data={activeInventoryData} />
                  <Preview title="Customer Sales Detail Preview" data={activeCustomerSalesData} />
                  <Preview title="Vendor Expense Detail Preview" data={activeVendorExpenseData} />
                </>
              )}
              {isVirtualCfo(packageTier) && (
                <>
                  <Preview title="Fixed Asset Preview" data={activeFixedAssetData} />
                  <Preview title="Prior Period Fixed Asset Preview" data={activePriorFixedAssetData} />
                  <Preview title="Budget vs Actual Preview" data={activeBudgetVsActualData} />
                  <Preview title="Prior Period P&L Preview" data={activePriorPeriodPlData} />
                  <Preview title="Prior Period Balance Sheet Preview" data={activePriorPeriodBsData} />
                  <Preview title="Cash Flow Statement Preview" data={activeCashFlowData} />
                  <Preview title="Debt Schedule Preview" data={activeDebtScheduleData} />
                  <Preview title="Current Month GL Preview" data={activeCurrentMonthGlData} />
                  <Preview title="Prior Month GL Preview" data={activePriorMonthGlData} />
                  <Preview title="Current Quarter GL Preview" data={activeCurrentQuarterGlData} />
                  <Preview title="Prior Quarter GL Preview" data={activePriorQuarterGlData} />
                  <Preview title="Current Year GL Preview" data={activeCurrentYearGlData} />
                  <Preview title="Prior Year GL Preview" data={activePriorYearGlData} />
                </>
              )}
            </>
          )}
        </div>
      </main>

      <PrintableFinancialPackage
        packageTier={packageTier}
        companyName={companyName}
        reportPeriod={reportPeriod}
        kpis={kpis}
        arKpis={arKpis}
        apKpis={apKpis}
        inventoryKpis={inventoryKpis}
        fixedAssetKpis={fixedAssetKpis}
        netMargin={netMargin}
        executiveSummary={executiveSummary}
        plData={activePlData}
        bsData={activeBsData}
        arData={activeArData}
        apData={activeApData}
        inventoryData={activeInventoryData}
        fixedAssetData={activeFixedAssetData}
        priorFixedAssetData={activePriorFixedAssetData}
        topExpenseRows={getTopExpenseRows(activePlData)}
        ratioRows={ratioRows}
        fixedAssetChangeRows={fixedAssetChangeRows}
        monthFluxRows={monthFluxRows}
        quarterFluxRows={quarterFluxRows}
        yearFluxRows={yearFluxRows}
      />
    </>
  );
}

function isReportAvailable(reportTier: UploadTier, packageTier: PackageTier) {
  if (reportTier === "essential") return true;
  if (reportTier === "professional") return isProfessionalOrHigher(packageTier);
  return isVirtualCfo(packageTier);
}

function ImportWorkflow({
  packageTier,
  hasSelectedPackage,
  onPackageTierChange,
  reports,
  uploadedReportsCount,
  missingReports,
  requiredUploadsComplete,
  kpisConfirmed,
  reportsChangedAfterConfirmation,
  canGeneratePackage,
  isPackageGenerated,
  isPackageExported,
  onGeneratePackage,
  onExportPackage,
}: {
  packageTier: PackageTier;
  hasSelectedPackage: boolean;
  onPackageTierChange: (tier: PackageTier) => void;
  reports: UploadReport[];
  uploadedReportsCount: number;
  missingReports: UploadReport[];
  requiredUploadsComplete: boolean;
  kpisConfirmed: boolean;
  reportsChangedAfterConfirmation: boolean;
  canGeneratePackage: boolean;
  isPackageGenerated: boolean;
  isPackageExported: boolean;
  onGeneratePackage: () => void;
  onExportPackage: () => void;
}) {
  const selectedReportsCount = reports.filter(
    (report) => isReportAvailable(report.tier, packageTier) && report.required,
  ).length;

  return (
    <div className="rounded-[2rem] border border-[#243041] bg-[#0B1020] p-8 shadow-2xl shadow-black/20">
      <div className="mb-10">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-[#5B8CFF]">
          FinSight Reports
        </p>
        <h1 className="text-5xl font-bold tracking-tight text-[#F9FAFB]">
          Build a Client Financial Package
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-[#94A3B8]">
          Upload QuickBooks reports, choose the appropriate advisory package, and FinSight prepares
          a polished client-ready financial package with the right level of analysis.
        </p>
      </div>

      <WorkflowSteps
        hasSelectedPackage={hasSelectedPackage}
        requiredUploadsComplete={requiredUploadsComplete}
        kpisConfirmed={kpisConfirmed}
        isPackageGenerated={isPackageGenerated}
        isPackageExported={isPackageExported}
      />

      <PremiumPackageSelector
        packageTier={packageTier}
        hasSelectedPackage={hasSelectedPackage}
        onPackageTierChange={onPackageTierChange}
      />

      {hasSelectedPackage && (
        <>
          <div className="mt-10 grid gap-8">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#5B8CFF]">
                Step 2
              </p>
              <h2 className="mt-2 text-2xl font-bold text-[#F9FAFB]">Upload Reports</h2>
              <p className="mt-2 text-sm leading-6 text-[#94A3B8]">
                Complete the checklist for the selected package. Higher-tier uploads remain visible as
                upgrade opportunities without adding clutter to the active workflow.
              </p>
            </div>

            <UploadGroup
              title="Essential Imports"
              subtitle="Core reports required for monthly financial package preparation."
              reports={reports.filter((report) => report.tier === "essential")}
              packageTier={packageTier}
            />

            <UploadGroup
              title="Professional Imports"
              subtitle="Additional advisory reports for inventory, customer, vendor, and margin analysis."
              reports={reports.filter((report) => report.tier === "professional")}
              packageTier={packageTier}
            />

            <UploadGroup
              title="Virtual CFO Imports"
              subtitle="Advanced reports for board-style analysis, forecasting placeholders, and flux review."
              reports={reports.filter((report) => report.tier === "virtualCfo")}
              packageTier={packageTier}
            />
          </div>

          <GeneratePackagePanel
            packageTier={packageTier}
            uploadedReportsCount={uploadedReportsCount}
            totalReportsCount={selectedReportsCount}
            missingReports={missingReports}
            canGeneratePackage={canGeneratePackage}
            kpisConfirmed={kpisConfirmed}
            reportsChangedAfterConfirmation={reportsChangedAfterConfirmation}
            isPackageGenerated={isPackageGenerated}
            onGeneratePackage={onGeneratePackage}
            onExportPackage={onExportPackage}
          />
        </>
      )}
    </div>
  );
}

function WorkflowSteps({
  hasSelectedPackage,
  requiredUploadsComplete,
  kpisConfirmed,
  isPackageGenerated,
  isPackageExported,
}: {
  hasSelectedPackage: boolean;
  requiredUploadsComplete: boolean;
  kpisConfirmed: boolean;
  isPackageGenerated: boolean;
  isPackageExported: boolean;
}) {
  const steps = [
    "Select Package",
    "Upload Reports",
    "Review & Confirm KPIs",
    "Generate Package",
    "Export PDF",
  ];
  const activeStep = !hasSelectedPackage
    ? 0
    : isPackageExported
      ? 4
      : isPackageGenerated
        ? 4
        : kpisConfirmed
          ? 3
          : requiredUploadsComplete
            ? 2
            : 1;

  return (
    <div className="mb-10 rounded-3xl border border-[#243041] bg-[#111827] p-5">
      <div className="grid gap-3 md:grid-cols-5">
        {steps.map((step, index) => {
          const current = index === activeStep;
          const complete = index < activeStep;

          return (
            <div
              key={step}
              className={`rounded-2xl border p-4 ${
                current
                  ? "border-[#5B8CFF] bg-[#172033]"
                  : complete
                    ? "border-[#243041] bg-[#0B1020]"
                    : "border-[#243041] bg-[#111827]"
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5B8CFF]">
                Step {index + 1}
              </p>
              <p className="mt-2 text-sm font-semibold text-[#F9FAFB]">{step}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PremiumPackageSelector({
  packageTier,
  hasSelectedPackage,
  onPackageTierChange,
}: {
  packageTier: PackageTier;
  hasSelectedPackage: boolean;
  onPackageTierChange: (tier: PackageTier) => void;
}) {
  const packages = [
    {
      tier: "essential" as PackageTier,
      name: "Essential",
      description: "Core monthly financial package for clean client reporting.",
      included: ["Executive summary", "Income statement", "Balance sheet", "AR/AP aging"],
    },
    {
      tier: "professional" as PackageTier,
      name: "Professional",
      description: "Expanded analytics for advisory clients and deeper operating insight.",
      included: ["Ratio analysis", "Inventory analytics", "Top customers/vendors", "Margin review"],
    },
    {
      tier: "virtualCfo" as PackageTier,
      name: "Virtual CFO",
      description: "Board-style CFO package with advanced variance and risk analysis.",
      included: ["Flux analysis", "Fixed assets", "Budget placeholders", "Risk indicators"],
    },
  ];

  return (
    <section>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#5B8CFF]">
            Step 1
          </p>
          <h2 className="mt-2 text-2xl font-bold text-[#F9FAFB]">Select Package Level</h2>
        </div>
        <p className="text-sm text-[#94A3B8]">
          Current package: {hasSelectedPackage ? PACKAGE_LABELS[packageTier] : "Not selected"}
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {packages.map((item) => {
          const selected = hasSelectedPackage && packageTier === item.tier;

          return (
            <button
              key={item.tier}
              type="button"
              onClick={() => onPackageTierChange(item.tier)}
              className={`rounded-3xl border p-6 text-left shadow-lg transition ${
                selected
                  ? "border-[#5B8CFF] bg-[#172033] shadow-[#5B8CFF]/10"
                  : "border-[#243041] bg-[#111827] shadow-black/10 hover:border-[#5B8CFF]/60"
              }`}
            >
              <div className="mb-5 flex items-center justify-between gap-4">
                <h3 className="text-2xl font-bold text-[#F9FAFB]">{item.name}</h3>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    selected ? "bg-[#5B8CFF] text-white" : "bg-[#172033] text-[#94A3B8]"
                  }`}
                >
                  {selected ? "Selected" : "Select"}
                </span>
              </div>

              <p className="min-h-14 text-sm leading-6 text-[#94A3B8]">{item.description}</p>

              <div className="mt-6 space-y-2">
                {item.included.map((included) => (
                  <p key={included} className="text-sm text-[#F9FAFB]">
                    {included}
                  </p>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function UploadGroup({
  title,
  subtitle,
  reports,
  packageTier,
}: {
  title: string;
  subtitle: string;
  reports: UploadReport[];
  packageTier: PackageTier;
}) {
  return (
    <section className="rounded-3xl border border-[#243041] bg-[#111827] p-6 shadow-xl shadow-black/10">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#F9FAFB]">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-[#94A3B8]">{subtitle}</p>
        </div>
        <p className="rounded-full bg-[#172033] px-3 py-1 text-xs font-semibold text-[#94A3B8]">
          {reports.filter((report) => isReportAvailable(report.tier, packageTier) && report.data && !report.omitted).length}
          /{reports.filter((report) => isReportAvailable(report.tier, packageTier)).length} uploaded
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {reports.map((report) =>
          isReportAvailable(report.tier, packageTier) ? (
            <PremiumUploadCard key={report.id} report={report} />
          ) : (
            <LockedUploadCard key={report.id} report={report} />
          ),
        )}
      </div>
    </section>
  );
}

function PremiumUploadCard({ report }: { report: UploadReport }) {
  const [fileInputKey, setFileInputKey] = useState(0);
  const uploaded = Boolean(report.data);
  const status = report.omitted
    ? "Omitted"
    : uploaded
      ? "Uploaded"
      : report.required
        ? "Missing"
        : "Optional";
  const statusClass = report.omitted
    ? "bg-slate-500/15 text-slate-300"
    : uploaded
      ? "bg-emerald-500/15 text-emerald-300"
      : report.required
        ? "bg-amber-500/15 text-amber-300"
        : "bg-[#111827] text-[#94A3B8]";

  return (
    <div
      className={`rounded-2xl border p-5 shadow-lg shadow-black/10 ${
        report.omitted ? "border-slate-700 bg-[#111827] opacity-80" : "border-[#243041] bg-[#172033]"
      }`}
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-[#F9FAFB]">{report.label}</h3>
            <PackageBadge tier={report.tier} />
            <span className="rounded-full bg-[#0B1020] px-3 py-1 text-xs font-semibold text-[#94A3B8]">
              {report.required ? "Required" : "Optional"}
            </span>
          </div>
          <p className="text-sm leading-6 text-[#94A3B8]">{report.description}</p>
        </div>

        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}>
          {status}
        </span>
      </div>

      <label
        className={`block rounded-2xl border border-dashed bg-[#111827] p-5 transition ${
          report.omitted
            ? "cursor-not-allowed border-[#243041]"
            : "cursor-pointer border-[#5B8CFF]/40 hover:border-[#5B8CFF]"
        }`}
      >
        <input
          key={fileInputKey}
          type="file"
          accept=".csv,.xlsx,.xls"
          disabled={report.omitted}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            await report.onFile(file);
          }}
          className="sr-only"
        />

        <span className="block text-sm font-semibold text-[#F9FAFB]">
          {report.omitted ? "Report omitted from package" : uploaded ? "Replace uploaded file" : "Upload report"}
        </span>
        <span className="mt-2 block text-xs text-[#94A3B8]">
          Accepted file types: CSV, XLS, XLSX
        </span>
        {report.data && (
          <span className="mt-3 block truncate rounded-xl bg-[#0B1020] px-3 py-2 text-sm text-[#F9FAFB]">
            {report.data.name}
          </span>
        )}
      </label>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-start gap-3 text-sm text-[#94A3B8]">
          <input
            type="checkbox"
            checked={report.omitted}
            disabled={report.required}
            onChange={(event) => report.onOmitChange(event.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-[#5B8CFF]"
          />
          <span>
            <span className="block text-[#F9FAFB]">Omit this report from package</span>
            {report.required && (
              <span className="mt-1 block text-xs text-[#94A3B8]">
                Required reports cannot be omitted.
              </span>
            )}
          </span>
        </label>

        {uploaded && (
          <button
            type="button"
            onClick={() => {
              report.onRemove();
              setFileInputKey((current) => current + 1);
            }}
            className="rounded-xl border border-[#243041] px-4 py-2 text-sm font-semibold text-[#F9FAFB] transition hover:border-red-400/60 hover:text-red-300"
          >
            Remove file
          </button>
        )}
      </div>
    </div>
  );
}

function LockedUploadCard({ report }: { report: UploadReport }) {
  return (
    <div className="rounded-2xl border border-[#243041] bg-[#111827] p-5 opacity-80 shadow-lg shadow-black/10">
      <div className="mb-3 flex items-center justify-between gap-4">
        <h3 className="text-lg font-semibold text-[#F9FAFB]">{report.label}</h3>
        <span className="rounded-full bg-[#172033] px-3 py-1 text-xs font-semibold text-[#94A3B8]">
          Locked
        </span>
      </div>

      <p className="text-sm leading-6 text-[#94A3B8]">{report.description}</p>

      <div className="mt-5 rounded-2xl border border-dashed border-[#243041] bg-[#0B1020] p-4 text-sm text-[#94A3B8]">
        {report.tier === "professional" ? "Available in Professional" : "Available in Virtual CFO"}
      </div>
    </div>
  );
}

function PackageBadge({ tier }: { tier: UploadTier }) {
  return (
    <span className="rounded-full bg-[#0B1020] px-3 py-1 text-xs font-semibold text-[#94A3B8]">
      {PACKAGE_LABELS[tier]}
    </span>
  );
}

function DsoSettingsPanel({
  startDate,
  endDate,
  manualDays,
  autoDays,
  effectiveDays,
  onStartDateChange,
  onEndDateChange,
  onManualDaysChange,
}: {
  startDate: string;
  endDate: string;
  manualDays: string;
  autoDays: number | null;
  effectiveDays: number | null;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onManualDaysChange: (value: string) => void;
}) {
  return (
    <section className="mt-6 rounded-3xl border border-[#243041] bg-[#111827] p-6 shadow-xl shadow-black/10">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#5B8CFF]">
            DSO Settings
          </p>
          <h2 className="mt-2 text-2xl font-bold text-[#F9FAFB]">Reporting Period</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#94A3B8]">
            Enter the reporting period so FinSight can calculate average daily sales and days sales
            outstanding from revenue and accounts receivable.
          </p>
        </div>
        <span className="rounded-full bg-[#172033] px-4 py-2 text-xs font-semibold text-[#94A3B8]">
          Period days: {effectiveDays ?? "Not set"}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="rounded-2xl border border-[#243041] bg-[#172033] p-4">
          <span className="text-sm font-semibold text-[#F9FAFB]">Start date</span>
          <input
            type="date"
            value={startDate}
            onChange={(event) => onStartDateChange(event.target.value)}
            className="mt-3 w-full rounded-xl border border-[#243041] bg-[#0B1020] px-3 py-2 text-sm text-[#F9FAFB] outline-none focus:border-[#5B8CFF]"
          />
        </label>

        <label className="rounded-2xl border border-[#243041] bg-[#172033] p-4">
          <span className="text-sm font-semibold text-[#F9FAFB]">End date</span>
          <input
            type="date"
            value={endDate}
            onChange={(event) => onEndDateChange(event.target.value)}
            className="mt-3 w-full rounded-xl border border-[#243041] bg-[#0B1020] px-3 py-2 text-sm text-[#F9FAFB] outline-none focus:border-[#5B8CFF]"
          />
          <span className="mt-2 block text-xs text-[#94A3B8]">
            Auto-calculated days: {autoDays ?? "Enter dates"}
          </span>
        </label>

        <label className="rounded-2xl border border-[#243041] bg-[#172033] p-4">
          <span className="text-sm font-semibold text-[#F9FAFB]">Manual day override</span>
          <input
            type="number"
            min="1"
            value={manualDays}
            onChange={(event) => onManualDaysChange(event.target.value)}
            placeholder="Optional"
            className="mt-3 w-full rounded-xl border border-[#243041] bg-[#0B1020] px-3 py-2 text-sm text-[#F9FAFB] outline-none placeholder:text-[#94A3B8] focus:border-[#5B8CFF]"
          />
          <span className="mt-2 block text-xs text-[#94A3B8]">
            Overrides the date-based period days when entered.
          </span>
        </label>
      </div>
    </section>
  );
}

function RatioAnalysisSection({
  ratioRows,
}: {
  ratioRows: Array<{ name: string; formula: string; value: string; interpretation: string }>;
}) {
  return (
    <section className="mt-10 rounded-3xl border border-blue-900/60 bg-slate-900 p-8 shadow-lg">
      <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-blue-400">
        Ratio Analysis
      </p>
      <h2 className="mb-6 text-3xl font-bold">Advisory Ratios</h2>
      <div className="overflow-x-auto rounded-xl border border-slate-700">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-800">
            <tr>
              <th className="px-4 py-3">Ratio</th>
              <th className="px-4 py-3">Formula</th>
              <th className="px-4 py-3">Value</th>
              <th className="px-4 py-3">Interpretation</th>
            </tr>
          </thead>
          <tbody>
            {ratioRows.map((ratio) => (
              <tr key={ratio.name} className="border-b border-slate-800">
                <td className="px-4 py-3 font-semibold text-slate-100">{ratio.name}</td>
                <td className="px-4 py-3 text-slate-300">{ratio.formula}</td>
                <td className="px-4 py-3 font-semibold text-slate-100">{ratio.value}</td>
                <td className="px-4 py-3 text-slate-300">{ratio.interpretation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function KpiConfirmationPanel({
  packageTier,
  kpis,
  apKpis,
  inventoryKpis,
  fixedAssetKpis,
  netMargin,
  includeAp,
  includeInventory,
  includeFixedAssets,
  dso,
  kpisConfirmed,
  reviewerNotes,
  reportsChangedAfterConfirmation,
  onKpisConfirmedChange,
  onReviewerNotesChange,
}: {
  packageTier: PackageTier;
  kpis: KPIs;
  apKpis: APKpis;
  inventoryKpis: InventoryKpis;
  fixedAssetKpis: FixedAssetKpis;
  netMargin: number;
  includeAp: boolean;
  includeInventory: boolean;
  includeFixedAssets: boolean;
  dso: number | null;
  kpisConfirmed: boolean;
  reviewerNotes: string;
  reportsChangedAfterConfirmation: boolean;
  onKpisConfirmedChange: (confirmed: boolean) => void;
  onReviewerNotesChange: (notes: string) => void;
}) {
  const confirmationRows = [
    { label: "Revenue", value: formatMoney(kpis.revenue) },
    { label: "Gross Profit", value: formatMoney(kpis.grossProfit) },
    { label: "Expenses", value: formatMoney(kpis.expenses) },
    { label: "Net Income", value: formatMoney(kpis.netIncome) },
    { label: "Cash", value: formatMoney(kpis.cash) },
    { label: "Accounts Receivable", value: formatMoney(kpis.accountsReceivable) },
    ...(includeAp ? [{ label: "AP Aging Total", value: formatMoney(apKpis.total) }] : []),
    ...(isProfessionalOrHigher(packageTier) && includeInventory
      ? [{ label: "Inventory Value", value: formatMoney(inventoryKpis.totalValue) }]
      : []),
    ...(isVirtualCfo(packageTier) && includeFixedAssets
      ? [{ label: "Fixed Assets", value: formatMoney(fixedAssetKpis.totalFixedAssets) }]
      : []),
    ...(dso !== null ? [{ label: "DSO", value: `${dso.toFixed(1)} days` }] : []),
    { label: "Net Margin", value: `${netMargin.toFixed(1)}%` },
  ];

  return (
    <section
      className={`mt-6 rounded-3xl border p-6 shadow-xl shadow-black/10 ${
        kpisConfirmed
          ? "border-emerald-500/40 bg-emerald-950/20"
          : "border-[#243041] bg-[#172033]"
      }`}
    >
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#5B8CFF]">
            KPI Approval Checkpoint
          </p>
          <h2 className="mt-2 text-2xl font-bold text-[#F9FAFB]">Review & Confirm KPIs</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#94A3B8]">
            Confirm the detected metrics before FinSight generates the client-ready financial
            package. Reuploading any report resets this approval.
          </p>
        </div>

        <span
          className={`rounded-full px-4 py-2 text-xs font-semibold ${
            kpisConfirmed
              ? "bg-emerald-500/15 text-emerald-300"
              : "bg-[#0B1020] text-[#94A3B8]"
          }`}
        >
          {kpisConfirmed ? "KPIs Confirmed" : "Pending Review"}
        </span>
      </div>

      {reportsChangedAfterConfirmation && (
        <div className="mb-5 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-200">
          Reports changed. Please review and confirm KPIs again.
        </div>
      )}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
        {confirmationRows.map((row) => (
          <div key={row.label} className="rounded-2xl border border-[#243041] bg-[#111827] p-4">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#94A3B8]">
              {row.label}
            </p>
            <p className="mt-2 text-xl font-bold text-[#F9FAFB]">{row.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,420px)]">
        <label className="flex cursor-pointer items-start gap-4 rounded-2xl border border-[#243041] bg-[#111827] p-5">
          <input
            type="checkbox"
            checked={kpisConfirmed}
            onChange={(event) => onKpisConfirmedChange(event.target.checked)}
            className="mt-1 h-5 w-5 rounded border-[#5B8CFF]"
          />
          <span>
            <span className="block font-semibold text-[#F9FAFB]">
              I have reviewed these KPIs and confirm they are accurate.
            </span>
            <span className="mt-1 block text-sm leading-6 text-[#94A3B8]">
              This approval unlocks package generation and confirms the reviewer has checked the
              detected financial snapshot.
            </span>
          </span>
        </label>

        <label className="rounded-2xl border border-[#243041] bg-[#111827] p-5">
          <span className="text-sm font-semibold text-[#F9FAFB]">Reviewer Notes</span>
          <textarea
            value={reviewerNotes}
            onChange={(event) => onReviewerNotesChange(event.target.value)}
            placeholder="Add optional review notes, adjustments, or context for this package."
            className="mt-3 min-h-28 w-full rounded-xl border border-[#243041] bg-[#0B1020] p-3 text-sm text-[#F9FAFB] outline-none transition placeholder:text-[#94A3B8] focus:border-[#5B8CFF]"
          />
        </label>
      </div>
    </section>
  );
}

function GeneratePackagePanel({
  packageTier,
  uploadedReportsCount,
  totalReportsCount,
  missingReports,
  canGeneratePackage,
  kpisConfirmed,
  reportsChangedAfterConfirmation,
  isPackageGenerated,
  onGeneratePackage,
  onExportPackage,
}: {
  packageTier: PackageTier;
  uploadedReportsCount: number;
  totalReportsCount: number;
  missingReports: UploadReport[];
  canGeneratePackage: boolean;
  kpisConfirmed: boolean;
  reportsChangedAfterConfirmation: boolean;
  isPackageGenerated: boolean;
  onGeneratePackage: () => void;
  onExportPackage: () => void;
}) {
  const uploadedReportNames = totalReportsCount - missingReports.length;
  const panelLabel = isPackageGenerated
    ? "Package Generated"
    : canGeneratePackage
      ? "Step 4 - Ready to Generate"
      : missingReports.length > 0
        ? "Upload Progress"
        : "KPI Review Required";

  return (
    <section className="mt-10 rounded-3xl border border-[#243041] bg-[#172033] p-6 shadow-xl shadow-black/10">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#5B8CFF]">
            {panelLabel}
          </p>
          <h2 className="mt-2 text-2xl font-bold text-[#F9FAFB]">
            {PACKAGE_LABELS[packageTier]} Financial Package
          </h2>
          <p className="mt-2 text-sm text-[#94A3B8]">
            {uploadedReportsCount} of {totalReportsCount} required reports uploaded. Optional reports
            can be uploaded for deeper analysis or omitted from the package.
          </p>
          {!canGeneratePackage && (
            <p className="mt-2 text-sm text-[#94A3B8]">
              {missingReports.length > 0
                ? "Upload all required reports to generate this package."
                : "Review and confirm KPIs before generating the financial package."}
            </p>
          )}
          {reportsChangedAfterConfirmation && (
            <p className="mt-3 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-200">
              Reports changed. Please review and confirm KPIs again.
            </p>
          )}

          <div className="mt-5 grid gap-2">
            <ReadinessChecklistItem
              complete={uploadedReportNames > 0}
              text={`${uploadedReportNames} reports uploaded`}
            />
            <ReadinessChecklistItem
              complete={missingReports.length === 0}
              text={
                missingReports.length === 0
                  ? "No required reports missing"
                  : `Missing: ${missingReports.map((report) => report.label).join(", ")}`
              }
            />
            <ReadinessChecklistItem
              complete={kpisConfirmed}
              text={
                kpisConfirmed
                  ? "KPIs reviewed and confirmed"
                  : "Review and confirm KPIs before generating"
              }
            />
            <ReadinessChecklistItem
              complete={isPackageGenerated}
              text={
                isPackageGenerated
                  ? "Package generated and ready to export"
                  : "Package preview not generated yet"
              }
            />
          </div>
        </div>

        {isPackageGenerated ? (
          <button
            type="button"
            onClick={onExportPackage}
            className="rounded-2xl bg-[#5B8CFF] px-6 py-4 font-semibold text-white shadow-lg shadow-[#5B8CFF]/20 transition hover:bg-[#7BA3FF]"
          >
            Export PDF Package
          </button>
        ) : (
          <button
            type="button"
            onClick={onGeneratePackage}
            disabled={!canGeneratePackage}
            className="rounded-2xl bg-[#5B8CFF] px-6 py-4 font-semibold text-white shadow-lg shadow-[#5B8CFF]/20 transition hover:bg-[#7BA3FF] disabled:cursor-not-allowed disabled:bg-slate-600 disabled:shadow-none"
          >
            Generate Financial Package
          </button>
        )}
      </div>
    </section>
  );
}

function ReadinessChecklistItem({ complete, text }: { complete: boolean; text: string }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          complete ? "bg-emerald-500/20 text-emerald-300" : "bg-[#0B1020] text-[#94A3B8]"
        }`}
      >
        {complete ? "OK" : "-"}
      </span>
      <span className={complete ? "text-[#F9FAFB]" : "text-[#94A3B8]"}>{text}</span>
    </div>
  );
}

function KpiCard({
  label,
  value,
  percent = false,
  plain = false,
  helperText,
}: {
  label: string;
  value: number | string | null;
  percent?: boolean;
  plain?: boolean;
  helperText?: string;
}) {
  const displayValue =
    typeof value === "string"
      ? value
      : value === null
        ? "Not provided"
        : plain
          ? formatNumber(value)
          : percent
            ? `${value.toFixed(1)}%`
            : formatMoney(value);
  const valueIsText = typeof value === "string";

  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-[#243041] bg-[#172033] p-5 shadow-lg shadow-black/10">
      <p className="text-sm font-bold uppercase tracking-[0.08em] text-slate-200">{label}</p>
      <h3 className={`mt-2 font-bold ${valueIsText ? "text-base leading-6" : "text-3xl"}`}>
        {displayValue}
      </h3>
      {helperText && <p className="mt-2 text-xs leading-5 text-slate-500">{helperText}</p>}
    </div>
  );
}

function ReportMetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-28 flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
    </div>
  );
}

function ExecutiveSummarySection({
  executiveSummary,
}: {
  executiveSummary: ReturnType<typeof buildExecutiveSummary>;
}) {
  return (
    <section className="mt-10 rounded-3xl border border-blue-900/60 bg-slate-900 p-8 shadow-lg">
      <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-blue-400">
        Client-Ready Executive Summary
      </p>
      <h2 className="mb-4 text-3xl font-bold">Executive Summary</h2>
      <p className="max-w-4xl text-lg leading-8 text-slate-300">{executiveSummary.paragraph}</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-blue-950 p-6">
          <h3 className="mb-4 text-xl font-bold">Key Highlights</h3>
          <ul className="list-disc space-y-3 pl-5 text-slate-300">
            {executiveSummary.highlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-700 bg-slate-950 p-6">
          <h3 className="mb-4 text-xl font-bold">Watch Items</h3>
          <ul className="list-disc space-y-3 pl-5 text-slate-300">
            {executiveSummary.watchItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function BasicChartsSection({ kpis }: { kpis: KPIs }) {
  const hasRevenueExpenseData = kpis.revenue > 0 || kpis.expenses > 0;
  const hasGrossProfitData = kpis.revenue > 0 || kpis.cogs > 0 || kpis.grossProfit > 0;
  const hasCashArData = kpis.cash > 0 || kpis.accountsReceivable > 0;

  const revenueExpenseData = [
    { name: "Revenue", value: kpis.revenue },
    { name: "Expenses", value: kpis.expenses },
  ];

  const grossProfitData = [
    { name: "COGS", value: Math.max(kpis.cogs, 0), color: "#38bdf8" },
    { name: "Gross Profit", value: Math.max(kpis.grossProfit, 0), color: "#22c55e" },
  ].filter((item) => item.value > 0);

  const cashArData = [
    { name: "Cash", value: kpis.cash },
    { name: "Accounts Receivable", value: kpis.accountsReceivable },
  ];

  return (
    <section className="mt-10 rounded-3xl border border-slate-700 bg-slate-900 p-8">
      <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-blue-400">
        Basic Charts
      </p>
      <h2 className="mb-6 text-3xl font-bold">Financial Snapshot</h2>

      <div className="grid gap-4 md:grid-cols-3">
        <ChartCard
          title="Revenue vs Expenses"
          value={`${formatMoney(kpis.revenue)} / ${formatMoney(kpis.expenses)}`}
        >
          {hasRevenueExpenseData ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={revenueExpenseData}>
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#cbd5e1", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<DarkChartTooltip />} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} animationDuration={700}>
                  <Cell fill="#3b82f6" />
                  <Cell fill="#f97316" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <NoChartData />
          )}
        </ChartCard>

        <ChartCard title="Gross Profit" value={formatMoney(kpis.grossProfit)}>
          {hasGrossProfitData && grossProfitData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={grossProfitData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  animationDuration={700}
                >
                  {grossProfitData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<DarkChartTooltip />} />
                <Legend wrapperStyle={{ color: "#cbd5e1", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <NoChartData />
          )}
          <p className="mt-2 text-center text-xs text-slate-400">
            Revenue: {formatMoney(kpis.revenue)}
          </p>
        </ChartCard>

        <ChartCard
          title="Cash and AR"
          value={`${formatMoney(kpis.cash)} / ${formatMoney(kpis.accountsReceivable)}`}
        >
          {hasCashArData ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={cashArData}>
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#cbd5e1", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<DarkChartTooltip />} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} animationDuration={700}>
                  <Cell fill="#22c55e" />
                  <Cell fill="#06b6d4" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <NoChartData />
          )}
        </ChartCard>
      </div>
    </section>
  );
}

function ChartCard({
  title,
  value,
  children,
}: {
  title: string;
  value: string;
  children: ReactNode;
}) {
  return (
    <div className="chart-card rounded-2xl border border-slate-800 bg-slate-950 p-6">
      <p className="text-sm font-bold uppercase tracking-[0.08em] text-slate-200">{title}</p>
      <p className="mt-3 text-2xl font-bold">{value}</p>
      <div className="mt-5 h-[260px]">{children}</div>
    </div>
  );
}

function NoChartData() {
  return (
    <div className="flex h-[220px] items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900 text-sm text-slate-400">
      No chart data available
    </div>
  );
}

function DarkChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; payload?: { name?: string } }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm shadow-xl">
      <p className="font-semibold text-white">{label || payload[0]?.payload?.name}</p>
      <p className="text-blue-300">{formatMoney(Number(payload[0]?.value || 0))}</p>
    </div>
  );
}

function InventoryAnalysisSection({ inventoryKpis }: { inventoryKpis: InventoryKpis }) {
  return (
    <section className="mt-10 rounded-3xl border border-blue-900/60 bg-slate-900 p-8">
      <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-blue-400">
        Inventory Analytics
      </p>
      <h2 className="mb-6 text-3xl font-bold">Inventory Summary</h2>
      <div className="grid gap-6 md:grid-cols-2">
        <KpiCard label="Total Inventory Value" value={inventoryKpis.totalValue} />
        <KpiCard label="Total Quantity on Hand" value={inventoryKpis.totalQuantity} plain />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <InventoryScreenTable title="Top 5 Inventory Items by Value" items={inventoryKpis.topByValue} />
        <InventoryScreenTable title="Top 5 Inventory Items by Quantity" items={inventoryKpis.topByQuantity} />
      </div>
    </section>
  );
}

function InventoryScreenTable({ title, items }: { title: string; items: InventoryItem[] }) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-950 p-6">
      <h3 className="mb-4 text-xl font-bold">{title}</h3>
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-800/60 text-slate-100">
          <tr>
            <th className="px-4 py-2 font-bold">Item</th>
            <th className="px-4 py-2 text-right font-bold">Qty</th>
            <th className="px-4 py-2 text-right font-bold">Value</th>
          </tr>
        </thead>
        <tbody>
          {items.length > 0 ? (
            items.map((item, index) => (
              <tr key={`${item.name}-${index}`} className="border-t border-slate-800">
                <td className="px-4 py-2 text-slate-300">{item.name}</td>
                <td className="px-4 py-2 text-right tabular-nums">{formatNumber(item.quantity)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{formatMoney(item.value)}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td className="px-4 py-2 text-slate-400" colSpan={3}>
                Inventory valuation report required.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ProfessionalPlaceholderSection() {
  return (
    <section className="mt-10 rounded-3xl border border-slate-700 bg-slate-900 p-8">
      <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-blue-400">
        Professional Advisory Tools
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        {[
          "Trend analysis",
          "Margin analysis",
          "Working capital analysis",
          "DSO calculations",
          "Enhanced AI commentary",
          "Top customers/vendors",
        ].map((item) => (
          <div key={item} className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
            {item}
          </div>
        ))}
      </div>
    </section>
  );
}

function VirtualCfoPlaceholderSection() {
  return (
    <section className="mt-10 rounded-3xl border border-blue-900/60 bg-slate-900 p-8">
      <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-blue-400">
        Virtual CFO Toolkit
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        {[
          "Forecasting placeholders",
          "Budget vs Actual placeholders",
          "Variance analysis",
          "EBITDA analysis",
          "Debt analysis",
          "Benchmarking placeholders",
          "KPI health scoring",
          "Multi-period placeholders",
          "Risk indicators",
          "Executive board-style formatting",
        ].map((item) => (
          <div key={item} className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
            {item}
          </div>
        ))}
      </div>
    </section>
  );
}

function FixedAssetAnalysisSection({
  fixedAssetKpis,
  priorFixedAssetData,
  changeRows,
}: {
  fixedAssetKpis: FixedAssetKpis;
  priorFixedAssetData: ParsedFile | null;
  changeRows: FixedAssetChangeRow[];
}) {
  return (
    <section className="mt-10 rounded-3xl border border-blue-900/60 bg-slate-900 p-8 shadow-lg">
      <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-blue-400">
        Fixed Asset Analysis
      </p>
      <h2 className="mb-6 text-3xl font-bold">Fixed Asset KPIs</h2>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
        <KpiCard label="Total Fixed Assets" value={fixedAssetKpis.totalFixedAssets} />
        <KpiCard label="Accumulated Depreciation" value={fixedAssetKpis.accumulatedDepreciation} />
        <KpiCard label="Net Book Value" value={fixedAssetKpis.netBookValue} />
        <KpiCard
          label="Depreciation Expense"
          value={fixedAssetKpis.depreciationExpense === null ? "N/A" : fixedAssetKpis.depreciationExpense}
          helperText={
            fixedAssetKpis.depreciationExpense === null
              ? "Depreciation expense not provided in uploaded reports."
              : undefined
          }
        />
        <KpiCard label="Fixed Assets % of Assets" value={fixedAssetKpis.fixedAssetsToTotalAssets} percent />
        <KpiCard label="Depreciation % of Fixed Assets" value={fixedAssetKpis.depreciationToFixedAssets} percent />
        <KpiCard label="NBV % of Assets" value={fixedAssetKpis.netBookValueToTotalAssets} percent />
      </div>

      <p className="mt-6 leading-7 text-slate-300">
        Fixed assets as a percentage of total assets shows how capital-intensive the business is.
        Depreciation as a percentage of fixed assets indicates how much of the asset base has been
        depreciated, while net book value as a percentage of total assets shows the remaining
        carrying value of long-term assets.
      </p>

      <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-950 p-6">
        <h3 className="mb-4 text-xl font-bold">Significant Changes</h3>
        {priorFixedAssetData ? (
          <FixedAssetChangeTable rows={changeRows} />
        ) : (
          <p className="text-slate-300">
            Upload prior period fixed asset report to calculate significant changes.
          </p>
        )}
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-700">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-800">
            <tr>
              <th className="px-4 py-3">Metric</th>
              <th className="px-4 py-3">Matched Row</th>
              <th className="px-4 py-3">Value</th>
            </tr>
          </thead>
          <tbody>
            {fixedAssetKpis.matches.map((match, index) => (
              <tr key={`${match.metric}-${index}`} className="border-b border-slate-800">
                <td className="px-4 py-3 text-slate-300">{match.metric}</td>
                <td className="px-4 py-3 text-slate-300">{match.label}</td>
                <td className="px-4 py-3 font-semibold">
                  {formatOptionalCurrency(
                    match.value,
                    "N/A",
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function FixedAssetChangeTable({ rows }: { rows: FixedAssetChangeRow[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-700">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-800">
          <tr>
            <th className="px-4 py-3">Metric</th>
            <th className="px-4 py-3">Prior Period</th>
            <th className="px-4 py-3">Current Period</th>
            <th className="px-4 py-3">Change</th>
            <th className="px-4 py-3">Interpretation</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.metric} className="border-b border-slate-800">
              <td className="px-4 py-3 text-slate-300">{row.metric}</td>
              <td className="px-4 py-3 font-semibold">{formatCurrency(row.prior)}</td>
              <td className="px-4 py-3 font-semibold">{formatCurrency(row.current)}</td>
              <td className="px-4 py-3 font-semibold">{formatCurrency(row.change)}</td>
              <td className="px-4 py-3 text-slate-300">{row.interpretation}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FluxAnalysisPanel({
  settings,
  onSettingsChange,
  monthRows,
  quarterRows,
  yearRows,
}: {
  settings: FluxSettings;
  onSettingsChange: (settings: FluxSettings) => void;
  monthRows: FluxRow[];
  quarterRows: FluxRow[];
  yearRows: FluxRow[];
}) {
  return (
    <section className="mt-10 rounded-3xl border border-blue-900/60 bg-slate-900 p-8">
      <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-blue-400">
        Virtual CFO Flux Analysis
      </p>
      <h2 className="mb-6 text-3xl font-bold">Flux Analysis Settings</h2>

      <div className="grid gap-4 md:grid-cols-4">
        <label className="rounded-2xl bg-slate-950 p-5">
          <span className="text-sm font-bold uppercase tracking-[0.08em] text-slate-200">
            Dollar Threshold
          </span>
          <input
            type="number"
            value={settings.dollarThreshold}
            onChange={(e) =>
              onSettingsChange({ ...settings, dollarThreshold: Number(e.target.value) })
            }
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800 p-3"
          />
        </label>

        <label className="rounded-2xl bg-slate-950 p-5">
          <span className="text-sm font-bold uppercase tracking-[0.08em] text-slate-200">
            Percentage Threshold
          </span>
          <input
            type="number"
            value={settings.percentThreshold}
            onChange={(e) =>
              onSettingsChange({ ...settings, percentThreshold: Number(e.target.value) })
            }
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800 p-3"
          />
        </label>

        <label className="rounded-2xl bg-slate-950 p-5">
          <span className="text-sm font-bold uppercase tracking-[0.08em] text-slate-200">
            Threshold Logic
          </span>
          <select
            value={settings.logic}
            onChange={(e) =>
              onSettingsChange({ ...settings, logic: e.target.value as ThresholdLogic })
            }
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800 p-3"
          >
            <option value="both">Both thresholds</option>
            <option value="either">Either threshold</option>
          </select>
        </label>

        <label className="flex items-center gap-3 rounded-2xl bg-slate-950 p-5">
          <input
            type="checkbox"
            checked={settings.includeZeroActivity}
            onChange={(e) =>
              onSettingsChange({ ...settings, includeZeroActivity: e.target.checked })
            }
          />
          <span className="text-sm font-bold uppercase tracking-[0.08em] text-slate-200">
            Include zero-to-activity changes
          </span>
        </label>
      </div>

      <FluxTable title="Current Month vs Prior Month" rows={monthRows} />
      <FluxTable title="Current Quarter vs Prior Quarter" rows={quarterRows} />
      <FluxTable title="Current Year vs Prior Year" rows={yearRows} />
    </section>
  );
}

function FluxTable({ title, rows }: { title: string; rows: FluxRow[] }) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<keyof FluxRow>("dollarVariance");
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const visibleRows = useMemo(() => {
    return rows
      .filter((row) =>
        `${row.accountNumber} ${row.accountName} ${row.flagReason}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      )
      .sort((a, b) => {
        const aValue = a[sortKey];
        const bValue = b[sortKey];

        if (typeof aValue === "number" && typeof bValue === "number") return bValue - aValue;
        return String(aValue).localeCompare(String(bValue));
      });
  }, [rows, search, sortKey]);

  return (
    <div className="mt-8 rounded-2xl border border-slate-700 bg-slate-950 p-6">
      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h3 className="text-2xl font-bold">{title}</h3>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search accounts"
          className="rounded-xl border border-slate-700 bg-slate-800 p-3"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-700">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-800">
            <tr>
              <th className="px-4 py-3">Account #</th>
              <th className="px-4 py-3">Account Name</th>
              <th className="px-4 py-3">
                <button type="button" onClick={() => setSortKey("currentAmount")}>
                  Current
                </button>
              </th>
              <th className="px-4 py-3">
                <button type="button" onClick={() => setSortKey("priorAmount")}>
                  Prior
                </button>
              </th>
              <th className="px-4 py-3">
                <button type="button" onClick={() => setSortKey("dollarVariance")}>
                  Variance
                </button>
              </th>
              <th className="px-4 py-3">%</th>
              <th className="px-4 py-3">Severity</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">AI Commentary</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.length > 0 ? (
              visibleRows.map((row, index) => {
                const key = `${row.accountNumber}-${row.accountName}-${index}`;

                return (
                  <tr key={key} className="border-b border-slate-800">
                    <td className="px-4 py-3 text-slate-300">{row.accountNumber}</td>
                    <td className="px-4 py-3 text-slate-300">
                      <button
                        type="button"
                        onClick={() => setExpandedRows({ ...expandedRows, [key]: !expandedRows[key] })}
                        className="text-left"
                      >
                        {row.accountName}
                      </button>
                      {expandedRows[key] && (
                        <p className="mt-2 text-xs text-slate-500">
                          AI explanation placeholder: management should review the account activity,
                          timing, and supporting detail for this variance.
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">{formatMoney(row.currentAmount)}</td>
                    <td className="px-4 py-3">{formatMoney(row.priorAmount)}</td>
                    <td className="px-4 py-3">{formatMoney(row.dollarVariance)}</td>
                    <td className="px-4 py-3">
                      {row.percentVariance === null ? "N/A" : `${row.percentVariance.toFixed(1)}%`}
                    </td>
                    <td className="px-4 py-3">
                      <SeverityBadge severity={row.severity} />
                    </td>
                    <td className="px-4 py-3 text-slate-300">{row.flagReason}</td>
                    <td className="px-4 py-3 text-slate-400">AI commentary placeholder</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td className="px-4 py-3 text-slate-400" colSpan={9}>
                  Upload matching GL detail reports to generate flux analysis.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: FluxSeverity }) {
  const className =
    severity === "High"
      ? "bg-red-500/20 text-red-300"
      : severity === "Moderate"
        ? "bg-yellow-500/20 text-yellow-300"
        : "bg-blue-500/20 text-blue-300";

  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${className}`}>{severity}</span>;
}

function PrintableFinancialPackage({
  packageTier,
  companyName,
  reportPeriod,
  kpis,
  arKpis,
  apKpis,
  inventoryKpis,
  fixedAssetKpis,
  netMargin,
  executiveSummary,
  plData,
  bsData,
  arData,
  apData,
  inventoryData,
  fixedAssetData,
  priorFixedAssetData,
  topExpenseRows,
  ratioRows,
  fixedAssetChangeRows,
  monthFluxRows,
  quarterFluxRows,
  yearFluxRows,
}: {
  packageTier: PackageTier;
  companyName: string;
  reportPeriod: string;
  kpis: KPIs;
  arKpis: AgingKpis;
  apKpis: APKpis;
  inventoryKpis: InventoryKpis;
  fixedAssetKpis: FixedAssetKpis;
  netMargin: number;
  executiveSummary: ReturnType<typeof buildExecutiveSummary>;
  plData: ParsedFile | null;
  bsData: ParsedFile | null;
  arData: ParsedFile | null;
  apData: ParsedFile | null;
  inventoryData: ParsedFile | null;
  fixedAssetData: ParsedFile | null;
  priorFixedAssetData: ParsedFile | null;
  topExpenseRows: StatementRow[];
  ratioRows: Array<{ name: string; formula: string; value: string; interpretation: string }>;
  fixedAssetChangeRows: FixedAssetChangeRow[];
  monthFluxRows: FluxRow[];
  quarterFluxRows: FluxRow[];
  yearFluxRows: FluxRow[];
}) {
  const plRows = getStatementRows(plData);
  const bsRows = getBalanceSheetStatementRowsWithNetBookValue(bsData);

  return (
    <div className="print-package hidden">
      <section className="print-page">
        <div className="print-report-meta">
          <h1>{companyName}</h1>
          <p>
            {reportPeriod} | {PACKAGE_LABELS[packageTier]} Package
          </p>
          <p>Prepared by FinSight Reports</p>
        </div>

        <div className="print-section-block">
          <h2>Executive Summary</h2>
          <p>{executiveSummary.paragraph}</p>
        </div>

        <div className="print-section-block">
          <h3>Key Highlights</h3>
          <ul>
            {executiveSummary.highlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="print-section-block">
          <h3>Watch Items</h3>
          <ul>
            {executiveSummary.watchItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="print-section-block">
          <h3>KPI Snapshot</h3>
          <div className="print-grid">
            <PrintKpiCard label="Revenue" value={formatMoney(kpis.revenue)} />
            <PrintKpiCard label="Gross Profit" value={formatMoney(kpis.grossProfit)} />
            <PrintKpiCard label="Expenses" value={formatMoney(kpis.expenses)} />
            <PrintKpiCard label="Net Income" value={formatMoney(kpis.netIncome)} />
            <PrintKpiCard label="Cash" value={formatMoney(kpis.cash)} />
            <PrintKpiCard label="Accounts Receivable" value={formatMoney(kpis.accountsReceivable)} />
            {apData && <PrintKpiCard label="AP Aging Total" value={formatMoney(apKpis.total)} />}
            {fixedAssetData && (
              <>
                <PrintKpiCard label="Fixed Assets" value={formatCurrency(fixedAssetKpis.totalFixedAssets)} />
                <PrintKpiCard
                  label="Accumulated Depreciation"
                  value={formatCurrency(fixedAssetKpis.accumulatedDepreciation)}
                />
                <PrintKpiCard label="Net Book Value" value={formatCurrency(fixedAssetKpis.netBookValue)} />
              </>
            )}
            <PrintKpiCard label="Net Margin" value={`${netMargin.toFixed(1)}%`} />
          </div>
        </div>
      </section>

      <section className="print-page">
        <div className="statement-section">
          <div className="statement-header">
            <h1>Income Statement</h1>
            <p>Profit and Loss detail from the uploaded report.</p>
          </div>
          <FinancialStatementTable rows={plRows} />
        </div>
      </section>

      <section className="print-page">
        <div className="statement-section">
          <div className="statement-header">
            <h1>Balance Sheet</h1>
            <p>Assets, liabilities, and equity detail from the uploaded balance sheet.</p>
          </div>
          <FinancialStatementTable rows={bsRows} />
        </div>
      </section>

      <section className="print-page">
        <h1>Aging Analysis</h1>
        <h2>Accounts Receivable Aging</h2>
        {arData ? (
          <AgingPrintTable kpis={arKpis} totalLabel="Accounts Receivable Total" currentLabel="Current AR" />
        ) : (
          <p>AR Aging report not uploaded</p>
        )}

        <h2>Accounts Payable Aging</h2>
        {apData ? (
          <AgingPrintTable kpis={apKpis} totalLabel="Accounts Payable Total" currentLabel="Current AP" />
        ) : (
          <p>AP Aging report not uploaded</p>
        )}
      </section>

      <section className="print-page">
        <h1>Customer and Expense Analysis</h1>
        <h2>Top Expense Categories</h2>
        <table className="print-table">
          <thead>
            <tr>
              <th>Expense Category</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {topExpenseRows.length > 0 ? (
              topExpenseRows.map((row, index) => (
                <tr key={`${row.label}-${index}`}>
                  <td>{row.label}</td>
                  <td>{formatMoney(row.amount || 0)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={2}>Expense detail unavailable from uploaded Profit and Loss report.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {isProfessionalOrHigher(packageTier) && (
        <>
          {inventoryData && (
          <section className="print-page">
            <h1>Inventory Summary</h1>
            <p>Inventory valuation detail from the uploaded Inventory Valuation report.</p>
            <table className="print-table">
              <tbody>
                <tr>
                  <td>Total Inventory Value</td>
                  <td>{formatMoney(inventoryKpis.totalValue)}</td>
                </tr>
                <tr>
                  <td>Total Quantity on Hand</td>
                  <td>{formatNumber(inventoryKpis.totalQuantity)}</td>
                </tr>
              </tbody>
            </table>
            <h2>Top 5 Inventory Items by Value</h2>
            <InventoryPrintTable items={inventoryKpis.topByValue} />
            <h2>Top 5 Inventory Items by Quantity</h2>
            <InventoryPrintTable items={inventoryKpis.topByQuantity} />
          </section>
          )}

          <section className="print-page">
            <h1>Ratio Analysis</h1>
            <table className="print-table">
              <thead>
                <tr>
                  <th>Ratio</th>
                  <th>Formula</th>
                  <th>Value</th>
                  <th>Interpretation</th>
                </tr>
              </thead>
              <tbody>
                {ratioRows.map((ratio) => (
                  <tr key={ratio.name}>
                    <td>{ratio.name}</td>
                    <td>{ratio.formula}</td>
                    <td>{ratio.value}</td>
                    <td>{ratio.interpretation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}

      {isVirtualCfo(packageTier) && (
        <>
          {fixedAssetData && (
          <section className="print-page">
            <h1>Fixed Asset Analysis</h1>
            <p>Fixed asset detail from the uploaded Fixed Asset report.</p>
            <table className="print-table">
              <tbody>
                <tr>
                  <td>Total Fixed Assets</td>
                  <td>{formatMoney(fixedAssetKpis.totalFixedAssets)}</td>
                </tr>
                <tr>
                  <td>Accumulated Depreciation</td>
                  <td>{formatMoney(fixedAssetKpis.accumulatedDepreciation)}</td>
                </tr>
                <tr>
                  <td>Net Book Value</td>
                  <td>{formatMoney(fixedAssetKpis.netBookValue)}</td>
                </tr>
                <tr>
                  <td>Depreciation Expense</td>
                  <td>
                    {formatOptionalCurrency(
                      fixedAssetKpis.depreciationExpense,
                      "N/A",
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
            <h2>Significant Changes</h2>
            {priorFixedAssetData ? (
              <FixedAssetChangePrintTable rows={fixedAssetChangeRows} />
            ) : (
              <p>Upload prior period fixed asset report to calculate significant changes.</p>
            )}
          </section>
          )}

          {monthFluxRows.length > 0 && (
            <>
              <PrintFluxSection title="Flux Analysis Executive Summary" rows={monthFluxRows} />
              <PrintFluxSection title="Month-over-Month Flux Analysis" rows={monthFluxRows} />
            </>
          )}
          {quarterFluxRows.length > 0 && (
            <PrintFluxSection title="Quarter-over-Quarter Flux Analysis" rows={quarterFluxRows} />
          )}
          {yearFluxRows.length > 0 && (
            <PrintFluxSection title="Year-over-Year Flux Analysis" rows={yearFluxRows} />
          )}

          <section className="print-page">
            <h1>Key Variance Highlights</h1>
            <p>Management commentary placeholder.</p>
            <p>
              Budget vs Actual, EBITDA, debt analysis, benchmarking, risk indicators, multi-period
              reporting, and board-style formatting placeholders are included for Virtual CFO
              package expansion.
            </p>
          </section>
        </>
      )}
    </div>
  );
}

function FinancialStatementTable({ rows }: { rows: StatementRow[] }) {
  const dedupedRows = getDedupedStatementRows(rows);

  return (
    <table className="print-statement-table statement-table">
      <thead>
        <tr>
          <th>Line Item</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        {dedupedRows.map((row, index) => {
          const rowType = row.amount === null ? "section" : getStatementRowType(row.label);

          return (
            <tr key={`${row.label}-${index}`} className={`print-statement-${rowType}`}>
              <td>{row.label}</td>
              <td>{row.amount === null ? "" : formatMoney(row.amount)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function PrintKpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="print-kpi-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function AgingPrintTable({
  kpis,
  totalLabel,
  currentLabel,
}: {
  kpis: AgingKpis;
  totalLabel: string;
  currentLabel: string;
}) {
  return (
    <table className="print-table">
      <tbody>
        <tr>
          <td>{totalLabel}</td>
          <td>{formatMoney(kpis.total)}</td>
        </tr>
        <tr>
          <td>{currentLabel}</td>
          <td>{formatMoney(kpis.current)}</td>
        </tr>
        <tr>
          <td>1-30 Days</td>
          <td>{formatMoney(kpis.days1To30)}</td>
        </tr>
        <tr>
          <td>31-60 Days</td>
          <td>{formatMoney(kpis.days31To60)}</td>
        </tr>
        <tr>
          <td>61-90 Days</td>
          <td>{formatMoney(kpis.days61To90)}</td>
        </tr>
        <tr>
          <td>90+ Days</td>
          <td>{formatMoney(kpis.days90Plus)}</td>
        </tr>
      </tbody>
    </table>
  );
}

function FixedAssetChangePrintTable({ rows }: { rows: FixedAssetChangeRow[] }) {
  return (
    <table className="print-table">
      <thead>
        <tr>
          <th>Metric</th>
          <th>Prior Period</th>
          <th>Current Period</th>
          <th>Change</th>
          <th>Interpretation</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.metric}>
            <td>{row.metric}</td>
            <td>{formatCurrency(row.prior)}</td>
            <td>{formatCurrency(row.current)}</td>
            <td>{formatCurrency(row.change)}</td>
            <td>{row.interpretation}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function InventoryPrintTable({ items }: { items: InventoryItem[] }) {
  return (
    <table className="print-table">
      <thead>
        <tr>
          <th>Item</th>
          <th>Quantity</th>
          <th>Value</th>
        </tr>
      </thead>
      <tbody>
        {items.length > 0 ? (
          items.map((item, index) => (
            <tr key={`${item.name}-${index}`}>
              <td>{item.name}</td>
              <td>{formatNumber(item.quantity)}</td>
              <td>{formatMoney(item.value)}</td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={3}>Inventory valuation report required.</td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

function PrintFluxSection({ title, rows }: { title: string; rows: FluxRow[] }) {
  return (
    <section className="print-page">
      <h1>{title}</h1>
      <p>Accounts exceeding selected Virtual CFO flux thresholds.</p>
      <table className="print-table">
        <thead>
          <tr>
            <th>Account #</th>
            <th>Account Name</th>
            <th>Current</th>
            <th>Prior</th>
            <th>Variance</th>
            <th>%</th>
            <th>Severity</th>
            <th>Reason</th>
            <th>Commentary</th>
          </tr>
        </thead>
        <tbody>
          {rows.length > 0 ? (
            rows.map((row, index) => (
              <tr key={`${row.accountNumber}-${row.accountName}-${index}`}>
                <td>{row.accountNumber}</td>
                <td>{row.accountName}</td>
                <td>{formatMoney(row.currentAmount)}</td>
                <td>{formatMoney(row.priorAmount)}</td>
                <td>{formatMoney(row.dollarVariance)}</td>
                <td>{row.percentVariance === null ? "N/A" : `${row.percentVariance.toFixed(1)}%`}</td>
                <td>{row.severity}</td>
                <td>{row.flagReason}</td>
                <td>AI explanation placeholder</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={9}>Upload matching GL detail reports to generate flux analysis.</td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}

function Preview({ title, data }: { title: string; data: ParsedFile | null }) {
  if (!data) return null;

  const previewRows = getPreviewRows(title, data);
  const normalizedPreviewTitle = title.toLowerCase();
  const isAgingPreview = normalizedPreviewTitle.includes("aging");
  const isGlPreview =
    normalizedPreviewTitle.includes("gl preview") ||
    normalizedPreviewTitle.includes("general ledger");
  const isComparisonPreview = previewRows.some((row) => isComparisonHeaderRow(row));
  const getHeadersForRow = (rowIndex: number) => {
    for (let index = rowIndex - 1; index >= 0; index--) {
      const candidate = previewRows[index];
      const filledCells = candidate?.filter((cell) => String(cell || "").trim()).length || 0;

      if (candidate && isHeaderRow(candidate) && filledCells > 1) return candidate;
    }

    return [];
  };
  const renderPreviewCell = (row: unknown[], cell: unknown, cellIndex: number, headers: unknown[], rowIndex: number) => {
    const value = parseNumber(cell);
    const isBudgetPreview = normalizedPreviewTitle.includes("budget");
    const lastNonEmptyCellIndex = row.reduce(
      (latestIndex, currentCell, currentIndex) =>
        String(currentCell || "").trim() ? currentIndex : latestIndex,
      -1,
    );
    const headerText = String(headers[cellIndex] || "").toLowerCase();
    const percentColumnIndexes = headers.reduce<number[]>((indexes, header, headerIndex) => {
      if (String(header || "").includes("%")) return [...indexes, headerIndex];
      return indexes;
    }, []);

    if (isGlPreview && cellIndex <= 2) {
      return String(cell || "");
    }

    if (
      isAgingPreview &&
      cellIndex > 0 &&
      value !== null &&
      !isAgingBucketLabel(cell)
    ) {
      return formatCurrency(value);
    }

    if (
      value !== null &&
      cellIndex > 0 &&
      !isHeaderRow(row) &&
      ((isBudgetPreview && cellIndex === lastNonEmptyCellIndex) ||
        (isComparisonPreview &&
          (headerText.includes("%") || percentColumnIndexes.includes(cellIndex))))
    ) {
      return formatPercent(value);
    }

    return formatPreviewCell(row, cell, cellIndex, headers, rowIndex, title);
  };

  return (
    <div className="mt-10 rounded-3xl bg-slate-900 p-8">
      <h2 className="mb-2 text-2xl font-bold">{title}</h2>
      <p className="mb-4 text-sm text-slate-400">
        File: {data.name} | Rows detected: {data.rows.length}
      </p>
      <div className="overflow-x-auto rounded-xl border border-slate-700">
        <table className="w-full text-left text-sm">
          <tbody>
            {previewRows.map((row, rowIndex) => {
              const rowType = getPreviewRowType(row);
              const metaRowType = getPreviewMetaRowType(row, rowIndex);
              const headers = getHeadersForRow(rowIndex);
              const subtotalRow = rowType === "subtotal";
              const calculatedValueRow = rowType === "calculated-value";
              const grandTotalRow = rowType === "grand-total";
              const majorTotalRow = rowType === "major-total";
              const headerRow = isHeaderRow(row) && row.length > 1;

              return (
              <tr
                key={rowIndex}
                className={`border-b border-slate-800 ${
                  metaRowType === "company"
                    ? "bg-[#172033] text-base font-extrabold text-[#F9FAFB]"
                    : metaRowType === "report"
                      ? "bg-[#172033]/80 font-bold text-blue-200"
                      : metaRowType === "period"
                        ? "bg-[#172033]/60 font-semibold text-slate-200"
                  : headerRow
                    ? "bg-slate-800/60 font-bold text-slate-100"
                    : rowType === "section"
                    ? "bg-slate-800/50 font-bold text-slate-100"
                    : grandTotalRow
                      ? "grandTotalRow border-t-[3px] border-t-slate-300 bg-slate-700/70 text-base font-black uppercase text-white"
                      : calculatedValueRow
                        ? "calculatedValueRow border-t border-t-slate-500 bg-slate-800/30 font-bold text-slate-100"
                        : majorTotalRow
                          ? "border-t-2 border-t-slate-500 bg-slate-800/40 font-extrabold text-white"
                          : subtotalRow
                            ? "border-t border-t-slate-600 bg-slate-800/20 font-semibold text-slate-100"
                            : "text-slate-300"
                } ${subtotalRow ? "subtotalRow" : ""}`}
              >
                {metaRowType ? (
                  <td colSpan={PREVIEW_COLUMN_LIMIT} className="px-4 py-3">
                    {String(row.find((cell) => String(cell || "").trim()) || "")}
                  </td>
                ) : (
                  row.slice(0, PREVIEW_COLUMN_LIMIT).map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className={`px-4 py-2 ${
                        cellIndex === 0 && rowType === "detail" && !headerRow ? "pl-8" : ""
                      } ${cellIndex > 0 ? "text-right tabular-nums" : ""}`}
                    >
                      {renderPreviewCell(row, cell, cellIndex, headers, rowIndex)}
                    </td>
                  ))
                )}
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}