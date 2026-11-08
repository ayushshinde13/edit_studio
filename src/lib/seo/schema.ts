import { SITE_URL } from "./sitemap-data";

export function generateWebSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Edito",
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function generateSoftwareApplicationSchema(tool: {
  name: string;
  description: string;
  route: string;
  applicationCategory?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: `${tool.name} - Edito`,
    operatingSystem: "All (Web Browser)",
    applicationCategory: tool.applicationCategory || "MultimediaApplication",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    url: `${SITE_URL}${tool.route}`,
    description: tool.description,
  };
}

export function generateHowToSchema({
  title,
  description,
  steps,
  totalTime = "PT1M",
}: {
  title: string;
  description: string;
  steps: string[];
  totalTime?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: title,
    description: description,
    totalTime: totalTime,
    step: steps.map((step, idx) => ({
      "@type": "HowToStep",
      position: idx + 1,
      name: `Step ${idx + 1}`,
      text: step,
    })),
  };
}

export function generateFAQSchema(faqs: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.a,
      },
    })),
  };
}

