import { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/sitemap-data";

/**
 * Next.js Robots.txt generation
 * Fully optimized for Search Engines (Google, Bing) and AI / GEO Crawlers (GPTBot, ClaudeBot, Perplexity, etc.)
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/stems",
          "/audio/",
          "/creative/",
          "/studio",
          "/settings",
          "/privacy",
          "/llms.txt",
          "/llms-full.txt",
        ],
        disallow: ["/admin/", "/api/"],
      },
      // Allow OpenAI / ChatGPT search crawler
      {
        userAgent: "GPTBot",
        allow: ["/", "/stems", "/audio/", "/creative/", "/llms.txt", "/llms-full.txt"],
        disallow: ["/admin/", "/api/"],
      },
      // Allow Anthropic Claude search crawler
      {
        userAgent: "ClaudeBot",
        allow: ["/", "/stems", "/audio/", "/creative/", "/llms.txt", "/llms-full.txt"],
        disallow: ["/admin/", "/api/"],
      },
      // Allow Perplexity AI search crawler
      {
        userAgent: "PerplexityBot",
        allow: ["/", "/stems", "/audio/", "/creative/", "/llms.txt", "/llms-full.txt"],
        disallow: ["/admin/", "/api/"],
      },
      // Allow Google Gemini & Vertex AI crawler
      {
        userAgent: "Google-Extended",
        allow: ["/", "/stems", "/audio/", "/creative/", "/llms.txt", "/llms-full.txt"],
        disallow: ["/admin/", "/api/"],
      },
      // Allow Apple Intelligence crawler
      {
        userAgent: "Applebot-Extended",
        allow: ["/", "/stems", "/audio/", "/creative/", "/llms.txt", "/llms-full.txt"],
        disallow: ["/admin/", "/api/"],
      },
      // Allow Common Crawl
      {
        userAgent: "CCBot",
        allow: ["/", "/stems", "/audio/", "/creative/"],
        disallow: ["/admin/", "/api/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
