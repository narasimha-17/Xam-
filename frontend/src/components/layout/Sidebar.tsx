import { NavLink } from "react-router-dom";
import {
  BarChart3,
  BookOpen,
  Briefcase,
  Building2,
  CalendarDays,
  Code2,
  FileText,
  Flag,
  GitBranch,
  LayoutDashboard,
  MessagesSquare,
  Mic,
  PanelLeftClose,
  PanelLeftOpen,
  Puzzle,
  ScrollText,
  Swords,
  TrendingUp,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { Logo } from "../ui/Logo";
import { cn } from "../../lib/utils";
import { useSidebar } from "./SidebarContext";
import { useAuth } from "../../auth/AuthContext";

const navLinks = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/subjects", label: "Subjects", icon: BookOpen },
  { to: "/coding", label: "Coding practice", icon: Code2 },
  { to: "/dev-practice", label: "Dev Practice", icon: GitBranch },
  { to: "/mock-interview", label: "Mock interview", icon: Mic },
  { to: "/companies", label: "Company Interview Bank", icon: Building2 },
  { to: "/jobs", label: "Off-campus jobs", icon: Briefcase },
  { to: "/competitions", label: "Live competition", icon: Swords },
  { to: "/progress", label: "Progress", icon: TrendingUp },
  { to: "/planner", label: "Study planner", icon: CalendarDays },
  { to: "/puzzle", label: "Daily puzzle", icon: Puzzle },
  { to: "/discussion", label: "Xipe Community", icon: MessagesSquare },
];

// Admin accounts don't practice, so they only get the student pages they actually act on
// directly (posting jobs, creating competition rooms, moderating discussion) — not the
// practice-only pages (coding/dev practice, mock interview, progress, planner, daily puzzle).
const ADMIN_VISIBLE_STUDENT_PATHS = new Set([
  "/dashboard",
  "/subjects",
  "/companies",
  "/jobs",
  "/competitions",
  "/discussion",
]);

const adminNavLinks = [
  { to: "/admin/overview", label: "Overview", icon: BarChart3 },
  { to: "/admin/subjects", label: "Subjects & exams", icon: BookOpen },
  { to: "/admin/pdfs", label: "PDF library", icon: FileText },
  { to: "/admin/puzzles", label: "Puzzle bank", icon: Puzzle },
  { to: "/admin/companies", label: "Company bank", icon: Building2 },
  { to: "/admin/students", label: "Student progress", icon: Users },
  { to: "/admin/users", label: "Manage users", icon: UserCog },
  { to: "/admin/reports", label: "Question reports", icon: Flag },
  { to: "/admin/logs", label: "Logs", icon: ScrollText },
];

function Tooltip({ label }: { label: string }) {
  return (
    <span
      role="tooltip"
      className="pointer-events-none absolute left-full top-1/2 z-[100] ml-3 -translate-x-1 -translate-y-1/2 whitespace-nowrap rounded-lg bg-navy px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-glow transition-all duration-150 group-hover:translate-x-0 group-hover:opacity-100"
    >
      {label}
    </span>
  );
}

export function Sidebar() {
  const { isCollapsed, toggle, isMobileOpen, closeMobile } = useSidebar();
  const { user } = useAuth();
  const links =
    user?.role === "admin"
      ? [...navLinks.filter((l) => ADMIN_VISIBLE_STUDENT_PATHS.has(l.to)), ...adminNavLinks]
      : navLinks;

  return (
    <>
      {isMobileOpen && (
        <div className="fixed inset-0 z-30 bg-navy/40 backdrop-blur-[2px] lg:hidden" onClick={closeMobile} />
      )}
      <aside
        className={cn(
          "glass fixed left-0 top-0 z-40 flex h-screen w-72 flex-col p-5 transition-transform duration-200",
          "-translate-x-full lg:translate-x-0 lg:transition-[width]",
          isMobileOpen && "translate-x-0",
          isCollapsed ? "lg:w-20" : "lg:w-64",
        )}
      >
        <div className={cn("mb-8 flex items-center px-1", isCollapsed ? "justify-between lg:justify-center" : "justify-between")}>
          <div className={cn(isCollapsed && "lg:hidden")}>
            <Logo />
          </div>
          <div className="group relative hidden lg:block">
            <button
              onClick={toggle}
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-black/5 hover:text-ink"
            >
              {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
            {isCollapsed && <Tooltip label="Expand sidebar" />}
          </div>
          <button
            onClick={closeMobile}
            aria-label="Close menu"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-black/5 hover:text-ink lg:hidden"
          >
            <X size={20} />
          </button>
        </div>
        <nav className="flex flex-col gap-1 overflow-y-auto">
          {links.map(({ to, label, icon: Icon }) => (
            <div key={to} className="group relative">
              <NavLink
                to={to}
                onClick={closeMobile}
                aria-label={isCollapsed ? label : undefined}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-muted transition-all duration-200 hover:bg-black/5 hover:text-ink",
                    isCollapsed && "lg:justify-center lg:px-0",
                    isActive && "bg-accent/10 text-ink shadow-glow",
                  )
                }
              >
                <Icon size={18} strokeWidth={1.75} className="shrink-0 text-accent-soft" />
                <span className={cn("truncate", isCollapsed && "lg:hidden")}>{label}</span>
              </NavLink>
              {isCollapsed && (
                <div className="hidden lg:block">
                  <Tooltip label={label} />
                </div>
              )}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
