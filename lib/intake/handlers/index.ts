import type { IntakeHandler } from "../types";
import { cashAppRemitHandler } from "./cash-app-remit";

const HANDLERS: readonly IntakeHandler[] = [
  cashAppRemitHandler,
  // Bills, docs land in Part 2 and Part 3.
];

export function getHandler(key: string): IntakeHandler | null {
  return HANDLERS.find((h) => h.key === key) ?? null;
}

export function listHandlers(): readonly IntakeHandler[] {
  return HANDLERS;
}
