import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { ADVISACOR_ACCESS_TOKEN_COOKIE } from "@/lib/reviewer/constants";
import { isAllowedSuperAdminEmail, SUPER_ADMIN_ROLE } from "@/lib/super-admin";
import { createClient } from "@supabase/supabase-js";
import { isSandboxJeCockpitRuntimeEnabled } from "@/lib/journal-entry-governance/sandbox-je-cockpit-api";
import SandboxJeCockpitClient from "./SandboxJeCockpitClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

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

export default async function SandboxJeAdminPage() {
  if (!isSandboxJeCockpitRuntimeEnabled()) {
    notFound();
  }

  const superAdmin = await requireSuperAdmin();
  if (!superAdmin) {
    redirect("/signin?next=/admin/sandbox-je");
  }

  return <SandboxJeCockpitClient superAdminEmail={superAdmin.email} />;
}
