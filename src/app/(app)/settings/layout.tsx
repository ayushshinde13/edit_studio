import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings & System Diagnostics",
  description: "Configure local storage, hardware performance mode, and WebGPU diagnostics.",
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

