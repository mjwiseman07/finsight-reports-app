// File: app/admin/demo-accounts/page.tsx
//
// Super-admin demo picker landing page. Gates on the same rules as other
// /admin/* pages (cookie -> resolveSuperAdminAccess), then renders the client
// component. NOTE: gating server-side is defence-in-depth; every API route
// this page calls is also gated by resolveSuperAdminAccess.

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADVISACOR_ACCESS_TOKEN_COOKIE } from "@/lib/reviewer/constants";
import { isAllowedSuperAdminEmail, SUPER_ADMIN_ROLE } from "@/lib/super-admin";
import { createClient } from "@supabase/supabase-js";
import DemoAccountsClient from "./DemoAccountsClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireSuperAdmin(): Promise<{ email: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADVISACOR_ACCESS_TOKEN_COOKIE)?.value;
  if (!token) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user?.email) return null;

  if (!isAllowedSuperAdminEmail(data.user.email)) return null;

  const appRole = (data.user.app_metadata as Record<string, unknown> | null)?.["role"];
  const userRole = (data.user.user_metadata as Record<string, unknown> | null)?.["role"];
  if (appRole !== SUPER_ADMIN_ROLE && userRole !== SUPER_ADMIN_ROLE) return null;

  return { email: data.user.email };
}

export default async function DemoAccountsPage() {
  const superAdmin = await requireSuperAdmin();
  if (!superAdmin) {
    redirect("/signin?next=/admin/demo-accounts");
  }

  return <DemoAccountsClient superAdminEmail={superAdmin.email} />;
}
