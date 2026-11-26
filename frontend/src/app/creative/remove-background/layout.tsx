import type { Metadata } from "next";
import { TOOLS } from "@/config/tools";
import { constructMetadata } from "@/lib/seo/metadata";
import { generateSoftwareApplicationSchema, generateBreadcrumbSchema } from "@/lib/seo/schema";

const tool = TOOLS.find((t) => t.slug === "remove-background")!;

export const metadata: Metadata = constructMetadata({
  title: tool.title,
  description: tool.description,
  path: tool.route,
  keywords: tool.keywords,
});

export default function Layout({ children }: { children: React.ReactNode }) {
  const appSchema = generateSoftwareApplicationSchema(tool);
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Creative Studio", path: "/creative" },
    { name: tool.name, path: tool.route },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(appSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {children}
    </>
  );
}
