/**
 * Thin wrapper for cash_app ledger events using the real publishEvent() API.
 */
import { publishEvent } from "@/lib/events/publisher";
import type { CashAppEventType } from "@/lib/events/cash-app-catalog";

export interface CashAppEventScope {
  firmId: string;
  firmClientId?: string;
  companyId?: string;
}

export async function publishCashAppEvent(
  eventType: CashAppEventType,
  scope: CashAppEventScope,
  aggregateType: string,
  aggregateId: string,
  payload: Record<string, unknown>,
  actor?: { actorType?: "user" | "system" | "ai_agent"; actorId?: string },
): Promise<void> {
  await publishEvent({
    eventType,
    eventCategory: "cash_app",
    firmId: scope.firmId,
    firmClientId: scope.firmClientId,
    aggregateType,
    aggregateId,
    actorType: actor?.actorType ?? "system",
    actorId: actor?.actorId,
    payload: {
      ...payload,
      ...(scope.companyId ? { company_id: scope.companyId } : {}),
    },
  });
}
