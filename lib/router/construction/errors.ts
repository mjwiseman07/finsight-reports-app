export class MissingDisclosureInputError extends Error {
  constructor(public readonly field: string) {
    super(`MissingDisclosureInputError: ${field}`);
    this.name = "MissingDisclosureInputError";
  }
}
