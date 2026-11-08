import type { Metadata } from "next";
import "./globals.css";
import { SITE_URL } from "@/lib/seo/sitemap-data";
import { generateWebSiteSchema } from "@/lib/seo/schema";
import { ThemeProvider } from "@/design-system/themes/theme-provider";
import { ResponsiveShell } from "@/design-system/layouts/responsive-shell";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Edito — Free In-Browser Music & Creative Studio",
    template: "Edito | %s",
  },
  description:
    "100% client-side, zero-upload media suite. AI stem separator, precision waveform cutter, watermark inpainting, photo canvas, and bulk image resizer.",
  keywords: [
    "browser media editor",
    "stem separator free",
    "online audio cutter",
    "watermark remover",
    "bulk image resizer",
    "client-side video editor",
  ],
  authors: [{ name: "Edito Team" }],
  creator: "Edito",
  publisher: "Edito",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: "Edito - Browser-Based Audio, Image & Video Studio",
    description: "100% private in-browser AI stem separation, audio toolbox, and photo editor. Zero server uploads.",
    url: SITE_URL,
    siteName: "Edito",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Edito - Browser-Based Audio, Image & Video Studio",
    description: "100% private in-browser media editing suite. No uploads.",
    creator: "@editostudio",
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const websiteSchema = generateWebSiteSchema();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
      </head>
      <body className="min-h-screen bg-white dark:bg-[#09090b] text-[#111827] dark:text-[#f4f4f5] selection:bg-[#fb6b6a] selection:text-white">
        <ThemeProvider>
          <ResponsiveShell>{children}</ResponsiveShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
