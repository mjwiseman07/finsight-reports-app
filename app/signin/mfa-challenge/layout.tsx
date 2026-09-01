import { redirect } from "next/navigation";
import { createMfaUserClient } from "@/lib/mfa/server";

export default async function MfaChallengeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createMfaUserClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    redirect("/signin?error=mfa_session_required");
  }
  return children;
}
