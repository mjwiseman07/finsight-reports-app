/**
 * D6.4d — Shared authentication + firm-scope resolution for reviewer API routes.
 */
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export type ReviewerRole = "firm_admin" | "controller" | "fractional_cfo" | "reviewer" | "readonly";

export interface AuthenticatedFirmContext {
  userId: string;
  firmIds: string[];
  writerFirmIds: string[];
  isServiceRoleCaller: false;
}

export interface AuthenticatedClientContext {
  userId: string;
  firmClientIds: string[];
  isServiceRoleCaller: false;
}

export type AuthedContext = AuthenticatedFirmContext | AuthenticatedClientContext;

export class ReviewerAuthError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ReviewerAuthError";
  }
}

const WRITER_ROLES = ["firm_admin", "controller", "fractional_cfo"] as const;

export async function requireFirmAuth(request: Request): Promise<AuthenticatedFirmContext> {
  const supabase = createServiceClient();
  const token = extractBearerToken(request);
  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData?.user) {
    throw new ReviewerAuthError("invalid_token", 401);
  }

  const userId = userData.user.id;
  const { data: memberships, error: mErr } = await supabase
    .from("firm_memberships")
    .select("firm_id, role, status")
    .eq("user_id", userId)
    .eq("status", "active");

  if (mErr) throw new ReviewerAuthError("membership_query_failed", 500);
  if (!memberships || memberships.length === 0) {
    throw new ReviewerAuthError("no_firm_membership", 403);
  }

  const firmIds = memberships.map((m) => m.firm_id as string);
  const writerFirmIds = memberships
    .filter((m) => WRITER_ROLES.includes(m.role as (typeof WRITER_ROLES)[number]))
    .map((m) => m.firm_id as string);

  return { userId, firmIds, writerFirmIds, isServiceRoleCaller: false };
}

export async function requireClientAuth(request: Request): Promise<AuthenticatedClientContext> {
  const supabase = createServiceClient();
  const token = extractBearerToken(request);
  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData?.user) {
    throw new ReviewerAuthError("invalid_token", 401);
  }

  const userId = userData.user.id;
  const { data: attachments, error: attErr } = await supabase
    .from("firm_client_users")
    .select("firm_client_id, status")
    .eq("user_id", userId)
    .eq("status", "active");

  if (attErr) throw new ReviewerAuthError("client_attachment_query_failed", 500);
  if (!attachments || attachments.length === 0) {
    throw new ReviewerAuthError("no_client_attachment", 403);
  }

  return {
    userId,
    firmClientIds: attachments.map((a) => a.firm_client_id as string),
    isServiceRoleCaller: false,
  };
}

function extractBearerToken(request: Request): string {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new ReviewerAuthError("missing_bearer_token", 401);
  return match[1];
}

export function authErrorResponse(e: unknown): NextResponse {
  if (e instanceof ReviewerAuthError) {
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
  console.error("[reviewer-auth] unexpected error", e);
  return NextResponse.json({ error: "internal_error" }, { status: 500 });
}
