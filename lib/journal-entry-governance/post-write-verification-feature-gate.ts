/**
 * JE-4 HTTP / production trigger gate.
 *
 * Default OFF. Enabling this gate does not enable JE create, live POST,
 * or JE-3C verify. Orchestration tests call runPostWriteVerification with
 * injected dependencies and do not consult this flag.
 */

import { PostWriteVerificationError } from "./post-write-verification-types";

export const JE4_POST_WRITE_FEATURE_GATE = {
  phase: "JE-4" as const,
  apiTriggerEnabled: false as const,
  authorizesProviderCreate: false as const,
  authorizesProviderVerify: false as const,
  authorizesMemoryAsCloseProof: false as const,
} as const;

/**
 * Boolean wrapper so callers are not narrowed to a constant-false branch.
 * The checked-in value remains false.
 */
export function isJe4ApiTriggerEnabled(): boolean {
  return JE4_POST_WRITE_FEATURE_GATE.apiTriggerEnabled;
}

export function assertJe4ApiTriggerEnabled(): void {
  if (!isJe4ApiTriggerEnabled()) {
    throw new PostWriteVerificationError(
      "je4_api_trigger_disabled",
      "JE-4 HTTP trigger is disabled. Post-write verification does not enable journal-entry create or verify.",
    );
  }
  if (JE4_POST_WRITE_FEATURE_GATE.authorizesProviderCreate) {
    throw new PostWriteVerificationError(
      "je4_must_not_authorize_create",
      "JE-4 must not authorize provider journal-entry create.",
    );
  }
}
