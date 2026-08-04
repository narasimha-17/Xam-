import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Bookmark, BookmarkCheck, Building2, Code2, ListChecks, MessageSquareText } from "lucide-react";
import { fetchCompanies, subscribeCompany, unsubscribeCompany } from "../lib/companies";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Loader } from "../components/ui/Loader";
import { SearchInput } from "../components/ui/SearchInput";
import { cn } from "../lib/utils";

const AVATAR_COLORS = ["#1e3f66", "#e8a23d", "#b8862e", "#e0475c", "#0a192f", "#142c48", "#2e9e6b"];

function avatarColor(name: string) {
  const sum = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

export function Companies() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: companies, isLoading } = useQuery({ queryKey: ["companies"], queryFn: fetchCompanies });

  const subscribeMutation = useMutation({
    mutationFn: ({ id, subscribed }: { id: number; subscribed: boolean }) =>
      subscribed ? unsubscribeCompany(id) : subscribeCompany(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["companies"] }),
  });

  const filtered = companies?.filter((c) => c.name.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2 font-display text-2xl font-semibold text-ink">
          <Building2 size={24} className="text-accent-soft" /> Company Interview Bank
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Subscribe to a company to unlock its coding, aptitude, and technical practice material.
        </p>
      </div>

      {!isLoading && companies && companies.length > 0 && (
        <SearchInput value={search} onChange={setSearch} placeholder="Search companies..." className="max-w-sm" />
      )}

      {isLoading && <Loader className="py-16" label="Loading companies..." />}

      {!isLoading && companies && companies.length === 0 && (
        <Card className="py-16 text-center text-sm text-ink-muted">No companies available yet.</Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered?.map((company) => (
          <Card key={company.id} className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-display text-base font-semibold text-white"
                  style={{ backgroundColor: avatarColor(company.name) }}
                >
                  {company.name[0]?.toUpperCase()}
                </div>
                <div>
                  <Link to={`/companies/${company.id}`}>
                    <h3 className="font-display text-lg font-semibold text-ink hover:text-accent">{company.name}</h3>
                  </Link>
                </div>
              </div>
            </div>

            {company.description && <p className="line-clamp-2 text-sm text-ink-muted">{company.description}</p>}

            <div className="flex flex-wrap items-center gap-3 text-xs text-ink-faint">
              <span className="flex items-center gap-1">
                <Code2 size={12} /> {company.coding_count} coding
              </span>
              <span className="flex items-center gap-1">
                <ListChecks size={12} /> {company.aptitude_count} aptitude
              </span>
              <span className="flex items-center gap-1">
                <MessageSquareText size={12} /> {company.technical_count} technical
              </span>
            </div>

            <Button
              variant={company.is_subscribed ? "outline" : "primary"}
              className={cn("w-full", subscribeMutation.isPending && "opacity-70")}
              onClick={() => subscribeMutation.mutate({ id: company.id, subscribed: company.is_subscribed })}
              isLoading={subscribeMutation.isPending && subscribeMutation.variables?.id === company.id}
            >
              {company.is_subscribed ? (
                <>
                  <BookmarkCheck size={16} /> Subscribed
                </>
              ) : (
                <>
                  <Bookmark size={16} /> Subscribe
                </>
              )}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
