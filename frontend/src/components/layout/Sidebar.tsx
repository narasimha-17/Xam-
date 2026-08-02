import { NavLink } from "react-router-dom";
import {
  BarChart3,
  BookOpen,
  Briefcase,
  Code2,
  Flag,
  LayoutDashboard,
  MessagesSquare,
  Mic,
  PanelLeftClose,
  PanelLeftOpen,
  Puzzle,
  TrendingUp,
  UserCog,
  Users,
} from "lucide-react";
import { Logo } from "../ui/Logo";
import { cn } from "../../lib/utils";
import { useSidebar } from "./SidebarContext";
import { useAuth } from "../../auth/AuthContext";

const navLinks = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/subjects", label: "Subjects", icon: BookOpen },
  { to: "/coding", label: "Coding practice", icon: Code2 },
  { to: "/mock-interview", label: "Mock interview", icon: Mic },
  { to: "/jobs", label: "Off-campus jobs", icon: Briefcase },
  { to: "/progress", label: "Progress", icon: TrendingUp },
  { to: "/puzzle", label: "Daily puzzle", icon: Puzzle },
  { to: "/discussion", label: "Discussion", icon: MessagesSquare },
];

const adminNavLinks = [
  { to: "/admin/overview", label: "Overview", icon: BarChart3 },
  { to: "/admin/students", label: "Student progress", icon: Users },
  { to: "/admin/users", label: "Manage users", icon: UserCog },
  { to: "/admin/reports", label: "Question reports", icon: Flag },
];

function Tooltip({ label }: { label: string }) {
  return (
    <span
      role="tooltip"
      className="pointer-events-none absolute left-full top-1/2 z-[100] ml-3 -translate-x-1 -translate-y-1/2 whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 text-xs font-medium text-base opacity-0 shadow-glow transition-all duration-150 group-hover:translate-x-0 group-hover:opacity-100"
    >
      {label}
    </span>
  );
}

export function Sidebar() {
  const { isCollapsed, toggle } = useSidebar();
  const { user } = useAuth();
  const links = user?.role === "admin" ? [...navLinks, ...adminNavLinks] : navLinks;

  return (
    <aside
      className={cn(
        "glass fixed left-0 top-0 z-30 flex h-screen flex-col p-5 transition-[width] duration-200",
        isCollapsed ? "w-20" : "w-64",
      )}
    >
      <div className={cn("mb-8 flex items-center px-1", isCollapsed ? "justify-center" : "justify-between")}>
        {!isCollapsed && <Logo />}
        <div className="group relative">
          <button
            onClick={toggle}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-black/5 hover:text-ink"
          >
            {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
          {isCollapsed && <Tooltip label="Expand sidebar" />}
        </div>
      </div>
      <nav className="flex flex-col gap-1">
        {links.map(({ to, label, icon: Icon }) => (
          <div key={to} className="group relative">
            <NavLink
              to={to}
              aria-label={isCollapsed ? label : undefined}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-muted transition-all duration-200 hover:bg-black/5 hover:text-ink",
                  isCollapsed && "justify-center px-0",
                  isActive && "bg-accent/10 text-ink shadow-glow",
                )
              }
            >
              <Icon size={18} strokeWidth={1.75} className="shrink-0 text-accent-soft" />
              {!isCollapsed && label}
            </NavLink>
            {isCollapsed && <Tooltip label={label} />}
          </div>
        ))}
      </nav>
    </aside>
  );
}
