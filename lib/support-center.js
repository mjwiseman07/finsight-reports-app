export const supportTicketCategories = [
  "Onboarding",
  "Login / Access",
  "QuickBooks Connection",
  "Xero Connection",
  "NetSuite Connection",
  "Sage Connection",
  "Microsoft Dynamics Connection",
  "Report Generation",
  "Executive Packages",
  "AI Assistant",
  "Weekly Executive Briefs",
  "Billing",
  "Feature Request",
  "Bug Report",
  "Other",
];

export const supportTicketPriorities = ["Low", "Normal", "High", "Critical"];

export const supportTicketStatuses = ["Open", "In Progress", "Waiting On Customer", "Resolved", "Closed"];

export const supportTicketTypes = {
  featureRequest: "Feature Request",
  bugReport: "Bug Report",
  supportIssue: "Support Issue",
};

export const aiSupportAssistantArchitecture = {
  status: "planned",
  step: "Ask Advisacor Support AI before ticket submission",
  scope: ["onboarding questions", "setup questions", "package questions", "report questions"],
  fallback: "If unresolved, submit support ticket with AI context attached.",
};

export function getSupportTicketType(category = "") {
  if (category === "Feature Request") return supportTicketTypes.featureRequest;
  if (category === "Bug Report") return supportTicketTypes.bugReport;
  return supportTicketTypes.supportIssue;
}

export function normalizeSupportTicket(row = {}) {
  return {
    id: row.id,
    ticketNumber: row.ticket_number || row.ticketNumber,
    category: row.category || "Other",
    type: row.ticket_type || row.type || getSupportTicketType(row.category),
    priority: row.priority || "Normal",
    status: row.status || "Open",
    subject: row.subject || "",
    description: row.description || "",
    userEmail: row.user_email || row.userEmail || "",
    companyName: row.company_name || row.companyName || "",
    packageLevel: row.package_level || row.packageLevel || "",
    persona: row.persona || "",
    assignedTo: row.assigned_to || row.assignedTo || "",
    adminNotes: row.admin_notes || row.adminNotes || "",
    attachmentMetadata: row.attachment_metadata || row.attachmentMetadata || {},
    notificationSent: Boolean(row.notification_sent ?? row.notificationSent),
    createdAt: row.created_at || row.createdAt || "",
    updatedAt: row.updated_at || row.updatedAt || "",
    qboRealmId: row.qbo_realm_id || row.qboRealmId || null,
    lastIntuitTid: row.last_intuit_tid || row.lastIntuitTid || null,
    correlationId: row.correlation_id || row.correlationId || null,
  };
}

export const supportSlaCommitments = [
  {
    severity: "Critical",
    definition: "Production down, data at risk, or blocking a customer close cycle",
    responseTime: "Within 4 business hours of ticket submission",
  },
  {
    severity: "High",
    definition: "Functional but significantly degraded workflow",
    responseTime: "Within 1 business day of ticket submission",
  },
  {
    severity: "Standard",
    definition: "Question, feature request, or non-blocking issue",
    responseTime: "Within 2 business days of ticket submission",
  },
];

export const supportFaqEntries = [
  {
    question: "How do I connect my QuickBooks Online company to Advisacor?",
    answer:
      "From your dashboard, click \"Connect QuickBooks\" and complete the Intuit OAuth flow. Advisacor requests only the scopes it needs and will not access data beyond the connected company. You can disconnect at any time from Account → Integrations.",
  },
  {
    question: "What QuickBooks Online editions does Advisacor support?",
    answer:
      "Advisacor supports Simple Start, Essentials, Plus, and Advanced. Features that require Plus or Advanced (Classes, Locations, Projects, Custom Fields) are automatically disabled when your connected company is on a lower edition.",
  },
  {
    question: "What data does Advisacor read from QuickBooks Online?",
    answer:
      "Advisacor reads accounts, journal entries, invoices, bills, payments, vendors, customers, items, deposits, transfers, and purchase orders from your connected QuickBooks Online company. See our Privacy Policy for the complete data-handling summary.",
  },
  {
    question: "Does Advisacor write data back to QuickBooks Online?",
    answer:
      "Advisacor can write proposed journal entries back to QuickBooks Online only after you or a firm reviewer explicitly approves them. Nothing is written automatically. Multi-currency writebacks include the CurrencyRef and ExchangeRate values the transaction requires.",
  },
  {
    question: "How often does Advisacor sync with QuickBooks Online?",
    answer:
      "Advisacor performs an automated Change Data Capture (CDC) sync once per hour per connected company. You can also trigger an on-demand sync from your dashboard.",
  },
  {
    question: "How do I set up multi-factor authentication (MFA) for my Advisacor account?",
    answer:
      "MFA is enforced on every Advisacor account. When you sign in for the first time, you will be prompted to enroll a TOTP authenticator app (Google Authenticator, Authy, 1Password, etc.) and download backup codes. You can re-enroll or view backup codes from Account → Security.",
  },
  {
    question: "How do I disconnect QuickBooks Online from Advisacor?",
    answer:
      "Go to Account → Integrations → QuickBooks Online → Disconnect. Advisacor will immediately revoke the OAuth tokens with Intuit and stop all CDC syncs on that connection. Your prior Advisacor review history is preserved and can be re-linked later if you reconnect the same company.",
  },
  {
    question: "How long does Advisacor retain my QuickBooks Online data after I disconnect?",
    answer:
      "On disconnect or subscription cancellation, customer data is purged within 30 days per our Privacy Policy. Audit logs (support ticket history, intuit_tid traces, error records) are retained for 90 days for troubleshooting.",
  },
  {
    question: "Where is my Advisacor data stored?",
    answer:
      "Advisacor is hosted on Vercel (US) with the database on Supabase (AWS us-east-2). All data is encrypted at rest (AES-256) and in transit (TLS 1.2+). No customer data leaves the United States.",
  },
  {
    question: "How do I get help if my review or QuickBooks Online connection is not working?",
    answer:
      "Submit a support ticket from this page. Advisacor automatically captures your account context, connected QuickBooks realm ID, browser, and the most recent intuit_tid from any Intuit API response, so our support team can diagnose your issue without a back-and-forth information exchange. See the \"Response time SLAs\" table above for how quickly we will respond.",
  },
];

export const supportSetupGuides = [
  {
    anchor: "connect-quickbooks",
    title: "Connecting your first QuickBooks Online company",
    summary:
      "Quick reference for the connect flow, required Intuit permissions, and what happens on the first sync.",
  },
  {
    anchor: "first-review",
    title: "Running your first review",
    summary:
      "How to trigger a review, what the review packet contains, and how to interpret findings.",
  },
  {
    anchor: "invite-team",
    title: "Inviting your firm or bookkeeping team",
    summary: "How to add team members with reviewer roles and set default review persona.",
  },
  {
    anchor: "recurring-briefings",
    title: "Setting up recurring executive briefings",
    summary:
      "How to configure delivery cadence, recipients, and format for the weekly Executive Brief.",
  },
];
