import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { useSidebar } from "./SidebarContext";
import { cn } from "../../lib/utils";

export function AppShell({ children }: { children: ReactNode }) {
  const { isCollapsed } = useSidebar();

  return (
    <div className="relative min-h-screen">
      <div className="app-backdrop">
        <div className="bg-grid" />
      </div>
      <Sidebar />
      <div className={cn("min-h-screen transition-[margin] duration-200", isCollapsed ? "lg:ml-20" : "lg:ml-64")}>
        <TopBar />
        <main className="px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-6xl animate-fade-in-up">{children}</div>
        </main>
      </div>
    </div>
  );
}
