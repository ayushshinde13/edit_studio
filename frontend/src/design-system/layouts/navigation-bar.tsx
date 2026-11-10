"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Sun,
  Moon,
  Search,
  Command,
  ShieldCheck,
  SlidersHorizontal,
  Home,
  Music2,
  Palette,
  FolderHeart,
  Settings,
  X,
  ArrowRight,
  Plus,
} from "lucide-react";
import { Button } from "../primitives/button";
import { Badge } from "../primitives/badge";
import { TOOLS } from "@/config/tools";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface NavigationBarProps {
  onOpenQuickCreate?: () => void;
}

export function NavigationBar({ onOpenQuickCreate }: NavigationBarProps = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Command palette state
  const [commandOpen, setCommandOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  React.useEffect(() => {
    setMounted(true);
    // Keyboard shortcut for Cmd+K / Ctrl+K
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const navTabs = [
    { label: "All Tools", href: "/" },
    { label: "Audio Hub", href: "/audio" },
    { label: "Creative Studio", href: "/creative" },
    { label: "Local Projects", href: "/studio" },
  ];

  const filteredTools = TOOLS.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.shortDesc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#09090b]">
        <div className="container mx-auto flex h-13 max-w-7xl items-center justify-between px-4">
          {/* Left: Brand mark */}
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2.5 group">
              <Image
                src="/logo1.png"
                alt="Edito Logo"
                width={38}
                height={24}
                className="h-6 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
                priority
              />
              <span className="font-bold text-base tracking-tight text-[#111827] dark:text-[#f4f4f5] leading-none select-none">
                Edito
              </span>
            </Link>
          </div>

          {/* Center: Hub tabs */}
          <nav className="hidden md:flex items-center gap-1">
            {navTabs.map((tab) => {
              const isActive =
                tab.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`px-3 py-1.5 text-xs font-medium rounded-[4px] transition-colors ${
                    isActive
                      ? "text-[#fb6b6a] bg-[#fb6b6a]/10"
                      : "text-[#6b7280] dark:text-[#a1a1aa] hover:text-[#111827] dark:hover:text-[#f4f4f5] hover:bg-[#f4f4f5] dark:hover:bg-[#18181c]"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>

          {/* Right: Command bar, Perf Mode, Theme Toggler, Support */}
          <div className="flex items-center gap-2">
            {/* Quick Create (+) button (PRD Section 4.2) */}
            {onOpenQuickCreate && (
              <Button
                variant="default"
                size="sm"
                onClick={onOpenQuickCreate}
                className="hidden sm:flex items-center gap-1.5 text-xs h-7 px-2.5 bg-[#fb6b6a] text-white hover:bg-[#ea5857]"
              >
                <Plus className="h-3 w-3" />
                <span>Create</span>
              </Button>
            )}

            {/* Global Command palette trigger (Cmd + K) */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCommandOpen(true)}
              className="hidden sm:flex items-center gap-2 text-xs h-7 px-2 text-[#6b7280] dark:text-[#a1a1aa]"
            >
              <Search className="h-3 w-3" />
              <span>Quick Search</span>
              <kbd className="pointer-events-none inline-flex h-4 select-none items-center gap-0.5 rounded border border-[#e5e7eb] dark:border-[#27272a] bg-[#f4f4f5] dark:bg-[#18181c] px-1 font-mono text-[9px] font-medium text-[#6b7280] dark:text-[#a1a1aa]">
                ⌘K
              </kbd>
            </Button>

            {/* Theme Toggler (Zero Layout Shift) */}
            {mounted && (
              <button
                type="button"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="h-7 w-7 rounded-[4px] border border-[#e5e7eb] dark:border-[#27272a] flex items-center justify-center text-[#6b7280] dark:text-[#a1a1aa] hover:text-[#111827] dark:hover:text-[#f4f4f5] hover:border-[#fb6b6a] transition-colors"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? (
                  <Sun className="h-3.5 w-3.5" />
                ) : (
                  <Moon className="h-3.5 w-3.5" />
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Command Palette Dialog Modal */}
      <Dialog open={commandOpen} onOpenChange={setCommandOpen}>
        <DialogContent className="max-w-xl p-0 border border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#121215] overflow-hidden rounded-[8px] shadow-none">
          <div className="flex items-center border-b border-[#e5e7eb] dark:border-[#27272a] px-3">
            <Search className="h-4 w-4 text-[#6b7280] dark:text-[#a1a1aa]" />
            <input
              type="text"
              placeholder="Search tools, actions, stem split, photo canvas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent p-3 text-xs text-[#111827] dark:text-[#f4f4f5] placeholder:text-[#6b7280] dark:placeholder:text-[#52525b] focus:outline-none"
              autoFocus
            />
            <kbd className="text-[10px] font-mono text-[#6b7280] dark:text-[#a1a1aa] border border-[#e5e7eb] dark:border-[#27272a] px-1.5 py-0.5 rounded">
              ESC
            </kbd>
          </div>

          <div className="max-h-80 overflow-y-auto p-2 space-y-1">
            {filteredTools.length === 0 ? (
              <div className="p-4 text-center text-xs text-[#6b7280] dark:text-[#a1a1aa]">
                No matching tools found.
              </div>
            ) : (
              filteredTools.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => {
                    setCommandOpen(false);
                    router.push(tool.route);
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-[6px] text-left hover:bg-[#f4f4f5] dark:hover:bg-[#18181c] group transition-colors"
                >
                  <div>
                    <div className="text-xs font-semibold text-[#111827] dark:text-[#f4f4f5] group-hover:text-[#fb6b6a] transition-colors">
                      {tool.name}
                    </div>
                    <div className="text-[11px] text-[#6b7280] dark:text-[#a1a1aa]">
                      {tool.shortDesc}
                    </div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-[#6b7280] dark:text-[#52525b] group-hover:text-[#fb6b6a] transition-colors" />
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

