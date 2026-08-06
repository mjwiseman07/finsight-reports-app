import { redirect } from "next/navigation";

/** DASH_1F — wizard retired; dashboard is the front door. */
export default function OnboardingRedirect() {
  redirect("/dashboard");
}
