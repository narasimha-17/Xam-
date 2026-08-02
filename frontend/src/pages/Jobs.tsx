import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, Briefcase, Pencil, Plus, Trash2 } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { createJob, deleteJob, fetchAdminJobs, fetchJobs, updateJob } from "../lib/jobs";
import type { JobPosting, JobPostingAdmin, JobPostingInput } from "../types/api";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Textarea } from "../components/ui/Textarea";
import { Select } from "../components/ui/Select";
import { Modal } from "../components/ui/Modal";
import { Loader } from "../components/ui/Loader";
import { SearchInput } from "../components/ui/SearchInput";
import { cn } from "../lib/utils";

const JOB_TYPE_LABELS: Record<string, string> = {
  full_time: "Full-time",
  internship: "Internship",
  part_time: "Part-time",
};

const AVATAR_COLORS = ["#8e5745", "#5f7a45", "#b4790e", "#a63d2f", "#201a14", "#6b4234"];

function avatarColor(name: string) {
  const sum = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

function daysUntil(deadline: string | null): number | null {
  if (!deadline) return null;
  const ms = new Date(deadline).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function isClosed(job: JobPosting | JobPostingAdmin): boolean {
  if ("is_active" in job && !job.is_active) return true;
  const days = daysUntil(job.application_deadline);
  return days !== null && days < 0;
}

type FormValues = {
  title: string;
  company_name: string;
  job_type: string;
  location: string;
  is_remote: boolean;
  description: string;
  min_qualification: string;
  package: string;
  application_link: string;
  application_deadline: string;
  is_active: boolean;
};

const EMPTY_FORM: FormValues = {
  title: "",
  company_name: "",
  job_type: "full_time",
  location: "",
  is_remote: false,
  description: "",
  min_qualification: "",
  package: "",
  application_link: "",
  application_deadline: "",
  is_active: true,
};

function JobCard({
  job,
  isAdmin,
  onEdit,
  onDelete,
}: {
  job: JobPosting | JobPostingAdmin;
  isAdmin: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const closed = isClosed(job);
  const days = daysUntil(job.application_deadline);

  return (
    <Card className={cn("flex flex-col gap-3.5", closed && "opacity-60")}>
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-display text-sm font-bold text-white"
          style={{ backgroundColor: avatarColor(job.company_name) }}
        >
          {initials(job.company_name)}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-base font-semibold text-ink">{job.title}</h3>
          <p className="truncate text-sm text-ink-muted">{job.company_name}</p>
        </div>
        {isAdmin && (
          <div className="flex shrink-0 gap-1">
            <button
              onClick={onEdit}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-muted hover:bg-black/5 hover:text-ink"
              aria-label="Edit job"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={onDelete}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-muted hover:bg-danger/10 hover:text-danger"
              aria-label="Delete job"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent-dim">
          {JOB_TYPE_LABELS[job.job_type] ?? job.job_type}
        </span>
        {(job.location || job.is_remote) && (
          <span className="rounded-full bg-black/5 px-2.5 py-1 text-xs font-medium text-ink-muted">
            {job.is_remote ? (job.location ? `${job.location} · Remote` : "Remote") : job.location}
          </span>
        )}
        {closed ? (
          <span className="rounded-full bg-black/5 px-2.5 py-1 text-xs font-medium text-ink-faint">
            Applications closed
          </span>
        ) : (
          days !== null && (
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-medium",
                days <= 3 ? "bg-danger/10 text-danger" : "bg-warning/10 text-warning",
              )}
            >
              Closes in {days} day{days === 1 ? "" : "s"}
            </span>
          )
        )}
      </div>

      <p className="line-clamp-2 text-sm text-ink-muted">{job.description}</p>

      <div className="mt-auto flex items-center justify-between border-t border-black/5 pt-3">
        <div>
          {job.package && <p className="font-display text-sm font-semibold text-ink">{job.package}</p>}
          {job.min_qualification && <p className="text-xs text-ink-faint">{job.min_qualification}</p>}
        </div>
        {closed ? (
          <span className="text-xs font-medium text-ink-faint">Closed</span>
        ) : job.application_link ? (
          <a
            href={job.application_link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm font-medium text-accent hover:underline"
          >
            Apply <ArrowUpRight size={13} />
          </a>
        ) : (
          <span className="text-xs text-ink-faint">No link provided</span>
        )}
      </div>
    </Card>
  );
}

export function Jobs() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data: jobs, isLoading } = useQuery({
    queryKey: ["jobs", isAdmin],
    queryFn: () => (isAdmin ? fetchAdminJobs() : fetchJobs()),
  });

  const { register, handleSubmit, reset } = useForm<FormValues>({ defaultValues: EMPTY_FORM });

  function toPayload(values: FormValues): JobPostingInput {
    return {
      title: values.title,
      company_name: values.company_name,
      job_type: values.job_type,
      location: values.location.trim() || null,
      is_remote: values.is_remote,
      description: values.description,
      min_qualification: values.min_qualification.trim() || null,
      package: values.package.trim() || null,
      application_link: values.application_link.trim() || null,
      application_deadline: values.application_deadline ? new Date(values.application_deadline).toISOString() : null,
      is_active: values.is_active,
    };
  }

  const createMutation = useMutation({
    mutationFn: (values: FormValues) => createJob(toPayload(values)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (values: FormValues) => updateJob(editingId!, toPayload(values)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteJob(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["jobs"] }),
  });

  function openCreateModal() {
    setEditingId(null);
    reset(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEditModal(job: JobPostingAdmin) {
    setEditingId(job.id);
    reset({
      title: job.title,
      company_name: job.company_name,
      job_type: job.job_type,
      location: job.location ?? "",
      is_remote: job.is_remote,
      description: job.description,
      min_qualification: job.min_qualification ?? "",
      package: job.package ?? "",
      application_link: job.application_link ?? "",
      application_deadline: job.application_deadline ? job.application_deadline.slice(0, 10) : "",
      is_active: job.is_active,
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    reset(EMPTY_FORM);
  }

  function onSubmit(values: FormValues) {
    if (editingId !== null) updateMutation.mutate(values);
    else createMutation.mutate(values);
  }

  const filtered = (jobs ?? []).filter((job) => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || job.title.toLowerCase().includes(q) || job.company_name.toLowerCase().includes(q);
    const matchesType =
      typeFilter === "all" ||
      (typeFilter === "remote" ? job.is_remote : job.job_type === typeFilter);
    return matchesSearch && matchesType;
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-semibold text-ink">
            <Briefcase size={24} className="text-accent-soft" /> Off-campus jobs
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Roles posted by the placement team for students applying outside campus recruitment drives.
          </p>
        </div>
        {isAdmin && (
          <Button onClick={openCreateModal}>
            <Plus size={16} /> Post a job
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by role or company..." className="max-w-sm" />
        <div className="flex flex-wrap gap-1.5">
          {[
            { value: "all", label: "All roles" },
            { value: "full_time", label: "Full-time" },
            { value: "internship", label: "Internship" },
            { value: "remote", label: "Remote" },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTypeFilter(opt.value)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
                typeFilter === opt.value
                  ? "border-ink bg-ink text-base"
                  : "border-black/10 text-ink-muted hover:bg-black/5",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <Loader className="py-16" label="Loading jobs..." />}

      {!isLoading && filtered.length === 0 && (
        <Card className="py-16 text-center text-sm text-ink-muted">
          {jobs?.length === 0 ? "No job postings yet." : "No jobs match your search."}
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            isAdmin={isAdmin}
            onEdit={() => openEditModal(job as JobPostingAdmin)}
            onDelete={() => {
              if (confirm(`Delete "${job.title}" at ${job.company_name}?`)) deleteMutation.mutate(job.id);
            }}
          />
        ))}
      </div>

      <Modal open={modalOpen} onClose={closeModal} title={editingId ? "Edit job" : "Post a job"} className="max-w-lg">
        <form onSubmit={handleSubmit(onSubmit)} className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Job title" {...register("title", { required: true })} />
            <Input label="Company" {...register("company_name", { required: true })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Job type" {...register("job_type")}>
              <option value="full_time">Full-time</option>
              <option value="internship">Internship</option>
              <option value="part_time">Part-time</option>
            </Select>
            <Input label="Location" placeholder="e.g. Bengaluru" {...register("location")} />
          </div>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" className="h-4 w-4 accent-accent" {...register("is_remote")} />
            Remote role
          </label>
          <Textarea label="Description" rows={4} {...register("description", { required: true })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Package / stipend" placeholder="e.g. ₹12–16 LPA" {...register("package")} />
            <Input label="Min. qualification" placeholder="e.g. B.Tech, 2026 batch" {...register("min_qualification")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Application link" placeholder="https://..." {...register("application_link")} />
            <Input label="Application deadline" type="date" {...register("application_deadline")} />
          </div>
          {editingId !== null && (
            <label className="flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" className="h-4 w-4 accent-accent" {...register("is_active")} />
              Active (visible to students)
            </label>
          )}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending || updateMutation.isPending}>
              {editingId ? "Save changes" : "Publish job"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
