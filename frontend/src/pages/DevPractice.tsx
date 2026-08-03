import { useState } from "react";
import { Container, GitBranch } from "lucide-react";
import { GitLearn } from "./GitLearn";
import { DockerLearn } from "./DockerLearn";
import { cn } from "../lib/utils";

type Tab = "git" | "docker";

const TABS: { id: Tab; label: string; icon: typeof GitBranch }[] = [
  { id: "git", label: "Git & GitHub", icon: GitBranch },
  { id: "docker", label: "Docker", icon: Container },
];

export function DevPractice() {
  const [tab, setTab] = useState<Tab>("git");

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex gap-1 rounded-xl border border-black/10 bg-base-soft/50 p-1 w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              tab === id ? "bg-base-panel text-ink shadow-glow" : "text-ink-muted hover:text-ink",
            )}
          >
            <Icon size={16} className="text-accent-soft" />
            {label}
          </button>
        ))}
      </div>

      {tab === "git" ? <GitLearn /> : <DockerLearn />}
    </div>
  );
}
