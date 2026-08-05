import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Industries | Advisacor",
  description:
    "Advisacor understands the shape of your books. Industry-aware close, review, and CFO insight for healthcare, professional services, manufacturing, construction, retail, SaaS, nonprofits, government contractors, and fund accounting.",
  alternates: {
    canonical: "/industries",
  },
};

export default function IndustriesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
