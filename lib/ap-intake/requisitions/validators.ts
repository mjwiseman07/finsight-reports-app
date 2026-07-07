import type { RequisitionCreateInput, RequisitionLineInput } from "./types";
export class RequisitionValidationError extends Error {
  constructor(public field: string, message: string) {
    super(message);
    this.name = "RequisitionValidationError";
  }
}
export function validateLine(line: RequisitionLineInput, idx: number): void {
  if (!line.description || line.description.trim().length === 0) {
    throw new RequisitionValidationError(`lines[${idx}].description`, "description required");
  }
  if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
    throw new RequisitionValidationError(`lines[${idx}].quantity`, "quantity must be > 0");
  }
  if (!Number.isInteger(line.unit_price_cents) || line.unit_price_cents < 0) {
    throw new RequisitionValidationError(
      `lines[${idx}].unit_price_cents`,
      "unit_price_cents must be non-negative integer",
    );
  }
}
export function validateCreate(input: RequisitionCreateInput): void {
  if (!input.firmClientId) {
    throw new RequisitionValidationError("firmClientId", "required");
  }
  if (!input.requesterUserId) {
    throw new RequisitionValidationError("requesterUserId", "required");
  }
  if (!Array.isArray(input.lines) || input.lines.length === 0) {
    throw new RequisitionValidationError("lines", "at least one line required");
  }
  input.lines.forEach(validateLine);
}
export function computeTotals(lines: RequisitionLineInput[]): {
  subtotalCents: number;
  totalCents: number;
} {
  const subtotal = lines.reduce(
    (sum, l) => sum + Math.round(l.quantity * l.unit_price_cents),
    0,
  );
  return { subtotalCents: subtotal, totalCents: subtotal };
}
