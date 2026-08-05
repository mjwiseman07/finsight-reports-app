import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free Review | Advisacor",
  description:
    "Get a free AI-powered review of your QuickBooks books. Advisacor flags material misstatements, reconciliation gaps, and disclosure risk in minutes — no credit card required.",
  alternates: {
    canonical: "/free-review",
  },
};

export default function FreeReviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
