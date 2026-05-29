import { QuickBooksAdapter } from "./quickbooks-adapter";

export function getERPAdapter(platform, userId) {
  const normalizedPlatform = String(platform || "").toLowerCase();

  if (normalizedPlatform === "quickbooks") {
    return new QuickBooksAdapter(userId);
  }

  throw new Error(`Unsupported ERP platform: ${platform}`);
}

export { QuickBooksAdapter } from "./quickbooks-adapter";
export { ERPBaseAdapter } from "./base-adapter";
