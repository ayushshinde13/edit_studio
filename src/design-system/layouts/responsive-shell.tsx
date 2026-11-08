"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  FolderHeart,
  Plus,
  Palette,
  Settings,
  Music2,
} from "lucide-react";
import { NavigationBar } from "./navigation-bar";
import { Footer } from "./footer";
import { CreateQuickStartModal } from "@/components/CreateQuickStartModal";
import { cn } from "@/lib/utils";

export function ResponsiveShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [quickCreateOpen, setQuickCreateOpen] = React.useState(false);
  const isAdmin = pathname.startsWith("/admin");

  if (isAdmin) {
    return <>{children}</>;
  }

  const mobileTabs = [
    { label: "Home", href: "/", icon: Home },
    { label: "Studio", href: "/studio", icon: FolderHeart },
    { label: "Create", href: "#", icon: Plus, isCreate: true },
    { label: "Creative", href: "/creative", icon: Palette },
    { label: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#09090b] text-[#111827] dark:text-[#f4f4f5]">
      <NavigationBar onOpenQuickCreate={() => setQuickCreateOpen(true)} />
      <main className="flex-1">{children}</main>
      <Footer onOpenQuickCreate={() => setQuickCreateOpen(true)} />

      {/* Mobile-First Fixed Bottom Navigation Bar (< 768px) per Spec 4 & PRD 4.2 */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-14 border-t border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#09090b] px-4 flex items-center justify-around">
        {mobileTabs.map((tab) => {
          const isActive =
            tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          const Icon = tab.icon;

          if (tab.isCreate) {
            return (
              <button
                key="mobile-create-button"
                type="button"
                onClick={() => setQuickCreateOpen(true)}
                className="flex items-center justify-center h-9 w-9 rounded-[6px] bg-[#fb6b6a] text-white active:scale-95 transition-transform"
                title="Create New (Quick Start)"
                aria-label="Create New"
              >
                <Plus className="h-5 w-5" />
              </button>
            );
          }

          return (
            <Link
              key={tab.label}
              href={tab.href}
              className={cn(
                "flex flex-col items-center gap-0.5 text-[10px] font-medium transition-colors",
                isActive
                  ? "text-[#fb6b6a]"
                  : "text-[#6b7280] dark:text-[#a1a1aa] hover:text-[#111827] dark:hover:text-[#f4f4f5]"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* PRD Section 4.2 Quick Start File Drop & Routing Modal */}
      <CreateQuickStartModal open={quickCreateOpen} onOpenChange={setQuickCreateOpen} />
    </div>
  );
}

