import { MetadataRoute } from "next";
import { getSitemapRoutes } from "@/lib/seo/sitemap-data";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = getSitemapRoutes();
  return routes.map((r) => ({
    url: r.url,
    lastModified: r.lastModified || new Date(),
    changeFrequency: r.changeFrequency || "weekly",
    priority: r.priority || 0.8,
  }));
}

