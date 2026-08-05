import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing | Advisacor",
  description:
    "Advisacor pricing — Review Assist and Review Assist Pro plans for accounting firms and bookkeepers. Transparent per-engagement pricing, no long-term contracts.",
  alternates: {
    canonical: "/pricing",
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
