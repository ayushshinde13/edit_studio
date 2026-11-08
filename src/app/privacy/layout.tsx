import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — 100% Secure & Zero Data Retention",
  description:
    "Edito is 100% private and secure. All audio, video, and photo processing runs locally in your browser. We never upload, collect, or store your files.",
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

