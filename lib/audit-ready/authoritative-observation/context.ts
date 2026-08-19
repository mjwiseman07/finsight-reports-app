/**
 * CC-2A4 context loader.
 *
 * Resolves engagement, company, connection identity, period, control-account
 * bindings, tie-out policy, and one classified PBC per AR/AP/Inventory kind.
 * Write authority is resolved for input.engagementId from a VERIFIED user id.
 * A cached EngagementActor.canWrite from another engagement is not authority.
 * Does not read the provider. Does not refresh tokens.
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { selectAccountingConnectionForActiveContext } from "@/lib/integrations/accounting/connection-selection";
import type { PolicySnapshot } from "@/lib/audit-ready/tie-out/policy";
import type { ArAcquisitionConnection } from "@/lib/audit-ready/measurement-snapshots/acquisition";
import { asIsoDate } from "@/lib/audit-ready/measurement-snapshots/validate";
import {
  resolveEngagementActorForVerifiedUser,
  type EngagementActor,
} from "@/lib/audit-ready/server-auth";
import {
  assertNoTriggeredByImpersonation,
  requireEngagementWriteActor,
  requireVerifiedUserPrincipal,
} from "./principal";
import {
  AUTHORITATIVE_OBSERVATION_ERROR,
  AuthoritativeObservationError,
  type AuthoritativeObservationContext,
  type AuthoritativeObservationExecutionContext,
  type AuthoritativeObservationInput,
} from "./types";

export type EngagementAuthorityRow = {
  id: string;
  company_id: string | null;
  firm_id: string | null;
  firm_client_id: string | null;
  audit_period_end: string | null;
  ar_control_qbo_account_id: string | null;
  ap_control_qbo_account_id: string | null;
  inventory_control_qbo_account_id: string | null;
};

export type PbcAuthorityRow = {
  id: string;
  engagement_id: string;
  tie_out_kind: string | null;
};

export type AuthoritativeContextDeps = {
  loadEngagement: (engagementId: string) => Promise<EngagementAuthorityRow | null>;
  authorize: (args: {
    engagementId: string;
    userId: string;
  }) => Promise<EngagementActor | null>;
  loadFirmClientCompanyId: (firmClientId: string) => Promise<string | null>;
  loadPolicy: (
    engagementId: string,
  ) => Promise<(PolicySnapshot & { policy_mode: string }) | null>;
  loadPbcs: (engagementId: string) => Promise<PbcAuthorityRow[]>;
  selectConnection: (args: {
    userId: string;
    companyId: string;
  }) => Promise<ArAcquisitionConnection | null>;
};

function monthStartFromAsOf(asOfDate: string): string {
  return `${asIsoDate(asOfDate).slice(0, 7)}-01`;
}

function requireText(value: string | null | undefined): string {
  return String(value || "").trim();
}

function pickUniquePbc(args: {
  rows: PbcAuthorityRow[];
  engagementId: string;
  kind: "ar_aging" | "ap_aging" | "inventory";
  missingCode: string;
  ambiguousCode: string;
  callerId?: string;
}): string {
  const matches = args.rows.filter(
    (row) =>
      row.engagement_id === args.engagementId &&
      String(row.tie_out_kind || "") === args.kind,
  );
  if (matches.length === 0) {
    throw new AuthoritativeObservationError(
      args.missingCode,
      `No classified ${args.kind} PBC request exists for this engagement.`,
      "context",
    );
  }
  if (matches.length > 1) {
    throw new AuthoritativeObservationError(
      args.ambiguousCode,
      `Multiple classified ${args.kind} PBC requests exist; refuse to guess.`,
      "context",
    );
  }
  const resolvedId = matches[0].id;
  const callerId = requireText(args.callerId);
  if (callerId && callerId !== resolvedId) {
    throw new AuthoritativeObservationError(
      AUTHORITATIVE_OBSERVATION_ERROR.PBC_CALLER_MISMATCH,
      `Caller-supplied ${args.kind} PBC id does not match the resolved engagement PBC.`,
      "context",
    );
  }
  return resolvedId;
}

export async function createDefaultAuthoritativeContextDeps(): Promise<AuthoritativeContextDeps> {
  const supabase = getSupabaseAdmin();
  return {
    async loadEngagement(engagementId) {
      const { data, error } = await supabase
        .from("audit_ready_engagements")
        .select(
          "id, company_id, firm_id, firm_client_id, audit_period_end, " +
            "ar_control_qbo_account_id, ap_control_qbo_account_id, inventory_control_qbo_account_id",
        )
        .eq("id", engagementId)
        .maybeSingle();
      if (error) throw error;
      if (!data?.id) return null;
      return data as EngagementAuthorityRow;
    },
    async authorize({ engagementId, userId }) {
      return resolveEngagementActorForVerifiedUser({ engagementId, userId });
    },
    async loadFirmClientCompanyId(firmClientId) {
      const { data } = await supabase
        .from("firm_clients")
        .select("company_id")
        .eq("id", firmClientId)
        .maybeSingle();
      return data?.company_id ? String(data.company_id) : null;
    },
    async loadPolicy(engagementId) {
      const { data } = await supabase
        .from("audit_ready_tie_out_policies")
        .select(
          "policy_mode, auto_reconcile_max_dollar, auto_reconcile_max_percent, kickout_min_dollar, kickout_min_percent, authoritative_comparison",
        )
        .eq("engagement_id", engagementId)
        .maybeSingle();
      if (!data) return null;
      return data as PolicySnapshot & { policy_mode: string };
    },
    async loadPbcs(engagementId) {
      const { data, error } = await supabase
        .from("audit_ready_pbc_requests")
        .select("id, engagement_id, tie_out_kind")
        .eq("engagement_id", engagementId);
      if (error) throw error;
      return (data || []) as PbcAuthorityRow[];
    },
    async selectConnection({ userId, companyId }) {
      const connection = await selectAccountingConnectionForActiveContext({
        supabase,
        userId,
        companyId,
        sourceSystem: "quickbooks",
      });
      if (!connection) return null;
      return {
        id: connection.id,
        user_id: connection.user_id,
        provider: connection.provider,
        tenant_or_realm_id: connection.tenant_or_realm_id ?? null,
        external_entity_id: connection.external_entity_id ?? null,
        external_entity_name: connection.external_entity_name ?? null,
        access_token: connection.access_token ?? null,
        metadata_json: connection.metadata_json ?? null,
      };
    },
  };
}

function isCompleteContextDeps(
  deps?: Partial<AuthoritativeContextDeps>,
): deps is AuthoritativeContextDeps {
  return Boolean(
    deps?.loadEngagement &&
      deps.authorize &&
      deps.loadFirmClientCompanyId &&
      deps.loadPolicy &&
      deps.loadPbcs &&
      deps.selectConnection,
  );
}

export async function loadAuthoritativeObservationContext(
  input: AuthoritativeObservationInput,
  executionContext: AuthoritativeObservationExecutionContext,
  deps?: Partial<AuthoritativeContextDeps>,
): Promise<AuthoritativeObservationContext> {
  const identity = requireVerifiedUserPrincipal(executionContext);
  assertNoTriggeredByImpersonation(input, identity.userId);

  const resolved: AuthoritativeContextDeps = isCompleteContextDeps(deps)
    ? deps
    : {
        ...(await createDefaultAuthoritativeContextDeps()),
        ...deps,
      };

  const engagement = await resolved.loadEngagement(input.engagementId);
  if (!engagement) {
    throw new AuthoritativeObservationError(
      AUTHORITATIVE_OBSERVATION_ERROR.ENGAGEMENT_NOT_FOUND,
      "Engagement was not found.",
      "context",
    );
  }

  const actor = requireEngagementWriteActor({
    verifiedUserId: identity.userId,
    actor: await resolved.authorize({
      engagementId: input.engagementId,
      userId: identity.userId,
    }),
  });

  let companyId = requireText(engagement.company_id);
  if (!companyId && engagement.firm_client_id) {
    companyId = requireText(
      await resolved.loadFirmClientCompanyId(engagement.firm_client_id),
    );
  }
  if (!companyId) {
    throw new AuthoritativeObservationError(
      AUTHORITATIVE_OBSERVATION_ERROR.COMPANY_UNRESOLVED,
      "Engagement company could not be resolved.",
      "context",
    );
  }

  const periodRaw = requireText(engagement.audit_period_end);
  if (!periodRaw) {
    throw new AuthoritativeObservationError(
      AUTHORITATIVE_OBSERVATION_ERROR.CLOSE_PERIOD_UNRESOLVED,
      "engagement.audit_period_end is required close-period authority.",
      "context",
    );
  }
  const periodEnd = asIsoDate(periodRaw);
  const callerPeriod = requireText(input.closePeriodEnd);
  if (callerPeriod && asIsoDate(callerPeriod) !== periodEnd) {
    throw new AuthoritativeObservationError(
      AUTHORITATIVE_OBSERVATION_ERROR.CLOSE_PERIOD_MISMATCH,
      "Caller closePeriodEnd does not match engagement.audit_period_end.",
      "context",
    );
  }

  const arAccountId = requireText(engagement.ar_control_qbo_account_id);
  if (!arAccountId) {
    throw new AuthoritativeObservationError(
      AUTHORITATIVE_OBSERVATION_ERROR.AR_ACCOUNT_ID_REQUIRED,
      "engagement.ar_control_qbo_account_id is required.",
      "context",
    );
  }
  const apAccountId = requireText(engagement.ap_control_qbo_account_id);
  if (!apAccountId) {
    throw new AuthoritativeObservationError(
      AUTHORITATIVE_OBSERVATION_ERROR.AP_ACCOUNT_ID_REQUIRED,
      "engagement.ap_control_qbo_account_id is required.",
      "context",
    );
  }
  const inventoryAccountId = requireText(engagement.inventory_control_qbo_account_id);
  if (!inventoryAccountId) {
    throw new AuthoritativeObservationError(
      AUTHORITATIVE_OBSERVATION_ERROR.INVENTORY_ACCOUNT_ID_REQUIRED,
      "engagement.inventory_control_qbo_account_id is required.",
      "context",
    );
  }

  const policy = await resolved.loadPolicy(input.engagementId);
  if (!policy) {
    throw new AuthoritativeObservationError(
      AUTHORITATIVE_OBSERVATION_ERROR.NO_TOLERANCE_POLICY,
      "audit_ready_tie_out_policies row is required.",
      "context",
    );
  }

  const pbcs = await resolved.loadPbcs(input.engagementId);
  const pbcRequestIds = {
    ar: pickUniquePbc({
      rows: pbcs,
      engagementId: input.engagementId,
      kind: "ar_aging",
      missingCode: AUTHORITATIVE_OBSERVATION_ERROR.MISSING_PBC_AR,
      ambiguousCode: AUTHORITATIVE_OBSERVATION_ERROR.AMBIGUOUS_PBC_AR,
      callerId: input.pbcRequestIds?.ar,
    }),
    ap: pickUniquePbc({
      rows: pbcs,
      engagementId: input.engagementId,
      kind: "ap_aging",
      missingCode: AUTHORITATIVE_OBSERVATION_ERROR.MISSING_PBC_AP,
      ambiguousCode: AUTHORITATIVE_OBSERVATION_ERROR.AMBIGUOUS_PBC_AP,
      callerId: input.pbcRequestIds?.ap,
    }),
    inventory: pickUniquePbc({
      rows: pbcs,
      engagementId: input.engagementId,
      kind: "inventory",
      missingCode: AUTHORITATIVE_OBSERVATION_ERROR.MISSING_PBC_INVENTORY,
      ambiguousCode: AUTHORITATIVE_OBSERVATION_ERROR.AMBIGUOUS_PBC_INVENTORY,
      callerId: input.pbcRequestIds?.inventory,
    }),
  };

  const connection = await resolved.selectConnection({
    userId: actor.userId,
    companyId,
  });
  if (!connection?.id) {
    throw new AuthoritativeObservationError(
      AUTHORITATIVE_OBSERVATION_ERROR.CONNECTION_NOT_FOUND,
      "No authoritative QuickBooks connection for this engagement company.",
      "context",
    );
  }

  const tenantOrRealmId = requireText(
    connection.tenant_or_realm_id || connection.external_entity_id,
  );
  if (!tenantOrRealmId) {
    throw new AuthoritativeObservationError(
      AUTHORITATIVE_OBSERVATION_ERROR.CONNECTION_NOT_FOUND,
      "Resolved connection is missing realm/tenant identity.",
      "context",
    );
  }

  return {
    engagementId: input.engagementId,
    companyId,
    actor,
    triggeredByUserId: actor.userId,
    connectionId: connection.id,
    provider: String(connection.provider),
    tenantOrRealmId,
    periodEnd,
    reportPeriod: {
      startDate: monthStartFromAsOf(periodEnd),
      endDate: periodEnd,
    },
    arAccountId,
    apAccountId,
    inventoryAccountId,
    policy,
    pbcRequestIds,
    acquisitionConnection: connection,
  };
}
