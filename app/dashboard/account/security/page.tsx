import { redirect } from "next/navigation";
import { AccountSettingsShell } from "@/components/account/AccountSettingsShell";
import { MfaEnrollmentCard } from "@/components/account/MfaEnrollmentCard";
import { MfaEnforcementNotice } from "@/components/account/MfaEnforcementNotice";
import { MfaManagementCard } from "@/components/account/MfaManagementCard";
import {
  createMfaUserClient,
  userHasActiveFirmAdminRole,
  writeMfaAuditLog,
} from "@/lib/mfa/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export default async function AccountSecurityPage({
  searchParams,
}: {
  searchParams: Promise<{ enforcement?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createMfaUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/signin?next=/dashboard/account/security");

  const { data: factors } = await supabase.auth.mfa.listFactors();
  const totp = factors?.totp?.[0] ?? null;
  const isEnrolled = Boolean(totp);
  const isFirmAdmin = await userHasActiveFirmAdminRole(user.id);
  const showEnforcement = isFirmAdmin && !isEnrolled;

  if (showEnforcement && params.enforcement === "required") {
    await writeMfaAuditLog({
      userId: user.id,
      eventType: "admin_enforcement_prompted",
      metadata: { source: "security_page" },
    });
  }

  let auditTail: Array<{ event_type: string; created_at: string }> = [];
  try {
    const admin = getSupabaseAdmin();
    const { data } = await admin
      .from("mfa_audit_log")
      .select("event_type, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(8);
    auditTail = data ?? [];
  } catch {
    auditTail = [];
  }

  return (
    <main className="min-h-screen bg-[#F7F6F2] text-[#111112]">
      <AccountSettingsShell activeTab="security">
        <MfaEnforcementNotice show={showEnforcement} />
        {!isEnrolled ? (
          <MfaEnrollmentCard />
        ) : totp ? (
          <MfaManagementCard
            factor={{
              id: totp.id,
              friendlyName: totp.friendly_name ?? null,
              createdAt: totp.created_at,
            }}
            isFirmAdmin={isFirmAdmin}
            auditTail={auditTail}
          />
        ) : null}
      </AccountSettingsShell>
    </main>
  );
}
