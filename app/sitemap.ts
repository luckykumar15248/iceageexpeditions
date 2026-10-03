import type { MetadataRoute } from "next";
import { listBlogFeed } from "@/lib/blog";
import { listSitemapExpeditions } from "@/lib/catalog";
import { getSiteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = getSiteUrl();
  const [expeditions, posts] = await Promise.all([listSitemapExpeditions(), listBlogFeed()]);
  const staticRoutes = ["", "/expeditions", "/blog", "/gallery", "/safety", "/gear", "/faq", "/about", "/enquire", "/contact", "/terms", "/booking-policies", "/privacy"].map((path) => ({
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
    ...posts
      .filter((post) => post.robotsIndex)
      .map((post) => ({
        url: `${site}/blog/${post.slug}`,
        lastModified: post.updatedAtIso,
        changeFrequency: "monthly" as const,
        priority: 0.6,
      })),
  ];
}
