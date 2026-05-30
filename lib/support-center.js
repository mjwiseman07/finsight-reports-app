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
  };
}
