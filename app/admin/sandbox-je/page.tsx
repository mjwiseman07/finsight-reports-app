import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { ADVISACOR_ACCESS_TOKEN_COOKIE } from "@/lib/reviewer/constants";
import { isAllowedSuperAdminEmail, SUPER_ADMIN_ROLE } from "@/lib/super-admin";
import { createClient } from "@supabase/supabase-js";
import { isSandboxJeCockpitRuntimeEnabled } from "@/lib/journal-entry-governance/sandbox-je-cockpit-api";
import {
  SANDBOX_JE_DESIGNATED_APPROVER_USER_ID,
} from "@/lib/journal-entry-governance/sandbox-je-proposal-shared";
import SandboxJeCockpitClient from "./SandboxJeCockpitClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

async function resolveSandboxJePageAccess(): Promise<{
  email: string;
  userId: string;
  isSuperAdmin: boolean;
  isDesignatedApprover: boolean;
} | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADVISACOR_ACCESS_TOKEN_COOKIE)?.value;
  if (!token) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user?.email || !data.user.id) return null;

  const appRole = (data.user.app_metadata as Record<string, unknown> | null)?.["role"];
  const userRole = (data.user.user_metadata as Record<string, unknown> | null)?.["role"];
  const isSuperAdmin =
    isAllowedSuperAdminEmail(data.user.email) &&
    (appRole === SUPER_ADMIN_ROLE || userRole === SUPER_ADMIN_ROLE);
  const isDesignatedApprover =
    data.user.id === SANDBOX_JE_DESIGNATED_APPROVER_USER_ID;

  if (!isSuperAdmin && !isDesignatedApprover) return null;

  return {
    email: data.user.email,
    userId: data.user.id,
    isSuperAdmin,
    isDesignatedApprover,
  };
}

export default async function SandboxJeAdminPage() {
  if (!isSandboxJeCockpitRuntimeEnabled()) {
    notFound();
  }

  const access = await resolveSandboxJePageAccess();
  if (!access) {
    redirect("/signin?next=/admin/sandbox-je");
  }

  return (
    <SandboxJeCockpitClient
      sessionEmail={access.email}
      sessionUserId={access.userId}
      isSuperAdmin={access.isSuperAdmin}
      isDesignatedApprover={access.isDesignatedApprover}
    />
  );
}
