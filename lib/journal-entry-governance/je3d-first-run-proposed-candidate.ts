/**
 * JE-3D — First-run JE candidate (proposed only; not activation authority).
 *
 * Durable Demo A COA mirror evidence after controlled sandbox account setup.
 * Does NOT enable CREATE. Does NOT set FIRST_RUN_* approved constants.
 * ChatGPT must approve before any FIRST_RUN_* write or governance staging.
 */

export const JE_3D_FIRST_RUN_PROPOSED_CANDIDATE = {
  readOnly: true as const,
  autoSelectionPerformed: false as const,
  governanceRowsCreated: false as const,
  providerAttemptCreated: false as const,
  qboPostMade: false as const,
  qboGetMade: false as const,
  companyId: "aaaaaaaa-2222-4222-8222-222222222222",
  accountingConnectionId: "dfef5e96-e717-4e3e-afac-fde0de1b5b23",
  realmId: "9341457151063823",
  amountCents: 100,
  currency: "USD" as const,
  originType: "ACCRUAL" as const,
  reasonCode: "cutoff_accrual" as const,
  debit: {
    qboAccountId: "15",
    name: "Office Expenses",
    accountType: "Expense",
    accountSubtype: "OfficeGeneralAdministrativeExpenses",
    active: true,
  },
  credit: {
    qboAccountId: "1150040002",
    name: "Accrued Expenses - Advisacor Test",
    accountType: "Other Current Liability",
    accountSubtype: "OtherCurrentLiabilities",
    active: true,
  },
  /** txn date remains unresolved until close_periods custody exists */
  txnDate: null as string | null,
  recommendation:
    "CANDIDATE IDENTIFIED — ChatGPT must approve pair, then stage engagement/CC/period/SoD before CREATE enablement.",
} as const;
