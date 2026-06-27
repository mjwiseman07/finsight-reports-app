/**
 * @audit-channel arr-mrr-audit
 * @last-verified 2026-06-27
 * @spec Phase_SAAS_1_Recon_Spec.md v1.0
 */

import { resolveSaasCitationHandle } from "../handles";
export const IFRS_SUBSCRIPTION_SERIES_HANDLES = ["IFRS15.SubscriptionSeries", "IFRS15.B14-B19"] as const;
export function resolveIfrsSubscriptionSeriesHandles() { return IFRS_SUBSCRIPTION_SERIES_HANDLES.map((h) => resolveSaasCitationHandle(h)); }
