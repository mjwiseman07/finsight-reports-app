import { redirect } from "next/navigation";
import { requireFirmAuthServer } from "@/lib/reviewer/auth";
import { ReviewerShellClient } from "./_components/ReviewerShellClient";

export const dynamic = "force-dynamic";

export default async function ReviewerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    const session = await requireFirmAuthServer();
    return <ReviewerShellClient session={session}>{children}</ReviewerShellClient>;
  } catch {
    redirect("/signin?next=/reviewer");
  }
}
