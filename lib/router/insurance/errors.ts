export class MissingDisclosureInputError extends Error {
  constructor(public readonly field: string) {
    super(`MissingDisclosureInputError: ${field}`);
    this.name = "MissingDisclosureInputError";
  }
}

export class FrameworkUnsupportedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FrameworkUnsupportedError";
  }
}
