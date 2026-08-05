import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Support | Advisacor",
  description:
    "Get help with Advisacor — documentation, troubleshooting, and direct support for accounting firms, bookkeepers, and business owners using our AI-powered close and review platform.",
  alternates: {
    canonical: "/support",
  },
};

export default function SupportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
