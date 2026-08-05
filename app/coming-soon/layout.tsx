import type { Metadata } from "next";

// TEMPORARY surface — do not index. When Solo BK / Review Assist gates lift,
// this surface will 404 or redirect. Explicit noindex prevents Google from
// caching a "coming soon" snippet as our homepage.
export const metadata: Metadata = {
  title: "Coming Soon | Advisacor",
  description: "This Advisacor product surface is coming soon.",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
  alternates: {
    canonical: "/coming-soon",
  },
};

export default function ComingSoonLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
