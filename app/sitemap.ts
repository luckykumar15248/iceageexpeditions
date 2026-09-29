import type { MetadataRoute } from "next";
import { listSitemapExpeditions } from "@/lib/catalog";
import { getSiteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = getSiteUrl();
  const expeditions = await listSitemapExpeditions();
  const staticRoutes = ["", "/expeditions", "/safety", "/gear", "/faq", "/about", "/enquire", "/contact", "/terms", "/booking-policies", "/privacy"].map((path) => ({
    url: `${site}${path || "/"}`,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.7,
  }));

  return [
    ...staticRoutes,
    ...expeditions.map((expedition) => ({
      url: `${site}/expeditions/${expedition.slug}`,
      lastModified: expedition.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
