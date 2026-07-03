/**
 * ERPAdapter — abstract shape any ERP integration must satisfy.
 * QBO adapter satisfies this today; Xero, NetSuite, Sage will implement
 * this interface in Doc E and beyond.
 *
 * D1.1 introduces this as a stub for structure only. The QBO adapter does NOT
 * fully implement it yet — that lands in D2. Concrete payload types below are
 * placeholders replaced with real definitions in D2+.
 */
export interface ERPAdapter {
  readonly provider: "quickbooks" | "xero" | "netsuite" | "sage";

  // Read
  getCompanyInfo(firmClientId: string): Promise<CompanyInfo>;
  getAccounts(firmClientId: string): Promise<Account[]>;
  getTransactions(firmClientId: string, params: TxQuery): Promise<Transaction[]>;
  getReport(firmClientId: string, reportName: string, params: ReportParams): Promise<ReportResult>;

  // Write (stubs — D2 fills in for QBO)
  postJournalEntry?(firmClientId: string, entry: JournalEntryInput): Promise<JournalEntryResult>;
  voidJournalEntry?(firmClientId: string, jeId: string): Promise<void>;

  // Health
  checkHealth(firmClientId: string): Promise<HealthResult>;
  canWrite(firmClientId: string): Promise<WritePreflightResult>;
}

// Stub type re-exports — real definitions live in D2+
export type CompanyInfo = Record<string, unknown>;
export type Account = Record<string, unknown>;
export type Transaction = Record<string, unknown>;
export type TxQuery = Record<string, unknown>;
export type ReportParams = Record<string, unknown>;
export type ReportResult = Record<string, unknown>;
export type JournalEntryInput = Record<string, unknown>;
export type JournalEntryResult = Record<string, unknown>;
export type HealthResult = Record<string, unknown>;
export type WritePreflightResult = Record<string, unknown>;
