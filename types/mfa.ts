export type MfaFactorType = "totp" | "webauthn";

export type WebAuthnCredential = {
  id: string;
  friendly_name: string;
  transports: string[];
  created_at: string;
  last_used_at: string | null;
};

export type TrustedDevice = {
  id: string;
  user_agent: string | null;
  ip_last_seen: string | null;
  created_at: string;
  last_used_at: string | null;
  expires_at: string;
};

export type MfaAuditEventType =
  | "enroll_started"
  | "enroll_completed"
  | "enroll_failed"
  | "verify_success"
  | "verify_failed"
  | "disable"
  | "recovery_code_used"
  | "recovery_codes_regenerated"
  | "admin_enforcement_prompted"
  | "trusted_device_added"
  | "trusted_device_revoked"
  | "trusted_device_expired"
  | "webauthn_register_started"
  | "webauthn_register_completed"
  | "webauthn_register_failed"
  | "webauthn_verify_success"
  | "webauthn_verify_failed"
  | "webauthn_credential_removed"
  | "webauthn_credential_renamed";
