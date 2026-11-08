import { TOOLS } from "@/config/tools";

export interface SitemapEntry {
  url: string;
  lastModified?: Date;
  changeFrequency?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
}

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://edito.studio";

export function getSitemapRoutes(): SitemapEntry[] {
  const routes: SitemapEntry[] = [
    {
      url: `${SITE_URL}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/stems`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.95,
    },
    {
      url: `${SITE_URL}/audio`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/creative`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/studio`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/settings`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];

  for (const tool of TOOLS) {
    if (tool.route !== "/stems") {
      routes.push({
        url: `${SITE_URL}${tool.route}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.85,
      });
    }
  }

  return routes;
}

