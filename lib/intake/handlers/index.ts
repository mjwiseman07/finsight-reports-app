import type { IntakeHandler } from "../types";
import { cashAppRemitHandler } from "./cash-app-remit";
import { billsHandler } from "./bills";

const HANDLERS: readonly IntakeHandler[] = [
  cashAppRemitHandler,
  billsHandler,
];

export function getHandler(key: string): IntakeHandler | null {
  return HANDLERS.find((h) => h.key === key) ?? null;
}

export function listHandlers(): readonly IntakeHandler[] {
  return HANDLERS;
}
