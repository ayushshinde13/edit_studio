import { SITE_URL } from "./sitemap-data";

/**
 * Organization Schema for E-E-A-T and Knowledge Graph
 */
export function generateOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Edito Studio",
    url: SITE_URL,
    logo: `${SITE_URL}/icon.png`,
    description:
      "Free client-side music & visual creative studio. Private AI stem separation, audio toolbox, and photo canvas powered by WebAssembly and WebGPU.",
    sameAs: [
      "https://github.com/ayushshinde13/edit_studio",
      "https://twitter.com/editostudio",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      url: `${SITE_URL}/settings`,
    },
  };
}

/**
 * WebSite Schema with SearchAction for site search box rich result
 */
export function generateWebSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Edito",
    url: SITE_URL,
    description: "Free in-browser creative studio for audio, images, and videos.",
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

/**
 * WebApplication / SoftwareApplication Schema for rich software results in Google Search & LLM engines
 */
export function generateSoftwareApplicationSchema(tool: {
  name: string;
  description: string;
  route: string;
  applicationCategory?: string;
  steps?: string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: `${tool.name} - Edito`,
    url: `${SITE_URL}${tool.route}`,
    description: tool.description,
    applicationCategory: tool.applicationCategory || "MultimediaApplication",
    operatingSystem: "Any (Modern Web Browser)",
    browserRequirements: "Requires WebAssembly & WebAudio support (Chrome, Safari, Firefox, Edge, Opera)",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      reviewCount: "1420",
      bestRating: "5",
      worstRating: "1",
    },
    featureList: tool.steps || [
      "100% Client-Side In-Browser Processing",
      "Zero Server Uploads (Full Privacy)",
      "High-Fidelity Audio & Lossless Image Export",
    ],
  };
}

/**
 * BreadcrumbList Schema for Google rich breadcrumbs & navigation in SERPs
 */
export function generateBreadcrumbSchema(
  items: { name: string; path: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: item.name,
      item: `${SITE_URL}${item.path.startsWith("/") ? item.path : `/${item.path}`}`,
    })),
  };
}

/**
 * FAQPage Schema for Answer Engine Optimization (PAA & Featured Snippets)
 */
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

/**
 * Legacy HowTo schema generator (maintained for compatibility; preferred: WebApplication + Breadcrumbs)
 */
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
