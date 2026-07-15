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
        <p className="text-xs font-black uppercase tracking-[0.22em] text-[#C9A961]">Profile</p>
        <h2 className="mt-2 text-xl font-black tracking-tight text-[#0B1A3A]">Your Advisacor account</h2>
        <p className="mt-3 text-sm leading-6 text-[#5C5A55]">
          Signed in as <span className="font-semibold text-[#111112]">{user.email}</span>
        </p>
        <p className="mt-4 text-sm leading-6 text-[#5C5A55]">
          Business name and package settings remain available from the dashboard
          account modal. Security settings live on the Security tab.
        </p>
      </AccountSettingsShell>
    </main>
  );
}
