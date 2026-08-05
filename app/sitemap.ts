import type { MetadataRoute } from "next";

/**
 * Phase MEM_LIFECYCLE Block 8 — Sitemap.
 *
 * Advertises the 14 indexable marketing surfaces (excludes /coming-soon).
 */

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const base = "https://advisacor.com";

  const entries: Array<{
    path: string;
    changeFrequency: "daily" | "weekly" | "monthly" | "yearly";
    priority: number;
  }> = [
    { path: "/", changeFrequency: "weekly", priority: 1.0 },
    { path: "/what-it-does", changeFrequency: "weekly", priority: 0.9 },
    { path: "/how-it-works", changeFrequency: "weekly", priority: 0.9 },
    { path: "/industries", changeFrequency: "weekly", priority: 0.9 },
    { path: "/pricing", changeFrequency: "weekly", priority: 0.9 },
    { path: "/for/owner", changeFrequency: "weekly", priority: 0.85 },
    { path: "/for/bookkeeper", changeFrequency: "weekly", priority: 0.85 },
    { path: "/for/firm", changeFrequency: "weekly", priority: 0.85 },
    { path: "/free-review", changeFrequency: "weekly", priority: 0.8 },
    { path: "/about", changeFrequency: "monthly", priority: 0.7 },
    { path: "/support", changeFrequency: "monthly", priority: 0.6 },
    { path: "/privacy", changeFrequency: "yearly", priority: 0.4 },
    { path: "/terms", changeFrequency: "yearly", priority: 0.4 },
    { path: "/refund-policy", changeFrequency: "yearly", priority: 0.4 },
  ];

  return entries.map(({ path, changeFrequency, priority }) => ({
    url: `${base}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
