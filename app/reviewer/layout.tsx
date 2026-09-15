import { redirect } from "next/navigation";
import {
  requireFirmAuthServer,
  ReviewerAuthError,
} from "@/lib/reviewer/auth";
import { ReviewerShellClient } from "./_components/ReviewerShellClient";

export const dynamic = "force-dynamic";

/**
 * /reviewer is RA Pro–only. Unauthenticated → sign-in (next=/dashboard, not
 * /reviewer, to avoid bounce loops). Authenticated but not entitled → dashboard.
 */
export default async function ReviewerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let session;
  try {
    session = await requireFirmAuthServer();
  } catch (err) {
    if (
      err instanceof ReviewerAuthError &&
      (err.status === 401 ||
        err.message.includes("missing") ||
        err.message.includes("invalid_token"))
    ) {
      redirect("/signin?next=/dashboard");
    }
    if (err instanceof ReviewerAuthError && err.status === 403) {
      redirect("/dashboard");
    }
    redirect("/dashboard");
  }

  return <ReviewerShellClient session={session}>{children}</ReviewerShellClient>;
}
