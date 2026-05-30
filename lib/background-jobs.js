export const backgroundJobTypes = [
  "PDF generation",
  "PowerPoint generation",
  "Weekly Executive Brief",
  "Monthly Executive Package",
  "AI Commentary Generation",
  "Forecast Generation",
  "Oversight Review",
];

export const backgroundJobStatuses = [
  "Scheduled",
  "Queued",
  "Processing",
  "Awaiting Approval",
  "Sent",
  "Failed",
];

export function buildBackgroundJob({
  jobType,
  companyId,
  personaMode = "Business Owner",
  packageLevel = "Virtual CFO",
  status = "Scheduled",
  metadata = {},
}) {
  return {
    job_type: jobType,
    status,
    company_id: companyId,
    persona_mode: personaMode,
    package_level: packageLevel,
    metadata,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export function buildInitialBackgroundJobs() {
  return [
    buildBackgroundJob({
      jobType: "PDF generation",
      companyId: "demo-manufacturing",
      status: "Scheduled",
      metadata: { source: "super_admin_seed" },
    }),
    buildBackgroundJob({
      jobType: "PowerPoint generation",
      companyId: "demo-construction",
      personaMode: "Controller",
      packageLevel: "Professional",
      status: "Queued",
      metadata: { source: "super_admin_seed" },
    }),
    buildBackgroundJob({
      jobType: "Weekly Executive Brief",
      companyId: "demo-healthcare",
      personaMode: "Bookkeeper",
      packageLevel: "Essential",
      status: "Processing",
      metadata: { source: "super_admin_seed" },
    }),
    buildBackgroundJob({
      jobType: "Monthly Executive Package",
      companyId: "demo-professional-services",
      personaMode: "Fractional CFO",
      status: "Awaiting Approval",
      metadata: { source: "super_admin_seed" },
    }),
    buildBackgroundJob({
      jobType: "AI Commentary Generation",
      companyId: "demo-manufacturing",
      status: "Sent",
      metadata: { source: "super_admin_seed" },
    }),
    buildBackgroundJob({
      jobType: "Forecast Generation",
      companyId: "demo-construction",
      personaMode: "Controller",
      packageLevel: "Professional",
      status: "Scheduled",
      metadata: { source: "super_admin_seed" },
    }),
    buildBackgroundJob({
      jobType: "Oversight Review",
      companyId: "demo-professional-services",
      personaMode: "Fractional CFO",
      status: "Failed",
      metadata: { source: "super_admin_seed", demo_failure: true },
      error_message: "Demo failure for failed-job visibility testing.",
    }),
  ];
}
