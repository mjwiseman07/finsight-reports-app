import { redirect } from "next/navigation";
import { requireAuditReadyUser } from "@/lib/audit-ready/server-auth";
import { listVisibleEngagementIds } from "@/lib/audit-ready/kickouts/list-visible-engagements.js";
import { listKickouts } from "@/lib/audit-ready/kickouts/list-kickouts.js";
import { KickoutInboxClient } from "@/components/audit-ready/KickoutInboxClient";
import { headingFont } from "@/components/site-ui";

export const dynamic = "force-dynamic";

export default async function KickoutsPage() {
  const auth = await requireAuditReadyUser();
  if ("error" in auth) {
    redirect("/signin");
  }

  const engagementIds = await listVisibleEngagementIds(auth.user.id);
  const rows =
    engagementIds.length > 0 ? await listKickouts(engagementIds) : [];

  return (
    <main className="min-h-screen bg-[#111112] text-[#ECEBE7]">
      <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        <header>
          <h1 className={`${headingFont} text-2xl font-semibold text-[#ECEBE7]`}>
            Kickout Inbox
          </h1>
          <p className="mt-1 text-sm text-[#A29E93]">
            Balance sheet and tie-out kickouts across all engagements you have
            access to. Investigate, note, and resolve.
          </p>
        </header>
        <KickoutInboxClient initialRows={rows} />
      </div>
    </main>
  );
}
