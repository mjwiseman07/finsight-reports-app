import type { MetadataRoute } from "next";

/**
 * Phase MEM_LIFECYCLE Block 8 — robots.txt.
 */

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/dashboard/",
          "/admin/",
          "/reviewer/",
          "/audit-ready/",
          "/firm/",
          "/onboarding/",
          "/owner/",
          "/healthcare-intelligence/",
          "/industry-intelligence/",
          "/client-briefings/",
          "/close-periods/",
          "/first-package-results/",
          "/import/",
          "/upload/",
          "/purchase-orders/",
          "/requisitions/",
          "/budgets/",
          "/developer/",
          "/quarantine/",
          "/landing-preview/",
          "/share/",
          "/signin",
          "/signin/",
          "/signup",
          "/signup/",
          "/forgot-password",
          "/auth/",
          "/coming-soon",
          "/login",
        ],
      },
    ],
    sitemap: "https://advisacor.com/sitemap.xml",
    host: "https://advisacor.com",
  };
}
