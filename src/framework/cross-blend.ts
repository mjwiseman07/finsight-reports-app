export class FrameworkCrossBlendError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "FrameworkCrossBlendError";
  }
}

export class FrameworkUnsetError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "FrameworkUnsetError";
  }
}
