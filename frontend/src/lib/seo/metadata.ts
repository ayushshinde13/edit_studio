import type { Metadata } from "next";
import { SITE_URL } from "./sitemap-data";

interface BuildMetadataParams {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  ogType?: "website" | "article";
  imagePath?: string;
  noIndex?: boolean;
}

export function constructMetadata({
  title,
  description,
  path,
  keywords = [],
  ogType = "website",
  imagePath,
  noIndex = false,
}: BuildMetadataParams): Metadata {
  const url = `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const defaultImage = imagePath ? `${SITE_URL}${imagePath}` : `${SITE_URL}/opengraph-image`;

  const displayTitle = title.startsWith("Edito") ? title : `Edito | ${title}`;

  return {
    title: displayTitle,
    description,
    keywords: [
      "free online audio editor",
      "free online photo editor",
      "stem separator",
      "browser media tools",
      "privacy first audio tools",
      ...keywords,
    ],
    metadataBase: new URL(SITE_URL),
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: "Edito Studio",
      images: [
        {
          url: defaultImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      type: ogType,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [defaultImage],
      creator: "@editostudio",
    },
    robots: noIndex
      ? {
        index: false,
        follow: false,
      }
      : {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          "max-video-preview": -1,
          "max-image-preview": "large",
          "max-snippet": -1,
        },
      },
  };
}

