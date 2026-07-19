import { redirect } from "next/navigation";
import { AccountSettingsShell } from "@/components/account/AccountSettingsShell";
import { createMfaUserClient } from "@/lib/mfa/server";

export const dynamic = "force-dynamic";

export default async function AccountNotificationsPage() {
  const supabase = await createMfaUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/signin?next=/dashboard/account/notifications");

  return (
    <main className="min-h-screen bg-[#F7F6F2] text-[#111112]">
      <AccountSettingsShell activeTab="notifications">
        <h2 className="text-base font-semibold text-[#0B1A3A]">Notifications</h2>
        <p className="mt-2 text-sm text-[#5C5A55]">
          Email and product notification preferences will land here in a later
          TCP1 block. MFA security alerts are always on for enrollment lifecycle
          events.
        </p>
      </AccountSettingsShell>
    </main>
  );
}
