import type { MetadataRoute } from "next";

const siteUrl = "https://zenova-1mwpvwfwn-shunai394-9704s-projects.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = [
    { path: "", priority: 1, changeFrequency: "weekly" as const },
    { path: "/terms", priority: 0.3, changeFrequency: "yearly" as const },
    { path: "/privacy", priority: 0.3, changeFrequency: "yearly" as const },
  ];

  return pages.map(({ path, priority, changeFrequency }) => ({
    url: `${siteUrl}${path}`,
    lastModified: new Date("2026-10-05"),
    changeFrequency,
    priority,
  }));
}
