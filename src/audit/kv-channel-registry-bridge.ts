/**
 * LOCK-VC C3 — src/audit re-exports canonical K-V channel registry from lib.
 */
export {
  VERTICAL_KV_AUDIT_CHANNEL_REGISTRY as SRC_AUDIT_CHANNEL_REGISTRY,
  VERTICAL_KV_AUDIT_CHANNEL_COUNT as SRC_AUDIT_CHANNEL_COUNT,
  type VerticalKvAuditChannel,
} from "../../lib/intelligence/synthetic/audit/channels/vertical-kv-audit-registry";
