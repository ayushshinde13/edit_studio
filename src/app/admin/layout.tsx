import type { Metadata } from "next";
import Link from "next/link";
import {
  LayoutDashboard,
  ListOrdered,
  AlertTriangle,
  Settings,
  LogOut,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/design-system/primitives/button";

export const metadata: Metadata = {
  title: "Edito | Admin Console",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] flex flex-col font-sans">
      {/* Admin Topbar */}
      <header className="border-b border-[#27272a] bg-[#121215] sticky top-0 z-50">
        <div className="container mx-auto max-w-7xl px-4 h-13 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-[4px] bg-[#fb6b6a] flex items-center justify-center text-white font-mono font-bold text-xs">
                E
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  Edito Admin
                  <span className="text-[9px] font-mono px-1 rounded bg-[#fb6b6a]/10 text-[#fb6b6a] border border-[#fb6b6a]/30">
                    Staff
                  </span>
                </span>
              </div>
            </Link>

            <nav className="hidden sm:flex items-center gap-1">
              <Link
                href="/admin"
                className="px-2.5 py-1 rounded-[4px] text-xs font-medium text-[#a1a1aa] hover:text-white hover:bg-[#18181c] transition-colors flex items-center gap-1.5"
              >
                <LayoutDashboard className="h-3 w-3 text-[#fb6b6a]" />
                Dashboard
              </Link>
              <Link
                href="/admin/logs"
                className="px-2.5 py-1 rounded-[4px] text-xs font-medium text-[#a1a1aa] hover:text-white hover:bg-[#18181c] transition-colors flex items-center gap-1.5"
              >
                <ListOrdered className="h-3 w-3 text-sky-400" />
                Live Logs
              </Link>
              <Link
                href="/admin/errors"
                className="px-2.5 py-1 rounded-[4px] text-xs font-medium text-[#a1a1aa] hover:text-white hover:bg-[#18181c] transition-colors flex items-center gap-1.5"
              >
                <AlertTriangle className="h-3 w-3 text-amber-400" />
                Failures & WebGPU
              </Link>
              <Link
                href="/admin/settings"
                className="px-2.5 py-1 rounded-[4px] text-xs font-medium text-[#a1a1aa] hover:text-white hover:bg-[#18181c] transition-colors flex items-center gap-1.5"
              >
                <Settings className="h-3 w-3 text-[#a1a1aa]" />
                Settings & Retention
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              target="_blank"
              className="text-xs text-[#a1a1aa] hover:text-white flex items-center gap-1 px-2 py-1 rounded border border-[#27272a]"
            >
              <ExternalLink className="h-3 w-3" />
              Public App
            </Link>

            <form
              action={async () => {
                "use server";
                const { cookies } = await import("next/headers");
                const cookieStore = await cookies();
                cookieStore.delete("edito_admin_auth");
                const { redirect } = await import("next/navigation");
                redirect("/admin/login");
              }}
            >
              <Button
                variant="ghost"
                size="sm"
                type="submit"
                className="h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/40"
              >
                <LogOut className="h-3 w-3 mr-1" />
                Sign Out
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* Admin Content Area */}
      <main className="flex-1 pb-16">{children}</main>
    </div>
  );
}
