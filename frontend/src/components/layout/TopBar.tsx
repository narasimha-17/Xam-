import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, LogOut, Menu, Search, UserRound } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { fetchSubjects } from "../../lib/subjects";
import { cn } from "../../lib/utils";
import { UserAvatar } from "../ui/UserAvatar";
import { NotificationBell } from "./NotificationBell";
import { ThemeToggle } from "./ThemeToggle";
import { useSidebar } from "./SidebarContext";

const SECTION_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  subjects: "Subjects",
  progress: "Progress",
  discussion: "Discussion",
  exams: "Exams",
  profile: "Profile",
};

function useBreadcrumb() {
  const { pathname } = useLocation();
  const segment = pathname.split("/").filter(Boolean)[0] ?? "dashboard";
  return SECTION_LABELS[segment] ?? "Xam+";
}

export function TopBar() {
  const { user, logout } = useAuth();
  const { openMobile } = useSidebar();
  const navigate = useNavigate();
  const section = useBreadcrumb();

  const [query, setQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const { data: subjects } = useQuery({ queryKey: ["subjects"], queryFn: fetchSubjects });
  const matches =
    query.trim().length > 0
      ? (subjects ?? []).filter((s) => s.name.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 5)
      : [];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function goToSubject(id: number) {
    setQuery("");
    setSearchFocused(false);
    navigate(`/subjects/${id}`);
  }

  return (
    <header className="glass sticky top-0 z-20 flex h-16 items-center justify-between gap-2 border-b border-black/10 px-4 sm:gap-4 sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-2">
        <button
          onClick={openMobile}
          aria-label="Open menu"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-black/5 hover:text-ink lg:hidden"
        >
          <Menu size={20} />
        </button>
        <nav className="flex min-w-0 items-center gap-1.5 truncate text-sm text-ink-muted">
          <Link to="/dashboard" className="hover:text-ink">
            Home
          </Link>
          <span className="text-ink-faint">/</span>
          <span className="truncate font-medium text-ink">{section}</span>
        </nav>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <div className="relative hidden w-48 md:block lg:w-64">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
            placeholder="Jump to a subject..."
            className="w-full rounded-xl border border-black/10 bg-base-soft/60 py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-faint outline-none transition-all duration-200 focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
          />
          {searchFocused && matches.length > 0 && (
            <div className="glass absolute left-0 right-0 top-full z-30 mt-1.5 flex flex-col overflow-hidden rounded-xl">
              {matches.map((s) => (
                <button
                  key={s.id}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => goToSubject(s.id)}
                  className="px-3 py-2 text-left text-sm text-ink hover:bg-accent/10"
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <ThemeToggle />
        <NotificationBell />

        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition-colors hover:bg-black/5"
          >
            <UserAvatar fullName={user?.full_name} avatarId={user?.avatar_id} size={32} className="text-xs" />
            <ChevronDown size={14} className={cn("text-ink-muted transition-transform", menuOpen && "rotate-180")} />
          </button>
          {menuOpen && (
            <div className="glass absolute right-0 top-full z-30 mt-1.5 w-48 overflow-hidden rounded-xl">
              <div className="border-b border-black/10 px-3 py-2.5">
                <p className="truncate text-sm font-medium text-ink">{user?.full_name}</p>
                <p className="truncate text-xs capitalize text-ink-faint">{user?.role}</p>
              </div>
              <Link
                to="/profile"
                onClick={() => setMenuOpen(false)}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-ink-muted hover:bg-black/5 hover:text-ink"
              >
                <UserRound size={15} /> Profile
              </Link>
              <button
                onClick={logout}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-ink-muted hover:bg-danger/10 hover:text-danger"
              >
                <LogOut size={15} /> Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
