import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

// Phase TCP1 W2.5 Block 9g:
// Server-side email confirmation status probe. The signup verify_email
// screen polls this endpoint every 3s while the user opens the confirmation
// link in another tab. We cannot use supabase.auth.getUser() on the client
// because the confirmation happens on a DIFFERENT tab — the original tab
// never receives auth cookies, so getUser() returns null forever.
//
// This endpoint reads auth.users.email_confirmed_at via service-role client
// and returns ONLY a boolean, avoiding any information leak:
//   - Never reveals if the email exists (non-existent → confirmed: false)
//   - Never returns timestamps, user IDs, or metadata
//   - Rate limited to prevent enumeration
//
// Route: POST /api/auth/confirmation-status
// Body:  { "email": "user@example.com" }
// Reply: { "confirmed": true|false }

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// In-memory rate limiter — per Vercel serverless instance.
// Key = normalized email. Window = 60s. Cap = 20 requests.
// Client polls every 3s, so at most ~20/min from a legitimate user.
type BucketState = { count: number; windowStart: number };
const RATE_BUCKETS = new Map<string, BucketState>();
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 20;

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const bucket = RATE_BUCKETS.get(key);
  if (!bucket || now - bucket.windowStart > RATE_WINDOW_MS) {
    RATE_BUCKETS.set(key, { count: 1, windowStart: now });
    return true;
  }
  if (bucket.count >= RATE_MAX) return false;
  bucket.count += 1;
  return true;
}

// Periodic cleanup — every 100 requests, prune stale buckets.
let requestCounter = 0;
function maybePruneBuckets() {
  requestCounter += 1;
  if (requestCounter % 100 !== 0) return;
  const now = Date.now();
  for (const [key, bucket] of RATE_BUCKETS.entries()) {
    if (now - bucket.windowStart > RATE_WINDOW_MS * 2) {
      RATE_BUCKETS.delete(key);
    }
  }
}

async function findAuthUserByEmail(email: string) {
  const admin = createServiceClient();
  // listUsers has no email filter in @supabase/auth-js 2.x — scan pages.
  // Cap at 5 pages × 100 = 500 users (pilot scale). Prefer a SQL RPC later.
  for (let page = 1; page <= 5; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 100,
    });
    if (error) {
      console.error("[confirmation-status] listUsers failed", error);
      return { error };
    }
    const users = data?.users ?? [];
    if (users.length === 0) break;
    const match = users.find((u) => (u.email ?? "").toLowerCase() === email);
    if (match) return { user: match };
  }
  return { user: null };
}

export async function POST(req: NextRequest) {
  maybePruneBuckets();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const rawEmail =
    body && typeof body === "object" && "email" in body
      ? (body as { email: unknown }).email
      : null;

  if (typeof rawEmail !== "string" || rawEmail.length === 0) {
    return NextResponse.json({ error: "email_required" }, { status: 400 });
  }

  const email = rawEmail.trim().toLowerCase();
  if (email.length > 320) {
    // RFC 5321 max email length
    return NextResponse.json({ error: "email_invalid" }, { status: 400 });
  }

  if (!checkRateLimit(email)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const { user, error } = await findAuthUserByEmail(email);
  if (error) {
    // Fail closed on lookup errors without revealing existence.
    return NextResponse.json({ confirmed: false });
  }
  if (!user) {
    // User doesn't exist (or is beyond page 5) — return false, never reveal.
    return NextResponse.json({ confirmed: false });
  }

  return NextResponse.json({
    confirmed: Boolean(user.email_confirmed_at),
  });
}
