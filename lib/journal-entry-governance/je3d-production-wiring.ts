/**
 * JE-3D — Production dependency wiring for controlled sandbox activation only.
 * Never selected unless activation guards pass. No legacy poster. No Memory.
 */

import { resolveEngagementActorForVerifiedUser } from "@/lib/audit-ready/server-auth";
import { loadEngagementFirmId, loadExactJournalEntryProposal } from "./approval-custody";
import { loadExactExecution } from "./provider-attempt-service";
import { loadProviderAttemptByExecutionId } from "./provider-attempt-repository";
import { resolveQBOTokenForAccountingConnection } from "@/lib/erp/quickbooks/token-resolver";
import { qboApiFetch } from "@/lib/qbo/api-fetch.js";
import {
  applyJournalEntryProviderDispatchStarted,
  applyJournalEntryProviderPosted,
  applyJournalEntryProviderPostUnknown,
} from "./provider-dispatch-repository";
import {
  postGovernedQboJournalEntryOnce,
  resolveGovernedQboWriteApiBase,
  type GovernedQboCreateFetchFn,
} from "./provider-qbo-create-transport";
import type { GovernedJeCreateOrchestrationDeps } from "./provider-create-orchestration";
import {
  applyJournalEntryVerificationMismatch,
  applyJournalEntryVerified,
} from "./provider-verification-repository";
import {
  confirmRealmBelongsToConnectionDefault,
  type GovernedJeVerificationDeps,
} from "./provider-verification-orchestration";
import { readJournalEntryById } from "./provider-qbo-read";
import { assertJe3dSandboxQboEnvironment } from "./je3d-sandbox-environment";
import { JE_3D_ACTIVATION_POLICY } from "./je3d-activation-policy";

export const governedSandboxQboFetchAdapter: GovernedQboCreateFetchFn = async (
  url,
  init,
) => {
  const result = await qboApiFetch(url, {
    accessToken: init.accessToken,
    method: init.method as "POST",
    body: init.body,
    throwOnError: init.throwOnError,
    context: init.context,
  });
  return {
    ok: result.ok,
    status: result.status,
    json: result.json,
    text: result.text,
    intuit_tid: result.intuit_tid,
    url: result.url,
    elapsed_ms: result.elapsed_ms,
  };
};

export function buildJe3dProductionCreateDeps(): GovernedJeCreateOrchestrationDeps {
  assertJe3dSandboxQboEnvironment();
  const apiBase = resolveGovernedQboWriteApiBase("sandbox");
  void JE_3D_ACTIVATION_POLICY.maxProviderPostsPerActivation;

  return {
    resolveActor: async (args) => {
      const actor = await resolveEngagementActorForVerifiedUser(args);
      if (!actor) {
        throw new Error("Engagement actor required for governed sandbox create.");
      }
      return actor;
    },
    loadExecution: loadExactExecution,
    loadProposal: loadExactJournalEntryProposal,
    loadAttempt: loadProviderAttemptByExecutionId,
    loadFirmId: async (engagementId) => {
      const firmId = await loadEngagementFirmId(engagementId);
      if (!firmId) {
        throw new Error("Engagement firm_id required for governed sandbox create.");
      }
      return firmId;
    },
    revalidateConnection: async (args) => {
      const { revalidateCanonicalExecutionConnection } = await import(
        "./provider-attempt-service"
      );
      return revalidateCanonicalExecutionConnection(args);
    },
    resolveToken: async (accountingConnectionId, opts) => {
      const bundle = await resolveQBOTokenForAccountingConnection(
        accountingConnectionId,
        opts,
      );
      if (!bundle) return null;
      return {
        accessToken: bundle.accessToken,
        realmId: bundle.realmId,
      };
    },
    applyDispatchStarted: (input) =>
      applyJournalEntryProviderDispatchStarted({
        ...input,
        expectedStatus: input.expectedStatus as "RESERVED",
      }),
    applyPosted: (input) =>
      applyJournalEntryProviderPosted({
        ...input,
        expectedStatus: input.expectedStatus as "REQUEST_STARTED",
      }),
    applyPostUnknown: (input) =>
      applyJournalEntryProviderPostUnknown({
        ...input,
        expectedStatus: input.expectedStatus as "REQUEST_STARTED",
      }),
    postOnce: async (args) =>
      postGovernedQboJournalEntryOnce({
        ...args,
        apiBase,
        fetchFn: governedSandboxQboFetchAdapter,
      }),
  };
}

export function buildJe3dProductionVerificationDeps(): GovernedJeVerificationDeps {
  assertJe3dSandboxQboEnvironment();

  return {
    resolveActor: async (args) => {
      const actor = await resolveEngagementActorForVerifiedUser(args);
      if (!actor) {
        throw new Error(
          "Engagement actor required for governed sandbox verification.",
        );
      }
      return actor;
    },
    loadExecution: loadExactExecution,
    loadProposal: loadExactJournalEntryProposal,
    loadAttempt: loadProviderAttemptByExecutionId,
    loadFirmId: async (engagementId) => {
      const firmId = await loadEngagementFirmId(engagementId);
      if (!firmId) {
        throw new Error(
          "Engagement firm_id required for governed sandbox verification.",
        );
      }
      return firmId;
    },
    revalidateConnection: async (args) => {
      const { revalidateCanonicalExecutionConnection } = await import(
        "./provider-attempt-service"
      );
      return revalidateCanonicalExecutionConnection(args);
    },
    resolveToken: async (accountingConnectionId, opts) => {
      const bundle = await resolveQBOTokenForAccountingConnection(
        accountingConnectionId,
        opts,
      );
      if (!bundle) return null;
      return {
        accessToken: bundle.accessToken,
        realmId: bundle.realmId,
        connectionId: accountingConnectionId,
      };
    },
    confirmRealmBelongsToConnection: confirmRealmBelongsToConnectionDefault,
    readById: async (args) => {
      assertJe3dSandboxQboEnvironment();
      return readJournalEntryById(args);
    },
    applyVerified: applyJournalEntryVerified,
    applyMismatch: applyJournalEntryVerificationMismatch,
  };
}
