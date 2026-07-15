import { redirect } from "next/navigation";
import { AccountSettingsShell } from "@/components/account/AccountSettingsShell";
import { createMfaUserClient } from "@/lib/mfa/server";

export const dynamic = "force-dynamic";

export default async function AccountProfilePage() {
  const supabase = await createMfaUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/signin?next=/dashboard/account");

  return (
    <main className="min-h-screen bg-[#F7F6F2] text-[#111112]">
      <AccountSettingsShell activeTab="profile">
        <h2 className="text-base font-semibold text-[#0B1A3A]">Profile</h2>
        <p className="mt-2 text-sm text-[#5C5A55]">
          Signed in as <span className="font-medium text-[#111112]">{user.email}</span>
        </p>
        <p className="mt-4 text-sm text-[#5C5A55]">
          Business name and package settings remain available from the dashboard
          account modal. Security settings live on the Security tab.
        </p>
      </AccountSettingsShell>
    </main>
  );
}
