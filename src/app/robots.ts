import { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/sitemap-data";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/stems", "/audio/", "/creative/", "/studio", "/settings"],
        disallow: ["/admin/", "/api/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

