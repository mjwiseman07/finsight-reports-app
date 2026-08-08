// WBP W1b — Kill-switch: is the write path enabled for this connection?
// Default: false. W1c's admin route (/api/admin/write-boundary/{enable,disable})
// flips metadata_json.write_enabled_{provider} to true/false.
// Rule 1: cutting edge = default deny. Ops must explicitly opt in per connection.

import type { WriteBoundaryConnection } from "./types";

export function writeEnabled(connection: WriteBoundaryConnection): boolean {
  const key = connection.provider === "xero" ? "write_enabled_xero" : "write_enabled_quickbooks";
  const value = connection.metadata_json?.[key];
  // Explicit true only. Any other value (missing, "true", 1, null) is disabled.
  return value === true;
}

/**
 * Reason text for a WriteBoundaryDisabled error thrown when writeEnabled=false.
 * Kept as a separate function so W1c's error surface has consistent messaging.
 */
export function writeDisabledReason(connection: WriteBoundaryConnection): string {
  const key = connection.provider === "xero" ? "write_enabled_xero" : "write_enabled_quickbooks";
  return `Write boundary disabled for connection ${connection.id} (${connection.provider}). metadata_json.${key} must be true. Enable via /api/admin/write-boundary/enable.`;
}
