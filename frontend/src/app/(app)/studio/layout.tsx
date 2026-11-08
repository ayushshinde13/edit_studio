import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Multitrack Studio Workspace",
  description: "Your local in-browser audio projects and multitrack studio sessions.",
};

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

