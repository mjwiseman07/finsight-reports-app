import { NextResponse } from "next/server";

const store = globalThis.__advisacorRateLimitStore || new Map();
globalThis.__advisacorRateLimitStore = store;

function getClientIp(request) {
  const forwardedFor = request.headers.get("x-forwarded-for") || "";
  return forwardedFor.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

export function rateLimit(request, { key = "global", limit = 60, windowMs = 60_000 } = {}) {
  const now = Date.now();
  const bucketKey = `${key}:${getClientIp(request)}`;
  const current = store.get(bucketKey);

  if (!current || current.resetAt <= now) {
    store.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return null;
  }

  current.count += 1;

  if (current.count > limit) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((current.resetAt - now) / 1000)),
        },
      },
    );
  }

  return null;
}
