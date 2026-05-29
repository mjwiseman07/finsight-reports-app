export class ERPBaseAdapter {
  constructor({ platform, userId }) {
    if (!platform) throw new Error("ERP adapter platform is required");
    this.platform = platform;
    this.userId = userId;
  }

  connect() {
    throw new Error(`${this.platform} adapter must implement connect()`);
  }

  fetchReports() {
    throw new Error(`${this.platform} adapter must implement fetchReports(dateRange)`);
  }

  detectCapabilities() {
    throw new Error(`${this.platform} adapter must implement detectCapabilities()`);
  }

  refreshToken() {
    throw new Error(`${this.platform} adapter must implement refreshToken()`);
  }
}
