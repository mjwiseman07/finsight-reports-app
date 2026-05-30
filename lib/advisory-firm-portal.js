export const firmPortalAudience = [
  "Accounting Firms",
  "Bookkeepers",
  "Controllers",
  "Fractional CFO Firms",
];

export const firmPortalRoles = [
  {
    role: "firm_admin",
    label: "Firm Admin",
    permissions: ["manage_clients", "manage_team", "view_all_clients", "approve_deliveries"],
  },
  {
    role: "bookkeeper",
    label: "Bookkeeper",
    permissions: ["view_assigned_clients", "manage_bookkeeper_view", "complete_review_items"],
  },
  {
    role: "controller",
    label: "Controller",
    permissions: ["view_assigned_clients", "manage_controller_view", "approve_review_items"],
  },
  {
    role: "fractional_cfo",
    label: "Fractional CFO",
    permissions: ["view_assigned_clients", "manage_cfo_view", "approve_executive_commentary"],
  },
];

export const firmClientPersonaViews = [
  "Bookkeeper View",
  "Controller View",
  "Fractional CFO View",
  "Owner View",
];

export const firmPackageLevels = ["Essential", "Professional", "Virtual CFO"];

export const firmPricingBands = [
  {
    id: "starter-firm",
    label: "Starter Firm",
    clientRange: "Up to 25 Clients",
    pricing: {
      Essential: "$199/month",
      Professional: "$499/month",
      "Virtual CFO": "$1,499/month",
    },
  },
  {
    id: "growth-firm",
    label: "Growth Firm",
    clientRange: "26-100 Clients",
    pricing: {
      Essential: "$399/month",
      Professional: "$999/month",
      "Virtual CFO": "$2,999/month",
    },
  },
  {
    id: "enterprise",
    label: "Enterprise",
    clientRange: "101+ Clients",
    pricing: {
      Essential: "Custom Pricing",
      Professional: "Custom Pricing",
      "Virtual CFO": "Contact Sales",
    },
  },
];

export function getFirmPricingBand(totalClients = 0) {
  if (totalClients <= 25) return firmPricingBands[0];
  if (totalClients <= 100) return firmPricingBands[1];
  return firmPricingBands[2];
}

export const firmDeliveryStatuses = [
  "Scheduled",
  "Queued",
  "Processing",
  "Awaiting Approval",
  "Sent",
  "Failed",
];

export const firmReviewQueueTypes = [
  "Flux Review Required",
  "Reserve Review Required",
  "Accrual Review Required",
  "Executive Commentary Approval Required",
];

export const firmHealthStatuses = [
  {
    status: "Healthy",
    description: "No major portfolio warnings; package and delivery activity is current.",
  },
  {
    status: "Moderate Review",
    description: "Some risk factors or outstanding review items need attention.",
  },
  {
    status: "Needs Attention",
    description: "Multiple risk factors, failed deliveries, stale reviews, or health score pressure.",
  },
];

export const firmHealthScoringFactors = [
  "reserve concerns",
  "cash concerns",
  "payroll trends",
  "inventory issues",
  "stale balances",
  "liquidity pressure",
];

export const firmFuturePreparationAreas = [
  "client benchmarking",
  "firm benchmarking",
  "client profitability",
  "client utilization",
  "advisory workflow automation",
];

export const firmAiMemoryBoundaries = {
  principle: "Client-specific AI memory must never mix clients.",
  allowedMemory: [
    "client context",
    "historical package trends",
    "prior executive summaries",
    "recurring concerns",
    "operational trends",
  ],
  isolationRule:
    "Every memory read/write must be scoped by firm_id and client_id after firm membership authorization.",
};

export function normalizeFirmClient(row = {}) {
  return {
    id: row.id,
    name: row.name || row.client_name || "Unnamed Client",
    group: row.group_name || row.group || "Ungrouped",
    packageLevel: row.package_level || row.packageLevel || "Essential",
    subscriptionStatus: row.subscription_status || row.subscriptionStatus || "active",
    healthStatus: row.health_status || row.healthStatus || "Moderate Review",
    healthScore: Number(row.health_score ?? row.healthScore ?? 75),
    lastPackageGenerated: row.last_package_generated || row.lastPackageGenerated || "Not generated",
    lastLogin: row.last_login || row.lastLogin || "No recent login",
    outstandingReviewItems: Number(row.outstanding_review_items ?? row.outstandingReviewItems ?? 0),
    upcomingDeliveries: Number(row.upcoming_deliveries ?? row.upcomingDeliveries ?? 0),
    weeklyBriefStatus: row.weekly_brief_status || row.weeklyBriefStatus || "Scheduled",
    monthlyPackageStatus: row.monthly_package_status || row.monthlyPackageStatus || "Scheduled",
    quarterlyReviewStatus: row.quarterly_review_status || row.quarterlyReviewStatus || "Scheduled",
    ownerVisibilityRestricted: row.owner_visibility_restricted ?? row.ownerVisibilityRestricted ?? true,
    reviewItems: Array.isArray(row.review_items) ? row.review_items : [],
    personaViews: Array.isArray(row.persona_views) ? row.persona_views : firmClientPersonaViews,
  };
}

export function calculateFirmKpis(clients = []) {
  const packageCounts = clients.reduce(
    (counts, client) => {
      counts[client.packageLevel] = (counts[client.packageLevel] || 0) + 1;
      return counts;
    },
    {},
  );

  const pricingBand = getFirmPricingBand(clients.length);

  return {
    totalClients: clients.length,
    clientsByPackage: packageCounts,
    firmPricingBand: pricingBand,
    activeExecutiveDeliveries: clients.reduce((total, client) => total + client.upcomingDeliveries, 0),
    openReviewItems: clients.reduce((total, client) => total + client.outstandingReviewItems, 0),
    upcomingMonthlyPackages: clients.filter((client) => client.monthlyPackageStatus === "Scheduled").length,
  };
}

export function buildFirmReviewQueue(clients = []) {
  return clients.flatMap((client) => {
    const reviewItems = client.reviewItems.length
      ? client.reviewItems
      : client.outstandingReviewItems > 0
        ? firmReviewQueueTypes.slice(0, Math.min(client.outstandingReviewItems, firmReviewQueueTypes.length))
        : [];

    return reviewItems.map((item, index) => ({
      id: `${client.id}-${index}`,
      clientId: client.id,
      clientName: client.name,
      type: typeof item === "string" ? item : item.type || "Review Required",
      status: typeof item === "string" ? "open" : item.status || "open",
      priority: client.healthStatus === "Needs Attention" ? "high" : "normal",
    }));
  });
}
