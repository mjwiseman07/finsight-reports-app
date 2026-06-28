export class FrameworkViolationError extends Error {
  constructor(
    public readonly framework: string,
    public readonly violation: string,
    public readonly citation: string,
    public readonly remediation: string,
  ) {
    super(`Framework violation: ${framework} | ${violation} | ${citation}`);
    this.name = "FrameworkViolationError";
  }
}
