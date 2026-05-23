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
  data: ParsedFile | null;
  onFile: (file: File) => void;
};

type APKpis = {
  total: number;
  current: number;
  days1To30: number;
  days31To60: number;
  days61To90: number;
  days90Plus: number;
};

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
  value: number;
};

type FixedAssetKpis = {
  totalFixedAssets: number;
  accumulatedDepreciation: number;
  netBookValue: number;
  depreciationExpense: number;
  fixedAssetsToTotalAssets: number;
  depreciationToFixedAssets: number;
  netBookValueToTotalAssets: number;
  matches: FixedAssetMatch[];
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

function isProfessionalOrHigher(tier: PackageTier) {
  return tier === "professional" || tier === "virtualCfo";
}

function isVirtualCfo(tier: PackageTier) {
  return tier === "virtualCfo";
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;

  const text = String(value)
    .replace(/\$/g, "")
    .replace(/,/g, "")
    .replace(/\((.*?)\)/g, "-$1")
    .replace(/^=/, "")
    .trim();

  const number = Number(text.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(number) ? number : null;
}

function calculateKPIs(plData: ParsedFile | null, bsData: ParsedFile | null): KPIs {
  const matches: MatchedLine[] = [];

  const findExact = (rows: unknown[][], metric: string, labels: string[]) => {
    for (const row of rows) {
      const label = String(row[0] || "").trim().toLowerCase();

      if (labels.map((x) => x.toLowerCase()).includes(label)) {
        const value = parseNumber(row[1]) || 0;
        matches.push({ metric, label: String(row[0]), value });
        return value;
      }
    }

    matches.push({ metric, label: "Not found", value: 0 });
    return 0;
  };

  const revenue = findExact(plData?.rows || [], "Revenue", ["Total Income"]);
  const cogs = findExact(plData?.rows || [], "COGS", ["Total Cost of Goods Sold"]);
  const grossProfit = findExact(plData?.rows || [], "Gross Profit", ["Gross Profit"]);
  const expenses = findExact(plData?.rows || [], "Expenses", ["Total Expenses"]);
  const netIncome = findExact(plData?.rows || [], "Net Income", ["Net Income"]);
  const cash = findExact(bsData?.rows || [], "Cash", ["Total Bank Accounts"]);
  const accountsReceivable = findExact(bsData?.rows || [], "Accounts Receivable", [
    "Total Accounts Receivable",
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

function buildExecutiveSummary(kpis: KPIs, netMargin: number) {
  const grossMargin = kpis.revenue ? (kpis.grossProfit / kpis.revenue) * 100 : 0;
  const expenseRatio = kpis.revenue ? (kpis.expenses / kpis.revenue) * 100 : 0;
  const cashToAssets = kpis.totalAssets ? (kpis.cash / kpis.totalAssets) * 100 : 0;

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
    )} in total assets, providing a snapshot of liquidity and overall financial position.`,
    highlights: [
      `Revenue totaled ${formatMoney(kpis.revenue)} for the uploaded period.`,
      `Gross profit was ${formatMoney(kpis.grossProfit)}, representing a gross margin of ${grossMargin.toFixed(1)}%.`,
      `Net income was ${formatMoney(kpis.netIncome)}, with a net margin of ${netMargin.toFixed(1)}%.`,
      `Cash on hand was ${formatMoney(kpis.cash)}, equal to ${cashToAssets.toFixed(1)}% of total assets.`,
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

function sumColumn(rows: unknown[][], columnIndex: number) {
  if (columnIndex < 0) return 0;
  return rows.reduce((total, row) => total + (parseNumber(row[columnIndex]) || 0), 0);
}

function calculateAPKpis(apData: ParsedFile | null): APKpis {
  if (!apData) {
    return {
      total: 0,
      current: 0,
      days1To30: 0,
      days31To60: 0,
      days61To90: 0,
      days90Plus: 0,
    };
  }

  const headerIndex = apData.rows.findIndex((row) =>
    row.some((cell) => normalizeHeader(cell).includes("current")),
  );
  const headers = apData.rows[headerIndex] || [];
  const dataRows = headerIndex >= 0 ? apData.rows.slice(headerIndex + 1) : apData.rows;
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
): FixedAssetKpis {
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
    "depreciation",
  ]);
  const depreciationExpense = findByLabels("Depreciation Expense", ["depreciation expense"]);
  const netBookValue =
    findByLabels("Net Book Value", ["net book value", "book value"]) ||
    totalFixedAssets + accumulatedDepreciation;

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

function getStatementRows(data: ParsedFile | null): StatementRow[] {
  if (!data) return [];

  return data.rows
    .map((row) => ({
      label: String(row[0] || "").trim(),
      amount: parseNumber(row[1]),
    }))
    .filter((row) => row.label && row.amount !== null);
}

function findStatementAmount(rows: StatementRow[], labels: string[]) {
  const normalizedLabels = labels.map((label) => label.toLowerCase());
  return rows.find((row) => normalizedLabels.includes(row.label.toLowerCase()))?.amount || 0;
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
    "expenses",
    "assets",
    "liabilities",
    "equity",
  ];
  const majorTotalLabels = [
    "total income",
    "total cost of goods sold",
    "gross profit",
    "total expenses",
    "net income",
    "total assets",
    "total liabilities",
    "total equity",
  ];

  if (sectionLabels.includes(normalized)) return "section";
  if (majorTotalLabels.includes(normalized)) return "major-total";
  if (normalized.startsWith("total")) return "subtotal";
  return "detail";
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

function buildRatioRows(
  kpis: KPIs,
  netMargin: number,
  bsRows: StatementRow[],
  apKpis: APKpis,
  inventoryKpis: InventoryKpis,
) {
  const grossMargin = kpis.revenue ? (kpis.grossProfit / kpis.revenue) * 100 : 0;
  const expenseRatio = kpis.revenue ? (kpis.expenses / kpis.revenue) * 100 : 0;
  const currentAssets = findStatementAmount(bsRows, [
    "Total Current Assets",
    "Total Other Current Assets",
  ]);
  const currentLiabilities = findStatementAmount(bsRows, [
    "Total Current Liabilities",
    "Total Liabilities",
  ]);
  const currentRatio = currentAssets && currentLiabilities ? currentAssets / currentLiabilities : 0;
  const quickRatio = currentLiabilities
    ? (kpis.cash + kpis.accountsReceivable) / currentLiabilities
    : 0;
  const cashToAssets = kpis.totalAssets ? (kpis.cash / kpis.totalAssets) * 100 : 0;
  const arToAssets = kpis.totalAssets ? (kpis.accountsReceivable / kpis.totalAssets) * 100 : 0;
  const apToRevenue = kpis.revenue ? (apKpis.total / kpis.revenue) * 100 : 0;
  const inventoryToAssets = kpis.totalAssets
    ? (inventoryKpis.totalValue / kpis.totalAssets) * 100
    : 0;
  const workingCapital =
    currentAssets && currentLiabilities ? currentAssets - currentLiabilities : null;

  return [
    {
      name: "Net Margin",
      formula: "Net Income / Revenue",
      value: `${netMargin.toFixed(1)}%`,
      interpretation:
        netMargin >= 10
          ? "The business is converting revenue into profit at a healthy level."
          : "Profitability is modest and should be monitored closely.",
    },
    {
      name: "Gross Margin",
      formula: "Gross Profit / Revenue",
      value: `${grossMargin.toFixed(1)}%`,
      interpretation: "Shows how much revenue remains after direct costs.",
    },
    {
      name: "Expense Ratio",
      formula: "Total Expenses / Revenue",
      value: `${expenseRatio.toFixed(1)}%`,
      interpretation: "Shows how much revenue is consumed by operating expenses.",
    },
    {
      name: "Current Ratio",
      formula: "Current Assets / Current Liabilities",
      value: currentRatio ? currentRatio.toFixed(2) : "N/A",
      interpretation: currentRatio
        ? "Shows the company's ability to cover short-term obligations with current assets."
        : "Current assets and current liabilities are needed for a precise calculation.",
    },
    {
      name: "Quick Ratio",
      formula: "(Cash + Accounts Receivable) / Current Liabilities",
      value: quickRatio ? quickRatio.toFixed(2) : "N/A",
      interpretation: quickRatio
        ? "Shows short-term liquidity using cash and receivables."
        : "Current liabilities are needed for a precise calculation.",
    },
    {
      name: "Cash to Assets",
      formula: "Cash / Total Assets",
      value: `${cashToAssets.toFixed(1)}%`,
      interpretation: "Shows how much of the asset base is held in cash.",
    },
    {
      name: "Accounts Receivable to Assets",
      formula: "Accounts Receivable / Total Assets",
      value: `${arToAssets.toFixed(1)}%`,
      interpretation: "Shows how much of the asset base is tied up in receivables.",
    },
    {
      name: "AP to Revenue",
      formula: "Accounts Payable / Revenue",
      value: `${apToRevenue.toFixed(1)}%`,
      interpretation: "Shows unpaid vendor obligations compared with revenue.",
    },
    {
      name: "Inventory to Total Assets",
      formula: "Inventory / Total Assets",
      value: `${inventoryToAssets.toFixed(1)}%`,
      interpretation: "Shows how much of the asset base is invested in inventory.",
    },
    {
      name: "Working Capital Estimate",
      formula: "Current Assets - Current Liabilities",
      value: workingCapital !== null ? formatMoney(workingCapital) : "N/A",
      interpretation:
        workingCapital !== null
          ? "Estimates short-term operating liquidity."
          : "Current assets and current liabilities are needed for a precise calculation.",
    },
    {
      name: "DSO",
      formula: "Accounts Receivable / Average Daily Sales",
      value: "N/A",
      interpretation:
        "AR aging or sales by period detail is needed for a more precise DSO calculation.",
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
  const [plData, setPlData] = useState<ParsedFile | null>(null);
  const [bsData, setBsData] = useState<ParsedFile | null>(null);
  const [arData, setArData] = useState<ParsedFile | null>(null);
  const [apData, setApData] = useState<ParsedFile | null>(null);
  const [inventoryData, setInventoryData] = useState<ParsedFile | null>(null);
  const [customerSalesData, setCustomerSalesData] = useState<ParsedFile | null>(null);
  const [vendorExpenseData, setVendorExpenseData] = useState<ParsedFile | null>(null);
  const [fixedAssetData, setFixedAssetData] = useState<ParsedFile | null>(null);
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

  const parseFile = async (file: File, setData: (data: ParsedFile) => void) => {
    setIsPackageGenerated(false);
    setIsPackageExported(false);
    setKpisConfirmed(false);
    const extension = file.name.split(".").pop()?.toLowerCase();

    if (extension === "csv") {
      Papa.parse(file, {
        complete: (result) => {
          setData({ name: file.name, rows: result.data as unknown[][] });
        },
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
      data: plData,
      onFile: (file) => parseFile(file, setPlData),
    },
    {
      id: "bs",
      tier: "essential",
      label: "Balance Sheet",
      description:
        "Export the QuickBooks Balance Sheet report. Used to calculate cash, receivables, assets, equity, and liquidity metrics.",
      data: bsData,
      onFile: (file) => parseFile(file, setBsData),
    },
    {
      id: "ar",
      tier: "essential",
      label: "Accounts Receivable Aging Summary",
      description:
        "Export the QuickBooks Accounts Receivable Aging Summary report. Supports receivables review, collections, and DSO commentary.",
      data: arData,
      onFile: (file) => parseFile(file, setArData),
    },
    {
      id: "ap",
      tier: "essential",
      label: "Accounts Payable Aging Summary",
      description:
        "Export the QuickBooks Accounts Payable Aging Summary report. Supports payables review, vendor obligations, and working capital analysis.",
      data: apData,
      onFile: (file) => parseFile(file, setApData),
    },
    {
      id: "inventory",
      tier: "professional",
      label: "Inventory Valuation Summary",
      description:
        "Export the QuickBooks Inventory Valuation Summary report. Adds inventory value, quantity on hand, and top item analytics.",
      data: inventoryData,
      onFile: (file) => parseFile(file, setInventoryData),
    },
    {
      id: "customers",
      tier: "professional",
      label: "Sales by Customer Summary",
      description:
        "Export the QuickBooks Sales by Customer Summary report. Adds top customer visibility and customer concentration commentary.",
      data: customerSalesData,
      onFile: (file) => parseFile(file, setCustomerSalesData),
    },
    {
      id: "vendors",
      tier: "professional",
      label: "Expenses by Vendor Summary",
      description:
        "Export the QuickBooks Expenses by Vendor Summary report. Adds vendor concentration and expense category analysis.",
      data: vendorExpenseData,
      onFile: (file) => parseFile(file, setVendorExpenseData),
    },
    {
      id: "fixed-assets",
      tier: "virtualCfo",
      label: "Fixed Asset Detail / Fixed Asset Register",
      description:
        "Export the QuickBooks Fixed Asset Detail or Fixed Asset Register report. Adds fixed asset, depreciation, and net book value analysis.",
      data: fixedAssetData,
      onFile: (file) => parseFile(file, setFixedAssetData),
    },
    {
      id: "budget",
      tier: "virtualCfo",
      label: "Budget vs. Actuals",
      description:
        "Export the QuickBooks Budget vs. Actuals report. Supports variance analysis and budget performance review.",
      data: budgetVsActualData,
      onFile: (file) => parseFile(file, setBudgetVsActualData),
    },
    {
      id: "prior-pl",
      tier: "virtualCfo",
      label: "Profit and Loss Comparison",
      description:
        "Export the QuickBooks Profit and Loss Comparison report. Supports trend, variance, and period-over-period comparison.",
      data: priorPeriodPlData,
      onFile: (file) => parseFile(file, setPriorPeriodPlData),
    },
    {
      id: "prior-bs",
      tier: "virtualCfo",
      label: "Balance Sheet Comparison",
      description:
        "Export the QuickBooks Balance Sheet Comparison report. Supports balance sheet movement and working capital comparison.",
      data: priorPeriodBsData,
      onFile: (file) => parseFile(file, setPriorPeriodBsData),
    },
    {
      id: "cash-flow",
      tier: "virtualCfo",
      label: "Statement of Cash Flows",
      description:
        "Export the QuickBooks Statement of Cash Flows report. Supports cash flow review and CFO-level liquidity commentary.",
      data: cashFlowData,
      onFile: (file) => parseFile(file, setCashFlowData),
    },
    {
      id: "debt",
      tier: "virtualCfo",
      label: "Debt Schedule / Loan Detail",
      description:
        "Export a QuickBooks loan detail report or your debt schedule. Supports debt analysis, risk indicators, and leverage commentary.",
      data: debtScheduleData,
      onFile: (file) => parseFile(file, setDebtScheduleData),
    },
    {
      id: "current-month-gl",
      tier: "virtualCfo",
      label: "General Ledger - Current Month",
      description:
        "Export the QuickBooks General Ledger for the current month. Used for month-over-month flux analysis.",
      data: currentMonthGlData,
      onFile: (file) => parseFile(file, setCurrentMonthGlData),
    },
    {
      id: "prior-month-gl",
      tier: "virtualCfo",
      label: "General Ledger - Prior Month",
      description:
        "Export the QuickBooks General Ledger for the prior month. Used as the comparison period for monthly flux analysis.",
      data: priorMonthGlData,
      onFile: (file) => parseFile(file, setPriorMonthGlData),
    },
    {
      id: "current-quarter-gl",
      tier: "virtualCfo",
      label: "General Ledger - Current Quarter",
      description:
        "Export the QuickBooks General Ledger for the current quarter. Used for quarter-over-quarter flux analysis.",
      data: currentQuarterGlData,
      onFile: (file) => parseFile(file, setCurrentQuarterGlData),
    },
    {
      id: "prior-quarter-gl",
      tier: "virtualCfo",
      label: "General Ledger - Prior Quarter",
      description:
        "Export the QuickBooks General Ledger for the prior quarter. Used as the comparison period for quarterly flux analysis.",
      data: priorQuarterGlData,
      onFile: (file) => parseFile(file, setPriorQuarterGlData),
    },
    {
      id: "current-year-gl",
      tier: "virtualCfo",
      label: "General Ledger - Current Year",
      description:
        "Export the QuickBooks General Ledger for the current year. Used for year-over-year flux analysis.",
      data: currentYearGlData,
      onFile: (file) => parseFile(file, setCurrentYearGlData),
    },
    {
      id: "prior-year-gl",
      tier: "virtualCfo",
      label: "General Ledger - Prior Year",
      description:
        "Export the QuickBooks General Ledger for the prior year. Used as the comparison period for annual flux analysis.",
      data: priorYearGlData,
      onFile: (file) => parseFile(file, setPriorYearGlData),
    },
  ];
  const selectedReports = uploadReports.filter((report) =>
    isReportAvailable(report.tier, packageTier),
  );
  const uploadedReportsCount = selectedReports.filter((report) => report.data).length;
  const missingReports = selectedReports.filter((report) => !report.data);
  const requiredUploadsComplete = hasSelectedPackage && selectedReports.length > 0 && missingReports.length === 0;
  const kpisAvailable = requiredUploadsComplete;
  const canReviewKpis = requiredUploadsComplete;
  const canGeneratePackage = canReviewKpis && kpisAvailable && kpisConfirmed;
  const canPreviewPackage = isPackageGenerated;

  const kpis = calculateKPIs(plData, bsData);
  const netMargin = kpis.revenue ? (kpis.netIncome / kpis.revenue) * 100 : 0;
  const executiveSummary = buildExecutiveSummary(kpis, netMargin);
  const apKpis = calculateAPKpis(apData);
  const inventoryKpis = calculateInventoryKpis(inventoryData);
  const fixedAssetKpis = calculateFixedAssetKpis(fixedAssetData, kpis.totalAssets);
  const reportPeriod = "Current Reporting Period";
  const companyName = "Client Company Name";
  const monthFluxRows = getFluxRows(currentMonthGlData, priorMonthGlData, fluxSettings);
  const quarterFluxRows = getFluxRows(currentQuarterGlData, priorQuarterGlData, fluxSettings);
  const yearFluxRows = getFluxRows(currentYearGlData, priorYearGlData, fluxSettings);
  const handlePackageTierChange = (tier: PackageTier) => {
    setPackageTier(tier);
    setHasSelectedPackage(true);
    setIsPackageGenerated(false);
    setIsPackageExported(false);
    setKpisConfirmed(false);
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

          .print-statement-major-total td {
            padding-top: 10px;
            padding-bottom: 10px;
            border-top: 2px solid #111827;
            border-bottom: 1px solid #6b7280;
            background: #eef2ff;
            font-weight: 800;
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
                  <KpiCard label="AP Aging Total" value={apKpis.total} />
                  {isProfessionalOrHigher(packageTier) && (
                    <>
                      <KpiCard label="Inventory Value" value={inventoryKpis.totalValue} />
                      <KpiCard label="Inventory Quantity" value={inventoryKpis.totalQuantity} plain />
                    </>
                  )}
                  {isVirtualCfo(packageTier) && (
                    <>
                      <KpiCard label="Total Fixed Assets" value={fixedAssetKpis.totalFixedAssets} />
                      <KpiCard label="Net Book Value" value={fixedAssetKpis.netBookValue} />
                    </>
                  )}
                </div>
              </section>

              <KpiConfirmationPanel
                packageTier={packageTier}
                kpis={kpis}
                apKpis={apKpis}
                inventoryKpis={inventoryKpis}
                fixedAssetKpis={fixedAssetKpis}
                netMargin={netMargin}
                kpisConfirmed={kpisConfirmed}
                reviewerNotes={reviewerNotes}
                onKpisConfirmedChange={(confirmed) => {
                  setKpisConfirmed(confirmed);
                  if (!confirmed) {
                    setIsPackageGenerated(false);
                    setIsPackageExported(false);
                  }
                }}
                onReviewerNotesChange={setReviewerNotes}
              />

              <ExecutiveSummarySection executiveSummary={executiveSummary} />
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
                  <ReportMetricCard label="AP Aging Total" value={formatMoney(apKpis.total)} />
                  {isProfessionalOrHigher(packageTier) && (
                    <ReportMetricCard
                      label="Inventory Value"
                      value={formatMoney(inventoryKpis.totalValue)}
                    />
                  )}
                  {isVirtualCfo(packageTier) && (
                    <ReportMetricCard
                      label="Fixed Assets"
                      value={formatMoney(fixedAssetKpis.totalFixedAssets)}
                    />
                  )}
                </div>
              </div>
            </section>
          )}

          {canReviewKpis && <BasicChartsSection kpis={kpis} />}

          {canReviewKpis && isProfessionalOrHigher(packageTier) && (
            <>
              <InventoryAnalysisSection inventoryKpis={inventoryKpis} />
              <ProfessionalPlaceholderSection />
            </>
          )}

          {canReviewKpis && isVirtualCfo(packageTier) && (
            <>
              <FixedAssetAnalysisSection fixedAssetKpis={fixedAssetKpis} />
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

              <Preview title="Profit & Loss Preview" data={plData} />
              <Preview title="Balance Sheet Preview" data={bsData} />
              <Preview title="AR Aging Preview" data={arData} />
              <Preview title="AP Aging Preview" data={apData} />
              {isProfessionalOrHigher(packageTier) && (
                <>
                  <Preview title="Inventory Valuation Preview" data={inventoryData} />
                  <Preview title="Customer Sales Detail Preview" data={customerSalesData} />
                  <Preview title="Vendor Expense Detail Preview" data={vendorExpenseData} />
                </>
              )}
              {isVirtualCfo(packageTier) && (
                <>
                  <Preview title="Fixed Asset Preview" data={fixedAssetData} />
                  <Preview title="Budget vs Actual Preview" data={budgetVsActualData} />
                  <Preview title="Prior Period P&L Preview" data={priorPeriodPlData} />
                  <Preview title="Prior Period Balance Sheet Preview" data={priorPeriodBsData} />
                  <Preview title="Cash Flow Statement Preview" data={cashFlowData} />
                  <Preview title="Debt Schedule Preview" data={debtScheduleData} />
                  <Preview title="Current Month GL Preview" data={currentMonthGlData} />
                  <Preview title="Prior Month GL Preview" data={priorMonthGlData} />
                  <Preview title="Current Quarter GL Preview" data={currentQuarterGlData} />
                  <Preview title="Prior Quarter GL Preview" data={priorQuarterGlData} />
                  <Preview title="Current Year GL Preview" data={currentYearGlData} />
                  <Preview title="Prior Year GL Preview" data={priorYearGlData} />
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
        apKpis={apKpis}
        inventoryKpis={inventoryKpis}
        fixedAssetKpis={fixedAssetKpis}
        netMargin={netMargin}
        executiveSummary={executiveSummary}
        plData={plData}
        bsData={bsData}
        arData={arData}
        apData={apData}
        inventoryData={inventoryData}
        fixedAssetData={fixedAssetData}
        topExpenseRows={getTopExpenseRows(plData)}
        ratioRows={buildRatioRows(kpis, netMargin, getStatementRows(bsData), apKpis, inventoryKpis)}
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
  canGeneratePackage: boolean;
  isPackageGenerated: boolean;
  isPackageExported: boolean;
  onGeneratePackage: () => void;
  onExportPackage: () => void;
}) {
  const selectedReportsCount = reports.filter((report) =>
    isReportAvailable(report.tier, packageTier),
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
          {reports.filter((report) => isReportAvailable(report.tier, packageTier) && report.data).length}
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
  const uploaded = Boolean(report.data);

  return (
    <div className="rounded-2xl border border-[#243041] bg-[#172033] p-5 shadow-lg shadow-black/10">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-[#F9FAFB]">{report.label}</h3>
            <PackageBadge tier={report.tier} />
          </div>
          <p className="text-sm leading-6 text-[#94A3B8]">{report.description}</p>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            uploaded ? "bg-emerald-500/15 text-emerald-300" : "bg-[#111827] text-[#94A3B8]"
          }`}
        >
          {uploaded ? "Uploaded" : "Needed"}
        </span>
      </div>

      <label className="block cursor-pointer rounded-2xl border border-dashed border-[#5B8CFF]/40 bg-[#111827] p-5 transition hover:border-[#5B8CFF]">
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) report.onFile(file);
          }}
          className="sr-only"
        />

        <span className="block text-sm font-semibold text-[#F9FAFB]">
          {uploaded ? "Replace uploaded file" : "Upload report"}
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

function KpiConfirmationPanel({
  packageTier,
  kpis,
  apKpis,
  inventoryKpis,
  fixedAssetKpis,
  netMargin,
  kpisConfirmed,
  reviewerNotes,
  onKpisConfirmedChange,
  onReviewerNotesChange,
}: {
  packageTier: PackageTier;
  kpis: KPIs;
  apKpis: APKpis;
  inventoryKpis: InventoryKpis;
  fixedAssetKpis: FixedAssetKpis;
  netMargin: number;
  kpisConfirmed: boolean;
  reviewerNotes: string;
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
    { label: "AP Aging Total", value: formatMoney(apKpis.total) },
    ...(isProfessionalOrHigher(packageTier)
      ? [{ label: "Inventory Value", value: formatMoney(inventoryKpis.totalValue) }]
      : []),
    ...(isVirtualCfo(packageTier)
      ? [{ label: "Fixed Assets", value: formatMoney(fixedAssetKpis.totalFixedAssets) }]
      : []),
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
            {uploadedReportsCount} of {totalReportsCount} selected-package reports uploaded.
          </p>
          {!canGeneratePackage && (
            <p className="mt-2 text-sm text-[#94A3B8]">
              {missingReports.length > 0
                ? "Upload all required reports to generate this package."
                : "Review and confirm KPIs before generating the financial package."}
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
                  ? "No selected-package reports missing"
                  : `Missing: ${missingReports.map((report) => report.label).join(", ")}`
              }
            />
            <ReadinessChecklistItem
              complete={isPackageGenerated}
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
}: {
  label: string;
  value: number;
  percent?: boolean;
  plain?: boolean;
}) {
  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-[#243041] bg-[#172033] p-5 shadow-lg shadow-black/10">
      <p className="text-sm text-slate-400">{label}</p>
      <h3 className="mt-2 text-3xl font-bold">
        {plain ? value.toLocaleString() : percent ? `${value.toFixed(1)}%` : formatMoney(value)}
      </h3>
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
      <p className="text-sm text-slate-400">{title}</p>
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
        <thead className="text-slate-400">
          <tr>
            <th className="py-2">Item</th>
            <th className="py-2">Qty</th>
            <th className="py-2">Value</th>
          </tr>
        </thead>
        <tbody>
          {items.length > 0 ? (
            items.map((item, index) => (
              <tr key={`${item.name}-${index}`} className="border-t border-slate-800">
                <td className="py-2 text-slate-300">{item.name}</td>
                <td className="py-2">{item.quantity.toLocaleString()}</td>
                <td className="py-2">{formatMoney(item.value)}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td className="py-2 text-slate-400" colSpan={3}>
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

function FixedAssetAnalysisSection({ fixedAssetKpis }: { fixedAssetKpis: FixedAssetKpis }) {
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
        <KpiCard label="Depreciation Expense" value={fixedAssetKpis.depreciationExpense} />
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
        <p className="text-slate-300">
          Prior period fixed asset report required to identify significant changes.
        </p>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-slate-400">
          <li>Additions</li>
          <li>Disposals</li>
          <li>Depreciation change</li>
          <li>Net book value change</li>
        </ul>
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
                <td className="px-4 py-3 font-semibold">{formatMoney(match.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
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
          <span className="text-sm text-slate-400">Dollar Threshold</span>
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
          <span className="text-sm text-slate-400">Percentage Threshold</span>
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
          <span className="text-sm text-slate-400">Threshold Logic</span>
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
          <span className="text-sm text-slate-300">Include zero-to-activity changes</span>
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
  topExpenseRows,
  ratioRows,
  monthFluxRows,
  quarterFluxRows,
  yearFluxRows,
}: {
  packageTier: PackageTier;
  companyName: string;
  reportPeriod: string;
  kpis: KPIs;
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
  topExpenseRows: StatementRow[];
  ratioRows: Array<{ name: string; formula: string; value: string; interpretation: string }>;
  monthFluxRows: FluxRow[];
  quarterFluxRows: FluxRow[];
  yearFluxRows: FluxRow[];
}) {
  const plRows = getStatementRows(plData);
  const bsRows = getStatementRows(bsData);

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
            <PrintKpiCard label="AP Aging Total" value={formatMoney(apKpis.total)} />
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
        <h1>AR and AP Aging</h1>
        <p>{arData ? "AR Aging report uploaded." : "AR Aging report required."}</p>
        <p>{apData ? "AP Aging report uploaded." : "AP Aging report required."}</p>
        <table className="print-table">
          <tbody>
            <tr>
              <td>Accounts Payable Total</td>
              <td>{formatMoney(apKpis.total)}</td>
            </tr>
            <tr>
              <td>Current AP</td>
              <td>{formatMoney(apKpis.current)}</td>
            </tr>
            <tr>
              <td>1-30 Days</td>
              <td>{formatMoney(apKpis.days1To30)}</td>
            </tr>
            <tr>
              <td>31-60 Days</td>
              <td>{formatMoney(apKpis.days31To60)}</td>
            </tr>
            <tr>
              <td>61-90 Days</td>
              <td>{formatMoney(apKpis.days61To90)}</td>
            </tr>
            <tr>
              <td>90+ Days</td>
              <td>{formatMoney(apKpis.days90Plus)}</td>
            </tr>
          </tbody>
        </table>
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
          <section className="print-page">
            <h1>Inventory Summary</h1>
            <p>
              {inventoryData
                ? "Inventory valuation detail from the uploaded Inventory Valuation report."
                : "Inventory Valuation report required."}
            </p>
            <table className="print-table">
              <tbody>
                <tr>
                  <td>Total Inventory Value</td>
                  <td>{formatMoney(inventoryKpis.totalValue)}</td>
                </tr>
                <tr>
                  <td>Total Quantity on Hand</td>
                  <td>{inventoryKpis.totalQuantity.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
            <h2>Top 5 Inventory Items by Value</h2>
            <InventoryPrintTable items={inventoryKpis.topByValue} />
            <h2>Top 5 Inventory Items by Quantity</h2>
            <InventoryPrintTable items={inventoryKpis.topByQuantity} />
          </section>

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
          <section className="print-page">
            <h1>Fixed Asset Analysis</h1>
            <p>
              {fixedAssetData
                ? "Fixed asset detail from the uploaded Fixed Asset report."
                : "Fixed Asset report required."}
            </p>
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
                  <td>{formatMoney(fixedAssetKpis.depreciationExpense)}</td>
                </tr>
              </tbody>
            </table>
          </section>

          <PrintFluxSection title="Flux Analysis Executive Summary" rows={monthFluxRows} />
          <PrintFluxSection title="Month-over-Month Flux Analysis" rows={monthFluxRows} />
          <PrintFluxSection title="Quarter-over-Quarter Flux Analysis" rows={quarterFluxRows} />
          <PrintFluxSection title="Year-over-Year Flux Analysis" rows={yearFluxRows} />

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
          const rowType = getStatementRowType(row.label);

          return (
            <tr key={`${row.label}-${index}`} className={`print-statement-${rowType}`}>
              <td>{row.label}</td>
              <td>{formatMoney(row.amount || 0)}</td>
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
              <td>{item.quantity.toLocaleString()}</td>
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

  return (
    <div className="mt-10 rounded-3xl bg-slate-900 p-8">
      <h2 className="mb-2 text-2xl font-bold">{title}</h2>
      <p className="mb-4 text-sm text-slate-400">
        File: {data.name} | Rows detected: {data.rows.length}
      </p>
      <div className="overflow-x-auto rounded-xl border border-slate-700">
        <table className="w-full text-left text-sm">
          <tbody>
            {data.rows.slice(0, 25).map((row, rowIndex) => (
              <tr key={rowIndex} className="border-b border-slate-800">
                {row.slice(0, 8).map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-4 py-2 text-slate-300">
                    {String(cell || "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}