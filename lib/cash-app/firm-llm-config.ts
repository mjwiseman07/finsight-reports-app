export interface FirmLlmConfig {
  layer2EscalationThreshold: number;
  layer2LlmPrimaryTier: "primary" | "toptier" | "haiku";
  layer2LlmEscalationTier: "primary" | "toptier" | "haiku";
  crossTenantPatternContributionEnabled: boolean;
}

const DEFAULT_FIRM_LLM_CONFIG: FirmLlmConfig = {
  layer2EscalationThreshold: 0.75,
  layer2LlmPrimaryTier: "primary",
  layer2LlmEscalationTier: "toptier",
  crossTenantPatternContributionEnabled: true,
};

interface FirmLlmConfigRow {
  layer2_escalation_threshold: number | null;
  layer2_llm_primary_tier: string | null;
  layer2_llm_escalation_tier: string | null;
  cross_tenant_pattern_contribution_enabled: boolean | null;
}

export async function getFirmLlmConfig(
  supabase: { from: (table: string) => unknown },
  tenantId: { firmId: string; companyId: string },
): Promise<FirmLlmConfig> {
  const query = supabase.from("firm_llm_config") as {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        eq: (col: string, val: string) => {
          maybeSingle: () => Promise<{ data: FirmLlmConfigRow | null; error: unknown }>;
        };
      };
    };
  };

  const { data, error } = await query
    .select(
      "layer2_escalation_threshold, layer2_llm_primary_tier, layer2_llm_escalation_tier, cross_tenant_pattern_contribution_enabled",
    )
    .eq("firm_id", tenantId.firmId)
    .eq("company_id", tenantId.companyId)
    .maybeSingle();

  if (error || !data) {
    return DEFAULT_FIRM_LLM_CONFIG;
  }

  const primaryTier = data.layer2_llm_primary_tier ?? DEFAULT_FIRM_LLM_CONFIG.layer2LlmPrimaryTier;
  const escalationTier =
    data.layer2_llm_escalation_tier ?? DEFAULT_FIRM_LLM_CONFIG.layer2LlmEscalationTier;

  return {
    layer2EscalationThreshold:
      data.layer2_escalation_threshold ?? DEFAULT_FIRM_LLM_CONFIG.layer2EscalationThreshold,
    layer2LlmPrimaryTier: primaryTier as FirmLlmConfig["layer2LlmPrimaryTier"],
    layer2LlmEscalationTier: escalationTier as FirmLlmConfig["layer2LlmEscalationTier"],
    crossTenantPatternContributionEnabled:
      data.cross_tenant_pattern_contribution_enabled ??
      DEFAULT_FIRM_LLM_CONFIG.crossTenantPatternContributionEnabled,
  };
}
