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
        <p className="text-xs font-black uppercase tracking-[0.22em] text-[#C9A961]">Billing</p>
        <h2 className="mt-2 text-xl font-black tracking-tight text-[#0B1A3A]">Subscription & invoices</h2>
        <p className="mt-3 text-sm leading-6 text-[#5C5A55]">
          Subscription and invoice management continues through Advisacor
          checkout and Stripe Customer Portal flows.
        </p>
      </AccountSettingsShell>
    </main>
  );
}
