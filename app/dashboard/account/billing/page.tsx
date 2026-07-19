import { redirect } from "next/navigation";
import { AccountSettingsShell } from "@/components/account/AccountSettingsShell";
import { createMfaUserClient } from "@/lib/mfa/server";

export const dynamic = "force-dynamic";

export default async function AccountBillingPage() {
  const supabase = await createMfaUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/signin?next=/dashboard/account/billing");

  return (
    <main className="min-h-screen bg-[#F7F6F2] text-[#111112]">
      <AccountSettingsShell activeTab="billing">
        <h2 className="text-base font-semibold text-[#0B1A3A]">Billing</h2>
        <p className="mt-2 text-sm text-[#5C5A55]">
          Subscription and invoice management continues through Advisacor
          checkout and Stripe Customer Portal flows.
        </p>
      </AccountSettingsShell>
    </main>
  );
}
